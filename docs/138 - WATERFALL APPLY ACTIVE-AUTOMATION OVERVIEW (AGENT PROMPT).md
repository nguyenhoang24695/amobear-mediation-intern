# 138 - Waterfall Apply: Active-Automation Overview (Implementation Agent Prompt)

This document is a **self-contained implementation prompt** for an independent coding agent. It
redesigns the `/waterfall-apply` screen to add an "Active automation" overview tab. Hand the section
below to the agent verbatim. (Document body intentionally written in English for best agent results.)

---

## Task: Redesign `/waterfall-apply` — add an "Active Automation" overview tab

Repo: `Amobear.Mediation.Tools` (monorepo: .NET 8 backend + Next.js 16 frontend).
Write code comments and user-facing copy in **Vietnamese**. Follow `CLAUDE.md` at the repo root.

### Background

The `/waterfall-apply` screen (component `frontend/components/waterfall-apply/waterfall-apply-content.tsx`,
title "Waterfall Automation") is currently ONLY a bulk-configuration tool: pick one app OR one rule
group → pick a target apply mode (`manual`/`semi_auto`/`auto`) + interval → "Preview matches" → check
rows → "Apply" to turn on / change the apply mode of mediation groups (MGs).

Problem: there is no place to **see which MGs are currently running in `auto` / `semi_auto` mode**. The
existing endpoint `GET /api/WaterfallManagement/bulk-policy-targets` requires exactly one filter and
returns EVERY MG under that filter (mostly `manual`), so it is an edit workflow, not a monitoring view.

Goals (already confirmed with the stakeholder):
1. Split the screen into **two tabs**: "Đang tự động" (Active automation — overview, the DEFAULT tab)
   and "Cấu hình hàng loạt" (Bulk configure — keep the EXISTING preview/apply flow unchanged).
2. The overview list = **every MG whose policy `apply_mode` is `auto` or `semi_auto`** (current
   configured state), including ones that have never reached their due cycle. Filterable by app.
3. Allow **inline mode change + confirm dialog** directly on each overview row (requires `manage`
   permission).

### Existing architecture & data to REUSE (do NOT reinvent)

Backend Clean Architecture: `MediationPro.Api` (controllers), `MediationPro.Core` (entities/DTOs/
interfaces), `MediationPro.Infrastructure` (services/EF Core 8).

Policy entity — `backend/MediationPro.Core/Entities/MediationGroupWaterfallApplyPolicy.cs`:
- Fields: `MediationGroupId` (PK), `ApplyMode` (`"manual"`/`"semi_auto"`/`"auto"`), `IntervalDays`,
  `PolicyEnabledAt`, `LastCycleCompletedAt`, `LastObservedApplyAt`, `LastApplySource`
  (`"SYSTEM"`/`"ADMOB_SYNC"`), `LastAlertedAnchorAt`, `LastAlertResultId`, `LastEvaluatedAt`, ...
- DbSet: `_dbContext.MediationGroupWaterfallApplyPolicies`.

Constants — `backend/MediationPro.Core/Constants/WaterfallApplyPolicyConstants.cs`: `ApplyModeManual`,
`ValidApplyModes`, `DefaultIntervalDays`, `MinIntervalDays`, `MaxIntervalDays`.

Controller — `backend/MediationPro.Api/Controllers/WaterfallManagementController.cs`. Reuse the
existing helpers / injected services:
- `TryGetCurrentUserId(out Guid userId)` — reads userId from the claim.
- `_permissionService.HasScreenFunctionAsync(userId, "s-waterfall-apply", "view"|"manage")`.
- `private async Task<List<App>> LoadAccessibleApprovedAppsAsync(Guid userId, CancellationToken ct)`
  — apps the user can access with `ApprovalState == "APPROVED"`.
- `_appIdResolver.ResolveAppAdMobIdAsync(mg.PublisherId, mg.MediationGroupLinesJson, ct)` (interface
  `IMediationGroupAppIdResolver`) — resolves the AdMob appId of one MG.
- `_ruleGroupResolver.ResolveEffectiveGroupsAsync(List<string> appIds, ct)` — returns a map
  `appId -> WaterfallEffectiveRuleGroupDto?` (`.GroupId`, `.GroupName`, `.Source`).
- `_waterfallApplyPolicyService.GetDueAt(MediationGroupWaterfallApplyPolicy policy)` -> `DateTime` (UTC).
- `_dbContext.MediationGroups` — fields: `MediationGroupId`, `PublisherId`, `DisplayName`, `Name`,
  `MediationGroupLinesJson`, `Platform`, `AdFormat`, `State`.
- `App` entity: `AppId`, `DisplayName`, `Name`, `IconUri`, `PublisherId`, `ApprovalState`.

Reference the existing `BuildBulkPolicyTargetsAsync` method in the same controller for the apps→MG→policy
join pattern — BUT the new endpoint goes the OTHER direction: start FROM the policy table.

DTO file to extend: `backend/MediationPro.Core/DTOs/Waterfall/WaterfallBulkPolicyDtos.cs`.

Frontend:
- Service: `frontend/lib/api/services.ts`, object `waterfallManagementApi` (already has
  `getBulkPolicyTargets`, `bulkUpdatePolicies`, and
  `updatePolicy(mediationGroupId, body)` -> `PUT /api/WaterfallManagement/policy/{id}`).
- Types: `frontend/types/api.ts`.
- Tabs component already exists: `frontend/components/ui/tabs.tsx` (shadcn —
  `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent`).
- Inside `waterfall-apply-content.tsx` these helpers already exist and should be reused: `getAppLabel`,
  `buildAppOptions`, `getApplyModeLabel`, `getApplyModeBadgeClass`, `formatDateTime`,
  `filterLocalOptions`; components `WaterfallFilterCombobox`, `Pagination`, `AlertDialog*`,
  `NoPermissionView`; hooks `useApi`, `useToast`; `hasScreenFunction`. Constants:
  `SCREEN_WATERFALL_APPLY = "s-waterfall-apply"`, `FN_VIEW`, `FN_MANAGE`.

### Work to do

#### A. Backend — DTOs (in `WaterfallBulkPolicyDtos.cs`)

Add two classes:

```csharp
public class WaterfallActivePolicyItemDto
{
    public string MediationGroupId { get; set; } = string.Empty;
    public string MediationGroupName { get; set; } = string.Empty;
    public string AppId { get; set; } = string.Empty;
    public string AppName { get; set; } = string.Empty;
    public string? AppIconUri { get; set; }
    public string? EffectiveRuleGroupName { get; set; }
    public string ApplyMode { get; set; } = string.Empty;     // auto | semi_auto
    public int IntervalDays { get; set; }
    public DateTime? DueAt { get; set; }                       // UTC; FE renders as GMT+7
    public bool IsDue { get; set; }
    public DateTime? LastObservedApplyAt { get; set; }
    public string? LastApplySource { get; set; }
    public DateTime? LastEvaluatedAt { get; set; }
    public int? LastAlertResultId { get; set; }
    public string? Platform { get; set; }
    public string? AdFormat { get; set; }
    public string? State { get; set; }
}

public class WaterfallActivePolicyListResponseDto
{
    public int TotalCount { get; set; }     // over the full matched set, before paging
    public int AutoCount { get; set; }
    public int SemiAutoCount { get; set; }
    public int DueNowCount { get; set; }
    public List<WaterfallActivePolicyItemDto> Items { get; set; } = new();
}
```

#### B. Backend — endpoint `GET /api/WaterfallManagement/active-policies`

Add a new action to `WaterfallManagementController` (next to `GetBulkPolicyTargets`).

Query params (all optional): `string? appId`, `string? applyMode`, `string? search`,
`int page = 1`, `int pageSize = 20`, `CancellationToken ct`.

Logic:
1. `TryGetCurrentUserId` → if it fails return `Unauthorized`. Check
   `HasScreenFunctionAsync(userId, "s-waterfall-apply", "view")` → if false return `Forbid()`.
2. If `applyMode` is provided, normalize (trim/lower) and accept ONLY `"auto"` or `"semi_auto"`;
   otherwise `BadRequest`. (`manual` is not valid for this endpoint.)
3. `accessibleApps = await LoadAccessibleApprovedAppsAsync(userId, ct)`. Build a dict `appById` keyed
   by `AppId` (OrdinalIgnoreCase). If empty, return an empty response.
4. Query policies:
   `_dbContext.MediationGroupWaterfallApplyPolicies.AsNoTracking()
     .Where(p => p.ApplyMode != WaterfallApplyPolicyConstants.ApplyModeManual)`; if `applyMode` filter
   present add `p.ApplyMode == normalized`. Materialize (small set).
5. Load the matching MGs by `MediationGroupId` in a single query
   (`Where(m => ids.Contains(m.MediationGroupId))`). For each (policy, mg): resolve appId via
   `_appIdResolver.ResolveAppAdMobIdAsync(mg.PublisherId, mg.MediationGroupLinesJson, ct)`; keep only
   when the appId is in `appById` (and matches the `appId` filter if provided, OrdinalIgnoreCase).
6. `effectiveGroups = await _ruleGroupResolver.ResolveEffectiveGroupsAsync(matchedAppIds.Distinct(), ct)`
   to populate `EffectiveRuleGroupName`.
7. Map to `WaterfallActivePolicyItemDto`. `DueAt = _waterfallApplyPolicyService.GetDueAt(policy)`;
   `IsDue = DateTime.UtcNow >= DueAt`. `MediationGroupName = mg.DisplayName ?? mg.Name ??
   mg.MediationGroupId`. `AppName = app.DisplayName ?? app.Name ?? app.AppId`.
8. Apply `search` (if present): filter where MediationGroupName/AppName/AppId/MediationGroupId contains
   the keyword (OrdinalIgnoreCase).
9. Compute summary over the FULL filtered set (before paging): `TotalCount`, `AutoCount`,
   `SemiAutoCount`, `DueNowCount`.
10. Sort by AppName → MediationGroupName (OrdinalIgnoreCase). Page with
    `Skip((page-1)*pageSize).Take(pageSize)`. Return `WaterfallActivePolicyListResponseDto`.

Inline mode change does NOT need a new endpoint — reuse
`PUT /api/WaterfallManagement/policy/{mediationGroupId}` (`UpdatePolicy`, which already writes an
activity log).

#### C. Frontend — types (`frontend/types/api.ts`)

Add `WaterfallActivePolicyItemDto` and `WaterfallActivePolicyListResponseDto` matching the backend DTOs
(camelCase fields). Place them next to the existing waterfall types.

#### D. Frontend — service (`frontend/lib/api/services.ts`)

Add to `waterfallManagementApi`:
```ts
getActivePolicies: async (params: {
  appId?: string; applyMode?: string; search?: string; page?: number; pageSize?: number
}): Promise<WaterfallActivePolicyListResponseDto> =>
  apiClient.get<WaterfallActivePolicyListResponseDto>(
    '/api/WaterfallManagement/active-policies',
    params as Record<string, string | number | undefined>),
```

#### E. Frontend — UI (`frontend/components/waterfall-apply/waterfall-apply-content.tsx`)

Restructure into Tabs. Keep the `canView` / `NoPermissionView` guard at the outer level.

- Move the CURRENT preview/apply logic into a `BulkConfigureTab` component (move as-is, KEEP behavior
  identical).
- New `ActiveAutomationTab` component (the default tab):
  - Filter bar: App combobox (use `WaterfallFilterCombobox` + `buildAppOptions`), Mode `Select`
    ("Tất cả tự động" = undefined / "Auto" / "Semi auto"), a search `Input`, and a "Chỉ đến hạn" toggle
    (`Checkbox` — client-side filter on `isDue` for the current page).
  - Call `waterfallManagementApi.getActivePolicies({ appId, applyMode, search, page, pageSize })`
    (via `useApi` or state + effect; reload when filters/page change).
  - Summary cards: Auto / Semi-auto / Đến hạn (from `autoCount` / `semiAutoCount` / `dueNowCount`).
  - Table columns: App (icon + name + appId) | Mediation group (name + id + State) | Mode (badge via
    `getApplyModeLabel` / `getApplyModeBadgeClass`) | Interval | Next due GMT+7
    (`formatDateTime(dueAt)`) | Status (badge "Đến hạn" if `isDue` else "Đúng lịch") | Last observed
    apply (`formatDateTime`) | Apply source | Platform/Format | Action.
  - Per-row Action: a `Select` to change mode (Auto / Semi auto / Manual) → open an `AlertDialog`
    confirm → call `waterfallManagementApi.updatePolicy(mediationGroupId, { applyMode })` →
    success/error toast → reload the list (switching to `manual` makes the row disappear after reload).
    Disable when `!canManage`. Include an "Mở mediation" link to
    `/mediation/{mediationGroupId}?tab=waterfall-optimization`.
  - `Pagination` (reuse the existing component). Empty state when the list is empty.
  - Match the existing visual style (Card, Badge, slate table, etc.).

### Conventions
- Commit message: `[type](scope): desc` (e.g. `feat(backend): ...`, `feat(frontend): ...`).
- C#: PascalCase / `_camelCase` private fields. TS: camelCase, PascalCase components.
- Do NOT change the existing bulk-config flow behavior; do NOT touch the existing alert/policy endpoints.

### Verification
1. `dotnet build backend/MediationPro.sln` — must pass.
2. `cd frontend && pnpm lint && pnpm build` — must pass.
3. Swagger `https://localhost:5001/swagger`: call `GET /api/WaterfallManagement/active-policies` with no
   params, then `?appId=...`, then `?applyMode=auto` — confirm only `auto`/`semi_auto` MGs are returned,
   and counters & paging are correct.
4. `http://localhost:3000/waterfall-apply`: the "Đang tự động" tab is default and shows the correct list
   + cards; app filter works; changing a row's mode → confirm → toast → refresh (to `manual` ⇒ row
   disappears); the "Cấu hình hàng loạt" tab works exactly as before.
5. Permissions: a `view`-only user sees the mode-change control disabled; a user without `view` sees
   `NoPermissionView`.
