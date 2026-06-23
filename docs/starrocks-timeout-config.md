# Cấu hình timeout StarRocks (tránh lỗi khi INSERT/load nặng)

## Vì sao sau khi thêm timeout lại bị lỗi?

- **Trước khi cấu:** Ứng dụng không set `CommandTimeoutSeconds` → MySqlConnector dùng mặc định **0 = không giới hạn** → lệnh INSERT/query có thể chạy bao lâu cũng được.
- **Sau khi cấu:** Ví dụ `CommandTimeoutSeconds = 300` → mỗi lệnh (mỗi batch INSERT) phải xong trong **5 phút**; nếu StarRocks xử lý chậm hơn (batch lớn, JSON nặng, BE bận) → **client timeout** trước khi FE/BE trả kết quả.

Vì vậy cần **đồng bộ** timeout phía app và phía StarRocks (FE/BE).

---

## 1. Cấu hình ứng dụng (appsettings.json)

| Config | Khuyến nghị | Ghi chú |
|--------|-------------|--------|
| **CommandTimeoutSeconds** | **600** (hoặc ≥ FE `query_timeout`) | Thời gian tối đa cho **một lệnh** (INSERT batch, DELETE, SELECT). Đặt **0** = không giới hạn (như trước). |
| **ConnectionTimeoutSeconds** | 60 | Thời gian chờ **thiết lập** kết nối (TCP + handshake). |
| **ConnectionLifetimeSeconds** | **300** (không nên 120) | Thời gian tối đa một connection nằm trong pool; sau đó bị recycle. 120 giây có thể khiến connection bị đóng sớm, dễ lỗi khi dùng lại. 300 hoặc 600 an toàn hơn. |

**Quan trọng:** `CommandTimeoutSeconds` phải **≥** giá trị `query_timeout` trong FE (mặc định 600). Nếu nhỏ hơn, client sẽ timeout trước khi FE trả kết quả.

---

## 2. Cấu hình StarRocks FE (fe.conf)

```properties
# Thời gian tối đa thực thi query (giây). Client CommandTimeoutSeconds phải >= giá trị này.
query_timeout = 600
```

Đã có sẵn trong `docker/starrocks/conf/fe.conf`. Nếu tăng (vd. 900), nhớ tăng `CommandTimeoutSeconds` trong app tương ứng.

---

## 3. Cấu hình StarRocks BE (be.conf / be.production.conf)

Timeout RPC giữa FE và BE (fragment thực thi trên BE):

```properties
# Timeout RPC BE (ms). 120000 = 2 phút. Tăng nếu INSERT/LOAD rất nặng.
thrift_rpc_timeout_ms = 120000
```

Đã thêm vào `docker/starrocks/conf/be.conf` và `be.production.conf`. **Cần restart BE** sau khi sửa.

---

## 4. Tóm tắt nhanh

| Vấn đề | Cách xử lý |
|--------|------------|
| Client báo "Command Timeout" / timeout sau vài phút | Tăng `StarRocks:CommandTimeoutSeconds` lên **600** (hoặc 0 để tắt). Đảm bảo ≥ FE `query_timeout`. |
| Connection bị đóng / lỗi khi dùng lại | Tăng `ConnectionLifetimeSeconds` lên **300** hoặc **600** (tránh 120). |
| FE/BE vẫn xử lý nhưng client đã cắt | Đồng bộ: FE `query_timeout` = 600, app `CommandTimeoutSeconds` = 600 (hoặc lớn hơn). BE `thrift_rpc_timeout_ms` = 120000. |

Sau khi sửa FE/BE, cần **restart** container StarRocks (hoặc ít nhất restart BE nếu chỉ sửa be.conf).
