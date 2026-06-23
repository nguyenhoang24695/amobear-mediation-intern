# Prompt: Thêm Deferred Deep Link URL Cho Meta Campaign Request

## Summary
- Bổ sung field **Deferred Deep Link URL** cho luồng tạo/sửa/duplicate/execute Meta campaign request.
- Field mới dùng tên rõ nghĩa: `deferredDeepLinkUrl` / `DeferredDeepLinkUrl`.
- Thay thế UI nhập `deepLinkUrlOverride` trong Meta App Mapping bằng wording/field mới ở **Meta request Destination**, không dùng nó như Store URL fallback nữa.
- **Tạm thời không drop DB column** `deep_link_url` / `deep_link_url_override`; giữ để backward compatibility và migration sau.

## Business Context
- Trong Meta Ads Manager, phần Destination của App campaign có option:
  - `Deferred deep link - Optional`
  - URL này đưa user tới store nếu chưa cài app, và sau khi cài/mở app có thể route user tới màn cụ thể.
- Deferred deep link khác với Store URL:
  - `object_store_url`: Google Play/App Store URL dùng cho `promoted_object`.
  - `link` / `call_to_action.value.link`: creative click URL hiện tại.
  - `deferredDeepLinkUrl`: optional app/deferred deep link, ví dụ Android App Link, custom URL scheme, Facebook App Link.
- Dự án hiện có `deepLinkUrlOverride` ở mapping nhưng đang bị dùng như fallback Store URL. Đây là nghiệp vụ sai/khó hiểu.

## Goals
- Có field `deferredDeepLinkUrl` riêng trong request payload/draft để người dùng nhập khi tạo Meta app campaign.
- UI hiển thị field này ở khu vực chọn app/destination của Meta request, giống ý nghĩa “Deferred deep link - Optional”.
- Store URL validation/payload không còn fallback sang `deepLinkUrlOverride`.
- Giữ legacy `deepLinkUrlOverride` trong DTO/entity/DB tạm thời nhưng không còn là primary UI cho request mới.

## Non-Goals
- Không drop DB column `deep_link_url` hoặc `deep_link_url_override` trong phase này.
- Không migrate dữ liệu production ngay trong scope này.
- Không sửa TikTok.
- Không bắt buộc validate app có Facebook SDK/deep link configured, vì không đủ dữ liệu nội bộ để kiểm chứng.
- Không thay đổi store identity/common mapping schema ngoài việc ngừng dùng deep link như Store URL fallback.

## Key Changes

### 1. Backend DTO / Request Contract
- Thêm field nullable vào Meta request DTO phù hợp với cấu trúc hiện tại, ưu tiên ở cấp `MetaAdSetDraftDto` hoặc destination/app section:
  - `public string? DeferredDeepLinkUrl { get; set; }`
- Nếu frontend/backend đang lưu request draft trong JSON payload, đảm bảo serialize/deserialize field mới.
- Khi duplicate/edit request, giữ lại `DeferredDeepLinkUrl` nếu có.
- Không dùng `DeepLinkUrlOverride` để populate field mới trừ khi cần compatibility rõ ràng và có comment/tên helper legacy.

### 2. Store URL Fallback Cleanup
- Tìm và sửa toàn bộ logic dùng URL mapping theo thứ tự:
  - hiện tại thường là `objectStoreUrl || storeUrlOverride || deepLinkUrlOverride`
- Đổi thành thứ tự đúng cho Store URL:
  - `objectStoreUrl || storeUrlOverride || downloadUrl`
  - hoặc source tương đương từ `PaidMediaAppBinding.DownloadUrl/StoreUrlOverride`.
- Không dùng `deepLinkUrlOverride` / `DeepLinkUrl` làm `object_store_url`.
- Validation lỗi “application_id + store URL” chỉ pass khi có store URL thật.

### 3. Meta Execution Payload
- Xác định chính xác vị trí payload Meta Marketing API cho deferred deep link đang dùng trong project version hiện tại.
- Với creative single image/single video/carousel/flexible, nếu `DeferredDeepLinkUrl` có giá trị:
  - đưa vào `object_story_spec.*_data.call_to_action.value` theo field Meta hỗ trợ cho app/deferred deep link, nếu API yêu cầu đặt ở CTA value.
  - hoặc field payload tương ứng khác nếu docs/API version của dự án yêu cầu.
- Không thay thế `link` store URL hiện tại nếu Meta vẫn cần `link` cho creative destination.
- Không đưa deferred deep link vào `promoted_object.object_store_url`.
- Nếu field không có, payload giữ nguyên behavior hiện tại.

> Lưu ý cho agent implement: cần kiểm chứng với Meta Marketing API docs/version hiện dùng trong project trước khi chốt key payload. Tránh đoán field name. Nếu không chắc, thêm helper/prompt TODO và không làm hỏng execute hiện tại.

### 4. Frontend Form State / Types
- Thêm vào TypeScript types/form state:
  - `deferredDeepLinkUrl?: string | null`
- Init default là empty string/null.
- Khi chọn app mapping, không tự fill deferred deep link từ `deepLinkUrlOverride` trừ khi có quyết định legacy migration rõ ràng.
- Submit payload gửi `deferredDeepLinkUrl` đã trim hoặc `null`.
- Duplicate/edit request load lại field này.

### 5. Frontend UI
- Trong Meta create request app/destination section, thêm input:
  - Label: `Deferred deep link`
  - Optional badge/text: `Optional`
  - Placeholder: `Enter the deferred deep link URL`
  - Help text: `Use Android App Link, custom URL scheme, or Facebook App Link. Requires app deep linking setup.`
- Vị trí đề xuất:
  - dưới Promoted Object / Store URL block trong `section-account-app.tsx`, hoặc nơi hiện đang quản lý destination app.
- Không hiển thị/không ưu tiên field `deepLinkUrlOverride` trong App Mapping UI như một URL cần nhập cho request mới.
- Nếu vẫn còn App Mapping screen có input `deepLinkUrlOverride`, đổi wording sang `Legacy deep link override` hoặc ẩn khỏi form create/edit để tránh user hiểu nhầm.

### 6. Detail / Summary UI
- Request detail hiển thị `Deferred deep link` nếu có.
- Campaign detail hiển thị field này nếu campaign/request config có lưu.
- Summary rail trong create request hiển thị trạng thái ngắn:
  - `Deferred deep link: Set`
  - hoặc không hiển thị nếu empty.

### 7. Validation
- Field optional, không block request nếu rỗng.
- Nếu có giá trị:
  - trim whitespace.
  - validate độ dài hợp lý, ví dụ <= 2048.
  - validate có scheme hoặc là URL/app link hợp lệ ở mức cơ bản:
    - `https://...`
    - `http://...` nếu project đang cho phép store URL http hiện tại.
    - custom scheme như `myapp://...`.
  - Không ép phải là Play Store/App Store URL.
- Nếu invalid, trả lỗi rõ:
  - `Deferred deep link URL must be a valid URL or custom URL scheme.`

### 8. Backward Compatibility
- Không xóa các field hiện có:
  - `DeepLinkUrlOverride` trong legacy `MetaAppMapping`.
  - `deep_link_url` trong `paid_media_app_bindings` nếu đang có.
- Không tạo migration drop column.
- Nếu cần đọc legacy data để hiển thị, chỉ đọc ở màn legacy mapping với label rõ `Legacy`.
- Luồng request mới dùng `DeferredDeepLinkUrl` riêng, không phụ thuộc legacy mapping field.

## Suggested Files To Inspect / Update
- Backend DTO:
  - `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
  - `backend/MediationPro.Core/DTOs/MetaAds/MetaReferenceDtos.cs`
- Backend execution/validation:
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs`
- Frontend types/form/UI:
  - `frontend/types/meta-ads.ts`
  - `frontend/components/meta-ads/create-request/create-request-content.tsx`
  - `frontend/components/meta-ads/create-request/section-account-app.tsx`
  - `frontend/components/meta-ads/create-request/summary-rail.tsx`
  - `frontend/components/meta-ads/requests/request-detail-content.tsx`
  - Campaign detail component(s) under `frontend/components/meta-ads/campaigns` if present.
- Legacy mapping UI cleanup:
  - `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`

## Acceptance Criteria
- User can enter `Deferred deep link` when creating/editing Meta request.
- Request save/edit/duplicate preserves `deferredDeepLinkUrl`.
- Store URL validation no longer passes just because `deepLinkUrlOverride` has a value.
- Execute payload includes deferred deep link only when provided and does not put it into `promoted_object.object_store_url`.
- Existing requests without deferred deep link continue to execute exactly as before.
- Meta App Mapping screen no longer presents `deepLinkUrlOverride` as if it were a required Store URL for new workflow.

## Test Plan
- Backend:
  - `dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1`
  - Unit/manual validation with empty, `https://...`, `myapp://...`, invalid string.
- Frontend:
  - Create Meta request with empty deferred deep link: submit should work.
  - Create Meta request with `https://example.com/path`: submit should preserve field.
  - Create Meta request with custom scheme `myapp://product/123`: submit should preserve field.
  - Edit/duplicate request: field remains populated.
  - Mapping missing Store URL but having legacy deep link should still show missing Store URL warning.
- Execution smoke:
  - Inspect outgoing creative/ad payload and confirm deferred deep link is in the correct Meta-supported field.
  - Confirm `promoted_object.object_store_url` remains a real store URL.

## Implementation Notes
- Be careful with terminology:
  - `Store URL` = app store destination.
  - `Deferred deep link` = optional app/deferred route URL.
  - `DeepLinkUrlOverride` = legacy mapping field; do not use for new request flow.
- Prefer small helpers:
  - `ResolveStoreUrl(...)`
  - `NormalizeDeferredDeepLinkUrl(...)`
  - `ApplyDeferredDeepLink(...)`
- If Meta API rejects the guessed deferred deep link key, keep the DTO/UI change but gate execution behind a verified helper or feature flag rather than breaking campaign execution.
