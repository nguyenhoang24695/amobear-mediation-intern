# Prompt: Implement Meta USER_TOKEN OAuth Flow

## Summary
- Replace the current manual-token-only UX for Meta `USER_TOKEN` integrations with a first-class OAuth connect flow.
- Keep `SYSTEM_USER` as the production-safe primary path.
- Let `USER_TOKEN` / `oauth_user` integrations be created without a manually pasted access token, then acquire the token through Meta OAuth.
- Harden the OAuth flow with proper `state` handling before treating it as a supported workflow.

## Business Context
- Current Meta integration UI exposes `USER_TOKEN`, but still asks the user to paste an access token manually.
- The desired user experience is similar to other OAuth integrations:
  - select `USER_TOKEN`
  - enter Meta app/business context
  - click `Connect Meta`
  - grant permissions on Meta
  - return to Nexus with a stored encrypted token
- Meta user tokens are useful for development, testing, troubleshooting, and onboarding.
- Meta System User tokens remain the recommended production credential for backend jobs, campaign execution, and recurring sync.

## Current State To Verify
- `MetaAuthManager` already has a partial OAuth flow:
  - `GetAuthorizationUrlAsync(...)`
  - `ExchangeCodeForTokenAsync(...)`
  - short-lived token exchange
  - long-lived token exchange with `grant_type=fb_exchange_token`
  - token inspection via `/debug_token`
  - connection testing against business/ad account access
- `MetaAuthController` already exposes:
  - `GET /api/v1/meta-auth/integrations/{integrationId}/authorize-url`
  - `POST /api/v1/meta-auth/integrations/{integrationId}/callback`
- Frontend already has:
  - `metaIntegrationsApi.getAuthorizeUrl(...)`
  - `metaIntegrationsApi.exchangeCode(...)`
  - callback route under `frontend/app/meta-ads/integrations/callback/[integrationId]/page.tsx`
  - `USER_TOKEN` option in the integrations form
- The blocking gaps are mainly validation, UX, and OAuth state verification.

## Goals
- User can create a `USER_TOKEN` integration without manually entering an access token.
- User can click `Connect Meta` / `Create & Connect Meta` to start OAuth.
- Backend exchanges the returned authorization code for a long-lived Meta user token and stores it encrypted.
- OAuth callback validates `state` before exchanging code.
- After OAuth completes, the integration token health is tested and surfaced in UI.
- Existing `SYSTEM_USER` manual token behavior remains unchanged.
- Existing manually pasted token path remains available as an advanced/dev fallback, not the default path for `USER_TOKEN`.

## Non-Goals
- Do not make `USER_TOKEN` production-safe.
- Do not replace System User token guidance.
- Do not implement Google-style refresh-token lifecycle for Meta.
- Do not add a generic secret/token viewer.
- Do not return plaintext app secret, access token, or refresh token from APIs.
- Do not change TikTok, AdMob, or other integration flows.
- Do not require a new DB table unless state handling cannot be implemented safely with existing infrastructure.

## Key Design Decisions

### Auth Modes
- Canonical modes remain:
  - `system_user_token`
  - `oauth_user`
- Legacy aliases remain accepted:
  - `SYSTEM_USER` -> `system_user_token`
  - `USER_TOKEN` -> `oauth_user`
  - `manual_access_token` -> `system_user_token`
- `system_user_token` remains production-safe.
- `oauth_user` remains dev/test only and should keep visible warnings.

### Credential Requirements
- For `system_user_token`:
  - `displayName` required
  - `metaBusinessId` required
  - `metaAppId` required
  - `appSecret` required
  - `accessToken` required
  - required scopes must include `ads_management`, `ads_read`
- For `oauth_user` create/update before OAuth:
  - `displayName` required
  - `metaBusinessId` required
  - `metaAppId` required
  - `appSecret` required
  - `accessToken` not required until after OAuth callback
  - required scopes must include `ads_management`, `ads_read`
- For `oauth_user` after OAuth:
  - stored encrypted access token is required for test/sync/execute.
  - token expiration must be respected.

### OAuth Redirect URI
- Prefer one stable redirect URI if feasible:
  - `/meta-ads/integrations/callback`
- Pass `integrationId` in verified `state` instead of path params.
- If keeping the existing path route is lower risk for the current app, keep:
  - `/meta-ads/integrations/callback/{integrationId}`
  - but still verify `state` and ensure Meta app redirect URI config is documented.
- Do not silently change route shape if it breaks existing configured Meta redirect URIs. If both are supported, add the new route and keep the old route as compatibility.

### OAuth State
- Backend must generate a cryptographically strong state value.
- The callback exchange must verify state before exchanging code.
- Acceptable implementations, in preferred order:
  - Signed/HMAC state payload containing `organizationId`, `integrationId`, `userId`, `nonce`, and expiry.
  - Persisted one-time OAuth state/nonce in DB/cache tied to organization/user/integration and expiry.
  - Session/local temporary state only if backend still verifies a signed value.
- Do not rely only on frontend localStorage/sessionStorage for security.
- State should expire quickly, for example 10-15 minutes.
- State should be single-use if persisted.

## Backend Changes

### 1. Request/DTO Contract
- Extend callback DTO if needed:
  - current `MetaOAuthCallbackRequestDto` includes `Code` and `RedirectUri`.
  - add `State` if backend will validate state during callback exchange.
- Keep response masking unchanged.
- Do not add plaintext token fields to any response DTO.

### 2. Integration Validation
- Update `MetaAccountsController` validation so `oauth_user` does not require `accessToken` at create time.
- Update update validation similarly:
  - editing an existing `oauth_user` integration must not force the user to re-enter access token if it already has one.
  - clearing access token on `oauth_user` should be allowed only if the UI expects a reconnect flow, and resulting status should become invalid/not tested.
- Keep `system_user_token` strict: manual access token is still required.
- Keep required scope validation for both modes.

### 3. Authorization URL
- `GetAuthorizationUrlAsync` should only allow `oauth_user` integrations.
- Required preconditions:
  - integration exists in caller organization.
  - integration is `oauth_user`.
  - Meta App ID exists.
  - App Secret exists if the chosen state implementation signs using app secret or if exchange will require it. Exchange always requires App Secret.
  - requested scopes default to required scopes if none saved.
- Include requested scopes in the OAuth URL:
  - required: `ads_management`, `ads_read`
  - recommended: `pages_show_list`, `pages_read_engagement` when configured in integration scopes.
- Return the authorization URL and state.

### 4. Callback Exchange
- Add state verification before exchanging code.
- Verify the state integration id matches the route/body integration id if the route still includes `integrationId`.
- Verify organization and user context match.
- Exchange code -> short-lived token -> long-lived token.
- Store:
  - encrypted access token
  - access token hint
  - token type
  - token expiry from Meta response/debug token
  - granted scopes from debug token/test result
  - status/last validated fields
- Do not store/pretend a Meta refresh token exists.
- After token exchange, call connection test or token inspection to persist health.

### 5. Token Health / Expiry
- Ensure `GetAccessTokenAsync` blocks expired/invalid/missing-scope tokens as it does today.
- Add or preserve warning behavior for `oauth_user` token expiry.
- If there is an existing scheduled health check pattern, optionally add a follow-up TODO for warning before expiry. Do not overbuild notification systems in this task unless they already exist.

## Frontend Changes

### 1. Integration Form UX
- When `authMode === "system_user_token"`:
  - show Access Token field as required.
  - primary CTA remains `Create Integration` / `Save Changes`.
  - `Test Connection` uses manually entered or saved token.
- When `authMode === "oauth_user"`:
  - hide Access Token from the default form or move it under an advanced/manual section.
  - show warning: `USER_TOKEN is for development/testing only. Use SYSTEM_USER for production.`
  - show CTA:
    - create mode: `Create & Connect Meta`
    - edit mode without token: `Connect Meta`
    - edit mode with token: `Reconnect Meta`
  - do not block submit because `accessToken` is blank.
- Token status panel should clearly show:
  - `No token connected` when `oauth_user` has no token.
  - expiry date after OAuth.
  - reconnect action when expired.

### 2. Create & Connect Flow
- On create mode with `oauth_user`:
  - validate non-token fields.
  - call create integration.
  - call get authorize URL for the new integration id.
  - store minimal pending OAuth metadata if needed for UX only.
  - redirect to Meta OAuth URL.
- On edit mode with `oauth_user`:
  - save changed app/business/scopes first if dirty, or require save before connect.
  - call get authorize URL.
  - redirect to Meta.

### 3. Callback Page
- Read `code`, `state`, and OAuth error params.
- If `state` is required by backend callback DTO, send it in `exchangeCode`.
- After successful callback:
  - invalidate `meta-integrations:list` and `meta-ad-accounts:list`.
  - redirect back to Meta integrations tab/page with success notice.
- On failure:
  - redirect back with a clear error message.
- Avoid exposing token values in URL, logs, or toast messages.

### 4. Manual Token Fallback
- It is acceptable to keep manual access token paste for `oauth_user`, but it should not be the default path.
- Suggested UI:
  - collapsed section: `Advanced: paste token manually`
  - helper: `Use only for debugging. OAuth Connect is recommended for USER_TOKEN.`
- Manual `Test Connection` should still work.

## Suggested Files To Inspect / Update
- Backend auth manager/controller:
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAuthManager.cs`
  - `backend/MediationPro.Api/Controllers/MetaAuthController.cs`
  - `backend/MediationPro.Core/Interfaces/IMetaAuthManager.cs`
  - `backend/MediationPro.Core/DTOs/MetaAds/MetaIntegrationDtos.cs`
- Backend integration CRUD/validation:
  - `backend/MediationPro.Api/Controllers/MetaAccountsController.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaIntegrationStatusEvaluator.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaValueNormalizer.cs`
- Backend persistence/security:
  - `backend/MediationPro.Core/Entities/MetaIntegration.cs`
  - `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs`
  - `backend/MediationPro.Core/Interfaces/IMetaSecretCryptoService.cs`
  - `backend/MediationPro.Infrastructure/Services/MetaAds/MetaSecretCryptoService.cs`
- Frontend integrations UI/API/types:
  - `frontend/components/meta-ads/integrations/integrations-content.tsx`
  - `frontend/app/meta-ads/integrations/callback/[integrationId]/page.tsx`
  - optionally add `frontend/app/meta-ads/integrations/callback/page.tsx` for stable callback route
  - `frontend/lib/api/meta-ads.ts`
  - `frontend/types/meta-ads.ts`
- Docs to keep aligned:
  - `docs/meta-ads/22-META-ADS-API-CONTRACTS-V1.md`
  - `docs/meta-ads/meta-integration-guide.md`

## Acceptance Criteria
- Creating `SYSTEM_USER` integration still requires Access Token and behaves exactly as before.
- Creating `USER_TOKEN` integration no longer requires manual Access Token.
- For `USER_TOKEN`, user can create and immediately start OAuth via `Create & Connect Meta`.
- Existing `USER_TOKEN` integration can start OAuth via `Connect Meta` / `Reconnect Meta`.
- OAuth callback verifies `state` before token exchange.
- Successful OAuth stores the Meta access token encrypted and never returns it plaintext.
- Successful OAuth updates token type, expiry, scopes, and token health.
- Token health blocks sync/execute when token is expired, invalid, access-denied, or missing required scopes.
- UI displays a clear dev/test warning for `USER_TOKEN`.
- UI no longer makes manual token entry look mandatory for `USER_TOKEN`.
- Existing manual token testing path still works for advanced/debug usage.
- No unrelated Meta campaign request, TikTok, AdMob, or analytics behavior is changed.

## Test Plan

### Backend
- Run focused build/tests:
  - `dotnet build backend\MediationPro.Api\MediationPro.Api.csproj --no-restore -v minimal /m:1`
  - `dotnet test backend\MediationPro.Api.Tests\MediationPro.Api.Tests.csproj -v minimal`
- Add or update tests if test project has controller/service coverage for Meta auth:
  - `system_user_token` create without access token returns validation error.
  - `oauth_user` create without access token succeeds when required non-token fields/scopes are present.
  - `oauth_user` authorize URL rejects missing app id/app secret as appropriate.
  - callback rejects missing/invalid/expired state.
  - callback rejects state for another integration/user/org.
  - callback stores encrypted token and does not expose plaintext token in response.
- Manual API checks:
  - create OAuth integration without token.
  - call authorize URL and inspect returned URL contains expected scopes and state.
  - call callback with bad state and confirm no token is saved.

### Frontend
- Run existing frontend validation/build command used by this repo if available, for example:
  - inspect `frontend/package.json` and use the existing lint/typecheck/build scripts.
- UI smoke:
  - `SYSTEM_USER` mode still shows Access Token as required.
  - `USER_TOKEN` mode shows `Connect Meta` UX and does not require Access Token.
  - create `USER_TOKEN` with blank Access Token starts OAuth after save.
  - callback success returns to integrations page with success toast.
  - callback failure returns with error toast.
  - expired/no-token statuses show reconnect action.

### Security Regression
- Confirm callback does not exchange code without verified `state`.
- Confirm no access token appears in:
  - API response bodies
  - browser URL
  - toast messages
  - console logs
  - activity log summaries
- Confirm `state` does not leak secrets. It may contain IDs if signed, but not app secret/access token.

## Implementation Notes
- Keep messages concise and user-facing:
  - `Connect Meta`
  - `Reconnect Meta`
  - `USER_TOKEN is for development/testing only. Use SYSTEM_USER for production.`
- Prefer small helpers for auth-mode-specific validation rather than duplicating conditionals throughout controller code.
- If adding signed state, prefer a service/helper with tests, for example:
  - `IMetaOAuthStateService`
  - `MetaOAuthStateService`
- If a new callback DTO field is added, update TypeScript API client/types at the same time.
- If switching to a stable callback route, keep old callback route as compatibility unless the team explicitly removes it from Meta app settings.
- Update docs after implementation so future agents do not assume manual token is required for `USER_TOKEN`.
