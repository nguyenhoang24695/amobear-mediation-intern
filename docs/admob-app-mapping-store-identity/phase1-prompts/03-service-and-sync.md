# Prompt 03 — StoreAppIdentityService (admob) + Hook vào StructureSyncJob

> Đọc trước: README gốc + `00-INDEX.md`. **Phụ thuộc: Prompt 01.** (02 không bắt buộc nhưng nên xong để có dữ liệu nền.)

## Mục tiêu
Cho `StoreAppIdentityService` hỗ trợ network `"admob"` (tạo/cập nhật binding có `app_row_id` + `admob_account_id`), và hook vào AdMob structure sync để tự động tạo/cập nhật binding mỗi lần sync app.

## Phạm vi
### IN — Service
1. `StoreAppIdentityService.cs`: thêm hằng số `public const string NetworkAdmob = "admob";`.
2. Cho phép `CreateBindingAsync`/`UpdateBindingAsync` set `AppRowId`, `AdmobAccountId` từ `PaidMediaAppBindingInput` (đã mở rộng ở prompt 01). Nếu cần, thêm method tiện ích `UpsertAdmobBindingAsync(orgId, userId, appRowId, admobAccountId, externalAppId, StoreAppIdentityInput)` để job gọi gọn.
3. Trong `UpsertIdentityAsync`/luồng admob: với binding admob, `app_row_id` là bắt buộc; `store_app_identity` chỉ gắn khi phân giải được package (đồng bộ phương án Unmapped chốt ở prompt 02).
4. Giữ permission check theo `app.AppId` (AdMob App ID). Prompt 04 đã chốt không chuyển permission sang package/store identity.

### IN — Sync hook
5. `backend/MediationPro.Jobs/StructureSyncJob.cs`:
   - Vòng upsert `apps` (~dòng 286-350): sau `SaveChangesAsync`, với mỗi app gọi service tạo/cập nhật binding admob.
   - **Tái dùng** logic phân giải package đã có (~dòng 380-430): ANDROID dùng `app.AppStoreId` làm package; IOS resolve bundle id qua `itunesLookupService.GetBundleIdByAppStoreIdAsync`. Dựng `StoreAppIdentityInput` từ kết quả đó (KHÔNG viết lại normalizer).
   - App không phân giải được package → tạo/cập nhật binding admob ở trạng thái Unmapped (giữ `app_row_id`).
   - Idempotent: chạy sync nhiều lần không tạo trùng (nhờ unique `(org, network, external_app_id)` + upsert).
   - Resolve `admob_account_id` từ `app.PublisherId` → `admob_accounts`.

### OUT
- Không sửa controller (prompt 05), không sửa frontend (prompt 06), không migrate `app_permissions`.

## Files dự kiến chạm
- `backend/MediationPro.Infrastructure/Services/PaidMedia/StoreAppIdentityService.cs`
- (Nếu thêm vào interface) `backend/MediationPro.Core/Interfaces/IStoreAppIdentityService.cs`
- `backend/MediationPro.Jobs/StructureSyncJob.cs`
- (Có thể) DI registration nếu thêm dependency.

## Bắt buộc verify trước khi code
- Chữ ký `itunesLookupService.GetBundleIdByAppStoreIdAsync` và cách nó được inject vào `StructureSyncJob`.
- Cách job lấy `organizationId` cho mỗi app + cách join `publisher_id` → `admob_accounts.id`.
- Logic mapping hiện tại quanh dòng 380-430 (trường `AdmobAppId`, bảng mapping nào) để tái dùng đúng, tránh tạo song song 2 nguồn sự thật.

## Acceptance criteria
- Chạy AdMob structure sync trên dev: mỗi AdMob app có đúng 1 binding `network='admob'`; app có package → gắn store identity đúng; app cùng package gộp 1 identity; app thiếu store info → Unmapped.
- Chạy sync 2 lần liên tiếp: số binding không đổi.
- Backend build + unit test hiện có pass.

## Verification
- Trigger job sync (hoặc gọi hàm sync trong test harness) trên DB dev; query `paid_media_app_bindings WHERE network='admob'`.
- Kiểm tra log không lỗi; vài app IOS có bundle id resolve đúng.
