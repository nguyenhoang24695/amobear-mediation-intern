# Đối soát ETL sau khi chuyển Silver/Gold sang `mediation_table`

Chạy trên StarRocks (điều chỉnh `@start`, `@end`). Mục đích: so sánh tổng trước/sau khi backfill, không thay thế CI.

## Silver — AdMob revenue theo ngày / app / country

So sánh tổng `estimated_earnings` giữa `mkt_table` và `mediation_table` (chỉ khi vẫn còn sync cả hai trong giai đoạn chuyển tiếp):

```sql
-- mediation aggregate (target semantics)
SELECT `date`, app_id, COALESCE(platform,'') AS platform, COALESCE(country,'') AS country,
       SUM(estimated_earnings) AS rev_med
FROM bronze.mediation_table
WHERE `date` BETWEEN @start AND @end
GROUP BY 1,2,3,4;

-- legacy mkt (nếu còn dữ liệu)
SELECT `date`, app_id, COALESCE(platform,'') AS platform, COALESCE(country,'') AS country,
       SUM(estimated_earnings) AS rev_mkt
FROM bronze.mkt_table
WHERE `date` BETWEEN @start AND @end
GROUP BY 1,2,3,4;
```

Chênh lệch đáng kể cần kiểm tra lịch sync ngày, phạm vi country chunk, và phiên bản pipeline API.

## Gold — waterfall vs ad_unit revenue

So sánh CTE-style splits với nguồn cũ (admob) và mới (mediation) trên cùng cửa sổ ngày và app:

```sql
SELECT p.`date`, p.app_id, p.platform,
  SUM(CASE WHEN w.app_id IS NULL THEN p.estimated_earnings ELSE 0 END) AS ad_unit_rev,
  SUM(CASE WHEN w.app_id IS NOT NULL THEN p.estimated_earnings ELSE 0 END) AS waterfall_rev
FROM bronze.mediation_table p
LEFT JOIN silver.dim_app_waterfall_ad_units w
  ON p.app_id = w.app_id AND p.ad_unit_id = w.ad_unit_id
WHERE p.`date` BETWEEN @start AND @end
  AND p.ad_unit_id IS NOT NULL AND p.ad_unit_id != ''
GROUP BY 1,2,3;
```

Sau backfill `silver.daily_app_revenue` / `gold.fact_daily_app_metrics`, đối chiếu với snapshot job hoặc export trước đổi.
