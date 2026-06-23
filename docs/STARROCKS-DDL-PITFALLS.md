# StarRocks DDL / ETL — lỗi thường gặp & checklist (tài liệu dùng chung)

> **Mục đích:** Ghi lại các lỗi đã gặp thực tế trên cluster để **không lặp lại** khi viết migration SQL, DDL embedded (`StarRocksSchemaInitializer`) hoặc `INSERT ... SELECT` trong C#.  
> **Cách dùng:** Mỗi khi mở luồng chat / PR mới liên quan StarRocks, **đọc nhanh checklist cuối file**; khi gặp lỗi mới → **bổ sung một mục** vào bảng dưới (PR cùng fix).  
> **Liên quan:** `docs/99a - STARROCKS-MIGRATION-NOTES.md`, `.cursorrules` (mục StarRocks DDL), `docker/starrocks/migrations/`.

---

## Bảng “bài học” (cập nhật khi có incident mới)

| # | Triệu chứng / thông báo lỗi (gần đúng) | Nguyên nhân | Cách xử lý |
|---|----------------------------------------|-------------|------------|
| 1 | `Key columns must be the first few columns of the schema and the order of the key columns must be consistent with the order of the schema` | Với bảng kiểu **DUPLICATE KEY**, StarRocks yêu cầu **toàn bộ cột trong `DUPLICATE KEY(...)` phải là N cột đầu tiên** của `CREATE TABLE`, **cùng thứ tự** với mệnh đề KEY. Thường sai khi đặt `event_datetime` / `appmetrica_device_id` / `level_display` lệch thứ tự so với KEY. | Sắp xếp lại cột trong DDL; cập nhật **`INSERT`/`SELECT`** (C# hoặc SQL) cho **khớp thứ tự cột thực tế** của bảng (ít nhất là khối KEY + phần còn lại map đúng). Ví dụ đã sửa: `007_silver_gold_appmetrica_game.sql` — `silver.appmetrica_level_flat`, `silver.appmetrica_ad_event_flat`. |
| 2 | Lỗi analyze / parse quanh **`DEFAULT`** (vd. `DEFAULT 0` trên `INT`, `DEFAULT 1` trên `TINYINT` trong `ALTER TABLE ADD COLUMN`), hoặc “column has no default value”; `Unexpected input '1'` tại cột default | Một số phiên bản / chế độ StarRocks **không chấp nhận** default số trong **ALTER ADD COLUMN** (CREATE TABLE có thể khác) hoặc **NOT NULL** không kèm default hợp lệ. | `ALTER ... ADD COLUMN col TINYINT NULL` (không `DEFAULT` số); backfill bằng `UPDATE ... SET col = 1 WHERE col IS NULL` nếu bảng hỗ trợ UPDATE; đọc query dùng `COALESCE(col, 1)` cho legacy NULL trên DUPLICATE KEY. Tham khảo: `MigrateAppIapDailyVerifiedAdmobAppIdAsync`. Style an toàn: `docker/starrocks/migrations/006_bronze_appmetrica.sql`. |
| 3 | Dữ liệu sai cột sau khi sửa DDL | Chỉ sửa `CREATE TABLE` nhưng **không** chỉnh `INSERT (cột...) SELECT ...` — thứ tự expression không khớp danh sách cột. | Sau mỗi lần đổi thứ tự cột bảng, rà soát **toàn bộ** chỗ insert (C#, comment template trong file `.sql`, job transform). |
| 4 | `Getting analyzing error ... Compound predicate's op should be AND` (thường trên `DELETE`) | StarRocks **không cho `OR` ở top-level** trong `WHERE` của `DELETE` (partition prune yêu cầu predicate kết hợp bằng `AND`). | `DELETE`: chỉ dùng `AND` (vd. xóa theo partition key `event_date` trong khoảng). `INSERT ... SELECT`: tránh `OR` trong `WHERE` nếu analyzer báo lỗi — tách `UNION ALL` hai nhánh hoặc dùng `COALESCE(...)` một điều kiện `AND`. Ví dụ: `StarRocksTransformService.Qonversion.cs` (Qonversion silver/gold transform). |
| 5 | `table … does not support update` (vd. `gold.app_iap_daily`, `gold.fact_hourly_app_revenue`) | Bảng OLAP **UNIQUE KEY** / **DUPLICATE KEY** trên cluster thường **không hỗ trợ `UPDATE`**, kể cả migration backfill. | ETL C#: **DELETE + INSERT** (hoặc INSERT upsert nếu model cho phép). Không dùng `UPDATE` trong verify AdMob id. Migration: bỏ `UPDATE` backfill nếu fail — dùng `COALESCE(col, 1)` khi đọc legacy NULL. |
| 6 | `must be an aggregate expression or appear in GROUP BY clause` khi JOIN dim + `CASE` verify trong cùng `SELECT` có `GROUP BY` | StarRocks không chấp nhận `MAX(CASE … d_admob … END)` trực tiếp trên cột join khi outer `GROUP BY` resolved `app_id`. | Tách 2 tầng: subquery `ra` JOIN dim → tính `resolved_app_id`, `verified_admob_app_id` **per raw row**; outer chỉ `SUM(…)` + `MAX(ra.verified_admob_app_id)` + `GROUP BY ra.resolved_app_id`. Xem `StarRocksTransformService.Qonversion.cs`. |

---

## Checklist trước khi merge (DDL / ETL StarRocks)

- [ ] `DUPLICATE KEY` / `AGG KEY` / `PRIMARY KEY`: các cột key == **các cột đầu** của schema, **đúng thứ tự**.
- [ ] Không dùng `INT NOT NULL` (hoặc số NOT NULL) “trần” nếu đã từng gặp lỗi default trên cluster; ưu tiên `NULL` + luồng ghi đủ dữ liệu.
- [ ] Mọi `INSERT INTO ... (cols) SELECT ...` (C# & SQL): **số cột và thứ tự** khớp bảng đích.
- [ ] `DELETE FROM ... WHERE`: **không** dùng `OR` top-level — chỉ `AND` (hoặc xóa theo partition key đơn giản).
- [ ] Bảng Gold OLAP (`app_iap_daily`, `fact_hourly_app_revenue`, …): **không** `UPDATE` — dùng DELETE + INSERT trong C# ETL.
- [ ] Nếu migration embedded đã chạy **thất bại** giữa chừng: xử lý `silver.schema_migrations` (hoặc cơ chế tương đương), `DROP TABLE` nếu DDL tạo sai, rồi chạy lại.

---

## Ghi chú về “học tự động”

- **Chat AI không lưu bộ nhớ giữa các phiên** như một DB dự án. Cách bền vững là: **git + tài liệu này + `.cursorrules`** (trích dẫn ngắn + link file này).  
- Khi sửa bug DDL/ETL: **thêm một dòng vào bảng “bài học”** ở trên để lần sau (human hoặc AI đọc repo) không tái phạm.
