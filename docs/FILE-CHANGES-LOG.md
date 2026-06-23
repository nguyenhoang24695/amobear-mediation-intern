# File Changes Log

Tracks code changes made from 2026-03-12 onward.

## 2026-03-12

### Waterfall recommendation/apply dedupe fix

- `backend/MediationPro.Infrastructure/Services/WaterfallRecommendationService.cs`
  Prevents suggested waterfall tiers from being generated when their displayed floor bucket already exists, and keeps existing line labels for KEEP recommendations without SoW data.
- `backend/MediationPro.Infrastructure/Services/WaterfallManagementService.cs`
  Stops apply from renaming existing lines during floor updates/removals and guarantees newly created line labels are unique before calling AdMob.
- `frontend/components/mediation/mediation-group-detail/waterfall-optimization-tab.tsx`
  Stops inline floor edits from auto-renaming existing waterfall lines to floor-derived labels.

## 2026-03-17

### Bulk waterfall apply mode screen

- `backend/MediationPro.Api/Controllers/WaterfallManagementController.cs`
  Adds bulk policy preview/update endpoints for `appId` or `ruleGroupId` filters, validates mutually exclusive filters, enforces `s-waterfall-apply` permissions, and reuses existing policy upsert behavior for bulk mode changes.
- `backend/MediationPro.Api/Program.cs`
  Registers `IWaterfallRuleGroupResolver` in DI so the new effective rule-group resolution flow can be injected into recommendation and management services.
- `backend/MediationPro.Core/Constants/PermissionScreensConstant.cs`
  Adds the new `s-waterfall-apply` screen with `view` and `manage` functions for navigation and API authorization.
- `backend/MediationPro.Core/DTOs/Waterfall/WaterfallBulkPolicyDtos.cs`
  Adds DTOs for preview targets and bulk update request/response payloads.
- `backend/MediationPro.Core/DTOs/Waterfall/WaterfallEffectiveRuleGroupDto.cs`
  Adds a shared DTO describing each app's effective waterfall rule group and whether it came from explicit mapping or default fallback.
- `backend/MediationPro.Core/Interfaces/IWaterfallRuleGroupResolver.cs`
  Defines the shared interface for resolving effective rule groups by app.
- `backend/MediationPro.Infrastructure/Migrations/20260317110000_SeedWaterfallApplyRolePermissions.cs`
  Seeds default `view` and `manage` permissions for the `admin` role on the new waterfall apply screen.
- `backend/MediationPro.Infrastructure/Services/WaterfallRecommendationService.cs`
  Switches recommendation rule loading to the shared effective rule-group resolver instead of duplicating app-to-rule-group logic.
- `backend/MediationPro.Infrastructure/Services/WaterfallRuleGroupResolver.cs`
  Implements shared effective rule-group resolution with explicit app mapping first and default-group fallback only when the group has active rules.
- `frontend/app/waterfall-apply/page.tsx`
  Adds the new `/waterfall-apply` route inside the dashboard layout.
- `frontend/components/dashboard/sidebar.tsx`
  Adds the `Waterfall Apply` Settings menu item after `Waterfall Rules` and shows a `New` badge beside it.
- `frontend/components/waterfall-apply/waterfall-apply-content.tsx`
  Adds the new bulk apply UI with filter-type selection, preview loading, confirmation table, client-side pagination, row selection, and confirm dialog before bulk update.
- `frontend/lib/api/services.ts`
  Adds frontend API methods for bulk preview and bulk policy updates.
- `frontend/types/api.ts`
  Adds frontend types for bulk preview targets and bulk policy update payloads.

## 2026-03-19

### Waterfall rule config master refactor and dialog UX

- `backend/MediationPro.Api/Controllers/WaterfallRecommendationSettingsController.cs`
  Refactors waterfall rule config APIs around standalone config masters, app-assignment replacement, effective-config lookup, and save flows that can switch the global default without a temporary gap.
- `backend/MediationPro.Infrastructure/Migrations/20260319103000_RefactorWaterfallRecommendationConfigMaster.cs`
  Adds the config-master and app-mapping schema, backfills legacy config data, supports unique config names, and introduces explicit global-default persistence.
- `backend/MediationPro.Infrastructure/Repositories/WaterfallRecommendationConfigRepository.cs`
  Persists config/app mapping changes atomically, wraps reassignment in EF execution-strategy-safe transactions, and swaps the active global default in a single save.
- `backend/MediationPro.Infrastructure/Services/WaterfallRecommendationConfigResolver.cs`
  Adds shared effective-config resolution for direct app assignment, global-default fallback, and final appsettings fallback.
- `backend/MediationPro.Infrastructure/Services/WaterfallRecommendationService.cs`
  Switches runtime recommendation loading to the new effective config resolver instead of legacy app-bound config rows.
- `frontend/components/apps/app-detail/app-overview-tab.tsx`
  Changes app overview to selector-style config assignment instead of editing shared rule thresholds inline.
- `frontend/components/apps/app-detail/app-waterfall-config-card.tsx`
  Shows the effective rule config, its resolution source, and allows assigning or clearing a direct config for the current app.
- `frontend/components/waterfall-rules/configs-table.tsx`
  Updates the table to render real config rows, show app avatars, and display fallback app counts/details for the global default config.
- `frontend/components/waterfall-rules/create-edit-config-dialog.tsx`
  Adds required unique config names, draft configs with zero assigned apps, confirm-before-save flows, explicit reassignment warnings, apply-mode sync controls, avatar-based app selection, compact right-aligned assignment badges, and the larger 70vw x 94vh modal layout.
- `frontend/components/waterfall-rules/waterfall-configs-panel.tsx`
  Reworks the waterfall config screen around config-master CRUD, global-default handling, fallback app counting, and app-assignment replacement.
- `frontend/components/waterfall-rules/waterfall-rules-content.tsx`
  Converts waterfall rules management to the new config-centric model and only runs apply-mode sync for explicitly assigned apps after config save succeeds.
- `frontend/lib/api/services.ts`
  Updates frontend API clients for config-master CRUD, app assignment replacement, effective-config lookup, and waterfall apply-mode sync integration.
- `frontend/types/api.ts`
  Adds the DTO and response types needed for config masters, assigned apps, and effective waterfall config resolution.
- `docs/119 - WATERFALL RULE CONFIG USER MANUAL.md`
  Adds a user-facing manual for the new waterfall rule config model, including Mermaid diagrams for effective-config resolution, save flow, and common operator decisions.
## 2026-03-30

### Meta Ads production refactor, discovery flow, live campaigns, and creative expansion

- `backend/MediationPro.Api/Controllers/MetaAccountsController.cs`
  Refines the production-oriented Meta account module, removes refresh-token assumptions from the active flow, adds app-mapping discovery/candidate endpoints, and keeps sync/test actions aligned with real Meta Business usage.
- `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs`
  Adds DB-backed live campaign list/detail APIs, full-account sync, single-campaign sync, and ad preview endpoints for monitor and drilldown workflows.
- `backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs`
  Adds request asset upload/content endpoints so request media can be stored internally and uploaded to Meta only at execute time.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAuthManager.cs`
  Normalizes token health around access tokens, System User usage, real scope checks, business-aware access checks, and human-readable test results.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAppMappingDiscoveryService.cs`
  Discovers Meta app signals from synced ad accounts, auto-creates exact mappings, persists non-trivial candidates, and supports manual resolution.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignSyncService.cs`
  Syncs campaigns, ad sets, ads, and creatives from Meta with account-level fetches, campaign-scoped sync fallback, and partial-sync behavior under rate limits.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
  Expands request execution to dispatch creative payloads by type, defer media upload to execute time, and keep created Meta objects mirrored locally.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaRequestAssetService.cs`
  Stores request image/video assets in MinIO and exposes them for later Meta upload during execute.
- `frontend/components/meta-ads/integrations/integrations-content.tsx`
  Reworks the integration modal around System User tokens, token health, connection testing, and a wider two-column operator layout.
- `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`
  Adds discovery candidates, better app presentation, app-detail linking, and mapping resolution flows without changing the existing business model.
- `frontend/components/meta-ads/campaigns/campaign-list-content.tsx`
  Adds the live campaigns monitor screen with filters, quick states, sync controls, and organization-level campaign visibility.
- `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`
  Adds campaign drilldown tabs for ad sets, ads, and creatives, plus single-campaign sync and creative preview actions.
- `frontend/components/meta-ads/create-request/section-account-app.tsx`
  Filters app choices by the selected Meta ad account so request creation only shows account-usable app mappings.
- `frontend/components/meta-ads/create-request/section-creative.tsx`
  Refactors request creative entry to support `SINGLE_IMAGE`, `SINGLE_VIDEO`, `CAROUSEL_IMAGE`, and `EXISTING_POST` with deferred asset uploads.
- `frontend/components/meta-ads/requests/request-detail-content.tsx`
  Renders request creative snapshots by creative type instead of assuming every request is single-image.
- `docs/meta-ads/22-META-ADS-API-CONTRACTS-V1.md`
  Documents the updated Meta Ads backend contracts after the auth and token-model refactor.
- `docs/meta-ads/24-META-ADS-USER-MANUAL.md`
  Adds a new flow-oriented user manual for operators using the Meta Ads module end to end.


