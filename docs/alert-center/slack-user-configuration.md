# Cấu hình Slack cho User (hồ sơ cá nhân)

Tài liệu mô tả quy trình gắn **Slack Incoming Webhook** vào tài khoản Mediation Pro và giải thích **khi nào** hệ thống gửi cảnh báo tới webhook đó.

> **Lưu ý:** Slack trên user **không thay thế** Slack cấu hình trực tiếp trên [Alert Rule](./alert-rule-configuration.md). Hai nguồn có thể được gộp khi gửi (URL trùng sẽ không gửi lặp). Chi tiết kỹ thuật xem thêm [120 - SLACK BOT TOKEN VA ALERT RULE](../120 - SLACK BOT TOKEN VA ALERT RULE.md).

---

## 1. Chuẩn bị trên Slack

1. Trong Slack workspace, tạo hoặc mở **Slack App** có hỗ trợ **Incoming Webhooks** (theo hướng dẫn hiện tại của Slack).
2. Bật **Incoming Webhooks** và tạo webhook gắn với kênh bạn muốn nhận thông báo.
3. Sao chép **Webhook URL** (dạng `https://hooks.slack.com/services/...`).

![Bật Incoming Webhooks trên Slack App](images/slack-incoming-webhooks-enable.png)

![Sao chép Webhook URL](images/slack-copy-webhook-url.png)

---

## 2. Nhập Webhook vào Mediation Pro

1. Đăng nhập Mediation Pro.
2. Mở **Profile** (đường dẫn: `/profile`).
3. Tìm trường **Slack webhook URL** (một URL; lưu trong `User.Settings` phía server).
4. Dán URL đã copy từ Slack.
5. Lưu thay đổi (Save).

![Trường Slack webhook URL trên trang Profile](images/profile-slack-webhook-field.png)

![Xác nhận sau khi lưu (ví dụ toast)](images/profile-save-slack-success.png)

---

## 3. Khi nào webhook của User được dùng?

Hệ thống **chỉ thêm** webhook từ hồ sơ user vào danh sách gửi Slack khi **đồng thời** thỏa các điều kiện sau (luồng metric-scoped recipients):

- Kết quả cảnh báo (**alert result**) có **`AppId`**.
- Suy ra được **metric** của rule (từ alert hoặc cấu hình rule).
- Trong catalog **`app_metrics`** có bản ghi metric tương ứng (đang bật).
- User có **quyền app** (`app_permissions`, grantee là user) trên đúng app đó và **mức quyền** phù hợp với cấu hình metric (nếu metric giới hạn theo level).
- **Rule** có bật kênh **`SLACK`** trong notification channels.

Nếu một trong các điều kiện trên không đạt, Slack **vẫn có thể** được gửi chỉ tới các URL khai báo **trên rule** (xem [Hướng dẫn Alert Rule](./alert-rule-configuration.md)), nhưng **không** tự động lấy webhook từ profile user.

---

## 4. Cấu hình môi trường (admin)

Backend kiểm tra `Slack:Enabled` trong cấu hình ứng dụng. Nếu tắt, **mọi** gửi Slack (cả rule lẫn user) đều không thực hiện POST.

---

## 5. Gỡ hoặc đổi webhook

- Xóa nội dung trường Slack trên Profile và Save, **hoặc** dán URL mới và Save.
- Trên Slack, có thể **revoke** webhook cũ để URL hết hiệu lực.

---

## Liên quan

- [Hướng dẫn tạo Alert Rule](./alert-rule-configuration.md)
- [README Alert Center](./README.md)
- [Slack webhook trên rule (chi tiết API / test)](../120 - SLACK BOT TOKEN VA ALERT RULE.md)
