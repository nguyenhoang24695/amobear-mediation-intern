# Hướng dẫn Phân tích và Check Lỗi Cost = 0 trên ds_app_pnl

Tài liệu này hướng dẫn cách kiểm tra nguyên nhân khi chi phí chạy quảng cáo (UA Cost) xuất hiện giá trị `0` trên dashboard phân tích P&L (sử dụng base dataset là `ds_app_pnl`).

## 1. Mạch Dữ Liệu (Data Lineage) của Cost

Để hiểu vì sao cost = 0, cần nắm luồng di chuyển từ Nguồn -> Gold như sau:
1. **Source (XMP Mobivista)** -> Kéo API về bảng `bronze.xmp_report`.
2. **Bronze -> Silver Mapping**: ETL dùng cột `store_package_id` hoặc `product_id` từ `bronze.xmp_report` để tham chiếu vào bảng `silver.dim_app_identifiers` (cụ thể là các cột `package_name`, `app_store_id`) nhằm lấy được `admob_app_id` làm khóa định danh chung toàn hệ thống.
3. **Silver -> Gold**: Dữ liệu sau khi map được `admob_app_id` sẽ được gộp theo `date, app_id, platform` và ghi vào bảng `gold.fact_daily_app_metrics`.
4. **Gold -> Superset**: Dashboard gọi từ dataset `ds_app_pnl` truy vấn trực tiếp từ bảng `gold.fact_daily_app_metrics` và join với `silver.dim_app_identifiers` để lấy tên ứng dụng.

---

## 2. Các Bước Kiểm Tra Xử Lý Lỗi Bằng SQL

Thực hiện chạy lần lượt các SQL sau trong StarRocks để bắt bệnh cho một ngày cụ thể (ví dụ trong kịch bản này là ngày **`202X-03-27`**).

### Bước 1: Kiểm tra dữ liệu nguồn ở layer Bronze
Có thể API kéo bị lỗi hệ thống/chưa kéo, dẫn tới không có data.

```sql
-- 1.1 Kiểm tra tổng cost và số records của toàn bộ hệ thống ngày bị lỗi
SELECT 
    date,
    SUM(cost) as total_raw_cost,
    COUNT(1) as total_records
FROM bronze.xmp_report
WHERE date = '202X-03-27'
GROUP BY date;

-- 1.2 Kiểm tra chi tiết định danh ứng dụng trả về từ XMP
SELECT 
    store_package_id,
    product_id,
    os,
    SUM(cost) as total_cost
FROM bronze.xmp_report
WHERE date = '202X-03-27'
GROUP BY store_package_id, product_id, os
ORDER BY total_cost DESC;
```
> **Chẩn đoán:** Nếu kết quả trả về rỗng hoặc tổng cost = 0, nguyên nhân là quá trình kéo cronjob API từ XMP Mobivista về đồng bộ lỗi. Cần kiểm tra lại cron/log tải dữ liệu.

### Bước 2: Kiểm tra việc rớt Mapping ID (Silver layer)
Thường là do có phát sinh cost từ ứng dụng/package mới nhưng phía Database Postgres cấu hình thiếu.

```sql
-- Tìm những package_name/product_id có phát sinh cost nhưng KHÔNG THỂ map sang admob_app_id
SELECT 
    xmp.store_package_id,
    xmp.product_id,
    xmp.os,
    SUM(xmp.cost) as unmapped_cost
FROM bronze.xmp_report xmp
LEFT JOIN silver.dim_app_identifiers dim 
    ON dim.package_name = xmp.store_package_id 
    OR dim.app_store_id = xmp.product_id 
    OR dim.package_name = xmp.product_id
WHERE xmp.date = '202X-03-27' 
  AND dim.admob_app_id IS NULL -- Tìm lỗi không map được
  AND xmp.cost > 0
GROUP BY xmp.store_package_id, xmp.product_id, xmp.os
ORDER BY unmapped_cost DESC;
```
> **Chẩn đoán:** Nếu query có trả về dữ liệu -> Chắc chắn Cost bị lọt mất ở khâu này. Cần vào Master DB (PostgreSQL) để bổ sung record bảng `apps` / `firebase_admob_mapping` và đợi flow `SyncAppIdentifiersAsync` đẩy sang StarRocks chạy lại ETL.

### Bước 3: Kiểm tra mức độ tổng hợp tại layer Gold
Có đầy đủ mapping và data, nhưng bảng Gold vẫn ra rỗng không gộp vào được?

```sql
SELECT 
    date,
    app_id, -- Khóa chính admob_app_id
    platform,
    SUM(ua_cost) as total_gold_cost
FROM gold.fact_daily_app_metrics
WHERE date = '202X-03-27'
GROUP BY date, app_id, platform
ORDER BY total_gold_cost DESC;
```
> **Chẩn đoán:** Nếu câu này trả về `total_gold_cost = 0` (hoặc rỗng) trong khi Bước 1 & Bước 2 đều bình thường, nguyên nhân do job `SilverGoldTransformJob` bị lỗi, chưa chạy, hoặc chạy qua rồi (nhưng không đẩy đè data). Bạn cần tiến hành Re-run/Backfill job này cho ngày 27/03.

### Bước 4: Kiểm tra query tại Superset (Level Dataset)
Dữ liệu dưới DB có đủ nhưng trên dashboard lại tàng hình? Kiểm tra logic mô phỏng Dataset `ds_app_pnl`.

```sql
SELECT
    g.date,
    g.app_id,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, g.app_id) AS app_display_name,
    g.platform,
    g.ua_cost AS superset_cost
FROM gold.fact_daily_app_metrics g
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = g.app_id
WHERE g.date = '202X-03-27' 
  AND g.ua_cost > 0
ORDER BY superset_cost DESC;
```
> **Chẩn đoán:** Nếu có output ở đây nhưng Superset không lên, nguyên nhân có thể do bộ lọc (Filters/Time Range), Cache của Superset, hoặc phân quyền Row-Level-Security (RLS) đang chặn người dùng xem thông tin cost của app đó.

---

## 3. Tổng kết các nguyên nhân
* Khuyết dữ liệu nguyên thủy API XMP -> **Kiểm tra luồng tải về Bronze**.
* Không map được App -> **Kiểm tra/update master mapping trên PostgreSQL**.
* ETL lạc nhịp -> **Backfill/Run lại job SilverGoldTransform**.
* Filter/Role chặn -> **Check Superset Cache, Filters và RLS**.
