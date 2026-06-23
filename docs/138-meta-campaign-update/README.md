# Meta Campaign Update — Implementation Prompts

Bộ prompt tách nhỏ để **nhiều agent/session độc lập** thực thi tính năng **cập nhật Meta campaign** (campaign config + ad set + ad). Mỗi file phase tự chứa context tối thiểu; file này là index + context dùng chung.

## Quyết định kiến trúc (đã chốt)

- **Direct edit đồng bộ toàn bộ** — user sửa → gọi Graph API ngay → re-sync object đó → trả kết quả. **KHÔNG** có lớp approval/edit-request. Tái dùng pattern `pause/resume/rename` đã có.
- **Scope v1:** Campaign config + Ad set + Ad (status/đổi tên). **KHÔNG** swap creative ở v1 (creative immutable, để pha sau).
- **Resync là nguồn sự thật:** sau update thành công, gọi `IMetaCampaignSyncService.SyncCampaignAsync()` để kéo lại `ConfigJson` từ Meta thay vì tự dựng lại.

## Thứ tự thực thi

| Phase | File | Nội dung |
|---|---|---|
| 1 | [phase-1-client.md](phase-1-client.md) | Client update methods + `ExecuteGraphPostAsync` overload + currency major→minor (Infra/Core) |
| 2 | [phase-2-targeting-builder.md](phase-2-targeting-builder.md) | Tách `MetaAdSetTargetingBuilder` dùng chung create/update (refactor) |
| 3 | [phase-3-dto-service.md](phase-3-dto-service.md) | Update DTOs + `MetaCampaignUpdateService` + validation (Core/Infra) |
| 4 | [phase-4-controller.md](phase-4-controller.md) | 3 endpoint PATCH + activity/operation log (Api) |
| 5 | [phase-5-frontend.md](phase-5-frontend.md) | Edit drawer campaign/adset/ad (Next.js) |
| 6 | [phase-6-test-docs.md](phase-6-test-docs.md) | Unit test + cập nhật docs |

Backend (1→2→3→4) phải build pass trước khi sang frontend (5). Làm tuần tự, build sau mỗi phase.

## Context nghiệp vụ dùng chung

Repo `Amobear.Mediation.Tools` — `.NET 8` Clean Architecture (backend) + Next.js 16 (frontend). Meta API version mặc định `v24.0` (config `MetaAds:ApiVersion`). Trả lời tiếng Việt.

> ⚠️ Định vị code bằng **tên class/method**, KHÔNG hardcode line number (số dòng trôi sau mỗi phase).

### Ma trận thuộc tính Meta cho phép UPDATE

**Campaign** (`POST /{campaign_id}`):
- ✅ `name`, `status` (đã có), `daily_budget`/`lifetime_budget` (**chỉ khi CBO**), `bid_strategy`, `spend_cap`, `start_time`/`stop_time` (lifetime budget).
- ❌ immutable: `objective`, `buying_type`, `is_skadnetwork_attribution`.

**Ad Set** (`POST /{adset_id}`):
- ✅ `name`, `status` (đã có), `daily_budget`/`lifetime_budget` (**chỉ khi ABO**), `bid_amount`/`bid_strategy`/`bid_constraints`, `targeting` (geo/age/gender/locales/placements/user_os — **replace toàn bộ**), `start_time`/`end_time`, `pacing_type`, `optimization_goal` (hạn chế).
- ❌ immutable: `billing_event`, `promoted_object.application_id`, `campaign_id`.

**Ad** (`POST /{ad_id}`):
- v1: ✅ `name`, `status`. (swap `creative` để pha sau.)

**Creative:** immutable hoàn toàn — không sửa được tại chỗ.

### 3 ràng buộc xuyên suốt
1. **Targeting replace toàn bộ** — Meta thay nguyên object, không merge → form bắt buộc **pre-fill từ `ConfigJson` hiện tại** trước khi cho sửa.
2. **CBO vs ABO** — budget chỉ tồn tại ở *một* cấp. Gửi sai cấp → Meta reject 400. Đọc `ConfigJson` / `IsAdSetBudgetSharingEnabled` để biết gửi vào đâu.
3. **Currency minor units** — UI nhập major, gửi API minor. Đã có `MetaCurrencyHelper.ConvertMinorUnitsToMajorString`, cần hàm ngược.

### Cảnh báo learning-phase (non-blocking)
Đổi budget >~20% / bid / optimization / targeting → Meta reset learning phase. Trả về dạng **warning**, không chặn.

## Hiện trạng codebase (đã có)

| Thành phần | File | Trạng thái |
|---|---|---|
| Client update rời rạc | `MetaAdsClient.cs` — `UpdateCampaignStatusAsync`, `UpdateCampaignNameAsync`, `UpdateAdSetAsync(name,status)` | Đã có, tái dùng pattern |
| Form-encode payload (object lồng) | `MetaAdsClient.cs` — `AddPayloadParameters` | Đã có, dùng cho update targeting |
| Build adset targeting | `MetaAdSetTargetingBuilder.cs` — dùng chung create/update | Đã triển khai (phase 2) |
| Resync 1 campaign | `IMetaCampaignSyncService.SyncCampaignAsync` | Đã có, gọi sau update |
| Sync lock | `MetaCampaignSyncLock` entity + repo | Đã có, acquire khi update |
| Access guard | `MetaCampaignsController` — `HasCampaignAccess`, `GetAccessible*` | Đã có |
| Currency convert | `MetaCurrencyHelper.ConvertMinorUnitsToMajorString`, `ConvertMajorToMinorUnits` | Đã triển khai hai chiều minor↔major |

## Verify chung

```powershell
dotnet build backend/MediationPro.sln
dotnet test  backend/MediationPro.sln -c Release
cd frontend; pnpm lint; pnpm build; pnpm test
```
