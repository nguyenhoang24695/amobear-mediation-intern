# 120 - Cấu hình Slack Webhook URL trong Alert Rule

## Mục tiêu

Tài liệu này mô tả quy trình cấu hình Slack cho hệ thống Alert:

1. Khai báo kênh `SLACK` trong màn hình Alert Rules bằng `Webhook URL`.
2. Kiểm tra gửi tin test Slack trước khi đưa vào rule thực tế.
3. Vận hành gửi Slack trong luồng notification job.

Lưu ý quan trọng:

- Không dùng `channelId`.
- Không dùng `Slack Bot Token` trong Organization Settings.
- Slack destination hiện dùng trực tiếp `Incoming Webhook URL`.

---

## 1) Khai báo Slack trong màn hình Alert Rules

### 1.1 Tạo/sửa rule

- Vào **Alert Center** (`/alert-center`) và mở phần **Alert Rules** (panel trên cùng trang).
- Tạo mới hoặc sửa rule.
- Trong `Notification Channels`, tick `SLACK`.
- Nhập danh sách `webhookUrl` (có thể nhiều dòng).
  - Ví dụ: `https://hooks.slack.com/services/T000/B000/XXXX`
- Nhấn `Save`.

### 1.2 Định dạng lưu trữ

- `notificationChannels` chứa `SLACK` (JSON array string).
- `slackChannels` là JSON array string của danh sách `webhookUrl`.

Ví dụ:

```json
notificationChannels = "[\"TELEGRAM\",\"SLACK\"]"
slackChannels = "[\"https://hooks.slack.com/services/T000/B000/AAA\",\"https://hooks.slack.com/services/T000/B000/BBB\"]"
```

---

## 2) Test kết nối trước khi sử dụng

Trong dòng Slack destination có nút `Test`:

- Bấm `Test` để gọi API `POST /api/Alerts/slack/test`.
- Nếu thành công: toast báo đã gửi.
- Nếu thất bại: hiện lỗi, cần kiểm tra webhook URL.

Body test:

```json
{
  "webhookUrl": "https://hooks.slack.com/services/T000/B000/XXXX"
}
```

---

## 3) Luồng xử lý backend

1. API test Slack nhận `webhookUrl`.
2. Gửi `POST` trực tiếp tới webhook với payload `{ "text": "..." }`.
3. Khi alert job chạy, hệ thống đọc `slackChannels` từ rule (danh sách webhook URL) rồi gửi lần lượt.
4. Ghi `notification_logs` cho từng webhook.

Nếu webhook URL không hợp lệ hoặc webhook bị revoke, gửi Slack sẽ thất bại.

---

## 4) Troubleshooting nhanh

### Lỗi 400 khi test Slack

- Webhook URL sai định dạng.
- Webhook URL đã bị xóa/revoke ở Slack.
- Workspace/app Slack không cho phép webhook hiện tại.

### Cách check nhanh

1. Mở rule, kiểm tra `webhookUrl` bắt đầu bằng `https://hooks.slack.com/services/...`.
2. Dán lại webhook mới từ Slack App nếu nghi ngờ webhook cũ bị revoke.
3. Test lại từ UI Alert Rule bằng nút `Test`.

---

## 5) Phạm vi áp dụng

- Tài liệu áp dụng cho module Alerts hiện tại.
- Cấu hình Slack nằm tại Alert Rule, không nằm ở Organization Settings.
- Rule có thể kết hợp đa kênh: `TELEGRAM`, `EMAIL`, `SLACK`.

