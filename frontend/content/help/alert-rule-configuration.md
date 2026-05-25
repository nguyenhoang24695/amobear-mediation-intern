# Hướng dẫn tạo và cấu hình Alert Rule

Tài liệu mô tả **quy trình trên UI** để tạo hoặc chỉnh **Alert Rule** trong Nexus: phạm vi, điều kiện, metric, và **kênh thông báo** (Email, Slack, Telegram, In-app).

Đường dẫn chính: **`/alert-center`**. Rules thường được quản lý trong panel/sheet từ trang này (không có route riêng `/alert-rules` trong bản hiện tại).

![Alert Center — vị trí mở Alert Rules](images/alert-center-rules-panel.png)

---

## 1. Mở màn hình Alert Rules

1. Vào **Alert Center** (`/alert-center`).
2. Mở phần **Alert Rules** (nút / tab theo bố cục phiên bản UI của bạn).
3. Chọn **Tạo mới** hoặc **Sửa** một rule có sẵn.

---

## 2. Các thành phần chính của một rule

Mỗi rule thường gồm (tên field có thể khác nhẹ theo UI):

| Nhóm | Mô tả ngắn |
|------|------------|
| **Tên / mô tả** | Giúp nhận diện rule trong danh sách. |
| **Phạm vi** | Publisher, app, nhóm mediation, v.v. (theo loại rule). |
| **Metric & ngưỡng** | Chỉ số cần theo dõi, toán tử so sánh, ngưỡng, cửa sổ thời gian (tùy rule). |
| **Kênh thông báo** | Email, Slack, Telegram, In-app — bật/tắt từng loại. |
| **Bật / tắt rule** | Rule tắt sẽ không đánh giá / không tạo alert mới theo rule đó. |

Danh sách **metric** có thể chọn khi tạo rule thường được lọc theo **quyền app** và **mức permission** của user (catalog từ `app_metrics`). Nếu không thấy metric mong muốn, kiểm tra quyền app và cấu hình metric trên hệ thống.

---

## 3. Cấu hình kênh thông báo

![Chọn notification channels](images/alert-rule-notification-channels.png)

### 3.1 Email

- Bật **EMAIL** và nhập danh sách địa chỉ nhận (theo định dạng UI cho phép: nhiều dòng hoặc CSV).

### 3.2 Slack (trên rule)

- Bật **SLACK**.
- Nhập một hoặc nhiều **Slack Incoming Webhook URL** (thường mỗi URL một dòng).

![Slack webhook URLs và nút Test](images/alert-rule-slack-urls-test.png)

- Dùng nút **Test** (nếu có) để gửi tin thử tới một URL trước khi lưu rule. API backend: `POST /api/Alerts/slack/test`.

**Lưu ý:** Hệ thống gửi payload dạng `{ "text": "..." }` tới từng URL webhook. Không dùng Slack Bot Token trong rule này. Chi tiết thêm: [120 - SLACK BOT TOKEN VA ALERT RULE](../120 - SLACK BOT TOKEN VA ALERT RULE.md).

### 3.3 Telegram

- Bật **TELEGRAM** và cấu hình topic/chat theo hướng dẫn trên form.

### 3.4 In-app

- Bật **IN_APP** để cảnh báo xuất hiện trong **notification popup** (chuông) và luồng open alerts khi rule được đánh giá và tạo kết quả phù hợp.

---

## 4. Lưu rule

1. Kiểm tra lại ngưỡng, phạm vi và kênh.
2. Nhấn **Save** (hoặc tương đương).

![Lưu rule thành công](images/alert-rule-save.png)

Sau khi lưu, job tính toán alert (theo lịch / trigger của hệ thống) sẽ dùng rule để tạo **alert results**; job thông báo sẽ gửi theo các kênh đã bật.

---

## 5. Slack: rule + webhook cá nhân

- URL trên **rule** luôn được xét khi kênh **SLACK** bật.
- **Webhook trong Profile user** có thể được **thêm** vào cùng lần gửi khi thỏa điều kiện app + metric + quyền (xem [Cấu hình Slack User](./slack-user-configuration.md)).
- URL trùng nhau (cùng chuỗi, hoặc chỉ khác hoa thường) **không** bị gửi lặp.

---

## 6. Kiểm tra sau khi triển khai

- Tạo điều kiện test (hoặc chờ trigger thật) và xem **Alert Center** có hiện kết quả mới.
- Với Slack: kiểm tra kênh Slack và bảng log thông báo phía backend (`notification_logs`) nếu cần support.

---

## Liên quan

- [Cấu hình Slack cho User](./slack-user-configuration.md)
- [README Alert Center](./README.md)
- [Đường dẫn frontend Alert Center](../ALERT-CENTER-FRONTEND-ROUTES.md)
- [Giải thích alert history](../23-ALERT-HISTORY-EXPLAINED.md)
