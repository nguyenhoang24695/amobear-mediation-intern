
# Amobear Nexus — Data context (doc 115, condensed for MCP)

## Bắt buộc
- Chỉ dùng **database.table** (vd `gold.fact_daily_app_metrics`). Không bịa `gold_fact_*`, `silver.dim_apps`, `daily_ad_revenue`.
- **app_id** trên StarRocks = **AdMob application id** (chuỗi) trên các bảng **có cột đó** (gold/silver facts, bronze AdMob/MKT/…). **Không** áp dụng cho **`bronze.fb_*`**: mỗi app một bảng `bronze.fb_{sanitized_key}`, **không có cột `app_id`** — không viết `WHERE app_id IN (…)` trên bảng đó; chọn đúng bảng. Không dùng `admob_id` làm tên cột.
- Dimension app: **`silver.dim_app_identifiers`** — khóa **`admob_app_id`**; có `adjust_id`, `appmetrica_id`, `package_name`, `platform`.
- Cột ngày: bronze AdMob/MKT dùng `` `date` `` (backtick); Firebase silver/gold dùng **`event_date`**; AppMetrica dùng **`stat_date`**.
- **Số liệu:** chỉ trích từ kết quả query/MCP; không ước lượng.

## Gold — KPI ngày
- **`gold.fact_daily_app_metrics`**: DUPLICATE KEY (`` `date` ``, account_id, app_id, platform). Cột: total_revenue, ad_unit_revenue, waterfall_revenue, total_impressions, total_ad_requests, total_matched_requests, ecpm, fill_rate, dau, dav, arpdau, ua_cost, roi.
- **`gold.daily_overview`**: event_date, app_id — dau, new_users, dav, sessions, iap_rev, iaa_rev, total_rev, arpdau, ad_penetration, …
- **`gold.retention_overview`**: event_date, app_id, install_date, retention_day, retention_rate, total_new_users, active_users, …
- **`gold.ab_user_app_mapping`**: username, app_id, end_date (RLS).

## Silver
- **`silver.daily_app_revenue`**: date, app_id, platform, country — **total_revenue**, total_impressions, ecpm, fill_rate (không có cột `revenue` đơn).
- **`silver.dim_country`**: country_code, country_name, country_name_firebase, region, tier.
- **`silver.dim_app_waterfall_ad_units`**: app_id, ad_unit_id.
- Firebase multi-tenant: **`silver.engagement`**, **geo**, **device**, **retention_cohort**, **ad_metrics**, **iap_metrics**, **event_summary** — lọc **event_date** + **app_id**.
- SoW: **`silver.daily_sow_analysis`**.

## Bronze
- **`bronze.mkt_table`**, **admob_table**, **mediation_table**: **app_id**, `` `date` ``, metrics; **không** có admob_id.
- **`bronze.adjust_report`**: **app_token** + JSON metrics; join dim **adjust_id**.
- **`bronze.xmp_report`**: **không** có `app_id` / **`bundle_id`**. Cột gói: **`store_package_id`** (Android thường = package; iOS thường dạng **`id` + số store**, vd `id6504559449`). Lọc app an toàn: **`INNER JOIN silver.dim_app_identifiers d`** (match `os` + `package_name` / `product_id` / `app_store_id` / `CONCAT('id', app_store_id)` như ETL) rồi `WHERE d.admob_app_id = '…'`. Chỉ `store_package_id = 'com.…'` — đúng nếu trùng dim; với iOS dễ thiếu/sai.
- **`bronze.applovin_revenue`**: package_name, date, estimated_revenue, …
- Firebase raw per app: **`bronze.fb_*`** — **một bảng / app**, tên từ **`silver.dim_app_identifiers`** cột firebase_id và tự sửa ký tự "-" thành "_". Cột: **`event_date`**, `event_name`, `user_pseudo_id`, JSON… **Không có `app_id`.** Chỉ lọc **`event_date`** (+ điều kiện khác), không thêm `app_id`.
- **AppsFlyer:** **`gold.app_ua_daily`** với **`mmp_source='appsflyer'`**, **`app_id`** = AdMob (sau `AppsFlyerUaTransformJob` / Silver-Gold transform). Nguồn fact **`bronze.appsflyer_aggregate_daily`** (`report_type='master_api_v4'`, `app_id` = AF app id); join **`silver.dim_app_identifiers`** (`appsflyer_af_app_id`, **hoặc** `package_name` / `id`+`app_store_id`). Pull tùy chọn: **`bronze.appsflyer_installs_raw`** / **`bronze.appsflyer_events_raw`** khi bật Pull API.
