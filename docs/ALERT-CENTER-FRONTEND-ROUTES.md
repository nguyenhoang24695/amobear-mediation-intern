# Alert Center — Đường dẫn frontend và redirect `/alerts`

## Canonical URL

- **Danh sách / trung tâm:** `/alert-center`
- **Chi tiết một kết quả cảnh báo:** `/alert-center/{id}` — `id` là **alert result id** (bảng `alert_results`), không phải `alert_rule_id`.

## Redirect từ `/alerts` (tương thích bookmark cũ)

Trong `frontend/next.config.mjs`, Next.js cấu hình redirect **308 permanent**:

- `/alerts` → `/alert-center`
- `/alerts/*` → `/alert-center/*` (ví dụ `/alerts/123` → `/alert-center/123`)

Mọi tài liệu và deep link mới nên dùng **`/alert-center`**, không cần dựa vào `/alerts`.

## Điều hướng trong app

- Sidebar: mục **Alert Center** trỏ tới `/alert-center`.
- Popup chuông thông báo (`NotificationPopup`): mỗi dòng mở `/alert-center/{id}`; liên kết **View All Notifications** mở `/alert-center`.

## Trang và component chính

| Route | Component |
|-------|-----------|
| `/alert-center` | `frontend/app/alert-center/page.tsx` → `AlertCenterContentV2` |
| `/alert-center/[id]` | `frontend/app/alert-center/[id]/page.tsx` (trang chi tiết) |

**Alert Rules** (cấu hình rule, Slack webhook, v.v.) được mở từ UI **Alert Center** (panel/sheet), không có route riêng kiểu `/alert-rules` trong bản hiện tại.

## API backend (tham chiếu nhanh)

Controller: `AlertsController`, route gốc `api/Alerts` (ASP.NET thường không phân biệt hoa thường).

- Danh sách / lọc kết quả: `GET /api/Alerts/results`
- Chi tiết (kèm timeline từ `alert_history`): `GET /api/Alerts/results/{id}`
- Workflow: `POST /api/Alerts/results/{id}/acknowledge`, `.../resolve`, `.../snooze`
- Mở cho bell / center: `GET /api/Alerts/open`, `GET /api/Alerts/open/summary`
- Timeline toàn cục (Alert Center v2): `GET /api/Alerts/center/timeline`
- Tạo/sửa rule: `POST /api/Alerts/rules`, `PUT /api/Alerts/rules/{id}`

Chi tiết lịch sử audit xem thêm `23-ALERT-HISTORY-EXPLAINED.md`.
