# Phase 1 — Prompt Index: AdMob App Mapping -> Store Identity

Tài liệu thiết kế gốc: `docs/admob-app-mapping-store-identity/README.md`. Agent phải đọc README trước khi chạy từng prompt.

## Bất biến

1. Không tạo bảng/entity/service riêng cho AdMob binding. Tái dùng `PaidMediaAppBinding`, `StoreAppIdentity`, `StoreAppIdentityService` với `Network = "admob"`.
2. AdMob app đã nằm trong bảng `apps`; binding AdMob mang thêm `app_row_id` và `admob_account_id`.
3. Store identity/package dùng cho mapping, grouping UI và data identity; **không** dùng làm khóa phân quyền.
4. `AppPermission.AppId` vẫn là AdMob App ID (`ca-app-pub-xxx~yyy`). Không migrate `app_permissions` sang package.
5. Binding AdMob chưa map được package dùng `store_app_identity_id = NULL` nhưng vẫn giữ `app_row_id`.
6. Không đụng StarRocks/Analytics trong Phase 1.

## Inventory nhanh

| Thành phần | Đường dẫn |
|---|---|
| Entity binding | `backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs` |
| Entity store identity | `backend/MediationPro.Core/Entities/StoreAppIdentity.cs` |
| Entity AdMob app | `backend/MediationPro.Core/Entities/App.cs` |
| Permission entity | `backend/MediationPro.Core/Entities/AppPermission.cs` |
| Permission service | `backend/MediationPro.Infrastructure/Services/PermissionService.cs` |
| Mapping service | `backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs` |
| AdMob sync job | `backend/MediationPro.Jobs/StructureSyncJob.cs` |
| AdMob mapping controller | `backend/MediationPro.Api/Controllers/AdmobAppMappingsController.cs` |

## Thứ tự thực thi

```
01 (DB schema + entity/DTO) ──┬─> 02 (backfill bindings)
                              ├─> 03 (service + sync hook) ──> 05 (API controller) ──> 06 (frontend)
                              ├─> 04 (permission semantic: keep AdMob App ID)
                              └──────────────────────────────────────────────────────> 07 (tests/deploy/rollback)
```

## Danh sách prompt

- `01-db-schema-entities.md`
- `02-backfill-bindings.md`
- `03-service-and-sync.md`
- `04-permissions-package-refactor.md` (đã đổi hướng: giữ permission theo AdMob App ID)
- `05-api-controller.md`
- `06-frontend.md`
- `07-tests-deploy-rollback.md`

## Definition of Done

- Backend/FE build và tests liên quan pass.
- Migration schema/backfill AdMob binding idempotent.
- UI AdMob App Mapping group nhiều binding cùng store identity thành một row.
- Permission vẫn exact theo AdMob App ID, không inherit theo package.
- Không có migration đổi `app_permissions.app_id` sang package.
