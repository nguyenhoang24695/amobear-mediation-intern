# Task: Fix — Ad "flexible" Meta không render Primary text / Headline (chuyển sang asset_feed_spec)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend + Next.js).

Khi tạo ad Meta theo định dạng **flexible**, Primary text và Headline KHÔNG render (kiểm
chứng qua màn preview iframe `/meta-ads/campaigns/{id}` — ảnh + CTA hiện nhưng không có chữ).

### Đã điều tra & đối chiếu tài liệu Meta — kết luận: payload tạo ad đang SAI cấu trúc
Hiện tại backend dựng payload flexible như sau (SAI):
```jsonc
{
  "creative": {
    "object_story_spec": {
      "page_id": "...",
      "link_data": {                 // ❌ một creative single-image HOÀN CHỈNH nhưng KHÔNG có text
        "link": "...", "image_hash": "...", "call_to_action": { ... }
      }
    }
  },
  "creative_asset_groups_spec": {     // text bị nhét riêng ở đây -> Meta lưu nhưng KHÔNG render
    "groups": [{ "texts": [{"text":"...","text_type":"primary_text"},{"text":"...","text_type":"headline"}], ... }]
  }
}
```
→ Meta lấy `object_story_spec.link_data` (không text) làm creative deliverable để render →
ra ảnh + CTA, mất chữ. Text trong `creative_asset_groups_spec` được lưu (sync đọc lại được)
nhưng không được dùng để render.

Tài liệu Meta (Flexible Ad Format / Asset Feed Spec) yêu cầu: `object_story_spec` chỉ chứa
`page_id` (+ optional `instagram_user_id`), còn TOÀN BỘ text/asset nằm trong `asset_feed_spec`:
```jsonc
{
  "object_story_spec": { "page_id": "<PAGE_ID>" },     // ✅ page-only
  "asset_feed_spec": {
    "images": [{"hash":"<HASH>"}],
    "bodies": [{"text":"<PRIMARY_TEXT_1>"}, {"text":"<PRIMARY_TEXT_2>"}],  // primary text
    "titles": [{"text":"<HEADLINE>"}],                                    // headline
    "descriptions": [{"text":"<DESC>"}],
    "ad_formats": ["SINGLE_IMAGE"],
    "link_urls": [{"website_url":"<URL>"}],
    "call_to_action_types": ["LEARN_MORE"]
  }
}
```
Nguồn:
- https://developers.facebook.com/docs/marketing-api/flexible-ad-format/
- https://developers.facebook.com/docs/marketing-api/ad-creative/asset-feed-spec/

## Phương án (đã chốt với user): #2 — chuyển flexible sang `asset_feed_spec`
Bỏ phụ thuộc `creative_asset_groups_spec` cho phần text. Dựng `creative.asset_feed_spec` +
`object_story_spec` page-only.

## File & code liên quan (backend)
`backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
- `BuildFlexibleAdPayloadAsync` (dòng ~1695-1723): nơi ráp `creative` + `creative_asset_groups_spec`.
- `BuildFlexibleAssetGroupAsync` (dòng ~1725-1808): hiện gom images/videos/texts thành 1 group.
- `BuildFlexibleObjectStorySpec` (dòng ~2102-2128): hiện dựng link_data/video_data ĐẦY ĐỦ (sai cho flexible).
- `BuildPageOnlyObjectStorySpec` (dòng ~2129-2140): helper chỉ set `page_id` — HIỆN ĐANG DEAD CODE, sẽ dùng.
- Helper sẵn có: `BuildImageAsset` (dòng ~2142), `ResolveImageReferenceAsync`,
  `ResolveVideoIdAsync`, `ApplyImageReference`, `ApplyCallToAction`, `GetCreativeName`,
  `ResolveLink`, `GetCreativeTextVariations` (dòng ~2154, hữu ích để dedupe + cap 5 biến thể).

DTO (đã có sẵn, KHÔNG cần đổi): `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
- `MetaFlexibleCreativeDraftDto` (dòng ~167): `PrimaryTexts: List<string>`, `Headlines: List<string>`,
  `CallToActionType: string?`, `LinkUrl: string?`, `Assets: List<MetaFlexibleCreativeAssetDraftDto>`.
- `MetaFlexibleCreativeAssetDraftDto` (dòng ~159): `AssetType` ("IMAGE"|"VIDEO"), `Image`, `Video`, `Thumbnail`.
- (Lưu ý: DTO KHÔNG có Descriptions → `asset_feed_spec.descriptions` bỏ qua, không bịa nguồn.)

## Yêu cầu implement

1. **Sửa `BuildFlexibleAdPayloadAsync`**: dựng:
   ```
   creative = {
     name = GetCreativeName(creative),
     object_story_spec = BuildPageOnlyObjectStorySpec(creative),   // ✅ chỉ page_id (+ instagram_actor_id nếu có)
     asset_feed_spec = <xem bước 2>
   }
   ```
   **BỎ** key `creative_asset_groups_spec` khỏi payload. Giữ `name/adset_id/status/tracking_specs`
   như cũ.

2. **Viết hàm dựng `asset_feed_spec`** (thay/tái dùng phần của `BuildFlexibleAssetGroupAsync`):
   - `images`: từ các asset `AssetType=IMAGE` → `[{ "hash": <image_hash> }]` (hoặc `{"url":...}`),
     tái dùng `ResolveImageReferenceAsync` + `BuildImageAsset`.
   - `videos`: từ asset `AssetType=VIDEO` → `[{ "video_id": <id>, "thumbnail_hash": <hash> }]`.
     ⚠️ Trong asset_feed_spec, field thumbnail của video là **`thumbnail_hash`** / `thumbnail_url`
     (KHÁC với object_story_spec dùng `image_hash`). VERIFY lại tên field qua docs/Graph trước khi chốt.
     Vẫn validate video phải có thumbnail (giữ logic ném lỗi hiện có).
   - `bodies`: từ `flexible.PrimaryTexts` (trim, bỏ rỗng, dedupe, tối đa 5) → `[{ "text": ... }]`.
     Dùng `GetCreativeTextVariations` nếu phù hợp.
   - `titles`: từ `flexible.Headlines` (tương tự) → `[{ "text": ... }]`.
   - `ad_formats`: suy ra từ loại asset: chỉ image → `["SINGLE_IMAGE"]`; chỉ video →
     `["SINGLE_VIDEO"]`; nhiều ảnh/hỗn hợp → cân nhắc `["CAROUSEL"]` hoặc để format phù hợp.
     VERIFY enum hợp lệ qua docs. Tối thiểu xử lý đúng SINGLE_IMAGE & SINGLE_VIDEO.
   - `link_urls`: `[{ "website_url": <link> }]` với `link = ResolveLink(flexible.LinkUrl, mapping)`.
   - `call_to_action_types`: `[ <flexible.CallToActionType> ]` nếu có.
   - Bỏ `descriptions` (không có nguồn DTO).

3. **Validate tối thiểu** trước khi gửi: phải có ≥1 image hoặc video, ≥1 body, và ad_formats
   không rỗng (nếu thiếu, ném `InvalidOperationException` message rõ ràng). bodies/titles cap 5
   (giới hạn Meta: 5 primary text, 5 headline).

4. **Dọn dead code**: nếu `BuildFlexibleObjectStorySpec` và phần asset-group cũ không còn ai dùng
   sau khi đổi, xóa để tránh nhầm. `BuildPageOnlyObjectStorySpec` giờ được sử dụng (hết dead).

## Test
File: `backend/MediationPro.Infrastructure.UnitTests/MetaAds/MetaCampaignExecutionServiceTests.cs`
- Có sẵn 2 test flexible (`BuildFlexibleAdPayloadAsync_*`, dòng ~273-455) hiện assert
  `object_story_spec.video_data` + `creative_asset_groups_spec`. **Phải viết lại** để assert:
  - `creative["asset_feed_spec"]` tồn tại; `bodies`/`titles` chứa đúng text; `images` hoặc
    `videos` đúng; `ad_formats` đúng; `link_urls[0].website_url` đúng.
  - `creative["object_story_spec"]` chỉ có `page_id` (+ optional instagram), KHÔNG có link_data/video_data.
  - payload KHÔNG còn key `creative_asset_groups_spec`.
- Thêm test: nhiều PrimaryTexts/Headlines → dedupe + cap 5; video thiếu thumbnail → ném lỗi (giữ).

## BƯỚC VERIFY THỰC TẾ (bắt buộc, vì đây là vấn đề render phía Meta)
1. Build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → thêm `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. Test:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
3. **E2E tạo ad thật + xem render** (quan trọng nhất):
   - Tạo 1 ad flexible mới qua flow create-request với ≥1 primary text + ≥1 headline.
   - Mở `/meta-ads/campaigns/{id}` → Preview → xác nhận iframe render **CÓ Primary text + Headline**.
   - (Đối chiếu Graph) đọc creative vừa tạo:
     `GET /v24.0/{creative_id}?fields=asset_feed_spec,object_story_spec&access_token=...`
     → `asset_feed_spec.bodies/titles` phải có text; `object_story_spec` chỉ page_id.
   - Token Meta lưu MÃ HÓA trong `meta_integrations.access_token_encrypted` (id=1) — không giải mã
     qua SQL; nhờ người chạy task cấp token. Graph version `v24.0`. Ad account test:
     `act_1679090066790569`.

## Phạm vi & ràng buộc
- Chỉ sửa luồng TẠO ad flexible (`MetaCampaignExecutionService` + test). KHÔNG đụng sync, preview,
  hay các loại creative khác (single image/video/carousel/existing post).
- Convention C#: PascalCase public, `_camelCase` private; key JSON snake_case khớp Graph API;
  dùng `MetaValueNormalizer.JsonOptions` khi (de)serialize.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass; ad flexible mới tạo có `creative.asset_feed_spec.bodies/titles` đúng text,
`object_story_spec` page-only, không còn `creative_asset_groups_spec`; preview iframe render
hiển thị đầy đủ Primary text + Headline; test flexible đã viết lại và xanh.
