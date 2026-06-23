# Task: Đảo ngược flexible từ asset_feed_spec → creative_asset_groups_spec (giữ object_story_spec page-only)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend).

Lần fix trước đã chuyển ad **flexible** sang dùng `asset_feed_spec`. Khi tạo ad thật, Meta trả
lỗi:
```json
{ "error": { "code": 100, "error_subcode": 1885998,
  "error_user_title": "Cannot create dynamic creative ad in non-dynamic creative ad set",
  "error_user_msg": "Dynamic creative ads can only be created under dynamic creative ad sets." } }
```

### Nguyên nhân (đã xác định, đối chiếu tài liệu Meta)
`asset_feed_spec` với **nhiều** asset (nhiều bodies/titles) = **Dynamic Creative**, BẮT BUỘC ad set
phải tạo với cờ `is_dynamic_creative = true`. Ad set của hệ thống là loại thường → bị từ chối.

Có 3 cơ chế, ta đã chọn nhầm cái cần đổi ad set:
| Cơ chế | API | Chạy dưới ad set thường? |
|---|---|---|
| Dynamic Creative | `asset_feed_spec` (multi-asset) | ❌ cần `is_dynamic_creative` |
| **Flexible Ad Format** | **`creative_asset_groups_spec`** | ✅ |

→ Với ad set thường (hiện tại), đúng cơ chế là **Flexible Ad Format = `creative_asset_groups_spec`**.
Lỗi text-không-render trước đây KHÔNG phải do `creative_asset_groups_spec`, mà do hồi đó gửi kèm
`object_story_spec.link_data` ĐẦY ĐỦ (không text) đè render. Lần fix vừa rồi đã sửa đúng phần
`object_story_spec` thành **page-only** — phần đó GIỮ NGUYÊN. Việc còn lại: **thay `asset_feed_spec`
trở lại `creative_asset_groups_spec`**.

Nguồn:
- https://developers.facebook.com/docs/marketing-api/flexible-ad-format/
- https://developers.facebook.com/docs/marketing-api/ad-creative/asset-feed-spec/dynamic-creative/ (yêu cầu is_dynamic_creative)

## File & code hiện tại
`backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
- `BuildFlexibleAdPayloadAsync` (dòng ~1701-1727): hiện ráp `creative` = { name,
  object_story_spec(page-only), asset_feed_spec } + `ApplyDegreesOfFreedomSpec`.
- `BuildFlexibleAssetFeedSpecAsync` (dòng ~1729-1801): hiện build asset_feed_spec
  (bodies/titles/images/videos/ad_formats/link_urls/call_to_action_types). ⚠️ ở đây thumbnail
  video dùng key `thumbnail_hash`/`thumbnail_url`.
- `ApplyDegreesOfFreedomSpec` (dòng ~2109): thêm `degrees_of_freedom_spec` (advantage+ opt-in).
- `ResolveFlexibleAdFormats`: helper suy ra ad_formats — sẽ thành dead sau khi đổi.
- `BuildPageOnlyObjectStorySpec` (dòng ~2130): GIỮ — vẫn dùng cho object_story_spec page-only.
- Helper sẵn có giữ nguyên: `ResolveImageReferenceAsync`, `ResolveVideoIdAsync`,
  `HasImageReferenceSource`, `BuildImageAsset`, `GetCreativeTextVariations`, `ResolveLink`,
  `GetCreativeName`.

DTO (KHÔNG đổi): `MetaFlexibleCreativeDraftDto` (PrimaryTexts, Headlines, CallToActionType,
LinkUrl, Assets[AssetType,Image,Video,Thumbnail]).

## Yêu cầu implement

### 1) `BuildFlexibleAdPayloadAsync` — đổi cấu trúc payload
Mục tiêu payload (cho ad image flexible):
```jsonc
{
  "name": "<ad name>",
  "adset_id": "<id>",
  "status": "ACTIVE",
  "creative": {
    "name": "<creative name>",
    "object_story_spec": { "page_id": "<PAGE_ID>" }   // ✅ page-only, GIỮ BuildPageOnlyObjectStorySpec
  },
  "creative_asset_groups_spec": {                      // ✅ ở cấp AD (sibling của creative)
    "groups": [
      {
        "texts": [
          {"text":"<primary 1>","text_type":"primary_text"},
          {"text":"<primary 2>","text_type":"primary_text"},
          {"text":"<headline>","text_type":"headline"}
        ],
        "call_to_action": {"type":"<CTA>","value":{"link":"<link>"}},
        "images": [{"hash":"<HASH>"}]                  // hoặc {"url":...}
      }
    ]
  }
}
```
- BỎ key `asset_feed_spec` khỏi `creative`.
- BỎ `ApplyDegreesOfFreedomSpec` (degrees_of_freedom_spec) trong bước fix này — nó được thêm cho
  hướng asset_feed_spec/advantage+, không cần cho flexible và làm tăng biến số khi debug render.
  (Có thể cân nhắc thêm lại sau khi đã xác nhận text render.)
- GIỮ `object_story_spec = BuildPageOnlyObjectStorySpec(creative)`.
- GIỮ `name/adset_id/status/tracking_specs`.

### 2) Viết hàm build group (thay `BuildFlexibleAssetFeedSpecAsync`)
Tạo `creative_asset_groups_spec` = `{ "groups": [ <1 group> ] }`. Group gồm:
- `texts`: từ `flexible.PrimaryTexts` → mỗi phần tử `{text, text_type:"primary_text"}`; từ
  `flexible.Headlines` → `{text, text_type:"headline"}`. Trim, bỏ rỗng, dedupe, cap 5 mỗi loại
  (dùng `GetCreativeTextVariations`). text_type để **chữ thường** (`primary_text`/`headline`) —
  Meta đã chấp nhận các giá trị này.
- `call_to_action`: `{ "type": flexible.CallToActionType, "value": { "link": link } }` với
  `link = ResolveLink(flexible.LinkUrl, mapping)`. Bỏ qua nếu thiếu CTA/link.
- `images`: từ asset `AssetType=IMAGE` → dùng `BuildImageAsset(imageRef)` (ra `{hash}` hoặc `{url}`).
- `videos`: từ asset `AssetType=VIDEO` → `{ "video_id": <id>, "image_hash": <hash> }`.
  ⚠️ Trong **asset groups**, thumbnail video dùng key **`image_hash`/`image_url`** (KHÁC
  asset_feed_spec dùng `thumbnail_hash`). Giữ validate "video phải có thumbnail" (ném lỗi nếu thiếu).
- Chỉ thêm `images`/`videos` vào group khi danh sách không rỗng.

### 3) Validation tối thiểu (giữ tinh thần cũ)
- ≥1 image hoặc video, ≥1 text (primary). Thiếu → `InvalidOperationException` message rõ ràng.

### 4) Dọn dead code
- Xóa `BuildFlexibleAssetFeedSpecAsync`, `ResolveFlexibleAdFormats`, `ApplyDegreesOfFreedomSpec`
  nếu không còn ai dùng sau khi đổi. `BuildPageOnlyObjectStorySpec` vẫn dùng (giữ).

## Test
File: `backend/MediationPro.Infrastructure.UnitTests/MetaAds/MetaCampaignExecutionServiceTests.cs`
- Các test flexible hiện assert `asset_feed_spec` (bodies/titles/...) → **viết lại** để assert:
  - `payload["creative_asset_groups_spec"]` tồn tại; `groups[0]["texts"]` chứa đúng các
    `{text, text_type}` (primary_text + headline); `groups[0]["images"]` hoặc `["videos"]` đúng;
    với video, thumbnail nằm ở key `image_hash`.
  - `creative["object_story_spec"]` chỉ có `page_id` (+ optional instagram), KHÔNG có link_data/video_data.
  - `creative` KHÔNG còn `asset_feed_spec`; payload KHÔNG còn `degrees_of_freedom_spec`.
- Giữ test "video thiếu thumbnail → ném lỗi". Thêm test "nhiều PrimaryTexts → dedupe + cap 5".

## VERIFY THỰC TẾ (bắt buộc — đây là lỗi render + lỗi ràng buộc ad set của Meta)
1. Build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. Test:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
3. **E2E tạo ad thật dưới ad set THƯỜNG hiện có** (quan trọng nhất — đây là cái lần trước fail):
   - Tạo 1 ad flexible mới với ≥1 primary text + ≥1 headline.
   - PHẢI KHÔNG còn lỗi `error_subcode 1885998` (dynamic creative ad set).
   - Mở `/meta-ads/campaigns/{id}` → Preview iframe → xác nhận render **CÓ Primary text + Headline**.
   - Token Meta lưu MÃ HÓA trong `meta_integrations.access_token_encrypted` (id=1) — không giải mã
     qua SQL; nhờ người chạy task cấp token. Graph `v24.0`. Ad account test `act_1679090066790569`.
   - NẾU vẫn không render text dù đã page-only + asset groups: KHÔNG tự ý đổi sang đổi ad set
     dynamic. Dừng lại, báo cáo lại payload đã gửi + response, để con người quyết định.

## Phạm vi & ràng buộc
- Chỉ sửa luồng TẠO ad flexible (`MetaCampaignExecutionService` + test). KHÔNG đụng sync, preview,
  hay creative loại khác. KHÔNG đổi luồng tạo ad set (không bật is_dynamic_creative).
- Convention C#: PascalCase public, `_camelCase` private; key JSON snake_case; dùng
  `MetaValueNormalizer.JsonOptions`.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass; ad flexible tạo dưới ad set thường KHÔNG còn lỗi 1885998; payload dùng
`creative_asset_groups_spec` + `object_story_spec` page-only (không asset_feed_spec, không
degrees_of_freedom_spec); preview iframe render đầy đủ Primary text + Headline; test đã viết lại xanh.
