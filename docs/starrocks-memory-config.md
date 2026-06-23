# Cấu hình bộ nhớ StarRocks (BE) khi gặp "Memory of process exceed limit"

Khi load/insert nhiều dữ liệu (vd: Firebase events) có thể gặp lỗi:

```text
MySqlConnector.MySqlException: Memory of process exceed limit. Start execute plan fragment.
Backend: 127.0.0.1, Used: 6226410376, Limit: 6184752905.
Mem usage has exceed the limit of BE backend [id=10001]
```

Tài liệu này mô tả cách **tăng giới hạn bộ nhớ BE** và **retry trong ứng dụng**.

---

## 1. Retry trong ứng dụng (đã có sẵn)

MediationPro đã bật **retry** cho các thao tác StarRocks (Firebase writer): khi gặp lỗi BE (memory exceed, connection lost, v.v.) sẽ tự retry theo cấu hình.

**Cấu hình** (vd. trong `appsettings.json`):

```json
"StarRocks": {
  "RetryCount": 3,
  "RetryDelaySeconds": 5
}
```

- **RetryCount**: Số lần thử lại (mặc định 3).
- **RetryDelaySeconds**: Số giây chờ giữa mỗi lần retry (mặc định 5).

Nếu vẫn lỗi sau khi retry hết, cần tăng bộ nhớ BE (và có thể giảm batch size) như dưới đây.

---

## 2. Tăng bộ nhớ BE (StarRocks Backend)

Lỗi "Mem usage has exceed the limit of BE backend" nghĩa là **BE (Backend)** đang dùng vượt **mem_limit** đã cấu.

### 2.1. File cấu hình BE: `be.conf`

Trên máy chạy StarRocks BE, mở file cấu hình (tùy cách cài):

- **Cài trực tiếp**: thường là `$STARROCKS_HOME/be/conf/be.conf`
- **Docker**: mount file `be.conf` hoặc chỉnh trong Dockerfile/volume (vd. `conf/be.conf` trong container)

### 2.2. Tham số chính: `mem_limit`

- **Ý nghĩa**: Giới hạn bộ nhớ tối đa cho **một process BE**.
- **Mặc định**: 90% RAM vật lý của server.
- **Đơn vị**: Phần trăm (vd. `"90%"`) hoặc dung lượng (vd. `"16G"`, `"32G"`).

**Ví dụ** (trong `be.conf`):

```properties
# Dùng 80% RAM (nếu chạy chung service khác)
mem_limit = 80%

# Hoặc giới hạn cố định (vd. server 32GB RAM, cho BE 24GB)
mem_limit = 24G
```

Sau khi sửa **cần restart BE** thì mới có hiệu lực (tham số tĩnh).

### 2.3. Các tham số liên quan (tùy chọn)

Có thể điều chỉnh thêm nếu vẫn thiếu memory khi load:

| Tham số | Ý nghĩa (tóm tắt) | Gợi ý |
|--------|---------------------|--------|
| `mem_limit` | Giới hạn bộ nhớ toàn process BE | Tăng % hoặc G nếu server còn RAM |
| `load_process_max_memory_limit_percent` | % mem_limit tối đa cho tất cả load | Mặc định 30%, có thể tăng (vd. 50%) |
| `load_process_max_memory_limit_bytes` | Giới hạn tuyệt đối (bytes) cho load | Chỉ set nếu cần giới hạn cứng |
| `default_load_mem_limit` | Giới hạn cho **một** phiên load (bytes) | Mặc định 2GB; tăng nếu một query load lớn |

Ví dụ thêm vào `be.conf` (tùy nhu cầu):

```properties
# Cho phép load dùng tối đa 50% mem_limit
load_process_max_memory_limit_percent = 50
```

Restart BE sau khi sửa.

### 2.4. Kiểm tra cấu hình hiện tại

Gọi HTTP BE (thay `<BE_IP>`, `<BE_HTTP_PORT>` bằng giá trị thực):

```bash
curl http://<BE_IP>:<BE_HTTP_PORT>/varz
```

Tìm các key `mem_limit`, `load_process_max_memory_limit_*` để xác nhận.

---

## 3. Giảm tải bộ nhớ từ phía ứng dụng

Nếu không thể tăng RAM BE, có thể:

- **Giảm batch insert**: trong `appsettings.json` giảm `StarRocks:InsertBatchSize` (vd. từ 10000 xuống 2000–5000) để mỗi lần insert ít dòng hơn, BE dùng ít memory hơn.
- **Chạy load vào thời điểm ít query khác** để tránh tranh chấp memory.

---

## 4. Tóm tắt nhanh

| Việc | Hành động |
|------|-----------|
| Retry khi lỗi BE | Đã có trong code; cấu hình `StarRocks:RetryCount`, `StarRocks:RetryDelaySeconds` |
| Tăng giới hạn BE | Sửa `mem_limit` trong `be.conf` (vd. `24G` hoặc `80%`), restart BE |
| Load vẫn quá tải | Tăng `load_process_max_memory_limit_percent` trong `be.conf`; giảm `InsertBatchSize` trong app |

Tham khảo thêm: [StarRocks BE Configuration](https://docs.starrocks.io/docs/administration/management/BE_configuration/), [Memory Management](https://docs.starrocks.io/docs/administration/management/resource_management/Memory_management).
