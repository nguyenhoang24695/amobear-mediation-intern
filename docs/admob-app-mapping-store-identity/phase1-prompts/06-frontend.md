# Prompt 06 — Frontend: Trang AdMob App Mappings

> Đọc trước: README gốc + `00-INDEX.md`. **Phụ thuộc: Prompt 05** (API sẵn sàng).

## Mục tiêu
Xây trang "AdMob App Mappings" cho người dùng quản lý liên kết AdMob app ↔ Store Identity, mirror trang Meta/TikTok.

## Bối cảnh (mẫu để clone)
- Trang: `frontend/app/meta-ads/app-mappings/page.tsx` (+ `frontend/app/tiktok-ads/app-mappings/page.tsx`).
- Component: `frontend/components/meta-ads/app-mappings/app-mappings-content.tsx`.
- API client: `frontend/lib/api/meta-ads.ts` (hàm app-mappings), `frontend/lib/api/tiktok-ads.ts`.
- Sidebar: `frontend/components/dashboard/sidebar.tsx`.

## Phạm vi
### IN
1. **API client** `frontend/lib/api/admob-ads.ts` (hoặc bổ sung vào client AdMob hiện có nếu đã tồn tại — verify): hàm gọi các endpoint từ prompt 05 (list, create, update, enable, disable). Kiểu dữ liệu mirror `PaidMediaAppBindingDto` (gồm `admobAccountId`, `appRowId`, `linkedStoreIdentity`, trạng thái).
2. **Trang** `frontend/app/admob-ads/app-mappings/page.tsx` (hoặc đường dẫn nhất quán với cấu trúc AdMob hiện có).
3. **Component** `frontend/components/admob-ads/app-mappings/app-mappings-content.tsx` (clone từ meta):
   - Bảng list: AdMob App ID, tài khoản AdMob (account), DisplayName, cột "Linked Store Identity" (package/store), trạng thái **Active / Unmapped**.
   - Modal Link/Unlink: chọn Store Identity sẵn có hoặc nhập Store URL / Package Name để tạo/gắn.
   - Enable/disable binding.
4. **Sidebar**: thêm mục "AdMob App Mappings" (đặt cùng nhóm các trang AdMob; kiểm tra điều kiện hiển thị theo quyền/role giống các mục khác).
5. Tôn trọng phân quyền: chỉ hiển thị/cho thao tác app mà user có quyền (API đã filter; FE xử lý trạng thái loading/empty/403).

### OUT
- Không làm màn Detail App tổng hợp (tùy chọn, để sau).
- Không đụng backend.

## Files dự kiến chạm
- `frontend/lib/api/admob-ads.ts` (mới hoặc mở rộng)
- `frontend/app/admob-ads/app-mappings/page.tsx` (mới)
- `frontend/components/admob-ads/app-mappings/app-mappings-content.tsx` (mới)
- `frontend/components/dashboard/sidebar.tsx`

## Bắt buộc verify trước khi code
- Đường dẫn route AdMob hiện có ở FE (`frontend/app/admob*` hay tên khác) để đặt trang nhất quán.
- Cấu trúc data trả về từ endpoint prompt 05 (field names) để map đúng type.
- Cách meta app-mappings xử lý trạng thái Unmapped/Active để tái dùng UI pattern.

## Acceptance criteria
- `pnpm build` / `next build` FE pass; không lỗi type.
- Trang hiển thị danh sách binding admob; link/unlink + enable/disable hoạt động end-to-end với backend dev.
- App cùng package hiện cùng một Store Identity; app thiếu store info hiện "Unmapped".
- Mục sidebar xuất hiện đúng quyền.

## Verification
- Chạy FE + BE dev, đăng nhập, mở trang, thực hiện map/unmap, reload xác nhận trạng thái lưu đúng.
