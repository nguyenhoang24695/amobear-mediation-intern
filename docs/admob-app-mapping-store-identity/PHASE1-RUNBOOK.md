# Runbook Deploy & Rollback — Phase 1

Phase 1 triển khai AdMob App Mapping theo Store Identity. Phân quyền app vẫn giữ theo AdMob App ID, không migrate `app_permissions` sang package.

## Thay đổi chính

- `paid_media_app_bindings` có thêm `admob_account_id`, `app_row_id`, và cho phép `store_app_identity_id` nullable để biểu diễn unmapped.
- `StoreAppIdentityService` hỗ trợ `network="admob"`.
- `StructureSyncJob`/backfill tạo binding AdMob từ bảng `apps`.
- `AdmobAppMappingsController` và UI AdMob App Mapping quản lý binding theo store identity.
- `PermissionService` check quyền theo exact AdMob App ID (`apps.app_id` / `app_permissions.app_id`).

## Deploy

1. Apply migration schema cho `paid_media_app_bindings`.
2. Deploy backend code mới.
3. Chạy backfill AdMob bindings nếu cần.
4. Deploy frontend code mới.
5. Trigger `StructureSyncJob` thủ công một lần trên môi trường cần kiểm tra.

Không chạy migration `MigrateAppPermissionsToPackage`. Không cần backup/restore riêng cho `app_permissions` vì semantic và schema của bảng này không đổi.

## Smoke test

| STT | Kiểm thử | Kết quả mong đợi |
|---|---|---|
| 1 | Super admin mở danh sách apps/mapping | Thấy tất cả app/binding, có quyền thao tác |
| 2 | User thường có quyền trên một AdMob App ID | Chỉ thấy app/binding của AdMob App ID đó |
| 3 | Hai AdMob App ID cùng package | UI mapping có thể group thành một row, nhưng quyền không tự kế thừa giữa hai App ID |
| 4 | App unmapped có permission exact AdMob App ID | User vẫn access được app đó |
| 5 | Chạy `StructureSyncJob` hai lần | Không tạo duplicate binding |
| 6 | Edit mapping | Save thành công khi các binding trong group cùng platform + store identity |

## Rollback

1. Deploy lại frontend stable nếu UI lỗi.
2. Deploy lại backend stable nếu API/service lỗi.
3. Rollback migration schema của `paid_media_app_bindings` nếu cần quay về trước Phase 1.
4. Chạy lại structure sync hoặc backfill sau khi deploy lại bản fix.

Không có bước restore `app_permissions_backup_pre_package` vì không còn tạo backup/migration package-permission.
