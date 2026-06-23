# AdMob App Mapping -> Store Identity

Tài liệu này mô tả Phase 1 của hệ mapping AdMob app sang Store Identity. Mục tiêu là cho phép một app thực tế trên store (package/App Store ID) có nhiều binding AdMob từ nhiều account khác nhau, trong khi vẫn giữ hệ phân quyền app theo semantic cũ.

## Quyết định hiện hành

- Tái dùng hạ tầng generic `PaidMediaAppBinding` + `StoreAppIdentity` + `StoreAppIdentityService`, với `Network = "admob"`.
- AdMob app đã nằm trong bảng `apps`; binding AdMob mang thêm `app_row_id` và `admob_account_id`.
- `store_app_identities.normalized_store_identifier` là khóa data/display để group UI theo store package/App Store ID.
- `AppPermission.AppId` vẫn là **AdMob App ID** (`ca-app-pub-xxx~yyy`). Package/store identity không phải authorization key.
- Không migrate `app_permissions` sang package. Migration `20260602120000_MigrateAppPermissionsToPackage` không còn hợp lệ và không được chạy.

## Inventory chính

| Thành phần | File | Vai trò |
|---|---|---|
| Binding generic | `backend/MediationPro.Core/Entities/PaidMediaAppBinding.cs` | Lưu binding theo `Network`, `ExternalAppId`, `StoreAppIdentityId`, `AppRowId`, `AdmobAccountId` |
| Store identity | `backend/MediationPro.Core/Entities/StoreAppIdentity.cs` | Đại diện app thực tế theo `(organization_id, platform, normalized_store_identifier)` |
| AdMob app | `backend/MediationPro.Core/Entities/App.cs` | Nguồn AdMob app; `AppId` là AdMob App ID, `AppStoreId` thường là package/App Store ID |
| Mapping service | `backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs` | Upsert/list/update binding cho `network="admob"` |
| Permission service | `backend/MediationPro.Infrastructure/Services/PermissionService.cs` | Check permission theo exact `apps.app_id` / `app_permissions.app_id` |
| AdMob mapping API | `backend/MediationPro.Api/Controllers/AdmobAppMappingsController.cs` | List/create/update/enable/disable mapping; filter theo quyền AdMob App ID |

## Database và dữ liệu

`paid_media_app_bindings` cần các cột AdMob-specific:

```sql
ALTER TABLE paid_media_app_bindings
    ADD COLUMN IF NOT EXISTS admob_account_id integer NULL,
    ADD COLUMN IF NOT EXISTS app_row_id integer NULL;

ALTER TABLE paid_media_app_bindings
    ALTER COLUMN store_app_identity_id DROP NOT NULL;
```

Backfill/sync tạo một binding `network='admob'` cho mỗi AdMob app:

- Có store info hợp lệ: binding trỏ tới `store_app_identity_id` tương ứng.
- Thiếu store info: binding vẫn có `app_row_id` nhưng `store_app_identity_id = NULL` để hiển thị trạng thái unmapped.
- Idempotent theo unique `(organization_id, network, external_app_id)`.

## Phân quyền

Phân quyền app vẫn theo từng AdMob App ID:

- Super admin được Owner trên tất cả `apps.app_id`.
- User thường chỉ access app/binding có `app_permissions.app_id` khớp exact `apps.app_id`.
- Hai AdMob App ID cùng package không kế thừa/gộp quyền.
- App unmapped không làm mất quyền nếu user được grant trực tiếp AdMob App ID đó.
- Màn AdMob App Mapping có thể group theo store identity, nhưng API chỉ trả các binding/app user được phép theo `app_row_id -> apps.app_id`.

## Frontend mapping

Màn AdMob App Mapping hiện group theo Store Identity để tránh một app/package xuất hiện nhiều dòng khi có nhiều AdMob account.

- Group key ưu tiên `platform + normalizedStoreIdentifier/packageName/appStoreId`.
- Binding trong drawer chọn AdMob Account rồi chọn AdMob App thuộc account đó.
- Không có dropdown `Linked Internal App` riêng; binding lấy thông tin read-only từ AdMob App đã sync.
- Validate mọi binding trong cùng group có cùng `platform + store identity` trước khi save.

## Deploy Phase 1

1. Apply migration schema cho `paid_media_app_bindings` và entity/DTO liên quan.
2. Deploy backend có `StoreAppIdentityService` hỗ trợ `network="admob"` và controller mapping.
3. Chạy backfill/sync AdMob bindings.
4. Deploy frontend AdMob App Mapping.
5. Trigger AdMob structure sync để cập nhật binding mới nhất.

Không có bước migrate `app_permissions` sang package và không cần invalidate permission cache vì semantic key không đổi.

## Tests cần giữ

- Permission exact theo AdMob App ID, không inherit theo package.
- Store identity service upsert AdMob binding idempotent.
- Controller mapping filter theo accessible `apps.app_id`.
- UI group cùng store identity thành một row nhưng vẫn hiển thị đủ bindings.
