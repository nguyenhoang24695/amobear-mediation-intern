# Prompt 07 — Tests, Deploy & Rollback

> Đọc trước: README gốc + `00-INDEX.md`. Phụ thuộc: 01-06 hoặc viết test song song khi từng phần xong.

## Mục tiêu

Đảm bảo Phase 1 end-to-end cho AdMob App Mapping theo Store Identity, đồng thời khóa regression quan trọng: permission vẫn theo AdMob App ID, không theo package.

## Tests

### Backend

- Permission exact: user có quyền trên `ca-app-pub-111~aaa` thì chỉ access App ID đó.
- Hai AdMob App ID cùng package không inherit permission lẫn nhau.
- App unmapped vẫn access được nếu permission exact AdMob App ID tồn tại.
- `GetUserAccessibleAppsAsync` trả app theo `Apps.AppId` được grant trực tiếp.
- `GrantAppPermissionAsync` lưu nguyên AdMob App ID.
- `StoreAppIdentityService` upsert admob: tạo binding với `app_row_id`/`admob_account_id`, app cùng package group đúng store identity, unmapped khi thiếu store info, idempotent.
- Controller mapping filter theo accessible `apps.app_id`, không theo package.

### Frontend

- Trang AdMob App Mapping render grouped rows theo store identity.
- Một store identity có nhiều binding vẫn là một row.
- Drawer edit chọn account -> app, validate cùng platform + store identity.

## Deploy

1. Apply migration schema cho `paid_media_app_bindings`.
2. Deploy backend.
3. Chạy backfill AdMob bindings nếu cần.
4. Deploy frontend.
5. Trigger AdMob structure sync một lần để chốt bindings mới nhất.

Không chạy migration migrate `app_permissions`; không tạo `app_permissions_backup_pre_package`; không bump cache chỉ vì permission key vì semantic không đổi.

## Rollback

- FE: deploy lại bản trước.
- BE: deploy lại bản trước.
- Schema: rollback migration `paid_media_app_bindings` nếu cần.
- Permission data: không cần restore từ backup package vì không đổi dữ liệu `app_permissions`.

## Smoke test

- Super admin thấy tất cả apps/bindings.
- User thường chỉ thấy binding của AdMob App ID được grant.
- Hai binding cùng package hiển thị cùng một row trên UI nhưng quyền vẫn tách theo App ID.
- Structure sync chạy lặp không tạo duplicate.

## Verification

- `dotnet test backend/MediationPro.Api.Tests/MediationPro.Api.Tests.csproj -v minimal`
- Vitest/typecheck frontend theo phần UI nếu có thay đổi frontend.
