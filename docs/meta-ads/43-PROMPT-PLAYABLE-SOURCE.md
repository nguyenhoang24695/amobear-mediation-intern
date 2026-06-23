# Prompt 43 — Thêm creative type "Playable" (Playable Source) cho Meta Campaign Request

> **Vai trò người thực thi:** Bạn là agent độc lập implement tính năng này từ đầu tới cuối trong repo `Amobear.Mediation.Tools`. Prompt này self-contained — đọc kỹ, không cần hỏi lại. Trả lời + comment code bằng tiếng Việt. **Chỉ commit khi được yêu cầu**, footer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## 0. Mục tiêu

Cho phép người dùng tạo **Playable Ad** (quảng cáo tương tác HTML5) trong màn tạo Meta campaign request — thêm một creative type mới `PLAYABLE` bên cạnh `SINGLE_IMAGE / SINGLE_VIDEO / CAROUSEL_IMAGE / EXISTING_POST / FLEXIBLE`. Playable gồm: **1 file HTML5 playable** (Playable Source) + **1 lead-in video** + thumbnail + CTA install.

## 1. HỢP ĐỒNG API META (ĐÃ VERIFY END-TO-END BẰNG SPIKE THẬT — DÙNG LÀM NGUỒN CHÂN LÝ)

Graph API version dự án: **`v24.0`** (`MetaAds:ApiVersion`). Luồng đã chạy thật và tạo được ad sống:

**Bước 1 — Upload playable** → trả về `playable_asset_id`:
```
POST /v24.0/act_{ACCOUNT}/adplayables   (multipart/form-data)
  name   = <tên>
  source = <FILE index.html, MIME text/html>     ← BẮT BUỘC 1 file HTML self-contained, KHÔNG phải zip
→ { "id": "<PLAYABLE_ASSET_ID>" }
```
- ⚠️ Endpoint **từ chối zip** với lỗi `(#100) Invalid file. Expected file of one of the following types: text/html`. File phải là **một `index.html` tự chứa** (JS/CSS/ảnh nhúng inline base64, **cấm request ra ngoài**). Giới hạn nội bộ ứng dụng: **≤ 10MB** (lưu ý Meta khuyến nghị `index.html` < 2MB — file lớn hơn có thể bị Meta từ chối ở bước upload).
- Khi upload phải ép content-type `text/html` (nếu gửi `application/octet-stream` sẽ bị từ chối).

**Bước 2 — Upload lead-in video** → `video_id` (đã có sẵn pipeline `/advideos` trong dự án).

**Bước 3 — Tạo creative** (`playable_asset_id` nằm **TOP-LEVEL**, KHÔNG nằm trong `video_data`):
```jsonc
POST /v24.0/act_{ACCOUNT}/adcreatives
{
  "name": "...",
  "playable_asset_id": "<PLAYABLE_ASSET_ID>",        // ← TOP-LEVEL, ngang hàng object_story_spec
  "object_story_spec": {
    "page_id": "<PAGE_ID>",
    "video_data": {
      "video_id": "<LEAD_IN_VIDEO_ID>",
      "image_hash": "<THUMBNAIL_HASH>",              // hoặc image_url
      "call_to_action": {
        "type": "INSTALL_MOBILE_APP",
        "value": {
          "application": "<META_APP_ID>",            // FB App ID của app (MetaApplicationId trong app mapping)
          "link": "<STORE_URL>"
        }
      }
    }
  }
}
→ { "id": "<CREATIVE_ID>" }
```
- Lỗi đã gặp & cách đúng: đặt `playable_id` trong `video_data` → lỗi `error_subcode 1443050 "The field playable_id is not supported in the field video_data"`. **Đúng** = `playable_asset_id` top-level.
- CTA bắt buộc `INSTALL_MOBILE_APP` (objective app-install). `LEARN_MORE` không hợp lệ cho playable.
- ⚠️ `degrees_of_freedom_spec.creative_features_spec.advantage_plus_creative = OPT_IN` **có thể xung đột** định dạng playable (Advantage+ tự biến đổi creative). Mặc định **KHÔNG** auto opt-in `advantage_plus_creative` cho playable; các enhancement khác giữ như creative thường.

**Bước 4 — Tạo ad** (đã có sẵn): `POST /act_{ACCOUNT}/ads` với `adset_id` + `creative.creative_id`.

## 2. SCOPE — chia 7 phần

### Phần A — Cho phép lưu asset kind `playable` (HTML5)

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaRequestAssetService.cs`
- `NormalizeKind` (~dòng 179): thêm nhánh `"playable" => "playable"`.
- `ValidateContentType` (~dòng 190): thêm nhánh `kind == "playable"`: chấp nhận content-type `text/html` **hoặc** extension `.html`/`.htm`; ngược lại throw `"Playable asset must be a self-contained HTML file."`.
- Thêm guard size cho playable: nếu `sizeBytes > 10MB` → throw (`"Playable HTML must be ≤ 10MB."`). Lấy `sizeBytes` ở `UploadAsync`.
- `ListAsync`/group counts (~dòng 102-139): cho phép filter `kind == "playable"` và đếm `PlayableCount` nếu DTO summary có (tùy, additive).

> Ghi chú: scope này **không** tự inline JS/ảnh vào HTML — người dùng upload sẵn `index.html` self-contained. (Inlining là out-of-scope.)

### Phần B — Upload playable lên Meta (asset preparation)

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAssetPreparationService.cs`
- Entity `MetaUploadedAsset`: thêm cột mới `string? MetaPlayableAssetId`. Map trong `ApplicationDbContext` (cạnh `meta_video_id`/`meta_image_hash` của bảng `meta_uploaded_assets`), cột `meta_playable_asset_id VARCHAR NULL`. **Tạo migration** `AddMetaPlayableAssetIdToMetaUploadedAssets` (project Infrastructure, startup Api; commit cả `.cs` + `.Designer.cs`).
- `ProcessOneAsync` (~dòng 113): thêm nhánh `else if (kind == "playable")` → `row.MetaPlayableAssetId = await UploadPlayableAsync(...)`.
- Thêm `UploadPlayableAsync` (clone `UploadVideoAsync` ~dòng 309 nhưng): `resourcePath = $"{accountPath}/adplayables"`, `request.AddFile("source", bytes, asset.FileName, "text/html")` (ép MIME `text/html` bất kể `asset.ContentType`), parse `id` từ response. Throw rõ ràng nếu fail.
- Thêm accessor `GetReadyPlayableAssetIdAsync(orgId, metaAdAccountId, requestAssetId, ct)` (clone `GetReadyVideoIdAsync` ~dòng 150) đọc `MetaPlayableAssetId`. Khai báo trong interface `IMetaAssetPreparationService`.
- `ExtractUploadedAssets` (~dòng 243): thêm `case "PLAYABLE"` queue 3 slot: playable (kind `"playable"`), lead-in video (kind `"video"`), thumbnail (kind `"image"`).
- `BuildDtos`/`MetaAssetPreparationDto`: thêm field `MetaPlayableAssetId` (additive) để FE thấy trạng thái ready.

### Phần C — DTO creative Playable

File: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
- Thêm class:
```csharp
public class MetaPlayableCreativeDraftDto
{
    public string? Message { get; set; }
    public List<string> Messages { get; set; } = new();
    public string? Headline { get; set; }
    public List<string> Headlines { get; set; } = new();
    public string? CallToActionType { get; set; } = "INSTALL_MOBILE_APP";
    public string? LinkUrl { get; set; }
    public MetaCreativeMediaSourceDto? PlayableSource { get; set; } = new(); // file index.html
    public MetaCreativeMediaSourceDto? LeadInVideo { get; set; } = new();    // lead-in video
    public MetaCreativeMediaSourceDto? Thumbnail { get; set; }               // thumbnail (tùy)
}
```
- `MetaCreativeDraftDto` (~dòng 179): thêm `public MetaPlayableCreativeDraftDto? Playable { get; set; }`.

### Phần D — Builder creative `PLAYABLE`

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
- `BuildCreativePayloadAsync` switch (~dòng 1608): thêm `"PLAYABLE" => await BuildPlayableCreativePayloadAsync(...)`.
- Thêm `BuildPlayableCreativePayloadAsync` (mô phỏng `BuildSingleVideoCreativePayloadAsync` ~dòng 1645):
  1. `link = ResolveLink(playable.LinkUrl, mapping, customStoreListingId)`.
  2. `videoId = await ResolveVideoIdAsync(... playable.LeadInVideo ...)`.
  3. Nếu có thumbnail → `ResolveImageReferenceAsync` + `ApplyImageReference(videoData, ref, "image_url")`.
  4. `playableAssetId = await ResolvePlayableAssetIdAsync(... playable.PlayableSource ...)` — thêm helper mới song song `ResolveVideoIdAsync` (~dòng 1908) gọi `GetReadyPlayableAssetIdAsync`.
  5. Build `videoData` (video_id + thumbnail) rồi `ApplyAppInstallCallToAction(videoData, ctaType ?? "INSTALL_MOBILE_APP", link, deferredDeepLinkUrl, metaApplicationId)` — **helper CTA mới** (xem dưới).
  6. `objectStorySpec = BuildObjectStorySpec(creative, "video_data", videoData)`.
  7. `result = { ["name"]=GetCreativeName(creative), ["object_story_spec"]=objectStorySpec, ["playable_asset_id"]=playableAssetId }` ← `playable_asset_id` TOP-LEVEL.
  8. Gọi `ApplyDegreesOfFreedomSpec(result, creative)` **nhưng loại `advantage_plus_creative`** khi type playable (xem ghi chú §1). Đơn giản nhất: trong `ApplyDegreesOfFreedomSpec` bỏ qua key `advantage_plus_creative` nếu `creative.Type == "PLAYABLE"`, hoặc không gọi spec cho playable.
- **Helper CTA mới** `ApplyAppInstallCallToAction`: giống `ApplyCallToAction` (~dòng 2265) nhưng `value` thêm `["application"] = metaApplicationId` (khi non-empty). `metaApplicationId` lấy từ binding/app mapping — dùng đúng property Meta App ID mà ad set `promoted_object.application_id` đang dùng (xác minh tên property trên `PaidMediaAppBinding` / `mapping`, ví dụ `mapping.ExternalAppId` hoặc qua app mapping `MetaApplicationId`). Nếu không resolve được app id → vẫn set `link` (giữ behavior cũ), nhưng log warning vì playable install thường cần `application`.

### Phần E — Validation

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`
- Trong `ValidateCreativeAsync`, nhánh `PLAYABLE`:
  - Objective phải `OUTCOME_APP_PROMOTION` (hoặc `APP_INSTALLS`); nếu khác → error `"Playable creative requires an app promotion objective."`.
  - Bắt buộc có `Playable.PlayableSource` (uploaded_asset) và `Playable.LeadInVideo`.
  - CTA mặc định/ hợp lệ: `INSTALL_MOBILE_APP` (có thể cho phép thêm `PLAY_GAME`). Nếu CTA khác → error.
  - (Tùy) cảnh báo nếu không resolve được Meta App ID cho CTA.

### Phần F — Frontend

- `frontend/types/meta-ads.ts`: thêm `"PLAYABLE"` vào union creative type; thêm interface `MetaPlayableCreativeDraft` (mirror DTO phần C); thêm field `metaPlayableAssetId?` vào asset-preparation DTO.
- `frontend/components/meta-ads/create-request/section-creative.tsx`: thêm lựa chọn type **"Playable"**; UI gồm:
  - Slot upload **Playable Source** (`.html`) — tái dùng cơ chế upload asset hiện có nhưng accept `text/html`; có thể cho chọn lại từ thư viện (kind playable) nếu prompt 42 đã có dialog library.
  - Slot **Lead-in video** — tái dùng picker/upload video + "From Library" như single video.
  - Thumbnail (tùy), Message/Headline, CTA mặc định `INSTALL_MOBILE_APP`.
- `frontend/lib/meta-ads/mappers.ts`: map `Playable` draft ↔ payload (cả chiều build & parse `payload_json`).
- Đảm bảo nút submit/validate FE không chặn type mới; preview playable: hiển thị tên file + (tùy) nút mở `index.html`.

### Phần G — Verification (bắt buộc trước khi báo xong)

1. `dotnet build backend/MediationPro.sln` (nếu API đang chạy khóa DLL → build ra `-p:BaseOutputPath=obj\check\`).
2. `dotnet test backend/MediationPro.sln -c Release` — kỳ vọng pass (thay đổi additive); cập nhật test creative builder nếu có snapshot.
3. `cd frontend && pnpm lint && pnpm test`.
4. Migration: `dotnet ef migrations add AddMetaPlayableAssetIdToMetaUploadedAssets --project ..\MediationPro.Infrastructure --startup-project .` rồi `database update`.
5. E2E thủ công đối chiếu §1 (luồng curl đã verify):
   - tạo request type Playable → execute → kiểm tra creative tạo ra có `playable_asset_id` (GET `/{CREATIVE_ID}?fields=name,playable_asset_id,object_story_spec,object_type`);
   - ad tạo được, preview chạy playable.

## 3. Ràng buộc & anti-pattern

- **Không** decrypt token bằng SQL; luôn qua `_authManager.GetAccessTokenAsync`.
- `playable_asset_id` **phải** top-level, **không** nhét vào `video_data` (đã verify lỗi 1443050).
- Upload playable **phải** ép MIME `text/html`, file đơn `index.html`, không zip.
- Không auto opt-in `advantage_plus_creative` cho playable.
- StarRocks DDL: không liên quan scope này.

## 4. File chính cần đụng

| Layer | File |
|---|---|
| Asset storage | `MetaRequestAssetService.cs` (NormalizeKind, ValidateContentType, size guard) |
| Asset → Meta | `MetaAssetPreparationService.cs` (UploadPlayableAsync, GetReadyPlayableAssetIdAsync, ExtractUploadedAssets), entity `MetaUploadedAsset`, `ApplicationDbContext`, migration |
| DTO | `MetaCampaignRequestDtos.cs` (MetaPlayableCreativeDraftDto + field) |
| Builder | `MetaCampaignExecutionService.cs` (BuildPlayableCreativePayloadAsync, ResolvePlayableAssetIdAsync, ApplyAppInstallCallToAction, switch) |
| Validation | `MetaCampaignValidationService.cs` |
| FE | `frontend/types/meta-ads.ts`, `section-creative.tsx`, `frontend/lib/meta-ads/mappers.ts` |
