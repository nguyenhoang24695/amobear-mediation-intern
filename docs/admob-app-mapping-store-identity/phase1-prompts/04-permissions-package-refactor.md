# Prompt 04 — Giữ phân quyền theo AdMob App ID

> Đọc trước: README gốc + `00-INDEX.md`. Phụ thuộc: Prompt 01 + 02 nếu cần dữ liệu mapping để test UI/filter. Đây là prompt đã được đổi hướng sau review nghiệp vụ.

## Mục tiêu

Không migrate `app_permissions` sang package/store identity. `AppPermission.AppId` tiếp tục mang nghĩa **AdMob App ID** (`ca-app-pub-xxx~yyy`) như logic cũ.

Store identity/package chỉ dùng cho:
- grouping UI AdMob App Mapping,
- binding dữ liệu paid media,
- chuẩn hóa store identity cho reconciliation/analytics sau này.

Store identity/package **không** là authorization key.

## Quy tắc nghiệp vụ

- Một package/store identity có nhiều AdMob App ID thì quyền **không tự gộp**.
- User có quyền trên AdMob App ID nào thì chỉ access app/binding của AdMob App ID đó.
- App unmapped vẫn có thể được phân quyền nếu `app_permissions.app_id` chứa chính AdMob App ID đó.
- Super admin có quyền Owner trên tất cả `apps.app_id`.
- Màn AdMob App Mapping có thể group nhiều binding cùng package thành một row, nhưng API/filter vẫn chỉ trả binding/app mà user được phép theo `app_row_id -> apps.app_id`.

## Phạm vi code

Trong `backend/MediationPro.Infrastructure/Services/PermissionService.cs`:

1. `GetEffectivePermissionsAsync(super_admin)` enumerate `Apps.AppId`, không enumerate `StoreAppIdentities.NormalizedStoreIdentifier`.
2. `HasAppPermissionAsync(userId, appId, requiredLevel)` check trực tiếp `effective.AppPermissions[appId]`, không resolve AdMob App ID sang package.
3. `GrantAppPermissionAsync(...)` lưu nguyên `appId` truyền vào.
4. `GetAppPermissionsAsync(appId)` query trực tiếp theo AdMob App ID.
5. `GetUserAccessibleAppsAsync(userId)` lấy app bằng `Apps.AppId IN effective.AppPermissions.Keys`.
6. Xóa mọi helper/flow resolve AdMob App ID -> package trong permission service.

Trong `StoreAppIdentityService` và controller mapping:

- Permission check vẫn dùng `app.AppId`.
- Không chuyển caller sang package.

## Migration

Không tạo migration mới cho `app_permissions` và không chạy migration data kiểu `MigrateAppPermissionsToPackage`.

Nếu repo còn file migration `20260602120000_MigrateAppPermissionsToPackage.cs`, phải xóa/revert vì migration này đổi dữ liệu quyền từ AdMob App ID sang package và không còn đúng nghiệp vụ.

## Tests bắt buộc

- Hai AdMob App ID cùng package vẫn có permission key riêng.
- `HasAppPermissionAsync` chỉ true với đúng AdMob App ID được grant.
- Cùng package nhưng AdMob App ID khác không kế thừa quyền.
- App unmapped vẫn access được nếu có quyền exact AdMob App ID.
- `GetUserAccessibleAppsAsync` trả app theo `Apps.AppId` được grant trực tiếp.
- `GrantAppPermissionAsync` lưu nguyên AdMob App ID.
- Controller/service AdMob mapping filter theo `apps.app_id`, không theo package.

## Acceptance criteria

- Backend tests liên quan permission pass.
- Không còn migration/prompt hướng dẫn đổi `app_permissions.app_id` sang package.
- Tài liệu ghi rõ store identity là data identity/display grouping, không phải authorization key.
