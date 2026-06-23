# Prompt 05 — API Controller: AdMob App Mappings

> Đọc trước: README gốc + `00-INDEX.md`. **Phụ thuộc: Prompt 03** (service admob sẵn sàng). Prompt 04 giữ permission theo AdMob App ID.

## Mục tiêu
Cung cấp REST endpoints quản lý AdMob app mappings, mirror pattern đã có ở `MetaAccountsController` nhưng cho `network='admob'`.

## Bối cảnh
- Mẫu: `backend/MediationPro.Api/Controllers/MetaAccountsController.cs`, route `[Route("api/v1/meta-accounts")]`, các action `app-mappings`, `store-app-mappings`, enable/disable (dòng ~348-810), helper `BuildMetaBindingInput` (~799) tạo `PaidMediaAppBindingInput` với `StoreAppIdentityService.NetworkMeta`.
- Controller AdMob hiện có để cân nhắc mở rộng: `AdMobApiController.cs`, `StructureController.cs`.

## Phạm vi
### IN
1. Tạo controller mới `AdmobAppMappingsController` (route đề xuất `api/v1/admob-accounts` hoặc `api/v1/admob/app-mappings` — chọn nhất quán với route AdMob hiện hữu; verify trong `AdMobApiController`). Hoặc mở rộng controller AdMob hiện có nếu phù hợp hơn — ghi rõ lựa chọn.
2. Endpoints (mirror Meta, network='admob'):
   - `GET app-mappings` — list bindings admob (kèm store identity + app), lọc theo quyền user trên AdMob App ID.
   - `GET store-app-mappings` — list store identities + binding admob tương ứng.
   - `POST app-mappings` / `PUT app-mappings/{id}` — tạo/cập nhật binding admob (set `AppRowId`, `AdmobAccountId`); dùng `StoreAppIdentityService.CreateBindingAsync`/`UpdateBindingAsync` với `NetworkAdmob`.
   - `POST app-mappings/{id}/enable` + `/disable` — bật/tắt binding (`SetBindingEnabledAsync`).
   - (Tùy chọn) endpoint link/unlink store identity riêng nếu UI cần.
3. Helper `BuildAdmobBindingInput(request)` tương tự `BuildMetaBindingInput`, set `Network = StoreAppIdentityService.NetworkAdmob` + `AppRowId`/`AdmobAccountId`.
4. Áp filter quyền: chỉ trả/ghi mapping mà user có quyền theo exact `apps.app_id` / AdMob App ID. Store identity/package chỉ dùng để group/display.
5. Lấy `organizationId`/`userId` theo cùng cơ chế các controller hiện có (claims/middleware).

### OUT
- Không làm discovery/candidates (Meta có `app-mappings/discover` — AdMob Phase 1 không cần, app đã có trong `apps`).
- Không sửa frontend (prompt 06).

## Files dự kiến chạm
- `backend/MediationPro.Api/Controllers/AdmobAppMappingsController.cs` (mới) hoặc controller AdMob hiện có
- (Có thể) DTO request riêng cho admob nếu cần field `AppRowId`/`AdmobAccountId` (hoặc tái dùng `UpsertPaidMediaAppBindingRequestDto`).

## Bắt buộc verify trước khi code
- Route/prefix + cơ chế auth (lấy org/user) của controller AdMob hiện có để nhất quán.
- Cách `MetaAccountsController` lọc theo `accessibleAppIds` để áp tương tự cho admob theo AdMob App ID.

## Acceptance criteria
- Build pass; Swagger hiển thị nhóm endpoint AdMob app-mappings.
- Gọi thử (curl/Swagger): list trả binding admob đúng; tạo/sửa/enable/disable hoạt động; user không có quyền bị chặn (403).
- Tạo binding qua API set đúng `network='admob'`, `app_row_id`, `admob_account_id`.

## Verification
- Gọi endpoint trên môi trường dev với token user thật; kiểm tra DB phản ánh đúng; kiểm tra filter quyền với user hạn chế.
