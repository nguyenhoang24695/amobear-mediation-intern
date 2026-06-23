# Xử lý API timeout khi StarRocks quá tải

Khi thấy **Connect Timeout expired** hoặc **Command Timeout expired** (MySqlConnector) từ API trong khi `docker stats` cho thấy các container khác vẫn còn tài nguyên, nguyên nhân thường là **StarRocks đang quá tải**, không phải API hay Postgres/Redis.

---

## 1. Chẩn đoán

### Triệu chứng

- Log API: `MySqlConnector.MySqlException: Connect Timeout expired` hoặc `Command Timeout expired`.
- Stack trace trỏ tới **StarRocks** (vd. `StarRocksAdmobReportTablesWriter.WriteMediationTableAsync`, `PerformanceSyncService.SyncAdmobReportTablesForBatchAsync`).
- `docker stats`: container **mediationpro-starrocks** có **CPU % rất cao** (vd. 800%+), **NET I/O** và **BLOCK I/O** lớn, **PIDS** cao.

### Nguyên nhân

| Yếu tố | Giải thích |
|--------|------------|
| **StarRocks là bottleneck** | API và job (PerformanceSyncJob) kết nối StarRocks qua MySQL protocol. Khi StarRocks CPU/disk bão hòa, nó không kịp nhận kết nối mới hoặc xử lý lệnh (INSERT, Stream Load) trong thời gian mặc định. |
| **Timeout mặc định quá thấp** | Nếu không cấu hình `StarRocks:ConnectionTimeoutSeconds` và `StarRocks:CommandTimeoutSeconds`, MySqlConnector dùng giá trị mặc định (thường 15s connection, 30s command). Khi StarRocks chậm, dễ vượt quá. |
| **Job đồng thời ghi nhiều** | PerformanceSyncJob ghi **mediation_table**, **admob_table**, **mkt_table** với nhiều chunk (theo country/ngày). Cùng lúc nhiều batch INSERT/Stream Load làm StarRocks BE quá tải. |

Kết luận: **API “timeout” vì kết nối / lệnh tới StarRocks hết hạn**, do StarRocks đang xử lý quá tải (CPU, I/O).

---

## 2. Giải pháp ngắn hạn (cấu hình)

Tăng timeout phía ứng dụng để khi StarRocks chậm, client chờ lâu hơn thay vì báo timeout.

Thêm (hoặc sửa) trong **appsettings.json** / **config/backend/appsettings.json** (khi chạy Docker):

```json
"StarRocks": {
  "ConnectionString": "Server=starrocks;Port=9030;User=root;Password=;Database=bronze;AllowUserVariables=True;UseAffectedRows=False",
  "ConnectionTimeoutSeconds": 60,
  "CommandTimeoutSeconds": 300,
  "InsertBatchSize": 10000,
  "HttpHost": "starrocks",
  "HttpPort": 8030,
  "User": "root",
  "Password": ""
}
```

- **ConnectionTimeoutSeconds**: thời gian chờ thiết lập kết nối (giây). Khuyến nghị **60** khi StarRocks hay bận.
- **CommandTimeoutSeconds**: thời gian chờ mỗi lệnh (INSERT, DELETE, SELECT). Khuyến nghị **300** (5 phút) cho job sync ghi nhiều dòng; có thể tăng **600** nếu batch rất lớn.

Sau khi sửa, **restart API** (hoặc container backend) để áp dụng.

---

## 3. Giải pháp trung/dài hạn (giảm tải StarRocks)

| Hướng | Hành động |
|-------|------------|
| **Tăng tài nguyên StarRocks** | Trong `docker-compose.yml` tăng `deploy.resources.limits.cpus` (vd. 10 → 12) và/hoặc `memory` cho service `starrocks` nếu host đủ RAM/CPU. Xem **104 - SERVER-RESOURCE-RECOMMENDATION.md**. |
| **Chạy job sync vào lúc ít tải** | Đặt cron PerformanceSync (mediation_table, admob_table, mkt_table) vào khung giờ ít user (vd. 2h–5h sáng), tránh trùng giờ API được gọi nhiều. |
| **Giảm độ song song / batch** | Nếu cấu hình cho phép: giảm số chunk (country/ngày) chạy đồng thời hoặc giảm `InsertBatchSize` (vd. 10000 → 5000) để mỗi lệnh INSERT ngắn hơn, tránh BE treo lâu. |
| **Ưu tiên Stream Load** | **AdMob bronze:** `StarRocksAdmobReportTablesWriter` ghi **admob_table**, **mkt_table**, **mediation_table** bằng Stream Load JSON khi đã cấu hình **`StarRocks:HttpHost`** / port 8030; batch = **`StarRocks:StreamLoadBatchSize`**. Lỗi hoặc không cấu hình → fallback INSERT MySQL (`InsertBatchSize`, `MediationTableInsertBatchSize`). **XMP gold hourly:** `XmpGoldHourlyReconciler` Stream Load **`gold.xmp_ua_cost_sync_hourly`** với fallback tương tự. Đặt **`StarRocks:StreamLoadTimeoutSeconds`** đủ lớn (mặc định 600). |

---

## 4. Kiểm tra nhanh

- **StarRocks có nhận kết nối không:** từ host hoặc container API: `mysql -h starrocks -P 9030 -u root -e "SELECT 1"`. Nếu lệnh này cũng treo hoặc timeout thì StarRocks đang quá tải hoặc mạng có vấn đề.
- **Theo dõi tài nguyên:** `docker stats` — nếu CPU StarRocks luôn > 500% khi chạy sync, cần tăng CPU limit hoặc giảm tải job.

---

**Tài liệu liên quan:** **104 - SERVER-RESOURCE-RECOMMENDATION.md** (phân bổ CPU/RAM), **config/backend/appsettings.Example.json** (mẫu StarRocks timeout).
