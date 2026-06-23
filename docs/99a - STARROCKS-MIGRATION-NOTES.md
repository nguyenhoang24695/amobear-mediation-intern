# Ghi chú chuyển tính toán từ PostgreSQL sang StarRocks

Theo **99-MEDIATION PRO PLATFORM.md**, dữ liệu raw AdMob đã chuyển sang StarRocks với 3 lớp:
- **Bronze**: raw parsed (admob_performance, ...)
- **Silver**: cleaned & enriched (daily_app_revenue, daily_sow_analysis)
- **Gold**: business metrics (fact_daily_app_metrics, fact_sow_recommendations)

**PostgreSQL** chỉ giữ **master data**: apps, admob_accounts, organizations, app_permissions, alert_rules, users, ...

## Đã triển khai

### 1. DDL StarRocks (StarRocksSchemaInitializer)
- `silver.daily_app_revenue`: aggregate từ bronze theo date, account_id, app_id, platform, country
- `silver.daily_sow_analysis`: SoW theo mediation group (instance revenue / MG total)
- `gold.fact_daily_app_metrics`: KPIs theo app/ngày (revenue, impressions, ecpm, fill_rate; dau/dav/ua_cost Phase 2)
- `gold.fact_hourly_app_revenue`: doanh thu theo giờ (phase 1 AppLovin từ `bronze.applovin_revenue` + dim)
- `gold.fact_sow_recommendations`: kết quả 8-rule engine (để mở rộng sau)

### 2. Transform service & job
- **IStarRocksTransformService** / **StarRocksTransformService**: chạy SQL trên StarRocks
  - `SyncPackageAdmobMappingAsync`: PostgreSQL FirebaseAdmobMapping → silver.dim_package_admob_mapping (package_name → admob_app_id)
  - `SyncAppIdentifiersAsync`: PostgreSQL App + FirebaseAdmobMapping → silver.dim_app_identifiers (admob_app_id, package_name, app_store_id) cho gold cost
  - `RunSilverDailyAppRevenueAsync`: bronze → silver.daily_app_revenue (AdMob giữ app_id; AppLovin dùng mapping → admob_app_id)
  - `RunSilverDailySowAnalysisAsync`: bronze → silver.daily_sow_analysis (CTE tính SoW)
  - `RunGoldFactDailyAppMetricsAsync`: silver + cost từ XMP qua dim_app_identifiers → gold.fact_daily_app_metrics
  - `RunGoldFactHourlyAppRevenueAsync`: bronze.applovin_revenue (+ dim) → **gold.fact_hourly_app_revenue** (sau bước daily revenue)
- **SilverGoldTransformJob**: sync dim + silver/gold transforms (gồm `RunGoldFactHourlyAppRevenueAsync`) cho cửa sổ ngày `Transform:JobDaysBack` (mặc định 7), cron seed **`25 */2 * * *`** (UTC; có thể chỉnh trên `hangfire_job_schedules`)

### 2b. Đồng bộ app_id (chỉ chạy lại Silver/Gold, không đụng Bronze)
- **Bronze** giữ nguyên: admob_performance (app_id = ca-app-pub-xxx~yyy), applovin_revenue (package_name), xmp_report (product_id, store_package_id).
- **Silver**: revenue AdMob lấy app_id từ bronze; AppLovin map package_name → admob_app_id qua dim_package_admob_mapping.
- **Gold**: revenue từ silver (đã thống nhất admob_app_id); cost từ xmp_report join dim_app_identifiers (store_package_id/product_id → admob_app_id) để khớp rev.app_id. App.AppStoreId dùng cho iOS (số), package_name cho Android.
- Chỉ cần **chạy lại Silver/Gold transform** (và sync 2 bảng dim trước) là đủ; không cần chạy lại Bronze.

### 3. Dashboard đọc từ StarRocks
- **IStarRocksAnalyticsReader** / **StarRocksAnalyticsReader**: query gold.fact_daily_app_metrics, silver.daily_sow_analysis
- **DashboardService**: khi `IStarRocksAnalyticsReader.IsEnabled`, ưu tiên đọc từ StarRocks (GetAggregatedMetricsAsync, GetDailyMetricsAsync); fallback PostgreSQL (org_daily_summary, performance_data)

### 4. Job bỏ qua ghi PostgreSQL khi StarRocks bật
- **DashboardAggregationJob**: nếu `IStarRocksTransformService.IsEnabled` → skip (không ghi AppDailySummary, OrgDailySummary, NetworkDailySummary)
- **MetricsAggregationJob**: nếu `IStarRocksTransformService.IsEnabled` → skip (metrics đã ở silver/gold)

### 5. SoW và Alert
- SoW được tính trong **RunSilverDailySowAnalysisAsync** (SQL CTE từ bronze) và ghi `silver.daily_sow_analysis`.
- **SoWCalculatorJob**: khi StarRocks bật thì **skip** (không ghi PG, tránh duplicate; nguồn SoW = silver.daily_sow_analysis).
- **AlertCalculationJob**: khi `IStarRocksAnalyticsReader.IsEnabled` thì đọc SoW từ `GetDailySowAnalysisAsync` (StarRocks silver); ngược lại đọc từ PostgreSQL `SoWData`. Alert vẫn chạy bình thường; dữ liệu alert (kết quả trigger) lưu trên PG (system), chỉ **nguồn SoW** để evaluate rule lấy từ StarRocks hoặc PG.
- **SoWDataController** (API cho FE): khi StarRocks bật trả dữ liệu từ `GetDailySowAnalysisAsync`, map sang dạng SoWData; khi không bật đọc từ PG.

## DDL / ETL — tránh lỗi thường gặp

- **Bắt buộc đọc khi thêm bảng hoặc sửa migration StarRocks:** [**docs/STARROCKS-DDL-PITFALLS.md**](./STARROCKS-DDL-PITFALLS.md) — thứ tự cột `DUPLICATE KEY`, NOT NULL/DEFAULT, đồng bộ `INSERT` với C#.
- Tóm tắt nhanh cũng có trong **`.cursorrules`** (mục StarRocks DDL & ETL).

## Cấu hình

- **StarRocks:ConnectionString** (hoặc ConnectionStrings:StarRocks): khi có thì Silver/Gold transform và reader được bật.
- **Stream Load (HTTP):** **`StarRocks:HttpHost`**, **`HttpPort`** (8030), user/password — để bật Stream Load cho **bronze.xmp_report**, **bronze.admob_table / mkt_table / mediation_table**, **gold.xmp_ua_cost_sync_hourly** (ưu tiên trước MySQL INSERT). Số dòng mỗi batch JSON: **`StarRocks:StreamLoadBatchSize`** (mặc định 10000).
- **StarRocks:CommandTimeoutSeconds** (tùy chọn): thời gian tối đa (giây) cho mỗi lệnh SQL; khuyến nghị **300**. **StarRocks:ConnectionTimeoutSeconds** (tùy chọn): thời gian chờ thiết lập kết nối (giây); khuyến nghị **60** để tránh "Connect Timeout expired" khi FE đang tải.
- **Transform:DaysBack**: số ngày transform (mặc định 7).

## Vận hành & giảm timeout

- **Ứng dụng:** Đã dùng MySqlConnector với `Default Command Timeout` lấy từ `StarRocks:CommandTimeoutSeconds` cho mọi kết nối StarRocks (reader, transform, writers). Nếu vẫn timeout, tăng `CommandTimeoutSeconds` (ví dụ 600).
- **StarRocks FE:** Trên cluster StarRocks, kiểm tra/cài đặt `query_timeout` (giây) đủ lớn cho query nặng (ví dụ 300–600). Session: `SET query_timeout = 300;` hoặc cấu hình mặc định trong FE.
- **Partition:** Các bảng lớn (bronze.mediation_table, silver.daily_sow_analysis) nên partition theo `date` để query chỉ quét partition cần thiết, giảm thời gian chạy và tránh timeout khi dữ liệu tăng. DDL mẫu và hướng dẫn migration: **docker/starrocks/partition-production.sql** và **docker/starrocks/README-production.md**.
- **StarRocks server (production):** Cấu hình FE/BE: **docker/starrocks/conf/**, **set-production.sql**; checklist: **docker/starrocks/docs/STARROCKS-PRODUCTION-CONFIG.md**. Khuyến nghị partition và distribution key (API + Superset): **docker/starrocks/docs/JOB-TABLE-KEYS.md**. **Migration** (áp dụng partition/index cho hệ thống hiện tại): **docker/starrocks/docs/MIGRATION-PARTITION-INDEX.md** (tham chiếu 99b).

## Thứ tự job (ví dụ mỗi 2h)

1. Performance Sync → ghi bronze AdMob (và MinIO raw)
2. **Silver/Gold Transform** (phút 25, cách 2h) → dim; **silver.daily_app_revenue**; **gold.fact_hourly_app_revenue** (AppLovin hourly); **gold.fact_daily_app_metrics**; SoW/Meta/AppsFlyer… (xem `SilverGoldTransformJob`)
3. Metrics Aggregation (30 phút): no-op nếu StarRocks bật
4. SoW Calculator (45 phút): vẫn ghi PG SoWData (cho Alert)
5. Dashboard Aggregation (55 phút): no-op nếu StarRocks bật

**XMP hourly UA cost:** Sau mỗi lần ghi **bronze.xmp_report** (vd job **xmp-sync-job-today** `*/30 * * * *`), writer gọi **XmpGoldHourlyReconciler** → **gold.xmp_ua_cost_sync_hourly** (phân bổ incremental theo `H_sync`, xem **99b §3.4**). Ghi gold hourly: ưu tiên **Stream Load** JSON (`StarRocksStreamLoadClient`; batch **`StreamLoadBatchSize`**), fallback batch INSERT MySQL.

**AdMob bronze (3 bảng report):** **PerformanceSync** / restore MinIO → **`StarRocksAdmobReportTablesWriter`**: Stream Load JSON khi đã cấu hình FE HTTP; fallback INSERT theo **`InsertBatchSize`** / **`MediationTableInsertBatchSize`**.

## API phục vụ FE khi StarRocks bật (không còn summary trên PG)

- **DashboardService**: GetKeyMetricsAsync, GetDailyMetricsAsync, GetAggregatedMetricsAsync, GetKeyMetricsForAppAsync, GetDailyMetricsForAppAsync, GetTopAppsAsync, GetRevenueByNetworkAsync — tất cả ưu tiên đọc từ StarRocks (gold/bronze) khi `IStarRocksAnalyticsReader.IsEnabled`, fallback PG.
- **DashboardCacheJob**: khi StarRocks bật thì skip (không ghi cache từ PG vì summary rỗng; FE vẫn hoạt động vì API đọc trực tiếp StarRocks).
- **SoWDataController**: GetSoWData, GetSoWSummary — khi reader enabled trả từ StarRocks silver.daily_sow_analysis.

## Việc có thể làm tiếp

- 8-rule recommendation engine: ghi kết quả vào `gold.fact_sow_recommendations`.
- Các API dashboard khác (nếu có) đảm bảo có path StarRocks khi cần.
