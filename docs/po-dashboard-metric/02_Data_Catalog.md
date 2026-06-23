# PO Dashboard — Data Catalog (Phase 1)

> Companion: [`01_Phase1_Implementation_Plan.md`](01_Phase1_Implementation_Plan.md) · [`03_API_Contract.md`](03_API_Contract.md) · [`04_Implementation_Guide.md`](04_Implementation_Guide.md)
> **Phase 1 dùng 3 nguồn**: Firebase (Audience/Engagement/Retention) + Adjust (Acquisition/IAA/ROAS) + Qonversion (IAP/SUB).

---

## 1. Storage layout

| Schema | Engine | Mô tả |
|---|---|---|
| `bronze.fb_{appKey}` | StarRocks | Firebase raw events per-app |
| `bronze.adjust_report` | StarRocks | Adjust raw report (JSON metrics) |
| `silver.qonversion_events_clean`, `gold.app_iap_daily` | StarRocks | Qonversion IAP/SUB events and daily aggregates |
| `silver.engagement`, `silver.geo`, `silver.retention_cohort`, `silver.dim_app_identifiers`, `silver.dim_country` | StarRocks | Aggregated/dimension |
| `gold.retention_overview` | StarRocks | Pre-aggregated retention rate |
| `meta.app_registry` | StarRocks | Mapping `admob_app_id ↔ bronze_table` cho Firebase raw bronze; không bắt buộc cho dashboard summary |
| `apps`, `admob_accounts` | PostgreSQL | App + AdMob account config |

> **Không dùng**: `silver.daily_app_revenue` (AdMob), `gold.daily_overview.iaa_rev/iap_rev/total_rev` cho PO Dashboard Phase 1.

---

## 2. Firebase Silver/Gold (Audience + Engagement + Retention)

### 2.1 `silver.engagement` (per app per day)

```
event_date, app_id,
dau, new_users, dav, sessions, total_events,
ad_impressions, ad_clicks, total_engagement_msec,
paying_users
```

Mapping → metric cards:
| Card | SQL |
|---|---|
| New users | `SUM(new_users)` |
| Total users | `SUM(dau)` |
| Returning users | `SUM(dau) - SUM(new_users)` |
| Avg engagement time | `SUM(total_engagement_msec) / NULLIF(SUM(dau), 0) / 60000.0` (phút) |
| Engaged sessions / user | `SUM(sessions) * 1.0 / NULLIF(SUM(dau), 0)` |

### 2.2 `silver.geo` (per app per day per country)

```
event_date, app_id, country,    -- country = Firebase full name (vd "United States"); some pipelines may emit ISO2/lowercase
dau, new_users, dav,
ad_impressions, ad_clicks,
paying_users, iap_revenue_usd
```

Mapping → Top Country (audience):
```sql
-- Top by New users
SELECT country, SUM(new_users) AS v
FROM silver.geo
WHERE app_id = :app AND event_date BETWEEN :start AND :end
  AND country IS NOT NULL AND country <> ''
GROUP BY country
ORDER BY v DESC
LIMIT 10
```

Conversion rate per country:
```sql
SUM(paying_users) * 100.0 / NULLIF(SUM(dau), 0)
```

### 2.3 `gold.retention_overview` (Firebase D1/D7)

```
event_date, app_id, install_date, retention_day,
total_new_users, active_users,
retention_rate,            -- active_users / d0_users * 100
avg_play_time_min,
ad_impressions, impdau, iap_rev_cum, total_ltv
```

Query D1/D7:
```sql
SELECT install_date,
       MAX(CASE WHEN retention_day = 1 THEN retention_rate END) AS d1,
       MAX(CASE WHEN retention_day = 7 THEN retention_rate END) AS d7
FROM gold.retention_overview
WHERE app_id = :app AND install_date BETWEEN :start AND :end
GROUP BY install_date
ORDER BY install_date
```

---

## 3. Adjust — `bronze.adjust_report` (Acquisition + Revenue + ROAS + Adjust Retention)

### 3.1 Schema

```
date, app_token,
country_code, os_name, network, partner_name,
campaign, campaign_id_network, campaign_network,
_synced_at,
dimensions_json,
conversion_metrics_json,             -- installs, sessions, daus, ...
cohort_metrics_json,                  -- roas_d{n}, retention_rate_d{n}, ...
cohort_non_cumulative_metrics_json,
ad_spend_metrics_json,                -- cost, ecpi, ...
revenue_metrics_json,                 -- ad_revenue, revenue, all_revenue, ...
skad_metrics_json, subscription_metrics_json, ...,
payload_json, _sync_job_type
```

### 3.2 JOIN với app

```sql
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app_id
```

### 3.3 Metric extraction (parser cheatsheet)

| Adjust metric | JSON path | Type | Mapping |
|---|---|---|---|
| Installs | `$.installs` trong `conversion_metrics_json` | DOUBLE | Card "Installs" |
| Sessions | `$.sessions` trong `conversion_metrics_json` | DOUBLE | (không dùng Phase 1) |
| IAA revenue | `$.ad_revenue` trong `revenue_metrics_json` | DOUBLE | Chart IAA, Top Country IAA |
| IAP revenue | `$.revenue` trong `revenue_metrics_json` | DOUBLE | Legacy Adjust field; PO Dashboard reads IAP from Qonversion |
| Total revenue | `$.all_revenue` trong `revenue_metrics_json` | DOUBLE | Legacy Adjust total; PO Dashboard total = Adjust IAA + Qonversion IAP + SUB |
| Ad spend | `$.cost` trong `ad_spend_metrics_json` | DOUBLE | Adjust report block |
| ROAS D0 | `$.roas_d0` trong `cohort_metrics_json` | DOUBLE % | Adjust report block |
| ROAS D1/D3/D7 | `$.roas_d{n}` | DOUBLE % | Adjust report block |
| Retention D1/D3/D7 | `$.retention_rate_d{n}` trong `cohort_metrics_json` | DOUBLE % | Chart Retention (Adjust), Adjust report |

Hàm StarRocks dùng để parse: `get_json_double(json_col, '$.path')` — trả `NULL` nếu key không tồn tại hoặc value không phải số.

### 3.4 Daily series queries

**Daily Installs**:
```sql
SELECT ar.`date`,
       SUM(get_json_double(ar.conversion_metrics_json, '$.installs')) AS installs
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
GROUP BY ar.`date`
ORDER BY ar.`date`
```

**Daily IAA Revenue (Adjust)**:
```sql
SELECT ar.`date`,
       SUM(get_json_double(ar.revenue_metrics_json, '$.ad_revenue'))  AS iaa
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
GROUP BY ar.`date`
ORDER BY ar.`date`
```

**Daily IAP/SUB Revenue (Qonversion)**:
```sql
SELECT s.event_date,
       SUM(CASE
             WHEN s.event_name IN ('non_renewing_purchase', 'in_app_purchase') AND s.revenue_sign = 1
             THEN ABS(COALESCE(s.revenue_usd, 0))
             WHEN s.event_name = 'in_app_refunded'
             THEN -ABS(COALESCE(s.revenue_usd, 0))
             ELSE 0 END) AS iap_net,
       SUM(CASE
             WHEN s.event_name IN ('subscription_started','trial_converted','subscription_renewed','subscription_upgraded','subscription_reactivated')
             THEN ABS(COALESCE(s.revenue_usd, 0))
             WHEN s.event_name = 'subscription_refunded'
             THEN -ABS(COALESCE(s.revenue_usd, 0))
             ELSE 0 END) AS sub_net
FROM silver.qonversion_events_clean s
JOIN silver.dim_app_identifiers d
  ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(:app))
 AND LOWER(TRIM(s.app_id)) IN (
       LOWER(TRIM(COALESCE(d.package_name, ''))),
       LOWER(TRIM(COALESCE(d.app_store_id, ''))),
       LOWER(TRIM(d.admob_app_id))
     )
WHERE s.event_date BETWEEN :start AND :end
  AND s.is_duplicate = 0
GROUP BY s.event_date
ORDER BY s.event_date
```

Revenue Trend:
- `iaa` = Adjust `ad_revenue`.
- `iap` = Qonversion one-time purchase net revenue.
- `sub` = Qonversion subscription net revenue, refunds subtracted.
- `total` = `iaa + iap + sub`.
- `arpu` = `total / Firebase dau` by date; null when either side is missing.

**Daily Retention (Adjust D1/D3/D7)** — cohort, dùng `install_date` thay vì event_date:
> Adjust trả retention theo cohort = ngày install. Khi query, `ar.date` chính là cohort date.
```sql
SELECT ar.`date` AS install_date,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d1')) AS d1,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d3')) AS d3,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d7')) AS d7
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
GROUP BY ar.`date`
ORDER BY ar.`date`
```

> **Note**: `AVG` thay vì `SUM` vì Adjust trả tỉ lệ %. Cần weight theo `installs` để chính xác hơn — Phase 1 dùng AVG đơn giản, chấp nhận sai số nhỏ khi nhiều partition (country/network) có install không đồng đều.
> Weighted version (preferred khi performance đủ):
> ```sql
> SUM(get_json_double(cohort_metrics_json, '$.retention_rate_d1') * get_json_double(conversion_metrics_json, '$.installs'))
> / NULLIF(SUM(get_json_double(conversion_metrics_json, '$.installs')), 0)
> ```

### 3.5 Top Country Adjust

**Top by IAA**:
```sql
SELECT ar.country_code,
       SUM(get_json_double(ar.ad_revenue))  -- (full path: revenue_metrics_json.$.ad_revenue)
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
  AND ar.country_code IS NOT NULL AND ar.country_code <> ''
GROUP BY ar.country_code
ORDER BY 2 DESC
LIMIT 10
```

**Top by IAP+SUB** (Qonversion):
```sql
WITH qon_country AS (
  SELECT
    UPPER(TRIM(s.country)) AS country_code,
    CASE WHEN s.event_name IN ('non_renewing_purchase', 'in_app_purchase') AND s.revenue_sign = 1
         THEN ABS(COALESCE(s.revenue_usd, 0))
         WHEN s.event_name = 'in_app_refunded'
         THEN -ABS(COALESCE(s.revenue_usd, 0))
         ELSE 0 END AS iap_net,
    CASE WHEN s.event_name IN ('subscription_started','trial_converted','subscription_renewed','subscription_upgraded','subscription_reactivated')
         THEN ABS(COALESCE(s.revenue_usd, 0))
         WHEN s.event_name = 'subscription_refunded'
         THEN -ABS(COALESCE(s.revenue_usd, 0)) ELSE 0 END AS sub_net
  FROM silver.qonversion_events_clean s
  JOIN silver.dim_app_identifiers d
    ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(:app))
   AND LOWER(TRIM(s.app_id)) IN (
         LOWER(TRIM(COALESCE(d.package_name, ''))),
         LOWER(TRIM(COALESCE(d.app_store_id, ''))),
         LOWER(TRIM(d.admob_app_id))
       )
  WHERE s.event_date BETWEEN :start AND :end
    AND s.is_duplicate = 0
    AND s.country IS NOT NULL AND TRIM(s.country) <> ''
    AND UPPER(TRIM(s.country)) REGEXP '^[A-Z]{2}$'
),
aggregated AS (
  SELECT country_code, SUM(iap_net) AS iap_net, SUM(sub_net) AS sub_net
  FROM qon_country
  GROUP BY country_code
)
SELECT a.country_code,
       COALESCE(NULLIF(dc.country_name, ''), a.country_code) AS country_name,
       a.iap_net,
       a.sub_net
FROM aggregated a
LEFT JOIN silver.dim_country dc ON dc.country_code = a.country_code
WHERE (a.iap_net + a.sub_net) > 0
ORDER BY (a.iap_net + a.sub_net) DESC
LIMIT 10
```

Qonversion country is normalized with `UPPER(TRIM(country))`; non-ISO2 country strings are excluded in Phase 1 instead of bridged as Firebase full names.

### 3.6 ARPU & Conversion rate per country — cross-source JOIN

Vì IAA revenue ở Adjust (country = ISO2), IAP/SUB ở Qonversion (country = ISO2), còn `dau`/`paying_users` ở Firebase (thường là full name, nhưng có thể là ISO2/lowercase), cần bridge Firebase qua `silver.dim_country`:

```sql
WITH iaa AS (
  SELECT ar.country_code,
         SUM(get_json_double(ar.revenue_metrics_json, '$.ad_revenue')) AS iaa
  FROM bronze.adjust_report ar
  JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
  WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
  GROUP BY ar.country_code
),
qon AS (
  SELECT s.country AS country_code,
         SUM(CASE
               WHEN s.event_name IN ('non_renewing_purchase', 'in_app_purchase') AND s.revenue_sign = 1
               THEN ABS(COALESCE(s.revenue_usd, 0))
               WHEN s.event_name = 'in_app_refunded'
               THEN -ABS(COALESCE(s.revenue_usd, 0))
               ELSE 0 END) AS iap,
         SUM(CASE WHEN s.event_name IN ('subscription_started','trial_converted','subscription_renewed','subscription_upgraded','subscription_reactivated') THEN ABS(COALESCE(s.revenue_usd, 0)) WHEN s.event_name = 'subscription_refunded' THEN -ABS(COALESCE(s.revenue_usd, 0)) ELSE 0 END) AS sub
  FROM silver.qonversion_events_clean s
  JOIN silver.dim_app_identifiers d
    ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(:app))
   AND LOWER(TRIM(s.app_id)) IN (LOWER(TRIM(COALESCE(d.package_name, ''))), LOWER(TRIM(COALESCE(d.app_store_id, ''))), LOWER(TRIM(d.admob_app_id)))
  WHERE s.event_date BETWEEN :start AND :end
    AND s.is_duplicate = 0
    AND s.country IS NOT NULL AND s.country <> ''
  GROUP BY s.country
),
users AS (
  SELECT dc.country_code,
         SUM(g.dau)          AS dau,
         SUM(g.new_users)    AS new_users,
         SUM(g.paying_users) AS paying_users
  FROM silver.geo g
  LEFT JOIN silver.dim_country dc
    ON LOWER(TRIM(dc.country_name_firebase)) = LOWER(TRIM(g.country))
    OR LOWER(TRIM(dc.country_name)) = LOWER(TRIM(g.country))
    OR UPPER(TRIM(dc.country_code)) = UPPER(TRIM(g.country))
  WHERE g.app_id = :app AND g.event_date BETWEEN :start AND :end
  GROUP BY dc.country_code
)
SELECT
  COALESCE(a.country_code, q.country_code, u.country_code) AS country_code,
  COALESCE(dc.country_name, a.country_code, q.country_code) AS country_name,
  a.iaa, q.iap, q.sub,
  COALESCE(a.iaa, 0) + COALESCE(q.iap, 0) + COALESCE(q.sub, 0) AS total_rev,
  u.dau, u.new_users, u.paying_users,
  ROUND((COALESCE(a.iaa, 0) + COALESCE(q.iap, 0) + COALESCE(q.sub, 0)) / NULLIF(u.dau, 0), 4) AS arpu,
  ROUND(u.paying_users * 100.0 / NULLIF(u.dau, 0), 2) AS conversion_rate
FROM iaa a
FULL OUTER JOIN qon q USING (country_code)
FULL OUTER JOIN users u USING (country_code)
LEFT JOIN silver.dim_country dc ON dc.country_code = COALESCE(a.country_code, q.country_code, u.country_code)
WHERE COALESCE(a.country_code, q.country_code, u.country_code) IS NOT NULL
  AND COALESCE(a.country_code, q.country_code, u.country_code) <> ''
ORDER BY total_rev DESC NULLS LAST
LIMIT 10
```

> Impl hiện tại lấy Adjust/Qon/Firebase bằng provider riêng rồi join in-memory theo `country_code`. Với `metric=iap_sub`, primary value = `qon.iap + qon.sub`.

### 3.7 Adjust report block

```sql
SELECT
  ar.network                                                              AS channel,
  ar.campaign                                                             AS source,
  SUM(get_json_double(ar.conversion_metrics_json, '$.installs'))          AS installs,
  SUM(get_json_double(ar.ad_spend_metrics_json,   '$.cost'))              AS ad_spend,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.roas_d0'))           AS roas_d0,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.roas_d1'))           AS roas_d1,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.roas_d3'))           AS roas_d3,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.roas_d7'))           AS roas_d7,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.retention_rate_d1')) AS retention_d1,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.retention_rate_d3')) AS retention_d3,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.retention_rate_d7')) AS retention_d7
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE d.admob_app_id = :app AND ar.`date` BETWEEN :start AND :end
GROUP BY ar.network, ar.campaign
HAVING SUM(get_json_double(ar.conversion_metrics_json, '$.installs')) > 0
ORDER BY installs DESC
LIMIT 200
```

`CPI` tính ở BE service: `ad_spend / NULLIF(installs, 0)`.

---

## 4. AdMob account → Timezone (PostgreSQL)

```sql
SELECT acc.account_id, acc.display_name, acc.is_default, acc.timezone_offset_hours
FROM apps a
JOIN admob_accounts acc ON acc.account_id = a.publisher_id
WHERE a.app_id = :app AND acc.enabled = TRUE
ORDER BY acc.is_default DESC, acc.id ASC
LIMIT 1
```

EF entity: [`AdMobAccount`](../../backend/MediationPro.Core/Entities/AdMobAccount.cs).
Schema mapping: [`ApplicationDbContext.cs:1290-1311`](../../backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs:1290).

---

## 5. Date range resolution

```
tz_offset = timezone_offset_hours (AdMob account)
now_account = NOW() UTC + tz_offset hours
today_account = DATE(now_account)

today      → start = today_account,             end = today_account
yesterday  → start = today_account - 1 day,     end = today_account - 1 day
last7      → start = today_account - 6 days,    end = today_account
```

Backend trả:
- `date_range.start_date_account_tz`, `date_range.end_date_account_tz` (yyyy-MM-dd theo TZ account).
- `tz_offset_hours` (info FE).
- `display_tz_offset_hours = 7` (luôn).

---

## 6. Cross-source mapping cheatsheet

| Có sẵn | Cần lookup | Bảng |
|---|---|---|
| `admob_app_id` (FE `app.appId`) | `bronze_table` Firebase raw | `meta.app_registry` hoặc `silver.dim_app_identifiers.firebase_id` |
| `admob_app_id` | `adjust_id` (Adjust app token) | `silver.dim_app_identifiers` |
| `admob_app_id` | AdMob account + timezone | PG: `apps.publisher_id` → `admob_accounts` |
| `country_code` (ISO2 — Adjust) | `country_name`, region, tier | `silver.dim_country` |
| Firebase country (full name) | ISO2 | `silver.dim_country.country_name_firebase` |

---

## 7. Empty-data probes

Trước khi query nặng, service nên gọi probe nhanh:

| Probe | Câu query | Empty → |
|---|---|---|
| Firebase summary/silver tồn tại | `SELECT 1 FROM silver.engagement WHERE app_id = :app LIMIT 1` | Audience/Engagement/Firebase Retention block empty |
| Adjust mapping tồn tại | `SELECT adjust_id FROM silver.dim_app_identifiers WHERE admob_app_id = :app AND adjust_id <> '' LIMIT 1` | Acquisition + IAA + Adjust block empty, add warning `adjust_not_configured` |
| Adjust có ad_revenue data | `SELECT 1 FROM bronze.adjust_report WHERE app_token = :token AND get_json_double(revenue_metrics_json, '$.ad_revenue') > 0 LIMIT 1` | (Optional) gắn warning `adjust_ad_revenue_missing` |
| Qonversion IAP/SUB tồn tại | `SELECT 1 FROM gold.app_iap_daily WHERE app_id = :app LIMIT 1` | IAP/SUB revenue empty, add warning `qonversion_not_configured` |

---

## 8. Hiện trạng đã verify trong codebase

- ✅ `FirebaseSilverGoldAggregator` chạy daily ([`FirebasePipelineJob`](../../backend/MediationPro.Jobs/FirebasePipelineJob.cs)).
- ✅ `bronze.adjust_report` được populate bởi [`AdjustStarRocksWriter`](../../backend/MediationPro.Infrastructure/Adjust/AdjustStarRocksWriter.cs); metrics theo glossary đã được parse vào `revenue_metrics_json`, `cohort_metrics_json`, `ad_spend_metrics_json` (xem [`AdjustParquetMetricGroups`](../../backend/MediationPro.Infrastructure/Adjust/AdjustParquetMetricGroups.cs:27)).
- ✅ `gold.retention_overview` đã pre-compute `retention_rate`.
- ✅ `silver.dim_country` đã có cột `country_name_firebase` để bridge naming khác biệt giữa Firebase và Adjust.
- ⚠️ `gold.daily_overview.iaa_rev/iap_rev/total_rev/arpdau` vẫn = 0 — **Phase 1 không dùng**, không cần fix. Các flow khác (AI insight, performance tab) nếu phụ thuộc thì cần task riêng (out of scope).

---

## 9. Performance considerations

- `bronze.adjust_report` partition theo MONTH, query `Last 7 days` thường chỉ chạm 1 partition → nhanh.
- Parse JSON `get_json_double` chậm hơn cột flat ~2-3x. Đo benchmark thực tế:
  - 1 app × 7 ngày × ~50 partition row (country × network × campaign) → kỳ vọng < 500ms.
  - Nếu chậm hơn (vd app có nhiều campaign) → Phase 2 build aggregate `silver.adjust_daily` với cột flat.
- Caching Redis 5 phút (today) / 30 phút (yesterday, last7) đủ hấp thụ tải repeat.
