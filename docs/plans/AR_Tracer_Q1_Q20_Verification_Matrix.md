# AR Tracer — Q1–Q20 Verification Matrix

Canonical query spec: **`02 - AR_Tracer_Insight_Complete_Guideline.md`**. This matrix maps each question to **StarRocks/Postgres objects**, **known aliases**, **ETL/job coverage**, and **runtime path** (gold → silver → bronze / API snapshot).

| Q | Topic | Primary source | Join / filter key | Schema / code notes | Job / backfill |
|---|--------|----------------|-------------------|---------------------|----------------|
| Q1 | Revenue, eCPM, fill, UA | `gold.fact_daily_app_metrics` | `d.admob_app_id = f.app_id` | Column is **`total_matched_requests`** (expose as `matched_requests` in SQL). **DAU/DAV/ARPDAU** filled from **`gold.daily_overview`** in `RunGoldFactDailyAppMetricsAsync`. | `RunGoldFactDailyAppMetricsAsync`; ensure `silver.daily_app_revenue` + dim sync |
| Q2 | Daily overview (DAU, sessions) | `gold.daily_overview` | **`app_id` = AdMob id**, not Firebase | Join **`silver.dim_app_identifiers`** on `admob_app_id = o.app_id`, filter `firebase_id`. ETL: `FirebaseSilverGoldAggregator.InsertGoldDailyOverviewAsync` from `silver.engagement`. | Firebase silver/gold pipeline per app/day (`AggregateGoldTableAsync` / scheduled jobs) |
| Q3 | Revenue by ad source | `bronze.mediation_table` | `dim.admob_app_id` | — | Mediation ingest |
| Q4 | Revenue by ad unit | `bronze.admob_table` | `dim.admob_app_id` | — | AdMob ingest |
| Q5 | DAU / engagement (heavy) | `bronze.fb_*` | Table name per app | Prefer **`gold.daily_overview`** / **`silver.engagement`** when populated. | Firebase bronze + silver engagement job |
| Q6 | Retention cohorts | `bronze.fb_*` or `gold.retention_overview` | Cohort users = **`first_open`** only | **Fixed SQL:** join activity only for users in install cohort (avoids retention > 100% / inflated D0). Gold: **`InsertGoldRetentionOverviewAsync`** uses **`MAX(active_users)`** and **`event_date = install_date`** for D0 denominator. | Silver `retention_cohort` + gold `retention_overview` |
| Q7 | Drawing / content | `bronze.fb_*` | — | — | Firebase |
| Q8 | Onboarding funnel | `bronze.fb_*` | — | — | Firebase |
| Q9 | IAP / subscription | `bronze.fb_*` | — | — | Firebase |
| Q10 | D0 activation | `bronze.fb_*` | — | — | Firebase |
| Q11 | Ad by format | `bronze.fb_*` or **`gold.ad_performance`** | StarRocks: **no alias in `GROUP BY`** — repeat `CASE` or use gold | Silver `ad_metrics` uses `ad_impression` + `ad_format` param; aligns with aggregator. | `AggregateGoldTableAsync` → `gold.ad_performance` |
| Q12 | Top events | `bronze.fb_*` | — | — | Firebase |
| Q13 | XMP UA cost | `bronze.xmp_report` | **Dim join** (package, `app_store_id`, `product_id`) | Avoid **only** `store_package_id = bundle` for iOS; use same pattern as **`GetXmpSpendByModuleForAppAsync`**. | XMP ingest + `SyncAppIdentifiersAsync` |
| Q14 | Installs by network | **AF:** `bronze.appsflyer_installs_raw` **hoặc** `gold.app_ua_daily` (`mmp_source=appsflyer`) **hoặc** `bronze.appsflyer_aggregate_daily` (Master); **Adjust:** `bronze.adjust_report` | AF: reader thứ tự raw→gold→aggregate; Adjust: `dim.adjust_id = app_token` | **`GetAppsFlyerInstallsByMediaSourceForAdmobAppAsync`**; snapshot **`attribution.appsFlyerInstallsByMediaSourceTop`**, **`hasAppsFlyerAttributionSlice`**. | AppsFlyer Master + transform (doc 128) |
| Q15 | Organic vs paid | **AF:** cùng nguồn Q14 (`media_source` organic / restricted); **Fallback:** Firebase `af_status` on `first_open` | Same as Q14 | **`GetAppsFlyerOrganicPaidInstallSplitForAdmobAppAsync`**, **`GetFirebaseAfStatusInstallSplitForAdmobAppAsync`**; snapshot **`attribution`**. | AF + Firebase |
| Q16–Q17 | Product × geo | `bronze.fb_*` | Top countries CTE + `GROUP BY` expressions | StarRocks-safe: **`GROUP BY get_json_string(b.geo_json, '$.country'), b.event_date`** (no alias-only GROUP BY). | Firebase |
| Q18 | Retention by country | `bronze.fb_*` | Cohort-scoped activity + **per-cell then sum** | Avoid joining `SUM(d0_users)` to raw events (denominator inflation). See corrected SQL in doc 02. | Firebase |
| Q19 | D0 activation by country | `bronze.fb_*` | Same GROUP BY rules as Q16 | — | Firebase |
| Q20 | T+1 actions | **Postgres** `app_daily_insights` | **`app_row_id`** FK → `apps.id` | Column **`actions_json`** (jsonb); API maps to **`Actions`**. Snapshot **`t1ActionTracking`** from previous completed insight. | EF migration `AddAppDailyInsightActionsJson`; generator sets `ActionsJson` |

## Performance guardrails (summary)

- **Q5 / Q18:** Use **`gold.daily_overview`**, **`gold.retention_overview`**, **`gold.ad_performance`** when bronze scans exceed ~1 min; cap date window (e.g. 15–35 days).
- **Hard filters:** Always constrain **`firebase_id`** / **`admob_app_id`** via **`silver.dim_app_identifiers`** (bronze `fb_*` has no `app_id` column).
- **App Insight snapshot:** `AppInsightSnapshotBuilder` adds **`attribution`**, **`t1ActionTracking`**, and **`schemaVersion` = 8**.

## Screenshot / manual checks

Place exports under **`docs/plans/AR Tracer`** and cross-check row counts vs. matrix above for the same date window.
