# 117 - WATERFALL APPLY POLICY AUTO-SEMI-MANUAL

## Summary

- Muc tieu: cho phep cau hinh per mediation group cach xu ly waterfall theo 3 mode: `manual`, `semi_auto`, `auto`.
- Chu ky mac dinh la `7 ngay`.
- Due cycle duoc tinh theo `ngay GMT+7` va moc xu ly co dinh la `09:00 GMT+7`.
- Nguon audit apply tiep tuc dung bang hien co `recommendation_apply_log`.
- Can them policy table rieng vi `MediationGroups` la du lieu sync tu AdMob, khong phai noi luu policy noi bo.
- He thong phai xu ly ca 2 nguon thay doi waterfall:
  - apply tu he thong Mediation Pro
  - thay doi truc tiep tren AdMob roi sync ve

## Scope

### In scope

- Backend DB schema cho policy.
- API doc va cap nhat policy.
- Job nen xu ly due cycle.
- Detect external apply hoac external change qua sync.
- Alert Center va bell cho semi-auto.
- Telegram notification cho semi-auto qua topic `recommendation_alerts`.
- Auto apply dung lai luong apply hien co.
- Activity logs cho cac su kien policy/apply moi.
- UI confirm popup khi doi mode policy.

### Out of scope

- Cho user cau hinh `interval_days` tren UI trong phase nay.
- Thay doi behavior cua alert APIs cu `/api/Alerts/active*`.
- Thiet ke lai recommendation lifecycle hien co.

## Product Behavior

### 1. Manual

- Khong auto apply.
- Khong tao alert overdue.

### 2. Semi-auto

- Khi den han 7 ngay, he thong tinh recommendation moi.
- Neu co actionable changes, tao 1 alert overdue cho dung chu ky do.
- Khi tao alert overdue moi, he thong gui 1 Telegram message qua topic `recommendation_alerts` trong `appsettings`.
- Neu khong co actionable changes, reset chu ky ma khong tao alert.

### 3. Auto

- Khi den han 7 ngay, he thong tinh recommendation moi.
- Neu co actionable changes, tu apply.
- Neu khong co actionable changes, reset chu ky nhu mot lan review no-op.
- Neu auto apply fail, ghi log that bai va tao alert loi de nguoi dung biet.

## Locked Decisions

- External change tren AdMob khi sync phat hien semantic waterfall change se reset chu ky.
- Alert semi-auto chi ban mot lan cho moi chu ky overdue.
- Mediation moi bat policy se bat dau dem 7 ngay tu luc bat policy.
- Neu due nhung recommendation khong sinh actionable changes, he thong reset cycle.
- `last_observed_apply_at` la moc cuoi cung he thong quan sat duoc mot lan apply hoac change that su cua waterfall.
- Voi apply truc tiep tren AdMob, `last_observed_apply_at` bang thoi diem sync phat hien thay doi, khong phai thoi diem thuc te ben Google.
- `due_at` luon roi vao `09:00 GMT+7` cua ngay due, khong cong chinh xac `168 gio`.
- Khi user doi apply mode tren UI, he thong phai hien popup confirm truoc khi ghi policy moi.

## Data Model

### New Table: `mediation_group_waterfall_apply_policies`

Moi mediation group co toi da 1 policy record.

| Column | Type | Nullable | Notes |
| --- | --- | --- | --- |
| `mediation_group_id` | `varchar(255)` | No | Primary key |
| `apply_mode` | `varchar(16)` | No | `manual`, `semi_auto`, `auto` |
| `interval_days` | `int` | No | Default `7` |
| `policy_enabled_at` | `timestamptz` | No | Moc policy bat dau co hieu luc |
| `last_cycle_completed_at` | `timestamptz` | Yes | Moc chu ky gan nhat da duoc xu ly xong |
| `last_observed_apply_at` | `timestamptz` | Yes | Lan cuoi he thong quan sat duoc waterfall da doi |
| `last_apply_source` | `varchar(32)` | Yes | `SYSTEM`, `ADMOB_SYNC` |
| `last_observed_waterfall_hash` | `char(64)` | Yes | Hash semantic cua waterfall snapshot gan nhat |
| `last_alerted_anchor_at` | `timestamptz` | Yes | Dung dedupe alert theo chu ky |
| `last_alert_result_id` | `int` | Yes | Alert overdue hoac auto-fail gan nhat |
| `last_evaluated_at` | `timestamptz` | Yes | Lan cuoi job evaluate policy |
| `created_at` | `timestamptz` | No | Audit |
| `updated_at` | `timestamptz` | No | Audit |
| `updated_by` | `uuid` | Yes | User cap nhat policy |

### Existing Table Reused: `recommendation_apply_log`

Khong doi schema. Chuan hoa cach ghi du lieu:

- `status`
  - `SUCCESS`
  - `FAILED`
  - `SKIPPED`
- `action`
  - `MANUAL_APPLY`
  - `AUTO_APPLY`
  - `EXTERNAL_APPLY_DETECTED`
  - `DUE_NO_ACTIONABLE_CHANGES`

### Vi sao van can policy table du da co `recommendation_apply_log`

- `recommendation_apply_log` la audit trail theo su kien.
- Policy table la current state de tinh due nhanh, dedupe alert, va luu cau hinh mode.
- Khong nen derive toan bo state runtime chi tu apply log vi se lam logic phuc tap hon, dac biet o cac nhanh no-op va alert cadence.

## Due Calculation

### Definitions

- `anchor_at = max(policy_enabled_at, last_cycle_completed_at ?? DateTime.MinValue)`
- convert `anchor_at` sang `GMT+7`
- `due_local_date = date(anchor_at_gmt_plus_7) + interval_days`
- `due_at = due_local_date 09:00 GMT+7`
- `is_due = now_utc >= due_at_utc`

### Y nghia

- `policy_enabled_at` chan viec vua bat policy la overdue ngay.
- `last_cycle_completed_at` la moc quan trong de doi chu ky tiep theo.
- `last_observed_apply_at` duoc giu rieng cho muc dich hien thi va audit.
- He thong chi quan tam den `ngay` khi tinh due cycle.

### Example

- Neu `anchor_at = 2026-03-13 23:00 GMT+7`
- Thi `due_at = 2026-03-20 09:00 GMT+7`
- Khong phai `2026-03-20 23:00 GMT+7`

## Waterfall Change Detection From Sync

### Principle

Khong compare raw JSON string cua `MediationGroupLinesJson`.

Phai compare semantic hash cua waterfall snapshot vi:

- thu tu key trong JSON object co the khac nhau
- thu tu `adUnitMappings` co the khac nhau
- serializer co the format khac nhung nghia khong doi

### Semantic hash strategy

Tao helper service `WaterfallSemanticHashService`.

Input:

- `MediationGroupLinesJson` cu tu DB
- `MediationGroupLinesJson` moi sau sync tu AdMob

Normalize:

- parse thanh dictionary line-by-line
- sort theo line id
- voi moi line chi lay cac field co y nghia serving:
  - dictionary key line id
  - `adSourceId`
  - `cpmMode`
  - `cpmMicros`
  - `state`
  - `adUnitMappings` da sort theo key
- bo qua `displayName`

Serialize:

- serialize lai thanh canonical JSON minified
- hash bang SHA-256 ra hex 64 ky tu

### Meaning

- `new_hash != old_hash` nghia la waterfall semantic da thay doi.
- Dieu nay khong chung minh chinh xac user da bam apply luc nao tren AdMob.
- Dieu nay chi chung minh: he thong da quan sat thay cau hinh waterfall moi co hieu luc sau sync.

## Internal Apply And External Apply Reconciliation

Tao service `IWaterfallApplyPolicyService`.

Responsibilities:

- get hoac upsert policy
- mark cycle completed
- log apply result vao `recommendation_apply_log`
- reconcile sync result voi policy
- create hoac resolve due alerts
- ghi `activity_logs` cho cac event runtime can audit

### Internal manual apply

Sau khi `ApplyWaterfallAsync` success:

- ghi apply log `MANUAL_APPLY`
- set `last_cycle_completed_at = applied_at`
- set `last_observed_apply_at = applied_at`
- set `last_apply_source = SYSTEM`
- clear `last_alerted_anchor_at`
- resolve due alert neu co

### Auto apply

Dung cung orchestration voi manual, nhung:

- `action = AUTO_APPLY`
- success thi update policy nhu manual
- sau do tu goi sync MG de load state moi tu AdMob

### External apply detected qua sync

Neu hash doi va khong co internal apply success rat gan truoc do cho cung MG trong cua so dedupe:

- ghi apply log `EXTERNAL_APPLY_DETECTED`
- set `last_cycle_completed_at = sync_time`
- set `last_observed_apply_at = sync_time`
- set `last_apply_source = ADMOB_SYNC`
- update `last_observed_waterfall_hash`
- clear overdue alert neu co

### Dedupe window

- Dung cua so dedupe 10 phut.
- Neu sync xay ra ngay sau internal apply thanh cong:
  - chi update `last_observed_waterfall_hash`
  - khong tao them `EXTERNAL_APPLY_DETECTED`

### Detailed sync decision tree when `MediationGroupLinesJson` changes

#### Step 1. Read old snapshot before overwrite

- Lay `MediationGroups.MediationGroupLinesJson` cu tu DB truoc khi update row hien tai.
- Tinh `old_hash` tu snapshot cu.
- Tinh `new_hash` tu payload moi lay ve tu AdMob.

#### Step 2. Always persist the latest synced snapshot

- Du hash co doi hay khong, van update:
  - `MediationGroupLinesJson`
  - `UpdatedAt`
  - `LastSyncedAt`
- Muc dich la giu local snapshot luon dong bo voi AdMob.

#### Step 3. If `old_hash == new_hash`

- Coi nhu khong co thay doi waterfall o muc semantic.
- Khong ghi `recommendation_apply_log`.
- Khong update:
  - `last_cycle_completed_at`
  - `last_observed_apply_at`
  - `last_apply_source`
- Chi update `last_observed_waterfall_hash` neu policy row da ton tai ma hash dang null hoac lech format.
- Khong tao hoac resolve alert moi chi vi lan sync nay.

#### Step 4. If `old_hash != new_hash`, classify the change

Phai phan loai thay doi vua quan sat duoc la:

- `internal confirm`
- hoac `external change`

#### Step 5. Internal confirm

Neu co mot apply noi bo thanh cong rat gan truoc do cho cung mediation group, voi:

- `action in ('MANUAL_APPLY', 'AUTO_APPLY')`
- `status = SUCCESS`
- `created_at >= sync_time - 10 minutes`

thi coi sync nay chi la buoc xac nhan cho lan apply noi bo vua dien ra.

Xu ly:

- khong ghi them `EXTERNAL_APPLY_DETECTED`
- khong doi:
  - `last_cycle_completed_at`
  - `last_observed_apply_at`
  - `last_apply_source`
- chi update `last_observed_waterfall_hash = new_hash`
- clear recommendation cache va rerun recommendation de baseline moi khop state thuc te

#### Step 6. External change

Neu `old_hash != new_hash` va khong co internal apply success gan do:

- insert 1 dong vao `recommendation_apply_log`
  - `status = SUCCESS`
  - `action = EXTERNAL_APPLY_DETECTED`
  - `request_json = null`
  - `response_json = new snapshot hoac summary payload`
  - `created_at = sync_time`
- update policy:
  - `last_cycle_completed_at = sync_time`
  - `last_observed_apply_at = sync_time`
  - `last_apply_source = ADMOB_SYNC`
  - `last_observed_waterfall_hash = new_hash`
  - `last_alerted_anchor_at = null`
- resolve alert overdue dang mo cho mediation group do
- clear recommendation cache va rerun recommendation

#### Step 7. Meaning of `last_observed_apply_at`

- Voi apply noi bo: day la thoi diem apply thanh cong.
- Voi thay doi phat hien qua sync tu AdMob: day la thoi diem he thong quan sat thay waterfall da doi.
- Khong dung cot nay de suy luan chinh xac user da bam Apply tren giao dien AdMob luc nao.

### Full sync note

Current full sync flow trong `StructureSyncJob.SyncMediationGroupsAsync` dang xoa roi insert lai toan bo mediation groups theo publisher.

De van detect external change dung trong full sync:

- build map `mediationGroupId -> old_hash` truoc khi xoa rows cu
- sau khi lay snapshot moi tu AdMob, tinh `new_hash` cho tung mediation group
- compare voi map cu
- sau do moi quyet dinh co ghi `EXTERNAL_APPLY_DETECTED` va update policy hay khong

Neu khong lam buoc nay, full sync se lam mat baseline cu va khong the phan biet duoc mediation group nao vua doi waterfall.

## Recommendation To Apply Payload

### Problem

Hien builder `recommendation -> ApplyDirectChanges` dang nam o frontend trong `waterfall-optimization-tab.tsx`.

De ho tro auto mode o backend, can tach logic nay thanh builder dung chung phia backend.

### New service: `WaterfallApplyPayloadBuilder`

Input:

- `WaterfallRecommendationsResponseDto`
- current `mediation_group_lines`

Output:

- `ApplyWaterfallRequestDto`

### Mapping rules

- `REMOVE` -> `sourcesRemoved`
- `INCREASE 10%`, `INCREASE 20%` voi floor khac hien tai -> `floorsModified`
- `ADD LAYER`, `ADD HIGHER` -> `sourcesAdded`
- `KEEP`, `TEST REDUCE` -> ignore

### Actionable changes

Chi bao gom:

- modify floor
- remove line
- add line voi `adSourceId == AdMobNetworkAdSourceId`

### Important normalization note

- Synthetic recommendation cho AdMob Network phai dung `AdMobNetworkAdSourceId`.
- Khong dung literal `"admob"` vi downstream apply compare theo technical ID that.

Neu recommendation chi con unsupported add actions hoac toan `KEEP`, coi la `no actionable changes`.

## New Backend APIs

### 1. `GET /api/WaterfallManagement/policy/{mediationGroupId}`

Response mau:

```json
{
  "mediationGroupId": "ca-app-pub-xxx:mg:yyy",
  "applyMode": "manual",
  "intervalDays": 7,
  "policyEnabledAt": "2026-03-13T10:00:00Z",
  "lastCycleCompletedAt": null,
  "lastObservedApplyAt": null,
  "lastApplySource": null,
  "dueAt": "2026-03-20T02:00:00Z",
  "isDue": false,
  "lastAlertResultId": null
}
```

Note:

- `dueAt` tra ve theo UTC.
- UI hien thi `dueAt` theo `GMT+7`.

### 2. `PUT /api/WaterfallManagement/policy/{mediationGroupId}`

Request mau:

```json
{
  "applyMode": "semi_auto"
}
```

Behavior:

- neu chua co row thi create
- neu chuyen tu `manual -> semi_auto|auto`
  - set `policy_enabled_at = now`
  - giu `last_observed_apply_at` cu neu co
  - set `last_cycle_completed_at = now`
  - clear pending due alert
- neu chuyen ve `manual`
  - resolve due alert dang mo
  - giu history fields de audit

## New Alert APIs

### 1. `GET /api/Alerts/open`

- tra unresolved alerts voi status trong `PENDING`, `SENT`, `ACKNOWLEDGED`
- khong filter theo hom nay

### 2. `GET /api/Alerts/open/summary`

- tong hop unresolved alerts cho bell va dashboard widgets

## Activity Logging

Ngoai `recommendation_apply_log`, he thong con ghi `activity_logs` cho cac su kien:

- `waterfall.policy.updated`
- `waterfall.auto_apply.succeeded`
- `waterfall.auto_apply.failed`
- `waterfall.apply_due.alert_created`
- `waterfall.external_apply.detected`
- `waterfall.due_cycle.no_actionable_changes`

Muc dich:

- hien thi `View Activity` ngay tai mediation group
- audit ro hanh vi do user kich hoat va hanh vi system-driven
- ho tro QA va debug ma khong phai doc raw apply log

## Compatibility

- Khong doi behavior cua `/api/Alerts/active`
- Khong doi behavior cua `/api/Alerts/active/summary`
- Alert Center page va bell chuyen sang dung endpoints moi

## New Jobs

### `WaterfallApplyPolicyJob`

Schedule:

- production recurring job: `09:00 GMT+7` hang ngay
- cron seed: `0 2 * * *` theo UTC

### Flow

1. Query policies co `apply_mode in ('semi_auto', 'auto')`.
2. Load policy + mediation group + publisher.
3. Compute `due_at`.
4. Skip neu chua due.
5. Run recommendation fresh cho mediation group.
6. Build payload qua `WaterfallApplyPayloadBuilder`.
7. Neu khong co actionable changes:
   - ghi apply log `SKIPPED / DUE_NO_ACTIONABLE_CHANGES`
   - set `last_cycle_completed_at = now`
   - clear overdue alert neu co
8. Neu `semi_auto`:
   - neu `last_alerted_anchor_at != anchor_at`, tao 1 due alert
   - gui Telegram qua topic `recommendation_alerts`
   - set `last_alerted_anchor_at = anchor_at`
9. Neu `auto`:
   - attempt apply
   - success: update policy + sync MG
   - fail: ghi apply log `FAILED`, tao hoac upsert alert `WATERFALL_AUTO_APPLY_FAILED`, khong reset cycle

### Development test endpoint

- `POST /api/v1/jobs-test/waterfall-apply-policy`
- Dung cho local/dev khi Hangfire recurring jobs khong auto schedule trong `Development`

## Alert Model

Seed 2 system alert rules neu chua co:

- `WATERFALL_APPLY_DUE`
- `WATERFALL_AUTO_APPLY_FAILED`

### AdditionalData cho due alert

- `dueAt`
- `anchorAt`
- `applyMode`
- `intervalDays`
- `lastObservedApplyAt`
- `lastApplySource`
- `actionableChangesCount`
- `app`
- `appId`
- `mediation`
- `mediationInfo`
- `mediationGroupId`
- `revenue7d`
- `impressions7d`
- `ecpm7d`
- `revenueWindowUtc`
- `floorsModified`
- `sourcesAdded`
- `sourcesRemoved`
- `openInMediationPro`

### Semi-auto Telegram

- Chi gui khi alert due moi duoc tao cho chu ky overdue hien tai.
- Dung `TelegramService` va topic `recommendation_alerts`.
- Deep link duoc build tu `Frontend:BaseUrl` trong `appsettings`.
- Message can co:
  - ten app va `AppId`
  - ten mediation va thong tin `Platform | AdFormat | State`
  - `MediationGroupId`
  - `DueAt`, `LastObservedApplyAt`, `LastApplySource`
  - `Revenue 7d`, `Impressions 7d`, `eCPM 7d`
  - `Changes Summary` dung theo payload actionable that su se apply
- `Revenue 7d` va metrics lien quan phai dung `7 complete days` gan nhat, khong tinh ngay hien tai dang do.
- `AlertResult` duoc update:
  - `NotificationChannelsAttempted = ["TELEGRAM"]`
  - `NotificationChannelsSucceeded = ["TELEGRAM"]` neu gui thanh cong
  - `Status = SENT` neu gui thanh cong, hoac giu `PENDING` neu gui that bai
  - `SentAt` va `ErrorMessage` duoc cap nhat theo ket qua gui
- Ghi `NotificationLog` cho lan gui Telegram de audit.

### Deep link

- `/mediation/{mediationGroupId}?tab=waterfall-optimization`

## Frontend Changes

### Policy card

Them card o dau tab `Waterfall & Optimization`.

Controls:

- select `Manual`, `Semi-auto`, `Auto`
- save button
- save button mo popup confirm truoc khi gay thay doi policy

Read-only status:

- `Last observed apply`
- `Next due (GMT+7)`
- `Apply source`
- note `Interval: 7 days`

Khong hien thi:

- `Last cycle completed`

### Policy save UX

- Khi user bam `Save`, hien thi popup confirm theo mode dich:
  - sang `auto`
  - sang `semi_auto`
  - sang `manual`
- Sau khi luu thanh cong, hien thi success toast.
- Neu luu loi, hien thi destructive error toast.

### Replace mock data

- `frontend/components/alerts/alert-center-content-v2.tsx` (trang `/alert-center`) dung `alertsApi.getOpenAlerts` va timeline `GET /api/Alerts/center/timeline`
- `frontend/components/shared/notification-popup.tsx` dung hook thong bao mo; link chi tiet `/alert-center/{id}`, xem tat ca `/alert-center`

### Alert UI mapping

- `WATERFALL_APPLY_DUE` => warning
- `WATERFALL_AUTO_APPLY_FAILED` => warning hoac critical theo severity seeded

### Manual apply flow

Giu nguyen `apply -> sync` o frontend, nhung backend phai ghi policy va apply log day du ngay sau buoc apply success.

## Implementation Sequence

1. Tao migration cho bang `mediation_group_waterfall_apply_policies`.
2. Add entity, DbSet, EF mapping, indexes.
3. Implement `WaterfallSemanticHashService`.
4. Implement `IWaterfallApplyPolicyService`.
5. Refactor `WaterfallManagementController.ApplyWaterfall` sang apply orchestration dung chung.
6. Them policy APIs.
7. Them detect external change vao single sync va full sync.
8. Implement `WaterfallApplyPayloadBuilder`.
9. Implement `WaterfallApplyPolicyJob` va register Hangfire schedule `09:00 GMT+7`.
10. Seed 2 system alert rules.
11. Add new `/api/Alerts/open*` endpoints.
12. Noi frontend policy card, alert center, bell sang API that.
13. Add activity log entries cho policy change, auto apply success/fail, due alert creation, external apply detect, due no actionable changes.
14. Them jobs-test endpoint cho `waterfall-apply-policy` de QA/local test.
15. Cap nhat UI policy card: an `Last cycle completed`, hien thi `Next due (GMT+7)`, them confirm popup khi save.
16. Gui Telegram cho semi-auto due alert bang `TelegramService` va luu `NotificationLog`.
17. Them `Frontend:BaseUrl` vao `appsettings` de build deep link cho Telegram.
18. Dung `7 complete days` cho recommendation evaluate window va metrics trong semi-auto alert.

## Test Cases

### Policy creation and due calculation

- Tao policy moi cho MG chua tung apply:
  - mode `semi_auto`
  - `dueAt` = ngay `policy_enabled_at + 7 ngay` tinh theo GMT+7, tai `09:00 GMT+7`
- Chuyen `manual -> auto`:
  - khong apply ngay
  - khong alert ngay
  - hien popup confirm truoc khi save

### Due date by day, not by hour

- Neu policy duoc bat hoac cycle duoc complete luc `23:00 GMT+7` ngay 13/03
- Thi due lan tiep theo van phai la `09:00 GMT+7` ngay 20/03
- Khong phai `23:00 GMT+7` ngay 20/03

### Due cycle with actionable recommendation

- `semi_auto` tao dung 1 due alert cho chu ky do
- `semi_auto` gui dung 1 Telegram message qua topic `recommendation_alerts`
- Telegram co:
  - `App`, `AppId`
  - `Mediation`, `MediationInfo`, `MediationGroupId`
  - deep link `/mediation/{mediationGroupId}?tab=waterfall-optimization`
  - `Revenue 7d`, `Impressions 7d`, `eCPM 7d`
  - `Changes Summary` theo payload actionable
- `auto` apply thanh cong, sync lai, update policy

### Due cycle with no actionable changes

- ghi `SKIPPED`
- reset `last_cycle_completed_at`
- khong tao due alert moi

### Manual apply

- apply tu UI thanh cong
- ghi `MANUAL_APPLY`
- reset due cycle
- resolve due alert

### External apply via AdMob

- user doi waterfall truc tiep tren AdMob roi sync
- semantic hash doi
- ghi `EXTERNAL_APPLY_DETECTED`
- reset due cycle
- resolve due alert

### Internal apply followed by sync

- apply internal success roi sync ngay
- khong sinh them external apply log

### Auto apply fail

- ghi `FAILED`
- tao hoac upsert `WATERFALL_AUTO_APPLY_FAILED`
- cycle van overdue de retry o lan job sau

### Alert Center and bell

- dung unresolved open alerts
- alert khong mat chi vi qua ngay moi

### Semi-auto Telegram delivery

- Khi tao due alert moi, `AlertResult` co `NotificationChannelsAttempted` chua `TELEGRAM`
- Neu gui thanh cong:
  - `AlertResult.Status = SENT`
  - co `SentAt`
  - co `NotificationLog` channel `TELEGRAM`, recipient `recommendation_alerts`, status `SUCCESS`
- Neu gui that bai:
  - `AlertResult.Status` van la `PENDING`
  - co `ErrorMessage`
  - co `NotificationLog` status `FAILED`
- Neu `Frontend:BaseUrl` duoc cau hinh:
  - Telegram co deep link click truc tiep vao man mediation waterfall optimization
- Neu metrics 7d khong resolve duoc:
  - field lien quan hien `N/A`, nhung van gui alert

### Policy save UX

- `Save` chi gay update sau khi user confirm trong popup
- success toast hien thi sau khi update policy thanh cong
- error toast hien thi khi update policy that bai

### Development job execution

- local/dev co the goi `POST /api/v1/jobs-test/waterfall-apply-policy`
- khong can cho Hangfire recurring scheduler

### Full publisher sync

- detect external change van hoat dong du current code remove va reinsert MG rows

## Acceptance Criteria

- User co the cau hinh policy per mediation group.
- Sau 7 ngay:
  - `auto` tu apply neu co actionable changes
  - `semi_auto` hien alert o Alert Center va bell, dong thoi gui Telegram qua topic `recommendation_alerts`
  - `manual` khong lam gi
- Due cycle duoc tinh theo `ngay GMT+7` va chay o moc `09:00 GMT+7`.
- UI mediation khong hien thi `Last cycle completed`.
- Khi doi apply mode, user phai confirm trong popup truoc khi policy duoc luu.
- External apply tu AdMob duoc he thong ghi nhan sau sync va reset chu ky.
- Khong co duplicate alert trong cung mot due cycle.
- Khong co duplicate external apply log sau internal apply + sync.
- Khong lam vo cac endpoints alert cu dang dung o cac man khac.

## Assumptions

- Ten file tai lieu la `117 - WATERFALL APPLY POLICY AUTO-SEMI-MANUAL.md`.
- `displayName` khong duoc tinh la semantic waterfall change.
- Cua so dedupe internal-apply-vs-sync la 10 phut.
- `interval_days` luu trong DB de future-proof nhung release nay khong expose chinh sua tren UI.
- `recommendation_apply_log` la audit trail chinh.
- Policy table la state nhanh de tinh due va dedupe alert.
