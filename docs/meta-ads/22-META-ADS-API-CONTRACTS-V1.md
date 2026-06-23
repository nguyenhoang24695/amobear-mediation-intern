# Meta Ads API Contracts V1

## 1. Goal
This document describes the current backend API contract for the Meta Ads V1 module after the production auth refinement.

## 2. General rules
- Base path uses the `api/v1` prefix.
- API auth uses the platform JWT.
- All endpoints are organization-scoped from user claims.
- Secrets are never returned in plaintext.
- Meta integrations are production-oriented around System User access tokens, not refresh tokens.

## 3. Auth model
Canonical `authMode` values:
- `system_user_token`
- `oauth_user`

Legacy aliases accepted for compatibility:
- `SYSTEM_USER` -> `system_user_token`
- `USER_TOKEN` -> `oauth_user`
- `manual_access_token` -> `system_user_token`

Production guidance:
- `system_user_token` is the recommended and production-safe mode.
- `oauth_user` is allowed for development or testing only.
- Meta Marketing API does not use a standard refresh-token lifecycle like Google OAuth.

Required token scopes:
- `ads_management`
- `ads_read`

Normalized token statuses:
- `NOT_TESTED`
- `VALID`
- `EXPIRED`
- `MISSING_SCOPES`
- `ACCESS_DENIED`
- `INVALID`

## 4. Controllers
### 4.1 `MetaAuthController`
Base route: `api/v1/meta-auth`

Endpoints:
- `GET /integrations/{integrationId}/authorize-url`
  - Query: `redirectUri`, optional `state`
  - Response: `MetaAuthorizeUrlResponseDto`
  - Purpose: start the Meta user-token OAuth flow for dev/test integrations
- `POST /integrations/{integrationId}/callback`
  - Body: `MetaOAuthCallbackRequestDto`
  - Response: `MetaTokenStatusDto`
  - Purpose: exchange Meta OAuth code for a user token, then evaluate token health
- `POST /integrations/test`
  - Body: `MetaIntegrationTestRequestDto`
  - Response: `MetaIntegrationTestResultDto`
  - Purpose: test draft credentials without requiring the integration to be saved first
- `POST /integrations/{integrationId}/test`
  - No body required
  - Response: `MetaIntegrationTestResultDto`
  - Purpose: test a persisted integration and store the latest token health result
- `GET /integrations/{integrationId}/token-status`
  - Response: `MetaTokenStatusDto`

Permissions:
- `s-meta-accounts:view` for read-only token status
- `s-meta-accounts:edit` for authorize URL, callback, and test actions

Connection test behavior:
- Validates that an access token is present
- Calls real Meta endpoints, including token inspection and lightweight access checks
- Verifies required scopes
- Verifies business and ad account access where applicable
- Normalizes Meta errors into internal result codes such as `INVALID_TOKEN`, `TOKEN_EXPIRED`, `MISSING_SCOPE`, `ACCESS_DENIED`, `APP_CONFIG_ERROR`, and `UNKNOWN_ERROR`

### 4.2 `MetaAccountsController`
Base route: `api/v1/meta-accounts`

#### Integration endpoints
- `GET /integrations`
  - Response: `List<MetaIntegrationDto>`
- `POST /integrations`
  - Body: `CreateMetaIntegrationRequestDto`
  - Response: `MetaIntegrationDto`
- `PUT /integrations/{id}`
  - Body: `UpdateMetaIntegrationRequestDto`
  - Response: `MetaIntegrationDto`
- `POST /integrations/{id}/enable`
- `POST /integrations/{id}/disable`
- `POST /integrations/{id}/sync-ad-accounts`
  - Response: `List<MetaAdAccountDto>`

Integration validation rules:
- `displayName` is required
- `authMode` is required and must resolve to a supported mode
- `metaBusinessId` is required
- `metaAppId` is required
- `appSecret` is required
- `accessToken` is required
- `tokenType` defaults to `Bearer`
- `scopes` must include `ads_management` and `ads_read`

Compatibility notes:
- Existing refresh-token columns may still exist in storage for compatibility, but they are no longer part of the active contract.
- New create/update payloads do not accept or require a refresh token.
- Existing encrypted app secret and access token behavior is preserved.

#### Ad account endpoints
- `GET /ad-accounts`
  - Response: `List<MetaAdAccountDto>`
- `POST /ad-accounts`
  - Body: `UpsertMetaAdAccountRequestDto`
  - Response: `MetaAdAccountDto`
- `PUT /ad-accounts/{id}`
  - Body: `UpsertMetaAdAccountRequestDto`
  - Response: `MetaAdAccountDto`
- `POST /ad-accounts/{id}/enable`
- `POST /ad-accounts/{id}/disable`

#### App mapping endpoints
- `GET /app-mappings`
  - Response: `List<MetaAppMappingDto>`
- `POST /app-mappings`
  - Body: `CreateMetaAppMappingRequestDto`
  - Response: `MetaAppMappingDto`
- `PUT /app-mappings/{id}`
  - Body: `UpdateMetaAppMappingRequestDto`
  - Response: `MetaAppMappingDto`
- `POST /app-mappings/{id}/enable`
- `POST /app-mappings/{id}/disable`

Permissions:
- `s-meta-accounts:view|create|edit|disable-enable`
- App mapping write actions also require app-level edit permission

### 4.3 `MetaReferenceController`
Base route: `api/v1/meta-reference`

Endpoints:
- `GET /create-campaign`
  - Response includes:
  - `adAccounts: List<MetaAdAccountDto>`
  - `appMappings: List<MetaAppMappingDto>`
  - `objectives: List<MetaObjectivePresetDto>`
  - `bidStrategies: List<MetaBidStrategyPresetDto>`

Permissions:
- `s-meta-requests:view`

### 4.4 `MetaCampaignRequestsController`
Base route: `api/v1/meta-campaign-requests`

Endpoints:
- `GET /`
  - Response: `List<MetaCampaignRequestListItemDto>`
- `GET /{id}`
  - Response: `MetaCampaignRequestDetailDto`
- `POST /`
  - Body: `CreateMetaCampaignRequestDto`
  - Response: `MetaCampaignRequestDetailDto`
- `PUT /{id}`
  - Body: `UpdateMetaCampaignRequestDto`
  - Response: `MetaCampaignRequestDetailDto`
- `POST /{id}/validate`
  - Response: `MetaValidationResultDto`
- `POST /{id}/submit`
- `POST /{id}/approve`
  - Body: `ApproveMetaCampaignRequestDto`
- `POST /{id}/reject`
  - Body: `RejectMetaCampaignRequestDto`
- `POST /{id}/execute`
  - Body: `ExecuteMetaCampaignRequestDto`
- `POST /{id}/retry`
  - Body: `ExecuteMetaCampaignRequestDto`

Permissions:
- `s-meta-requests:view` for list, detail, and validate
- `s-meta-requests:create` for create, update, and submit
- `s-meta-requests:approve` for approve and reject
- `s-meta-requests:execute` for execute
- `s-meta-requests:retry` for retry

## 5. Main DTOs
### `MetaIntegrationDto`
Fields:
- `id`
- `displayName`
- `authMode`
- `isProductionSafe`
- `productionUsageMessage`
- `metaBusinessId`
- `metaAppId`
- `hasAppSecret`
- `appSecretHint`
- `hasAccessToken`
- `accessTokenHint`
- `tokenType`
- `tokenExpiresAt`
- `lastCheckedAt`
- `scopes`
- `tokenStatus`
- `lastCheckMessage`
- `isDefault`
- `isEnabled`
- `createdAt`
- `updatedAt`

### `CreateMetaIntegrationRequestDto`
Fields:
- `displayName`
- `authMode`
- `metaBusinessId`
- `metaAppId`
- `appSecret`
- `accessToken`
- `tokenType`
- `tokenExpiresAt`
- `scopes`
- `isDefault`
- `isEnabled`

### `UpdateMetaIntegrationRequestDto`
Fields:
- `displayName`
- `authMode`
- `metaBusinessId`
- `metaAppId`
- `appSecret`
- `accessToken`
- `tokenType`
- `tokenExpiresAt`
- `scopes`
- `isDefault`
- `isEnabled`
- `clearAppSecret`
- `clearAccessToken`

### `MetaTokenStatusDto`
Fields:
- `integrationId`
- `authMode`
- `isProductionSafe`
- `hasAccessToken`
- `tokenType`
- `tokenExpiresAt`
- `lastCheckedAt`
- `tokenStatus`
- `lastCheckMessage`
- `scopes`

### `MetaIntegrationTestRequestDto`
Fields:
- `integrationId`
- `authMode`
- `metaBusinessId`
- `metaAppId`
- `appSecret`
- `accessToken`
- `tokenType`
- `tokenExpiresAt`
- `scopes`

### `MetaIntegrationTestResultDto`
Fields:
- `integrationId`
- `success`
- `authMode`
- `isProductionSafe`
- `resultCode`
- `tokenStatus`
- `checkedAt`
- `message`
- `tokenType`
- `tokenExpiresAt`
- `scopes`

## 6. Validation and execution rules
Current business rules include:
- ad account must exist and be active
- integration must exist, be enabled, and have a usable access token
- integration health blocks execution when status is `EXPIRED`, `MISSING_SCOPES`, `ACCESS_DENIED`, or `INVALID`
- app must exist and user must have edit access
- app mapping must exist, be active, and contain the required Meta application/store fields
- supported objectives are:
  - `OUTCOME_AWARENESS`
  - `OUTCOME_TRAFFIC`
  - `OUTCOME_ENGAGEMENT`
  - `OUTCOME_LEADS`
  - `OUTCOME_APP_PROMOTION`
  - `OUTCOME_SALES`
- at least one budget must exist at campaign or ad set level
- budgets must be greater than zero when supplied
- `countries` cannot be empty
- `age_min` cannot be greater than `age_max`
- creative requires `name`, `page_id`, `image_hash|image_url`, and `link_url` or a mapping fallback URL
- ad requires `name`

## 7. Error model
Common response groups:
- `400 Bad Request`
  - missing payload fields
  - business validation failures
  - normalized Meta validation failures returned as human-readable messages
- `401/403`
  - invalid JWT or missing screen/app permissions
- `404 Not Found`
  - integration, ad account, app mapping, or request not found in the current organization
- `409 Conflict`
  - idempotency or duplicate business key failure
- `500 Internal Server Error`
  - unexpected persistence or downstream Meta failure

## 8. Response masking
`MetaIntegrationDto` returns:
- `hasAppSecret`, `appSecretHint`
- `hasAccessToken`, `accessTokenHint`

It does not return:
- plaintext app secret
- plaintext access token
- plaintext refresh token

## 9. Implementation notes
- System User token auth is the primary production path.
- User-token OAuth remains available for dev/test workflows.
- Token health is explicit and persisted through `tokenStatus`, `lastCheckedAt`, and `lastCheckMessage`.
- Saving an integration no longer implies any refresh-token lifecycle.
- Reporting endpoints are still outside the V1 contract.
