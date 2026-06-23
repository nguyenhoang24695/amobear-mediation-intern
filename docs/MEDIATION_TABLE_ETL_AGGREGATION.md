# Bronze `mediation_table` — quy tắc aggregate cho Silver / Gold

Tham chiếu `docs/99b - Ad Revenue Analytics.md` — tránh double-count khi gộp revenue.

## Nguồn chính thức cho ETL (thay `admob_table` / `mkt_table`)

- **`silver.daily_app_revenue` (nhánh AdMob):** `SUM` metrics trên `bronze.mediation_table` theo `(date, app_id, platform, country)` — tương đương grain marketing của `mkt_table`. Mỗi dòng Bronze mediation có `hash_key` duy nhất theo báo cáo API; gộp theo country không chồng lặp giữa các dimension chi tiết (network, instance, …) trong cùng một báo cáo.
- **`gold.fact_daily_app_metrics` (CTE `admob_revenue`):** `SUM(estimated_earnings)` trên `bronze.mediation_table` với cùng logic `LEFT JOIN silver.dim_app_waterfall_ad_units` trên `(app_id, ad_unit_id)` như trước khi dùng `admob_table`. Khớp waterfall dim → `waterfall_revenue`; không khớp (hoặc không có ad unit) → `ad_unit_revenue`.

## Không filter waterfall-only ở ETL

Rollup tab Bronze “new” có thể lọc chỉ waterfall AdMob cho một số view; **ETL Silver/Gold** giữ **tất cả** `ad_source_id` trong `mediation_table` để khớp tổng doanh thu unified như `mkt_table` / `admob_table` trước đây.

## Mapping vào `gold.fact_daily_app_metrics`

`SilverGoldTransformJob.RunTransformAsync` gọi:

1. `RunSilverDailyAppRevenueAsync(startDate, endDate)` — gom doanh thu AdMob từ `bronze.mediation_table` vào `silver.daily_app_revenue`.
2. `RunGoldFactDailyAppMetricsAsync(startDate, endDate)` — build `gold.fact_daily_app_metrics` từ Silver + CTE `admob_revenue` + XMP cost + IAP + Firebase engagement.

> Lưu ý: `bronze.admob_table` vẫn được ghi để đối soát và debug, nhưng ETL production hiện không đọc trực tiếp bảng này để build `gold.fact_daily_app_metrics`. Query dưới dùng `bronze.admob_table` như minh họa tương đương cột; code thật dùng `bronze.mediation_table`.

| Cột `gold.fact_daily_app_metrics` | Nguồn ETL | Cột Bronze tương đương |
| --- | --- | --- |
| `date` | Grain ngày | `date` |
| `account_id` | Parse từ `app_id` (phần trước `~`, bỏ prefix `ca-app-`) | `app_id` |
| `app_id` | Grain app | `app_id` |
| `platform` | Grain platform | `platform` |
| `total_revenue` | `silver.daily_app_revenue` | `SUM(estimated_earnings)` |
| `ad_unit_revenue` | CTE `admob_revenue`, ad unit không thuộc waterfall | `SUM(estimated_earnings)` khi không match `silver.dim_app_waterfall_ad_units` |
| `waterfall_revenue` | CTE `admob_revenue`, ad unit thuộc waterfall | `SUM(estimated_earnings)` khi match `silver.dim_app_waterfall_ad_units` |
| `total_impressions` | `silver.daily_app_revenue` | `SUM(impressions)` |
| `total_ad_requests` | `silver.daily_app_revenue` | `SUM(ad_requests)` |
| `total_matched_requests` | `silver.daily_app_revenue` | `SUM(matched_requests)` |
| `ecpm` | `silver.daily_app_revenue` | `AVG(observed_ecpm)` |
| `fill_rate` | `silver.daily_app_revenue` | `AVG(show_rate)` |
| `dau`, `dav`, `arpdau` | `gold.daily_overview` | Không từ AdMob Bronze |
| `ua_cost`, `roi` | `bronze.xmp_report` + `silver.dim_app_identifiers` | Không từ AdMob Bronze |
| `iap_*`, `total_revenue_usd` | `gold.app_iap_daily` | Không từ AdMob Bronze |

Các cột Bronze như `hash_key`, `ad_unit_name`, `format`, `app_version_name`, `app_name`, `clicks`, `match_rate` không được ghi trực tiếp vào `gold.fact_daily_app_metrics`.

### Query minh họa

Query này minh họa phần AdMob IAA nếu đọc từ `bronze.admob_table`. Trong code thật, thay `bronze.admob_table` bằng `bronze.mediation_table`.

```sql
WITH silver_rev AS (
    SELECT
        a.`date`,
        COALESCE(
            NULLIF(
                TRIM(
                    IF(
                        SUBSTRING_INDEX(a.app_id, '~', 1) LIKE 'ca-app-%',
                        SUBSTRING(SUBSTRING_INDEX(a.app_id, '~', 1), 8),
                        SUBSTRING_INDEX(a.app_id, '~', 1)
                    )
                ),
                ''
            ),
            'default-account'
        ) AS account_id,
        a.app_id,
        COALESCE(a.platform, '') AS platform,
        COALESCE(SUM(a.estimated_earnings), 0) AS total_revenue,
        COALESCE(SUM(a.impressions), 0) AS total_impressions,
        COALESCE(SUM(a.ad_requests), 0) AS total_ad_requests,
        COALESCE(SUM(a.matched_requests), 0) AS total_matched_requests,
        AVG(a.observed_ecpm) AS ecpm,
        AVG(a.show_rate) AS fill_rate
    FROM bronze.admob_table a
    WHERE a.`date` >= '2026-06-01'
      AND a.`date` <= '2026-06-30'
      AND a.app_id IS NOT NULL
      AND a.app_id != ''
    GROUP BY
        a.`date`,
        account_id,
        a.app_id,
        COALESCE(a.platform, '')
),
admob_revenue AS (
    SELECT
        p.`date`,
        COALESCE(
            NULLIF(
                TRIM(
                    IF(
                        SUBSTRING_INDEX(p.app_id, '~', 1) LIKE 'ca-app-%',
                        SUBSTRING(SUBSTRING_INDEX(p.app_id, '~', 1), 8),
                        SUBSTRING_INDEX(p.app_id, '~', 1)
                    )
                ),
                ''
            ),
            'default-account'
        ) AS account_id,
        p.app_id,
        p.platform,
        COALESCE(
            SUM(CASE WHEN w.app_id IS NULL THEN p.estimated_earnings ELSE 0 END),
            0
        ) AS ad_unit_revenue,
        COALESCE(
            SUM(CASE WHEN w.app_id IS NOT NULL THEN p.estimated_earnings ELSE 0 END),
            0
        ) AS waterfall_revenue
    FROM bronze.admob_table p
    LEFT JOIN silver.dim_app_waterfall_ad_units w
        ON p.app_id = w.app_id
       AND p.ad_unit_id = w.ad_unit_id
    WHERE p.`date` >= '2026-06-01'
      AND p.`date` <= '2026-06-30'
    GROUP BY
        p.`date`,
        account_id,
        p.app_id,
        p.platform
)
SELECT
    r.`date`,
    r.account_id,
    r.app_id,
    r.platform,
    r.total_revenue,
    COALESCE(ar.ad_unit_revenue, 0) AS ad_unit_revenue,
    COALESCE(ar.waterfall_revenue, 0) AS waterfall_revenue,
    r.total_impressions,
    r.total_ad_requests,
    r.total_matched_requests,
    r.ecpm,
    r.fill_rate
FROM silver_rev r
LEFT JOIN admob_revenue ar
    ON r.`date` = ar.`date`
   AND r.account_id = ar.account_id
   AND LOWER(TRIM(r.app_id)) = LOWER(TRIM(ar.app_id))
   AND LOWER(TRIM(r.platform)) = LOWER(TRIM(ar.platform));
```

## Đối soát sau deploy

Xem [MEDIATION_BRONZE_ETL_VALIDATION.md](MEDIATION_BRONZE_ETL_VALIDATION.md).
