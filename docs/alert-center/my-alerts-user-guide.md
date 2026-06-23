# My Alerts (PRIVATE) — Hướng dẫn sử dụng & Telegram presets

Tài liệu mô tả các thay đổi UI/flow gần đây liên quan đến **My Alerts (PRIVATE rules)** và **Telegram destinations/presets**.

## 1. Khái niệm nhanh

- **System/ORG rules**: rule cấp hệ thống/organization, thường quản lý trong **Alert Center** (`/alert-center`).
- **My Alerts (PRIVATE rules)**: rule do user tạo cho riêng mình; quản lý trong **tab My Alerts** (trong Alert Center UI).

> **Lưu ý:** Không commit secrets. Token bot Telegram cấu hình qua `Telegram:BotToken` và môi trường (xem thêm `docs/55-FIX-TELEGRAM-400-ERROR.md`).

---

## 2. Telegram destinations/presets trong Profile (`/profile`)

Mục **Telegram destinations** cho phép lưu các preset để dùng nhanh khi tạo My Alerts.

### 2.1 Trường dữ liệu

Mỗi preset gồm:

- **Name**: tên gợi nhớ (ví dụ “Finance room”)
- **Chat ID**: `-100...` hoặc `@channelusername`
- **Message thread ID** (optional): dùng cho forum topics trong supergroup

### 2.2 Actions

Trong danh sách preset có cột **Action**:

- **Send**: gọi API test `POST /api/Alerts/telegram/test`
  - Kết quả hiển thị bằng **modal**: icon ở trên (✅/⚠️), message ở dưới, căn giữa
  - Modal **auto-close** và có label đếm ngược: “Auto-closes in \(N\) seconds”
- **Remove**: xóa preset khỏi profile và lưu ngay (không cần vào Edit)

---

## 3. Tạo My Alert từ Template (Create Alert from Template)

Khi tạo My Alert bằng cách **clone** từ 1 ORG template, wizard có các bước chính (tùy UI phiên bản):

### 3.1 Step Condition (Điều kiện) — Keep / Customize

Ở bước **Condition** sẽ có 2 lựa chọn:

- **Giữ nguyên (Keep)**:
  - Chỉ hiển thị **text mô tả** điều kiện của template
  - Không cho chỉnh sửa điều kiện
  - **Severity** vẫn hiển thị (và vẫn có thể đổi nếu UI cho phép)
- **Customize**:
  - Hiển thị editor điều kiện như bình thường (Combine conditions + danh sách conditions)
  - Severity hiển thị như cũ

### 3.2 Validation

- Khi chọn **Keep**: bỏ qua validate conditions ở step Condition (vì dùng đúng điều kiện từ template).
- Khi chuyển từ Customize → Keep: điều kiện được reset về đúng config của template.

---

## 4. Telegram trong My Alerts wizard

### 4.1 Add nhanh từ preset

Trong bước cấu hình Notification (khi bật Telegram):

- Hiển thị **list preset dạng label** (pill)
- Click một preset sẽ **tự add** vào danh sách Telegram destinations
- Preset nào đã có trong danh sách sẽ bị disable (tránh add trùng)

### 4.2 Save preset khi đang tạo My Alert

Trong mỗi dòng Telegram destination có thể:

- Nhập **Preset name** và bấm **Save** để lưu vào Profile
- Sau khi lưu thành công:
  - hiển thị **icon tích xanh**
  - ẩn nút Save (để nhìn gọn)

---

## 5. Troubleshooting nhanh (Telegram test)

Nếu `Send test message` fail, modal sẽ hiển thị **error message** từ response (`error`), ví dụ:

- **Bot is not in the group chat. Please double-check.**

Khi gặp lỗi Telegram 400 trong backend, service có thể gọi thêm `getChatMember` để kiểm tra bot có nằm trong chat hay không (chi tiết xem `docs/55-FIX-TELEGRAM-400-ERROR.md`).

---

## Liên quan

- [README Alert Center](./README.md)
- [Hướng dẫn tạo Alert Rule](./alert-rule-configuration.md)
- [Fix Telegram 400 Bad Request](../55-FIX-TELEGRAM-400-ERROR.md)

