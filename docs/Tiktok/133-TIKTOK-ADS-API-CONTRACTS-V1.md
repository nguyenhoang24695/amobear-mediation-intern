# TikTok Ads API Contracts V1

## 1. Mục tiêu
Tài liệu này mô tả API contract của backend Nexus cho module TikTok Ads V1, bao gồm endpoints, DTOs, validation rules, và error model. Tương ứng với Meta Ads Doc 22.

## 2. Quy tắc chung
- Base path dùng prefix `api/v1`.
- Auth dùng platform JWT.
- Tất cả endpoints thuộc phạm vi organization từ user claims.
- Secrets không bao giờ trả plaintext.
- TikTok integration xoay quanh OAuth access token (không hết hạn cứng, nhưng revoke-able).

## 3. Auth model
`authMode` canonical:
- `oauth` — OAuth 2.0 authorization code flow (mặc định, production-safe).

> **Khác Meta:** Meta dùng `system_user_token` cho production. TikTok chỉ có OAuth flow, không có System User concept. Access token trả về khi OAuth **không hết hạn cứng** nhưng bị revoke khi advertiser thu hồi quyền.

Token scopes cần thiết (Phase 1):
- `3` — Campaign Management (Read)
- `4` — Ad Account Management
- `7` — Reporting
- `19` — Business Center

Token statuses:
- `NOT_TESTED`
- `VALID`
- `REVOKED`
- `INVALID`
- `MISSING_SCOPES`

## 4. Controllers

### 4.1 `TikTokAuthController`
Base route: `api/v1/tiktok-auth`

Endpoints:
- `GET /integrations/{integrationId}/authorize-url`
  - Query: `redirectUri`, optional `state`
  - Response: `TikTokAuthorizeUrlResponseDto`
  - Purpose: tạo URL redirect đến TikTok OAuth consent screen
- `POST /integrations/{integrationId}/callback`
  - Body: `TikTokOAuthCallbackRequestDto`
  - Response: `TikTokTokenStatusDto`
  - Purpose: exchange auth_code → access_token, lưu token + advertiser_ids
- `POST /integrations/test`
  - Body: `TikTokIntegrationTestRequestDto`
  - Response: `TikTokIntegrationTestResultDto`
  - Purpose: test draft credentials chưa save
- `POST /integrations/{integrationId}/test`
  - No body
  - Response: `TikTokIntegrationTestResultDto`
  - Purpose: test integration đã save, cập nhật token health
- `GET /integrations/{integrationId}/token-status`
  - Response: `TikTokTokenStatusDto`

Permissions:
- `s-tiktok-accounts:view` cho token status read-only
- `s-tiktok-accounts:edit` cho authorize URL, callback, test

Connection test behavior:
- Validate access token tồn tại
- Gọi `GET /advertiser/info/` (R1) kiểm tra token hợp lệ
- Verify scopes đủ
- Verify advertiser access
- Normalize TikTok errors thành `INVALID_TOKEN`, `TOKEN_REVOKED`, `MISSING_SCOPE`, `ACCESS_DENIED`, `UNKNOWN_ERROR`

### 4.2 `TikTokAccountsController`
Base route: `api/v1/tiktok-accounts`

#### Integration endpoints
- `GET /integrations` → `List<TikTokIntegrationDto>`
- `POST /integrations` → `TikTokIntegrationDto`
  - Body: `CreateTikTokIntegrationRequestDto`
- `PUT /integrations/{id}` → `TikTokIntegrationDto`
  - Body: `UpdateTikTokIntegrationRequestDto`
- `POST /integrations/{id}/enable`
- `POST /integrations/{id}/disable`
- `POST /integrations/{id}/sync-ad-accounts` → `List<TikTokAdAccountDto>`

Integration validation rules:
- `displayName` bắt buộc
- `tiktokAppId` bắt buộc
- `appSecret` bắt buộc
- `accessToken` bắt buộc
- `scopes` phải bao gồm `3, 4, 7`

#### Ad account endpoints
- `GET /ad-accounts` → `List<TikTokAdAccountDto>`
- `POST /ad-accounts` → `TikTokAdAccountDto`
  - Body: `UpsertTikTokAdAccountRequestDto`
- `PUT /ad-accounts/{id}` → `TikTokAdAccountDto`
- `POST /ad-accounts/{id}/enable`
- `POST /ad-accounts/{id}/disable`

#### App mapping endpoints
- `GET /app-mappings` → `List<TikTokAppMappingDto>`
- `POST /app-mappings` → `TikTokAppMappingDto`
  - Body: `CreateTikTokAppMappingRequestDto`
- `PUT /app-mappings/{id}` → `TikTokAppMappingDto`
  - Body: `UpdateTikTokAppMappingRequestDto`
- `POST /app-mappings/{id}/enable`
- `POST /app-mappings/{id}/disable`

Permissions:
- `s-tiktok-accounts:view|create|edit|disable-enable`
- App mapping write cần thêm app-level edit permission

### 4.3 `TikTokReferenceController`
Base route: `api/v1/tiktok-reference`

Endpoints:
- `GET /create-campaign`
  - Response:
    - `adAccounts: List<TikTokAdAccountDto>`
    - `appMappings: List<TikTokAppMappingDto>`
    - `objectives: List<TikTokObjectivePresetDto>`
    - `placementTypes: List<TikTokPlacementPresetDto>`
    - `bidTypes: List<TikTokBidTypePresetDto>`
    - `optimizationGoals: List<TikTokOptimizationGoalPresetDto>`

Permissions: `s-tiktok-requests:view`

> **Khác Meta:** TikTok thêm `placementTypes` và `optimizationGoals` trong reference data (Meta placement nằm trong targeting, TikTok là field riêng).

### 4.4 `TikTokCampaignRequestsController`
Base route: `api/v1/tiktok-campaign-requests`

Endpoints:
- `GET /` → `List<TikTokCampaignRequestListItemDto>`
- `GET /{id}` → `TikTokCampaignRequestDetailDto`
- `POST /` → `TikTokCampaignRequestDetailDto`
  - Body: `CreateTikTokCampaignRequestDto`
- `PUT /{id}` → `TikTokCampaignRequestDetailDto`
  - Body: `UpdateTikTokCampaignRequestDto`
- `POST /{id}/validate` → `TikTokValidationResultDto`
- `POST /{id}/submit`
- `POST /{id}/approve`
  - Body: `ApproveTikTokCampaignRequestDto`
- `POST /{id}/reject`
  - Body: `RejectTikTokCampaignRequestDto`
- `POST /{id}/execute`
  - Body: `ExecuteTikTokCampaignRequestDto`
- `POST /{id}/retry`
  - Body: `ExecuteTikTokCampaignRequestDto`

Permissions:
- `s-tiktok-requests:view` cho list, detail, validate
- `s-tiktok-requests:create` cho create, update, submit
- `s-tiktok-requests:approve` cho approve, reject
- `s-tiktok-requests:execute` cho execute
- `s-tiktok-requests:retry` cho retry

## 5. DTOs chính

### `TikTokIntegrationDto`
Fields:
- `id`, `displayName`
- `tiktokAppId`
- `hasAppSecret`, `appSecretHint`
- `hasAccessToken`, `accessTokenHint`
- `tokenStatus`, `lastCheckedAt`, `lastCheckMessage`
- `scopes`, `authorizedAdvertiserIds`
- `isSandbox`, `isDefault`, `isEnabled`
- `createdAt`, `updatedAt`

### `CreateTikTokIntegrationRequestDto`
Fields:
- `displayName`, `tiktokAppId`
- `appSecret`, `accessToken`
- `scopes`, `isSandbox`
- `isDefault`, `isEnabled`

### `UpdateTikTokIntegrationRequestDto`
Thêm: `clearAppSecret`, `clearAccessToken`

### `TikTokTokenStatusDto`
Fields:
- `integrationId`, `hasAccessToken`
- `tokenStatus`, `lastCheckedAt`, `lastCheckMessage`
- `scopes`, `authorizedAdvertiserIds`

### `TikTokIntegrationTestResultDto`
Fields:
- `integrationId`, `success`
- `resultCode`, `tokenStatus`
- `checkedAt`, `message`
- `scopes`, `authorizedAdvertiserIds`

### `TikTokAdAccountDto`
Fields:
- `id`, `advertiserId`, `name`
- `currency`, `timezone`, `timezoneOffsetMinutes`
- `bcId`, `bcName`
- `balance`, `status`, `isActive`
- `lastSyncedAt`

### `TikTokAppMappingDto`
Fields:
- `id`, `appRowId`, `appName`, `appPlatform`
- `tiktokAppId`, `downloadUrl`
- `packageNameOverride`, `bundleIdOverride`
- `storeUrlOverride`, `deepLinkUrlOverride`
- `isActive`

### `CreateTikTokCampaignRequestDto`
Fields:
- `tiktokAdAccountRowId`, `appRowId`
- `campaign`: `{ campaignName, objectiveType, budget, budgetMode }`
- `adgroup`: `{ adgroupName, placementType, placements[], budget, budgetMode, scheduleType, startTime, endTime, optimizationGoal, bidType, bid, billingEvent, appId, appDownloadUrl, operatingSystems[], locationIds[], ageGroups[], gender, languages[] }`
- `ad`: (xem bên dưới)
- `idempotencyKey`

#### Ad media resolution model

Ad DTO hỗ trợ **2 mode** cho media:

| Mode | Field | Ý nghĩa | Khi nào dùng |
|---|---|---|---|
| Existing TikTok media | `videoId`, `imageIds[]` | ID media đã tồn tại trên TikTok | User đã upload trước qua TikTok Ads Manager |
| Local asset | `videoAssetId`, `imageAssetIds[]` | ID asset trong Mediation Pro storage | User upload file vào Mediation Pro, backend upload lên TikTok khi execute |

```
ad: {
  adName,
  adFormat,           // SINGLE_VIDEO | SINGLE_IMAGE | CAROUSEL

  // Mode 1: Existing TikTok media (đã có trên TikTok)
  videoId?,            // TikTok video_id (nếu đã upload trước)
  imageIds[]?,         // TikTok image_id list

  // Mode 2: Local asset (chưa upload lên TikTok)
  videoAssetId?,       // Mediation Pro internal asset ID → upload khi execute
  imageAssetIds[]?,    // Mediation Pro internal asset IDs → upload khi execute

  adText,
  callToAction,
  landingPageUrl,
  trackingUrl
}
```

> **Validation rule:** Phải có ít nhất 1 trong 4 fields media: `videoId` HOẶC `videoAssetId` HOẶC `imageIds` HOẶC `imageAssetIds`. Không được cung cấp cả video + image mode cùng lúc.

> **Execute behavior:** Nếu dùng `videoAssetId`/`imageAssetIds` → executor sẽ upload lên TikTok trước khi tạo Ad (step `media_upload` trong Doc 132 §6).

### `TikTokCampaignRequestDetailDto`
Fields:
- `id`, `organizationId`
- `tiktokAdAccountRowId`, `appRowId`, `tiktokAppMappingId`
- `campaignName`, `objective`, `payloadJson`
- `status`, `idempotencyKey`
- `validationErrorsJson`, `failureSummary`, `correlationId`
- `requestedBy`, `approvedBy`, `rejectedBy`, `executedBy`
- `createdAt`, `updatedAt`, `submittedAt`, `approvedAt`, `rejectedAt`, `executedAt`, `failedAt`
- `operationLogs: List<TikTokOperationLogDto>`
- `createdObjects`: `{ campaignId, adgroupId, adId }`

## 6. Validation và execution rules
Business rules hiện tại:
- Ad account phải tồn tại và active
- Integration phải tồn tại, enabled, có access token
- Token status phải là `VALID`; block khi `REVOKED`, `INVALID`, `MISSING_SCOPES`
- App phải tồn tại và user có edit access
- App mapping phải tồn tại, active, có `tiktok_app_id` và `download_url`
- Objective hỗ trợ V1: `APP_PROMOTION`
- Ít nhất 1 budget ở campaign hoặc ad group
- Budget > 0 khi provided
- `location_ids` không rỗng
- Ad phải có ít nhất 1 trong: `videoId`, `videoAssetId`, `imageIds[]`, `imageAssetIds[]` (xem §5 Ad media resolution model)
- `campaign_name`, `adgroup_name`, `ad_name` không rỗng

## 7. Error model

| HTTP Code | Trường hợp |
|---|---|
| `400 Bad Request` | Missing fields, validation fail, TikTok validation errors normalized |
| `401/403` | Invalid JWT hoặc thiếu screen/app permissions |
| `404 Not Found` | Integration, ad account, app mapping, request không tìm thấy |
| `409 Conflict` | Idempotency hoặc duplicate business key |
| `500 Internal Server Error` | Lỗi persistence hoặc TikTok downstream |

## 8. Response masking
`TikTokIntegrationDto` trả:
- `hasAppSecret`, `appSecretHint`
- `hasAccessToken`, `accessTokenHint`

Không trả: plaintext app secret, plaintext access token.

## 9. Implementation notes
- OAuth access token là production path duy nhất cho TikTok.
- Token health kiểm tra bằng daily job gọi `/advertiser/info/`.
- Saving integration không có refresh-token lifecycle (TikTok access token không hết hạn cứng).
- Reporting endpoints nằm ngoài V1 contract (Doc 130 xử lý qua sync jobs).
- TikTok API base URL: `https://business-api.tiktok.com/open_api/v1.3` (production), `https://sandbox-ads.tiktok.com/open_api/v1.3` (sandbox).
