# Alert Center — Tài liệu vận hành

Thư mục này tập trung hướng dẫn cấu hình **Alert Center**, **Slack theo user**, và **tạo / chỉnh alert rule**. Ảnh chụp màn hình đặt trong [`images/`](./images/README.md).

**Trong ứng dụng:** mở **Help & Docs** (sidebar) hoặc đường dẫn `/help` — nội dung Markdown được phục vụ từ `frontend/content/help/` (đồng bộ với các file `.md` tại đây). Ảnh hiển thị trên web đặt trong `frontend/public/help-images/`.

## Mục lục

| Tài liệu | Nội dung |
|----------|----------|
| [Cấu hình Slack cho User](./slack-user-configuration.md) | Gắn Incoming Webhook vào hồ sơ cá nhân; khi nào hệ thống dùng webhook đó. |
| [Hướng dẫn tạo Alert Rule](./alert-rule-configuration.md) | Luồng tạo rule trên UI, kênh thông báo, Slack trên rule, kiểm thử. |
| [My Alerts (PRIVATE) & Telegram presets](./my-alerts-user-guide.md) | Hướng dẫn My Alerts: clone template (Keep/Customize), Telegram presets trong Profile, test message (modal), remove preset. |

## Đường dẫn UI nhanh

- **Alert Center:** `/alert-center`
- **Chi tiết một cảnh báo:** `/alert-center/{id}`
- **Hồ sơ (Slack cá nhân):** `/profile`

Tham chiếu kỹ thuật route frontend: [`../ALERT-CENTER-FRONTEND-ROUTES.md`](../ALERT-CENTER-FRONTEND-ROUTES.md).

## Ảnh minh họa

Thêm file PNG hoặc WebP vào [`images/`](./images/README.md) đúng tên đã ghi trong từng tài liệu; sau đó bản xem trước Markdown sẽ hiển thị ảnh tự động.
