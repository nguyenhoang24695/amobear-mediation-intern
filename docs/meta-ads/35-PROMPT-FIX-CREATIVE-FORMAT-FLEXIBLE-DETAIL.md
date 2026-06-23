# Task: Fix — Detail campaign Meta gắn nhãn "Single" cho creative flexible (set CreativeFormat + AssetGroups)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend).

Màn detail campaign Meta (`/meta-ads/campaigns/{id}`) gắn nhãn **"Single"** cho creative thực ra
là **flexible** (Flexible Ad Format, tạo bằng `creative_asset_groups_spec`). Ví dụ campaign 1862,
creative `meta_creatives.id=14903`: config_json synced ĐÃ có `creative_asset_groups_spec` với 1
group chứa 6 videos + texts (primary_text + headline) → đúng là flexible, nhưng UI vẫn hiện "Single".

### Nguyên nhân (đã xác định)
FE quyết định nhãn ở `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`
(`getCreativeFormatLabel`):
```ts
return item.creativeFormat === "flexible" || (item.assetGroups?.length ?? 0) > 0 ? "Flexible format" : "Single"
```
→ cần BE trả `creativeFormat="flexible"` hoặc `assetGroups` không rỗng.

Nhưng BE `ToCreativeSummaryDto` trong `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs`
(method `private static MetaCampaignCreativeSummaryDto ToCreativeSummaryDto(MetaCreative, IReadOnlyList<MetaAd>)`,
dòng ~999-1031) **KHÔNG** set `CreativeFormat` (giữ mặc định `"single"`) và **KHÔNG** set
`AssetGroups` (để rỗng). Nó cũng không đọc `creative_asset_groups_spec`; class `CreativeSnapshot`
(cùng file, dòng ~1467-1489) không model field này.
(Text primary/headline vẫn hiện đúng vì SYNC ghi thẳng body/title vào config_json — KHÔNG đụng.)

**Test đang ĐỎ cần làm xanh:** `backend/MediationPro.Api.Tests/Controllers/MetaCampaignCreativeSummaryMappingTests.cs`
đã kỳ vọng `dto.CreativeFormat == "flexible"` + `AssetGroups` đầy đủ — đây là spec nghiệm thu.

## DTO đích (đã có sẵn, KHÔNG đổi)
`backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignDtos.cs`:
- `MetaCampaignCreativeSummaryDto`: `string CreativeFormat = "single"` (dòng 127);
  `List<MetaCampaignCreativeAssetGroupDto> AssetGroups` (dòng 139).
- `MetaCampaignCreativeAssetGroupDto` (dòng 146): `GroupUuid`, `LinkUrl`, `CallToActionType`,
  `List<string> PrimaryTexts`, `List<string> Headlines`, `List<MetaCampaignCreativeAssetDto> Assets`.
- `MetaCampaignCreativeAssetDto` (dòng 156): `AssetType`, `ImageHash`, `ImageUrl`, `VideoId`, `ThumbnailUrl`.

## Cấu trúc `creative_asset_groups_spec` trong config_json (theo shape SYNC đã lưu)
Tham chiếu `MetaCampaignSyncService.cs` (dòng ~1536-1594) — đây là JSON thực tế nằm trong config_json:
```jsonc
"creative_asset_groups_spec": {
  "groups": [
    {
      "group_uuid": "…",
      "link": "…",                                  // có thể có (test cấp), parse optional
      "call_to_action": { "type": "LEARN_MORE" },
      "texts":  [ { "text": "…", "text_type": "primary_text" }, { "text": "…", "text_type": "headline" } ],
      "images": [ { "hash": "…", "url": "…" } ],
      "videos": [ { "video_id": "…", "image_hash": "…", "image_url": null, "thumbnail_url": null } ]
    }
  ]
}
```

## Yêu cầu implement (chỉ trong MetaCampaignsController.cs)
1. **Mở rộng `CreativeSnapshot`**: thêm property
   `[JsonPropertyName("creative_asset_groups_spec")] CreativeAssetGroupsSpecSnapshot? CreativeAssetGroupsSpec`.
   Tạo các snapshot sub-class (private sealed, JsonPropertyName khớp shape trên):
   - groups → list group; group có: `group_uuid`, `link`, `call_to_action{type}`,
     `texts[{text,text_type}]`, `images[{hash,url}]`, `videos[{video_id,image_hash,image_url,thumbnail_url}]`.
2. **Sửa `ToCreativeSummaryDto`**: sau khi parse snapshot, build:
   - `AssetGroups` = map mỗi group → `MetaCampaignCreativeAssetGroupDto`:
     - `GroupUuid` = group.group_uuid; `LinkUrl` = group.link; `CallToActionType` = group.call_to_action?.type.
     - `PrimaryTexts` = texts where text_type == "primary_text" → text (bỏ rỗng).
     - `Headlines` = texts where text_type == "headline" → text (bỏ rỗng).
     - `Assets` = **images trước, videos sau** (đúng thứ tự test):
       - image → `{ AssetType="image", ImageHash=hash, ImageUrl=url }`.
       - video → `{ AssetType="video", VideoId=video_id, ImageHash=image_hash, ImageUrl=image_url, ThumbnailUrl=thumbnail_url }`.
   - `CreativeFormat` = `AssetGroups.Count > 0 ? "flexible" : "single"`.
   - GIỮ NGUYÊN các field còn lại (Headline/Message/ObjectType/… đang chạy đúng).
3. KHÔNG đổi SYNC, FE, hay DTO. KHÔNG đụng creative loại khác.

## Verify
1. Build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. Test — phải xanh, đặc biệt:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
   Trọng tâm: `MetaCampaignCreativeSummaryMappingTests` (3 case: flexible từ asset groups →
   CreativeFormat="flexible" + AssetGroups đúng; single → "single" + AssetGroups rỗng).
3. E2E: mở `/meta-ads/campaigns/1862` → creative phải hiện nhãn **"Flexible format"** + block
   "Flexible Asset Groups" (FE đã sẵn sàng render khi `assetGroups` có dữ liệu).

## Phạm vi & ràng buộc
- Chỉ sửa `MetaCampaignsController.cs` (CreativeSnapshot + ToCreativeSummaryDto). KHÔNG đụng FE/sync/DTO.
- Convention C#: PascalCase public, `_camelCase` private; `JsonPropertyName` snake_case khớp config_json;
  dùng `MetaValueNormalizer.JsonOptions` qua `ParseCreativeSnapshot` sẵn có (dòng ~1158).
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass (`MetaCampaignCreativeSummaryMappingTests` xanh); detail của creative flexible
trả `creativeFormat="flexible"` + `assetGroups` đầy đủ; UI campaign 1862 hiện "Flexible format"
thay vì "Single".
