# 116 - WATERFALL OPTIMIZER TEST & ROLLOUT

## Objective

A short checklist to verify the `analyze -> approve/reject -> apply -> sync -> audit` flow before a wider rollout.

## 1. Pre-deploy

- Run the new backend migration:
  - `dotnet ef database update --project ../MediationPro.Infrastructure --startup-project .`
- Confirm the new tables exist:
  - `waterfall_recommendations`
  - `recommendation_apply_log`
- Confirm the backend API builds successfully.
- Confirm the `Waterfall & Optimization` tab opens successfully on the mediation group detail screen.

## 2. Smoke Test Backend

### 2.1 Analyze

- Call `POST /api/waterfall/analyze` with one pilot `mediationGroupId`.
- Verify:
  - The response returns `configUsed`.
  - `waterfall_recommendations` contains new records.
  - New records have `status = pending`.
  - `expires_at` is later than the current time.

### 2.2 Approve / Reject

- Call `POST /api/waterfall/recommendations/{id}/approve`.
- Call `POST /api/waterfall/recommendations/{id}/reject` for another record.
- Verify:
  - `approved_at` and `rejected_at` are stored correctly.
  - `GET /api/waterfall/recommendations` returns correct data when filtered by `status`.

### 2.3 Bulk Approve

- Call `POST /api/waterfall/recommendations/bulk-approve`.
- Verify `approvedCount` matches the number of selected pending/high-priority records.

### 2.4 Apply

- Use only one low-traffic pilot mediation group.
- Call `POST /api/waterfall/apply` with approved recommendations.
- Verify:
  - Backend returns `success = true`.
  - `waterfall_recommendations.status` changes to `applied`.
  - `recommendation_apply_log` contains new records.
  - The mediation group is synced again from AdMob.
  - Recommendation cache is refreshed after apply.

## 3. Smoke Test Frontend

### 3.1 Mediation Group Detail Tab

- Open `/mediation/{id}?tab=waterfall-optimization`.
- Verify:
  - The `Recommendation Lifecycle` panel is visible.
  - `Analyze`, `Approve All High`, `Apply Approved`, and `History` work.
  - `Run A/B Test` is disabled.
  - Bidding add/toggle and reorder/status toggle no longer imply unsupported persistence.

### 3.2 Suggested Optimization In Mediation Group Detail

- Open `/mediation/{id}?tab=waterfall-optimization`.
- Verify:
  - Suggested optimization is shown in the `OPTIMIZED (Suggested)` area.
  - Suggested floors/actions match the latest recommendation output.
  - Re-analyze refreshes the suggested setup correctly.
  - Apply/Sync keeps the suggested state and current structure aligned.

## 4. Pilot Rollout

- Pilot only 1-3 low-revenue mediation groups.
- Approve/apply recommendations from only one mediation group at a time.
- After each apply, monitor:
  - Activity log domain `waterfall`
  - `recommendation_apply_log`
  - Structure sync result
  - Revenue / match rate / fill rate over the next 24 hours

## 5. Rollback / Safety

- If apply fails:
  - Review `recommendation_apply_log.error_message`
  - Re-sync the mediation group from AdMob
  - Analyze again before retrying
- If structure drift happens after analysis:
  - Do not apply old records
  - Run analyze again to generate a new snapshot

## 6. Known Gaps

- The repo does not yet have a dedicated automated test project for this module.
- `npx tsc --noEmit` is still failing due to existing issues outside the Waterfall Optimizer scope.
- `npm run lint` cannot run in the current environment because the `eslint` command is not available.
