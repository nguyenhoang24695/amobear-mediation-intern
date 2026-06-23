# Hướng dẫn tạo và cấu hình Alert Rule

Tài liệu mô tả **quy trình trên UI** để tạo hoặc chỉnh **Alert Rule** trong Mediation Pro: phạm vi, điều kiện, metric, và **kênh thông báo** (Email, Slack, Telegram, In-app).

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
| **Metric & ngưỡng** | Một hoặc nhiều điều kiện trên metric (threshold, % change, consecutive days), kết hợp **AND** hoặc **OR**. |
| **Kênh thông báo** | Email, Slack, Telegram, In-app — bật/tắt từng loại. |
| **Bật / tắt rule** | Rule tắt sẽ không đánh giá / không tạo alert mới theo rule đó. |

Danh sách **metric** có thể chọn khi tạo rule thường được lọc theo **quyền app** và **mức permission** của user (catalog từ `app_metrics`). Nếu không thấy metric mong muốn, kiểm tra quyền app và cấu hình metric trên hệ thống.

**Profit** (`metric_key` = `profit`): doanh thu trừ UA cost theo ngày từ `gold.fact_daily_app_metrics` (cùng đơn vị tiền với revenue). Dùng cho rule Manual / AI Builder giống revenue hoặc cost; job alert tính từ `RevenueMicros` và `Cost` đã load từ fact daily app.

### 2.1 Nhiều điều kiện trong `rule_config` (Manual / AI Builder)

JSON lưu trong `rule_config` (và thường trùng `filter_conditions`) hỗ trợ:

- **`conditionLogic`**: `"all"` = tất cả điều kiện phải thỏa (AND), `"any"` = một điều kiện đủ (OR), `"always_true"` = job luôn tạo alert cho mỗi app trong phạm vi có dữ liệu (bỏ qua `conditions[]`; nên để mảng rỗng).
- **`conditions`**: mảng các điều kiện; mỗi phần tử có `id` (tùy chọn), `metricKey`, `conditionType` (`threshold` | `percent_change` | `consecutive`), `operator`, `thresholdValue` / `percentChange` / `consecutiveDays` tùy loại.

**`scope.orderByMetric` / `scope.orderByDirection`:** (tùy chọn) Sắp xếp thứ tự xử lý alert theo từng app theo **giá trị metric ngày mới nhất** trong cửa sổ đánh giá. `orderByDirection`: `"asc"` hoặc `"desc"` (mặc định `desc`). Bỏ trống / không gửi = giữ thứ tự dữ liệu tải về.

**Tương thích ngược:** Rule cũ chỉ có các field phẳng (`metricKey`, `conditionType`, … ở root) vẫn chạy; khi lưu rule qua API, backend có thể chuẩn hóa thành `version: 2` với một phần tử trong `conditions[]` và `conditionLogic: "all"`.

**Người nhận theo metric:** Với email/Slack bổ sung theo quyền app (`app_metrics.app_permission_levels`), hệ thống gom **hợp** danh sách người nhận theo **tất cả** `metricKey` xuất hiện trong `conditions[]` (hoặc metric root nếu không có mảng).

**Test rule:** `POST /api/Alerts/rules/test` trả về từng match kèm `conditionEvals` (từng điều kiện: `evaluable`, `triggered`, `detail`, …) khi rule được đánh giá dạng composite.

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

#### Test Telegram destination

- Dùng nút **Send / Test** (nếu có trên UI) để gửi tin thử tới `chat_id` và `message_thread_id`.
- API backend: `POST /api/Alerts/telegram/test`
- Kết quả hiển thị bằng **modal** (icon success/fail + message), có **đếm ngược auto-close**.

> Với **My Alerts (PRIVATE)**: destinations/presets được quản lý trong `/profile` và có thể add nhanh vào wizard khi tạo My Alert. Xem thêm [My Alerts (PRIVATE) & Telegram presets](./my-alerts-user-guide.md).

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
