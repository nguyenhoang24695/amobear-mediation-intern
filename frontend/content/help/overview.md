# Alert Center — Tài liệu vận hành

Thư mục này tập trung hướng dẫn cấu hình **Alert Center**, **Slack theo user**, và **tạo / chỉnh alert rule**. Ảnh chụp màn hình đặt trong [`images/`](./images/README.md) (trong ứng dụng: thư mục `public/help-images/`).

## Mục lục

| Tài liệu | Nội dung |
|----------|----------|
| [Cấu hình Slack cho User](./slack-user-configuration.md) | Gắn Incoming Webhook vào hồ sơ cá nhân; khi nào hệ thống dùng webhook đó. |
| [Hướng dẫn tạo Alert Rule](./alert-rule-configuration.md) | Luồng tạo rule trên UI, kênh thông báo, Slack trên rule, kiểm thử. |

## Đường dẫn UI nhanh

- **Alert Center:** `/alert-center`
- **Chi tiết một cảnh báo:** `/alert-center/{id}`
- **Hồ sơ (Slack cá nhân):** `/profile`

Tham chiếu kỹ thuật route frontend: [`../ALERT-CENTER-FRONTEND-ROUTES.md`](../ALERT-CENTER-FRONTEND-ROUTES.md).

## Ảnh minh họa

Thêm file PNG hoặc WebP vào `public/help-images/` đúng tên đã ghi trong từng tài liệu; sau đó ảnh sẽ hiển thị trong trang Help.
