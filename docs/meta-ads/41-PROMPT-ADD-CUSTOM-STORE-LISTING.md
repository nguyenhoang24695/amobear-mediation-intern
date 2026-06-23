# Prompt: Thêm Custom Store Listing Cho Meta Campaign Request

## Summary
- Bổ sung field **Custom Store Listing ID** cho luồng tạo/sửa/duplicate/execute Meta campaign request.
- Field mới dùng tên rõ nghĩa: `customStoreListingId` / `CustomStoreListingId`.
- Áp dụng chính cho Android/Google Play app campaigns.
- Không thay thế `object_store_url`; field này là modifier để route click tới Google Play custom store listing.

## Business Context
- Trong Meta Ads Manager, phần Destination của App campaign có option:
  - `Custom store listing`
  - Placeholder: `Enter custom store listing ID`
- Google Play Custom Store Listing cho phép tạo nhiều trang store tùy biến theo audience/country/campaign.
- URL Google Play custom listing thường có dạng:
  - `https://play.google.com/store/apps/details?id=<packageName>&listing=<customStoreListingId>`
- Custom store listing khác với:
  - `object_store_url`: URL store chính dùng trong `promoted_object`.
  - `storeUrlOverride`: full store URL override thủ công.
  - `deferredDeepLinkUrl`: optional deferred/app deep link route sau install/open.

## Goals
- User có thể nhập `Custom store listing ID` khi tạo/edit Meta request.
- Request save/edit/duplicate giữ lại `customStoreListingId`.
- Khi execute, store URL dùng cho Meta payload có thể được enrich bằng query `listing=<customStoreListingId>` nếu là Google Play URL.
- UI đặt field gần `Deferred deep link` trong Destination section để tương đồng Meta Ads Manager.

## Non-Goals
- Không sửa TikTok.
- Không quản lý danh mục custom store listing từ Google Play Console trong phase này.
- Không gọi Google Play Developer API để validate listing tồn tại.
- Không tạo DB table riêng cho custom listing.
- Không thay thế toàn bộ `storeUrlOverride`; nếu user đã nhập full custom listing URL ở `storeUrlOverride`, vẫn phải tránh append trùng `listing`.

## Key Changes

### 1. Backend DTO / Request Contract
- Thêm field nullable vào Meta request DTO phù hợp với cấu trúc hiện tại, ưu tiên ở cấp ad set destination/app draft:
  - `public string? CustomStoreListingId { get; set; }`
- Nếu request draft được lưu trong JSON payload, đảm bảo serialize/deserialize field mới.
- Khi duplicate/edit request, giữ lại `CustomStoreListingId` nếu có.
- Không cần DB migration riêng nếu campaign request payload đang lưu dạng JSON.

### 2. Frontend Form State / Types
- Thêm field vào TypeScript types/form state:
  - `customStoreListingId?: string | null`
- Init default là empty string/null.
- Submit payload gửi `customStoreListingId` đã trim hoặc `null`.
- Edit/duplicate request load lại field này.
- Summary rail hiển thị ngắn khi có giá trị:
  - `Custom store listing: <id>`

### 3. Frontend UI
- Trong Meta create request app/destination section, thêm input:
  - Label: `Custom store listing`
  - Optional badge/text: `Optional`
  - Placeholder: `Enter custom store listing ID`
  - Help text: `For Google Play custom store listings. The ID is appended to the Play Store URL as listing=...`.
- Vị trí đề xuất:
  - dưới `Deferred deep link` trong `section-account-app.tsx`.
- Chỉ enable field khi selected app mapping/platform là Android hoặc URL là Google Play.
- Nếu selected app là iOS hoặc platform không xác định:
  - Có thể disable field với hint `Custom store listing is only supported for Google Play apps.`
  - Hoặc cho nhập nhưng backend sẽ warning/ignore nếu không phải Google Play. Ưu tiên disable để rõ UX.

### 4. Backend Store URL Builder
- Tạo helper nhỏ để build URL cuối cho Meta payload, ví dụ:
  - `BuildStoreUrlWithCustomListing(string storeUrl, string? customStoreListingId)`
- Behavior:
  - Nếu `customStoreListingId` rỗng: trả về `storeUrl` gốc.
  - Nếu `storeUrl` không phải Google Play URL: trả về `storeUrl` gốc hoặc validation error tùy flow.
  - Nếu `storeUrl` đã có query `listing=...`: replace bằng giá trị mới hoặc giữ nguyên nếu giống nhau. Ưu tiên replace để request field là source of truth.
  - Preserve các query params có sẵn như `id`, `hl`, `gl`, `referrer`.
  - Encode value bằng URL encoding.
- Áp dụng helper ở mọi nơi Meta payload cần store click URL:
  - `promoted_object.object_store_url` nếu Meta chấp nhận URL có `listing` param.
  - creative `link`.
  - `call_to_action.value.link`.
- Không đưa `customStoreListingId` vào payload như một arbitrary unknown field nếu chưa xác minh API hỗ trợ field riêng.

> Lưu ý cho agent implement: cần kiểm chứng với Meta Marketing API version đang dùng xem Ads Manager gửi custom listing bằng field riêng hay bằng Google Play URL query `listing`. Nếu chưa xác minh được, MVP an toàn là enrich Google Play URL bằng `listing` param và không thêm field lạ vào API payload.

### 5. Validation
- Field optional, không block request nếu rỗng.
- Nếu có giá trị:
  - trim whitespace.
  - validate độ dài hợp lý, ví dụ <= 100 hoặc <= 128.
  - validate ký tự an toàn cho Google Play listing id:
    - cho phép `[A-Za-z0-9._~-]`.
    - không cho space, `?`, `&`, `=`, `/`.
  - nếu selected platform không phải Android/Google Play, trả warning hoặc validation error rõ ràng:
    - `Custom store listing is only supported for Google Play app campaigns.`
- Nếu store URL không phải Google Play URL nhưng có `customStoreListingId`, nên báo lỗi trước execute để tránh user tưởng đã áp dụng.

### 6. Request / Campaign Detail UI
- Request detail hiển thị `Custom store listing` nếu có.
- Campaign detail hiển thị custom listing ID nếu campaign/request config có lưu.
- Nếu có thể, hiển thị generated Play Store URL preview:
  - `Store URL with listing`
- Không hiển thị nếu empty.

### 7. Compatibility With Store URL Override
- Nếu `storeUrlOverride` đã chứa `listing=...` và `customStoreListingId` rỗng:
  - giữ nguyên URL override.
- Nếu cả `storeUrlOverride` chứa `listing=old` và `customStoreListingId=new`:
  - helper nên replace thành `listing=new`.
  - UI nên có hint `Custom store listing ID overrides listing parameter in Store URL override.`
- Không dùng `customStoreListingId` để thay package/store identity mapping.

## Suggested Files To Inspect / Update
- Backend DTO:
  - `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
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

## Acceptance Criteria
- User can enter `Custom store listing ID` in Meta request Destination for Android/Google Play app.
- Request save/edit/duplicate preserves `customStoreListingId`.
- If selected app is not Android/Google Play, UI disables or validation blocks the field with clear message.
- Execute payload uses a Google Play URL with `listing=<customStoreListingId>` when provided.
- Existing requests without custom listing continue to execute exactly as before.
- `storeUrlOverride` with existing `listing` remains compatible and does not produce duplicate listing params.

## Test Plan
- Backend:
  - `dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1`
  - Unit/manual tests for helper:
    - no listing id returns original URL.
    - append listing to `https://play.google.com/store/apps/details?id=com.example.app`.
    - preserve `hl`, `gl`, `referrer` params.
    - replace existing `listing=old` with `listing=new`.
    - reject invalid listing id with spaces/query chars.
    - reject non-Google Play URL when listing id is set.
- Frontend:
  - Android app mapping: field enabled, submit preserves value.
  - iOS app mapping: field disabled or validation blocks with clear message.
  - Edit/duplicate request: field remains populated.
  - Summary/request detail display custom listing ID.
- Execution smoke:
  - Inspect outgoing Meta payload and confirm store URL/CTA link contains exactly one `listing=<id>` param.
  - Confirm no unknown arbitrary `custom_store_listing_id` field is sent unless API docs/version explicitly supports it.

## Implementation Notes
- Keep terminology consistent:
  - `Custom store listing ID` = identifier only.
  - `Store URL with listing` = generated/enriched URL.
- Prefer not to store generated URL in request payload; generate at execute/preview time from base Store URL + ID.
- If Meta API has a verified first-class field for custom listing in the project API version, document the field in code comments/tests and use it consistently. Otherwise use the Google Play `listing` query param strategy.
