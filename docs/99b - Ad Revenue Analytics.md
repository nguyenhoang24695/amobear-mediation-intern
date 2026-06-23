# 📊 Tài liệu Training: Ad Revenue Analytics

## Xây dựng Dashboard phân tích doanh thu quảng cáo với Superset & StarRocks

**Phiên bản:** 1.14 | **Ngày:** Tháng 6, 2026 | **Đối tượng:** Data Analyst, BI Developer, Admin, PO/MKT

> **Cập nhật 1.14:** **§1.3** — **Redis Global Gate** cho `mediationReport:generate` (Doc **136**): một session, cooldown 15 phút, hàng đợi job không trùng; áp dụng mọi job performance-sync AdMob bronze và compare resync trước khi ghi `admob_table` / `mkt_table` / `mediation_table` / `admob_revenue_table`.
> **Cập nhật 1.13:** **§1.3** — `gold.fact_hourly_app_revenue`: job **`calculate-app-revenue-hourly`** (`CalculateAppRevenueHourlyJob.RunAsync`, cron **`0 * * * *`**) chạy **`RunGoldFactHourlyAppRevenueIncrementalAsync`** với watermark file (`Transform:HourlyAppRevenueCheckpointPath`, overlap `HourlyAppRevenueCheckpointLookbackHours`); **`silver-gold-transform-job`** không còn gọi full hourly theo `JobDaysBack`. Cột audit **`created_at`** + **`_updated_at`**. Nguồn IAA hourly: **`applovin`**, **`admob`** (bronze.mediation_table, phân slot kiểu XMP `H_sync`), **`qonversion`** (÷24). Tránh double-count KPI: AppLovin vs AdMob là hai network — Performance tab sum IAA có cả `applovin` và `admob` khi bật đủ nguồn.
> **Cập nhật 1.12:** **§3.3** — Ghi AdMob bronze (admob_table, mkt_table, mediation_table): **`StarRocksAdmobReportTablesWriter`** ưu tiên **Stream Load** JSON khi cấu hình **`StarRocks:HttpHost`**; batch **`StarRocks:StreamLoadBatchSize`**; fallback INSERT MySQL. **§3.4** — Ghi **gold.xmp_ua_cost_sync_hourly**: **`XmpGoldHourlyReconciler`** Stream Load + fallback MySQL (cùng pattern `StarRocksStreamLoadClient`).
> **Cập nhật 1.11:** **§1.3** — `gold.fact_hourly_app_revenue`: job Hangfire liên quan (`applovin-sync-job`, `silver-gold-transform-job`), gợi ý tần suất intraday. **§3.4** — `gold.xmp_ua_cost_sync_hourly`: đổi mô tả sang phân bổ **incremental** (slot `H_sync` = tổng bronze ngày − SUM(slot 0..H−1)); quy tắc `H_sync` từ `_synced_at`; múi giờ `hour_of_day` theo `XmpSync:SyncedAtTimeZoneId` / `XmpSync:ThirdPartyTimezone` hoặc UTC (tham chiếu `XmpSyncTimeHelper`).
> **Cập nhật 1.10:** Bổ sung **cột mới bronze.mediation_table**: ad_source_instance_id, ad_source_instance_name, impression_ctr (AdMob AD_SOURCE_INSTANCE + IMPRESSION_CTR). **§3.3** bảng dimensions/metrics + bảng "Cột mới mediation_table" với cách sử dụng trong Superset (SoW theo instance, CTR, label). **§2.1** ER diagram mediation_table thêm 3 cột.
> **Cập nhật 1.9:** Bổ sung **thiết lập Roles chi tiết** theo đúng Superset (FAB): 11.3 Roles có sẵn (Admin, Alpha, Gamma, sql_lab, Public), Groups/Roles, Permissions; 11.4 từng bước cho DA (Alpha + sql_lab) và PO/MKT (Gamma + custom role PO_MKT + RLS); 11.4.4 Row Level Security theo app; 11.5 Đồng bộ user từ Mediation. Đánh số lại 11.6–11.7 (Tạo Dataset, Tạo Dashboard).
> **Cập nhật 1.8:** Bổ sung **mục 11 — Hướng dẫn sử dụng Superset** đầy đủ: 11.1 Kết nối StarRocks (Admin), 11.2 Tạo dataset gốc, 11.3 Phân quyền (Data Analyst vs PO/MKT), 11.4 Đồng bộ user và RLS theo app (từ Mediation), 11.5–11.6 Tạo Dataset/Dashboard.
> **Cập nhật 1.7:** Bổ sung **Firebase** vào toàn bộ luồng và kiến trúc: **§1.1** mục tiêu engagement/ARPDAU; **§1.3** diagram Sources/Bronze/ETL/Silver có Firebase + fb_* + daily_app_engagement; **§2.1** Data Model + ER (fb_events); **§2.2** bảng mapping thêm cột Firebase; **§3.8** cấu trúc bảng Bronze Firebase; **§4.1** bảng dataset + diagram có ds_firebase_engagement, ds_arpdau, ds_firebase_events/geo; **§4.8** tận dụng Silver engagement và Bronze fb_*.
> **Cập nhật 1.6:** Thêm **mục 11** (Dữ liệu Firebase: Bronze fb_*, Silver engagement, mapping) và **mục 12** (Khuyến nghị dashboard bổ sung khi có Firebase): Dashboard 7 Engagement & Retention, 8 ARPDAU & Monetization, 9 Event Funnel, 10 Geo & Device, 11 Engagement vs Revenue); datasets mẫu và chart.
> **Cập nhật 1.5:** Bỏ bảng **admob_performance** (Bronze). AdMob Bronze chỉ còn **admob_table**, **mkt_table**, **mediation_table**; ETL Silver lấy doanh thu AdMob từ **bronze.admob_table**. Cập nhật diagram luồng dữ liệu, ER, dataset (ds_unified_revenue, Dashboard 2, Troubleshooting) theo cấu trúc mới.
> **Cập nhật 1.4:** Thêm **mục 10 — Dashboard 6: Điều hành (Executive)** — dataset và hướng dẫn xây dashboard Superset cho cấp điều hành: tên app (package_name), Cost break theo kênh (XMP module), Revenue break theo kênh (AdMob/AppLovin), bảng theo app/ngày, tổng theo tháng, KPI và biểu đồ.
> **Cập nhật 1.3:** Bổ sung **mục 3.7** bảng mapping từ PostgreSQL (apps, firebase_admob_mapping); hướng dẫn **hiển thị tên đầy đủ app** trên Superset (mục 4.7) — dùng `app_display_name` từ JOIN với silver.dim_app_identifiers (hoặc dim_app_display khi có); cập nhật query ds_unified_revenue và ds_app_pnl có JOIN dim; mục **4.8** tận dụng Silver/Gold cho dashboard (filter, time range).
> **Cập nhật 1.2:** Đồng bộ cấu trúc app identifier: **Bronze** giữ nguyên format từng nguồn; **Silver/Gold** thống nhất **admob_app_id**; chỉ cần chạy lại Silver/Gold, không đụng Bronze.
> **Cập nhật 1.1:** Dataset ưu tiên dùng **Silver/Gold** do ETL populate; đồng nhất với backend.

---

# 1. Tổng quan hệ thống

## 1.1 Mục tiêu

- **Theo dõi doanh thu** từ nhiều ad network (AppLovin, AdMob)
- **Phân tích chi phí UA** từ XMP Mobivista
- **Tính toán P&L** cho từng ứng dụng
- **So sánh hiệu suất** giữa các ad network
- **Phân tích Cohort & LTV**
- **Khi có Firebase:** Theo dõi **engagement** (DAU, DAV, sessions), **ARPDAU** (revenue/DAU), **funnel events** và **geo/device**; kết hợp với ad revenue (mục 11, 12).

## 1.2 Công nghệ sử dụng

| Thành phần | Công nghệ | Vai trò |
| --- | --- | --- |
| Database | StarRocks | Lưu trữ và xử lý OLAP |
| Visualization | Apache Superset | Dashboard và báo cáo |
| Data Sources | AppLovin, AdMob, XMP | Nguồn dữ liệu (revenue, cost) |
| Data Sources (engagement) | Firebase → BigQuery → StarRocks | DAU, DAV, sessions, events (mục 11, 12) |

## 1.3 Luồng dữ liệu

Dữ liệu chảy **Bronze → Silver → Gold** qua ETL (job **SilverGoldTransformJob**). Superset **ưu tiên dùng Silver/Gold** để đồng nhất với hệ thống. **AdMob tại Bronze** gồm 3 bảng: **admob_table**, **mkt_table**, **mediation_table** (sync từ AdMob Mediation Report API); ETL Silver/Gold hiện lấy nhánh AdMob từ **bronze.mediation_table** (thay `admob_table` / `mkt_table` để giữ đủ breakdown và tránh double-count; xem `docs/MEDIATION_TABLE_ETL_AGGREGATION.md`). (Bảng cũ admob_performance đã bỏ.) **Firebase** (tùy chọn): events từ BigQuery → **bronze.fb_{app_id}**; ETL có thể tổng hợp **silver.daily_app_engagement** (DAU, DAV, sessions). Chi tiết và dashboard bổ sung: **mục 11, 12**.

**Gold hourly revenue:** Bảng **gold.fact_hourly_app_revenue** ghi nhận doanh thu quảng cáo theo **ngày + giờ (0–23) + app** (`admob_app_id`), kèm **country**, **channel**, **revenue_source** = **`applovin`** (bronze.applovin_revenue, có `hour`), **`admob`** (bronze.admob_revenue_table — không có giờ; ETL phân bổ incremental theo `syncedAt − 1h` làm tròn phút/giây, xem `StarRocksTransformService.GetEffectiveSyncStartTimeUtcForAdmobHourly`), **`qonversion`** (gold.app_iap_daily ÷ 24). Cột **`created_at`** / **`_updated_at`** = thời điểm batch ghi (DELETE+INSERT).

**Job & lịch (tham chiếu seed `HangfireJobScheduleService` / bảng `hangfire_job_schedules`):**

| Job | Method | Cron mặc định (UTC) | Vai trò với `fact_hourly_app_revenue` |
|-----|--------|---------------------|----------------------------------------|
| **applovin-sync-job** | `AppLovinSyncJob.SyncAllAsync` | `0 2 * * *` (1×/ngày) | Kéo MAX → MinIO → **bronze.applovin_revenue** (có `hour`). |
| **silver-gold-transform-job** | `SilverGoldTransformJob.RunTransformAsync` | `35 * * * *` | Silver/Gold **daily** — **không** rebuild full hourly theo `JobDaysBack`. |
| **calculate-app-revenue-hourly** | `CalculateAppRevenueHourlyJob.RunAsync` | `0 * * * *` | **Incremental** hourly: watermark file (`Transform:HourlyAppRevenueCheckpointPath`) → `RunGoldFactHourlyAppRevenueIncrementalAsync`. Chạy sau daily (phút 35) — phút **0** giờ kế an toàn. |

**Intraday:** job **`calculate-app-revenue-hourly`** + cấu hình checkpoint; backfill full range vẫn dùng **`RunGoldFactHourlyAppRevenueAsync`** (SilverGoldInitialTransformJob, AppPerformanceDayReprocessJob, v.v.).

```mermaid
flowchart LR
    subgraph Sources["📥 Data Sources"]
        AL[AppLovin API]
        AM[AdMob API]
        XMP[XMP Mobivista]
        FB[Firebase → BigQuery → GCS]
    end

    subgraph Bronze["💾 Bronze (format gốc, không đổi)"]
        B1[applovin_revenue<br/>package_name]
        B2[applovin_cohort]
        B3[admob_table, mkt_table, mediation_table<br/>report AdMob, app_id, PK=hash_key]
        B4[xmp_report<br/>product_id, store_package_id]
        B5[fb_app1, fb_app2, ...<br/>events, app_id=firebaseAppKey]
    end

    subgraph PG["🗄️ PostgreSQL"]
        App[App, FirebaseAdmobMapping]
    end

    subgraph ETL["⚙️ ETL"]
        SyncDim[Sync dim từ PG]
        T1[Silver daily_app_revenue]
        T2[Gold fact_daily_app_metrics]
        T3[Silver daily_app_engagement<br/>DAU, DAV, sessions]
    end

    subgraph SilverGold["📊 Silver / Gold (app_id = admob_app_id)"]
        DIM1[dim_package_admob_mapping]
        DIM2[dim_app_identifiers]
        S1[silver.daily_app_revenue]
        S2[silver.daily_app_engagement]
        G1[gold.fact_daily_app_metrics]
    end

    subgraph BI["📈 Superset"]
        DS[Datasets]
        DB[Dashboards]
    end

    AL --> B1
    AL --> B2
    AM --> B3
    XMP --> B4
    FB --> B5
    App --> SyncDim
    SyncDim --> DIM1
    SyncDim --> DIM2
    B1 --> T1
    B3 --> T1
    DIM1 --> T1
    T1 --> S1
    S1 --> T2
    B4 --> T2
    DIM2 --> T2
    T2 --> G1
    B5 --> T3
    T3 --> S2
    DIM2 --> T3
    S1 --> DS
    G1 --> DS
    S2 --> DS
    B2 --> DS
    DS --> DB
```

---

# 2. Kiến trúc dữ liệu

## 2.1 Data Model

**Bronze** — Raw theo từng nguồn (app_id / package_name / product_id tùy bảng). AdMob: **bronze.admob_table**, **bronze.mkt_table**, **bronze.mediation_table** (3 bảng report AdMob theo pipeline docs/admob, PRIMARY KEY = hash_key, app_id = ca-app-pub-xxx~yyy), dùng cho ETL Silver và báo cáo chi tiết theo dimension (ad unit, marketing, mediation). **Firebase:** Mỗi app một bảng **bronze.fb_{sanitized_app_id}** (events từ BigQuery → GCS → StarRocks); app identifier = **firebaseAppKey** (package_name style); ETL hoặc job riêng có thể tổng hợp **silver.daily_app_engagement** (DAU, DAV, sessions). **Silver/Gold** — Thống nhất `app_id` = **admob_app_id** cho revenue/cost; engagement có thể dùng firebaseAppKey hoặc map qua dim (package_name ↔ admob_app_id). ETL lấy AdMob từ **bronze.admob_table**; dùng **silver.dim_package_admob_mapping** và **silver.dim_app_identifiers** để map revenue/cost về cùng identifier.

```mermaid
erDiagram
    applovin_revenue {
        date date PK
        string package_name PK
        string platform PK
        string country
        string network
        string ad_format
        bigint impressions
        decimal estimated_revenue
        decimal ecpm
    }

    applovin_cohort {
        date cohort_date PK
        string package_name PK
        int day_number PK
        string country
        string platform
        bigint installs
        decimal revenue
    }

    admob_table {
        string hash_key PK
        date date
        string app_id
        string platform
        string format
        string ad_unit_id
        bigint impressions
        double estimated_earnings
        double observed_ecpm
    }

    mkt_table {
        string hash_key PK
        date date
        string app_id
        string country
        string platform
        string format
        bigint impressions
        double estimated_earnings
    }

    mediation_table {
        string hash_key PK
        date date
        string app_id
        string ad_source_id
        string ad_source_instance_id
        string ad_source_instance_name
        string mediation_group_id
        string country
        string platform
        string format
        bigint impressions
        double impression_ctr
        double estimated_earnings
    }

    xmp_report {
        date date PK
        string product_id PK
        string store_package_id
        string os PK
        string module PK
        string account_name
        decimal cost
    }

    fb_events {
        date event_date
        bigint event_timestamp
        string user_pseudo_id
        string event_name
        string app_version
        string device_json
        string geo_json
        string event_params_json
        string raw_event_json
    }
```

**Firebase (Bronze):** Thực tế mỗi app một bảng **bronze.fb_{sanitized_app_id}** (vd. `fb_com_earthmap_livesatellite_worldmap_view`); schema chung như trên. App được xác định bởi tên bảng (firebaseAppKey). Chi tiết: **mục 3.8**, **docs/firebase-project/BIGQUERY-SCHEMA-STORAGE.md**.

## 2.2 Mapping giữa các nguồn

**Bronze (raw) — mỗi nguồn giữ format riêng:**

| Khái niệm | AppLovin (Bronze) | AdMob (Bronze) | XMP (Bronze) | Firebase (Bronze) |
| --- | --- | --- | --- | --- |
| Bảng | `applovin_revenue` | **admob_table**, **mkt_table**, **mediation_table** (3 bảng) | `xmp_report` | **fb_{app_id}** (mỗi app 1 bảng) |
| App identifier | `package_name` | `app_id` (ca-app-pub-xxx~yyy) | `product_id`, `store_package_id` | **firebaseAppKey** (tên bảng ≈ package_name) |
| Platform | `platform` | `platform` | `os` | (trong device_json / app_info) |
| Revenue | `estimated_revenue` | `estimated_earnings` | - | - (chỉ engagement; revenue từ AdMob/AppLovin) |
| Cost | - | - | `cost` | - |
| Engagement | - | - | - | **event_name**, **user_pseudo_id**, **geo_json**, **device_json** → DAU, DAV, sessions |

**Silver / Gold — identifier thống nhất:**

- Toàn bộ Silver/Gold dùng **admob_app_id** (định dạng `ca-app-pub-xxx~yyy`) để khớp với **PostgreSQL App.AppId** (structure).
- ETL dùng 2 bảng dimension:
  - **silver.dim_package_admob_mapping**: package_name → admob_app_id (sync từ FirebaseAdmobMapping).
  - **silver.dim_app_identifiers**: admob_app_id, package_name, app_store_id (sync từ App + FirebaseAdmobMapping; dùng để map XMP cost → admob_app_id).
- **Silver daily_app_revenue:** AdMob lấy từ **bronze.admob_table** (app_id = admob_app_id); AppLovin map `package_name` → `admob_app_id` qua dim_package_admob_mapping.
- **Gold fact_daily_app_metrics:** Revenue từ silver (đã admob_app_id); Cost từ bronze.xmp_report join dim_app_identifiers (store_package_id / product_id → admob_app_id).
- **Firebase:** Bronze fb_* dùng **firebaseAppKey** (≈ package_name); để join với Silver/Gold (admob_app_id) dùng **dim_app_identifiers** (package_name ↔ admob_app_id). **Silver daily_app_engagement** (nếu có) có thể lưu app_id = firebaseAppKey hoặc admob_app_id tùy ETL.
- Chỉ cần **chạy lại Silver/Gold** transform (và sync 2 bảng dim); **không cần chạy lại Bronze**.

### ⚠️ Xử lý trùng lặp dữ liệu (Deduplication)

```mermaid
flowchart TB
    subgraph Problem["❌ VẤN ĐỀ: Đếm trùng Revenue"]
        AL_Raw["AppLovin Data<br/>Bao gồm: Facebook, Unity,<br/>AdMob, Google Bidding..."]
        AM_Raw["AdMob Data<br/>AdMob Revenue"]
        Dup["⚠️ AdMob Revenue<br/>bị đếm 2 lần!"]
    end

    subgraph Solution["✅ GIẢI PHÁP: Loại bỏ trùng lặp"]
        AL_Clean["AppLovin Data<br/>Loại bỏ: AdMob, Google"]
        AM_Clean["AdMob Data (bronze.admob_table<br/>— nguồn chính thức)"]
        Final["Unified Revenue<br/>Không trùng lặp"]
    end

    AL_Raw --> Dup
    AM_Raw --> Dup

    AL_Clean --> Final
    AM_Clean --> Final

```

**Nguyên nhân:**

- AppLovin MAX là **mediation platform** - nó tổng hợp revenue từ nhiều ad network
- Trong đó có cả **AdMob/Google Bidding** revenue
- Nếu cộng thêm data từ AdMob (bronze) sẽ bị **đếm trùng**

**Giải pháp:**

- Khi query từ `applovin_revenue`, thêm filter: `WHERE LOWER(network) NOT LIKE '%admob%' AND LOWER(network) NOT LIKE '%google%'`
- AdMob revenue lấy từ **bronze.admob_table** (và ETL Silver aggregate từ đây — nguồn chính thức)

---

# 3. Cấu trúc bảng dữ liệu

## 3.1 Bảng `applovin_revenue`

| Column | Type | Mô tả |
| --- | --- | --- |
| `date` | DATE | Ngày báo cáo |
| `package_name` | VARCHAR(255) | Bundle ID của app |
| `country` | VARCHAR(10) | Mã quốc gia |
| `ad_format` | VARCHAR(50) | Loại quảng cáo |
| `network` | VARCHAR(255) | Ad network |
| `platform` | VARCHAR(50) | iOS/Android |
| `impressions` | BIGINT | Số lượt hiển thị |
| `estimated_revenue` | DECIMAL(20,6) | Doanh thu (USD) |
| `ecpm` | DECIMAL(20,4) | Effective CPM |

## 3.2 Bảng `applovin_cohort`

| Column | Type | Mô tả |
| --- | --- | --- |
| `cohort_date` | DATE | Ngày cài đặt |
| `package_name` | VARCHAR(255) | Bundle ID |
| `day_number` | INT | Số ngày từ install (D0, D1, D7...) |
| `installs` | BIGINT | Số lượt cài đặt |
| `revenue` | DECIMAL(20,6) | Doanh thu từ cohort |

## 3.3 Bảng report AdMob (Bronze): admob_table, mkt_table, mediation_table

Ba bảng này thay thế bảng **admob_performance** (đã bỏ). Nằm trong **bronze**, sync từ AdMob Mediation Report API qua **PerformanceSyncService** → **StarRocksAdmobReportTablesWriter**. Mỗi bảng có **PRIMARY KEY = hash_key** (INSERT = UPSERT). **ETL Silver** nhánh AdMob aggregate từ **`bronze.mediation_table`** (theo date, app_id, platform, country) — xem **`docs/MEDIATION_TABLE_ETL_AGGREGATION.md`**. **Gold** split `ad_unit_revenue` / `waterfall_revenue` cũng từ aggregate **`bronze.mediation_table`** + `silver.dim_app_waterfall_ad_units`.

**Điều phối API:** Mọi job gọi `mediationReport:generate` trước khi ghi bronze đi qua **Redis Global Gate** ([Doc 136](./136-ADMOB-MEDIATION-REPORT-GENERATE-GATE.md)) — tránh nhiều job Hangfire + resync manual gọi AdMob đồng thời. Cấu hình: `PerformanceSync:MediationGenerateGateEnabled`, `MediationGenerateCooldownMinutes`.

**Cơ chế ghi StarRocks:** Khi đã cấu hình **HTTP Stream Load** (`StarRocks:HttpHost`, port 8030, `StarRocksStreamLoadClient`), writer ưu tiên nạp **JSON** theo batch (**`StarRocks:StreamLoadBatchSize`**) vào `bronze.admob_table`, `bronze.mkt_table`, `bronze.mediation_table`. Nếu không dùng Stream Load hoặc lỗi (vd. bảng chưa có trên FE) → **INSERT** qua MySQL protocol theo **`StarRocks:InsertBatchSize`**; riêng **mediation_table** có **`StarRocks:MediationTableInsertBatchSize`**. Giúp giảm số transaction nhỏ và lỗi **too many versions** trên tablet khi chạy song song nhiều chunk.

| Bảng | Dimensions chính | Mục đích |
| --- | --- | --- |
| **bronze.admob_table** | DATE, AD_UNIT, APP, FORMAT, PLATFORM, APP_VERSION_NAME | Report theo ad unit / app / format; có thể sync song song cho đối soát / UI deprecated |
| **bronze.mkt_table** | DATE, APP, COUNTRY, APP_VERSION_NAME, FORMAT, PLATFORM | Report theo app / country (marketing); có thể sync song song cho đối soát |
| **bronze.mediation_table** | DATE, AD_SOURCE, **AD_SOURCE_INSTANCE**, AD_UNIT, MEDIATION_GROUP, APP, COUNTRY, FORMAT, PLATFORM | Report mediation theo nguồn / nhóm / **từng instance**; **nguồn aggregate cho Silver/Gold AdMob**; sync theo country chunk (5 châu lục + 11 cặp country) |

**Cột chung (metrics):** hash_key, date, app_id (hoặc APP tương đương), platform, format, ad_requests, clicks, estimated_earnings, impressions, **impression_ctr**, matched_requests, match_rate, show_rate, observed_ecpm. Cột dimension riêng: admob_table (ad_unit_id, ad_unit_name, app_name, app_version_name); mkt_table (country, app_name, app_version_name); mediation_table (ad_source_id, ad_source_name, **ad_source_instance_id**, **ad_source_instance_name**, mediation_group_id, mediation_group_name, ad_unit_id, country, app_name). Chi tiết DDL và luồng xem **docs/100 - AMOBEAR DATA STORAGE ARCHITECTURE.md** (Bronze AdMob Tables).

**Cột mới mediation_table (phân tích sâu mediation / waterfall):**

| Cột | Mô tả | Cách sử dụng trong Superset / báo cáo |
|-----|-------|----------------------------------------|
| **ad_source_instance_id** | ID instance nguồn quảng cáo (vd: ca-app-pub-xxx:asi:5678) | Group by / filter theo **từng instance** trong waterfall; SoW theo instance; so sánh eCPM giữa "AdMob (default)" và instance tùy chỉnh. |
| **ad_source_instance_name** | Tên hiển thị (vd: "AdMob (default)") | Dùng làm label trên chart/table thay vì ID. |
| **impression_ctr** | CTR từ API (clicks/impressions) | Metric sẵn cho chart CTR theo ad_source/instance/country/format; không cần tính thủ công từ clicks/impressions. |

## 3.4 Bảng `xmp_report` (Bronze)

| Column | Type | Mô tả |
| --- | --- | --- |
| `date` | DATE | Ngày chi tiêu |
| `product_id` | VARCHAR(255) | ID sản phẩm (có thể là package_name hoặc app store id tùy nguồn) |
| `store_package_id` | VARCHAR(255) | Package name (Android); tương ứng package_name |
| `os` | VARCHAR(50) | iOS/Android |
| `module` | VARCHAR(100) | Kênh UA (Facebook, Google...) |
| `account_name` | VARCHAR(255) | Tên tài khoản |
| `timezone` | VARCHAR(128) | Múi báo cáo theo dòng API (IANA như `Asia/Hong_Kong`, hoặc offset Mobvista như `+8`); rỗng thì reconcile dùng `XmpSync:ThirdPartyTimezone` rồi `UTC`. |
| `cost` | DECIMAL(18,6) | Chi phí UA (USD) |

Cột `date` giữ **nhãn ngày nghiệp vụ** từ API (yyyy-MM-dd). Một ngày đó được hiểu là **cả ngày lịch tại `timezone`**; cửa sổ UTC tương ứng dùng khi reconcile gold và khi lọc `start_time_utc` (helper `XmpReportDayUtcWindow` trong backend): local `00:00` → `UtcStart`, local nửa đêm ngày hôm sau → `UtcEndExclusive` (nửa mở). Ví dụ `date = 2026-04-22` và `Asia/Hong_Kong` (UTC+8): `UtcStart = 2026-04-21 16:00:00 UTC`, `UtcEndExclusive = 2026-04-22 16:00:00 UTC` (tương đương `start_time_utc` tới `2026-04-22 15:59:59` inclusive theo giây).

Gold ETL map XMP → admob_app_id qua **silver.dim_app_identifiers** (match store_package_id/product_id với package_name/app_store_id).

**gold.xmp_ua_cost_sync_hourly** — Cập nhật sau mỗi lần ghi `bronze.xmp_report` (job **xmp-sync-job-today** / writer StarRocks). Mỗi grain (**ngày báo cáo × múi hiệu lực** × `admob_app_id` × `module`) có đúng 24 dòng: mỗi slot là một **giờ UTC** liên tiếp trong cửa sổ nửa mở `[UtcStart, UtcEndExclusive)` ở trên (`start_time_utc` … `end_time_utc`); `SUM(ua_cost)` / `SUM(xmp_cost)` trên 24 dòng bằng tổng bronze **cùng** `date`, cùng biểu thức `COALESCE(timezone, ThirdPartyTimezone, UTC)`, INNER JOIN `silver.dim_app_identifiers` như nhánh XMP trong `gold.fact_daily_app_metrics` (code: **`XmpGoldHourlyReconciler`**). **Ghi bulk:** ưu tiên **Stream Load** JSON (`gold` / `xmp_ua_cost_sync_hourly`, batch **`StarRocks:StreamLoadBatchSize`**); lỗi hoặc không cấu hình FE → batch **INSERT** MySQL như trước.

**Backfill dữ liệu gold cũ:** Nếu trước đây slot đã ghi theo **24 giờ UTC lịch** của `date` (cách cũ), cần xóa hourly cho grain/ngày/múi tương ứng rồi sync lại bronze để reconcile tạo lại cửa sổ theo `timezone`.

**Ý nghĩa chỉ số slot 0–23 (incremental XMP cost, không chia đều theo cửa sổ trọng số):** Mỗi lần reconcile đọc tổng ngày `T` từ bronze và các slot gold hiện có. Gọi **`H_sync`** = `GetEffectiveSyncHourForHourly(_synced_at, report_date)`: **phút &lt; 10** → giờ của `_synced_at` **trừ 1** (wrap 0→23), **trừ** khi `DATE(_synced_at)` trùng `report_date` và đúng **00:00:00** thì **0**; **phút ≥ 10** → giờ của `_synced_at` (vd 13:05 → `H_sync = 12`). Công thức: giữ nguyên mọi slot có chỉ số **&lt; H_sync**; **`slot[H_sync] = T − SUM(slot[0..H_sync−1])`**; mọi slot **&gt; H_sync** → 0. Đây là bucket theo **lần sync** (delta tích lũy giữa các lần), **không** phải chi phí UA thực từng giờ từ API XMP.

**Múi giờ của `H_sync` (XMP):** Trùng với **giờ wall** lấy từ cột **`_synced_at`** khi ghi bronze: mặc định không cấu hình → **`DateTime.UtcNow`** (**UTC**); có **`XmpSync:ThirdPartyTimezone`** (vd `+7`) hoặc **`XmpSync:SyncedAtTimeZoneId`** (IANA) → giờ theo múi đó (`XmpSyncTimeHelper.GetSyncedAtForStorage`).

**AdMob revenue hourly (`fact_hourly_app_revenue`, `revenue_source = admob`):** Dùng quy tắc riêng — **`syncStartUtc = _synced_at − 1 giờ`**, làm tròn phút/giây (`GetEffectiveSyncStartTimeUtcForAdmobHourly`); giữ slot có `start_time_utc &lt; syncStartUtc`; slot tại `syncStartUtc` nhận phần delta còn lại.

**Đóng ngày (cross-verify):** Khi **`DATE(_synced_at)`** lớn hơn **nhãn** ngày báo cáo XMP (`date`), pipeline đọc lại tổng bronze, so với `SUM` 24 dòng gold; nếu lệch thì cộng phần lệch vào **slot cuối cửa sổ** (chỉ số giờ 23 trong 24 slot theo TZ, `start_time_utc` tương ứng).

## 3.5 Bảng Silver Dimension (sync từ PostgreSQL, dùng trong ETL)

**silver.dim_package_admob_mapping** — Map package_name → admob_app_id (từ FirebaseAdmobMapping). Dùng khi build silver.daily_app_revenue từ AppLovin.

| Column | Type | Mô tả |
| --- | --- | --- |
| `package_name` | VARCHAR(255) | Package name (Android) |
| `admob_app_id` | VARCHAR(255) | AdMob App ID (ca-app-pub-xxx~yyy) |
| `_updated_at` | DATETIME | Lần sync cuối |

**silver.dim_app_identifiers** — Mỗi app một dòng: admob_app_id, package_name, app_store_id, platform, **display_name** (từ App + FirebaseAdmobMapping). Dùng khi build gold cost từ XMP và hiển thị tên app trên Superset.

| Column | Type | Mô tả |
| --- | --- | --- |
| `admob_app_id` | VARCHAR(255) | AdMob App ID (khớp App.AppId) |
| `package_name` | VARCHAR(255) | Package name (Android/iOS, từ mapping) |
| `app_store_id` | VARCHAR(255) | App Store ID (iOS, từ App.AppStoreId; dạng số) |
| `platform` | VARCHAR(50) | ANDROID / IOS |
| `display_name` | VARCHAR(500) | **Tên hiển thị app** (sync từ apps.display_name), dùng trên Superset |
| `_updated_at` | DATETIME | Lần sync cuối |

## 3.6 Bảng Silver / Gold (do ETL populate)

**silver.daily_app_revenue** — Doanh thu gộp (AdMob + AppLovin đã loại trùng). **app_id thống nhất = admob_app_id** (AdMob từ **bronze.admob_table**; AppLovin qua dim_package_admob_mapping). Dùng cho ds_unified_revenue.

| Column | Type | Mô tả |
| --- | --- | --- |
| `date` | DATE | Ngày báo cáo |
| `account_id` | VARCHAR(255) | Publisher (AdMob) hoặc `'AppLovin'` |
| `app_id` | VARCHAR(255) | **AdMob App ID** (ca-app-pub-xxx~yyy) — khớp App.AppId |
| `platform` | VARCHAR(50) | iOS/Android |
| `country` | VARCHAR(10) | Mã quốc gia |
| `total_revenue` | DECIMAL(20,6) | Doanh thu |
| `total_impressions` | BIGINT | Impressions |
| `ecpm` | DECIMAL(20,4) | eCPM |
| `fill_rate` | DECIMAL(18,6) | Fill rate (AdMob) |

**gold.fact_daily_app_metrics** — KPIs theo app/ngày (revenue + cost + ROI). **app_id = admob_app_id**. Cost từ XMP được map qua dim_app_identifiers. Dùng cho ds_app_pnl.

| Column | Type | Mô tả |
| --- | --- | --- |
| `date` | DATE | Ngày |
| `account_id` | VARCHAR(255) | Nguồn (AdMob publisher hoặc 'AppLovin') |
| `app_id` | VARCHAR(255) | **AdMob App ID** (ca-app-pub-xxx~yyy) — khớp App.AppId |
| `platform` | VARCHAR(50) | iOS/Android |
| `total_revenue` | DECIMAL(20,6) | Doanh thu (unified) |
| `total_impressions` | BIGINT | Impressions |
| `ua_cost` | DECIMAL(20,6) | Chi phí UA (XMP, đã map theo admob_app_id) |
| `roi` | DECIMAL(18,6) | ROI = revenue / ua_cost (ratio) |

## 3.7 Bảng mapping từ PostgreSQL (master data)

Dữ liệu master (app, mapping package ↔ AdMob) nằm trong **PostgreSQL**. ETL sync một phần vào StarRocks (các bảng dim) để join trong Silver/Gold. Superset có thể dùng **silver.dim_app_identifiers** (và nếu có **dim_app_display**) để hiển thị tên app đầy đủ mà không cần kết nối trực tiếp PostgreSQL.

| Bảng (PostgreSQL) | Mô tả |
| --- | --- |
| **apps** | Master app: AdMob App ID, tên hiển thị, platform, App Store ID. |
| **firebase_admob_mapping** | Map package_name (Android) / bundle (iOS) ↔ admob_app_id; dùng sync dim. |

**apps (PostgreSQL)** — Cột chính dùng cho mapping / hiển thị:

| Column | Type | Mô tả |
| --- | --- | --- |
| `id` | INT | PK |
| `app_id` | VARCHAR | **AdMob App ID** (ca-app-pub-xxx~yyy) — khớp Silver/Gold `app_id` |
| `display_name` | VARCHAR(500) | **Tên hiển thị đầy đủ** của app (dùng trên dashboard) |
| `platform` | VARCHAR | ANDROID / IOS |
| `app_store_id` | VARCHAR | App Store ID (iOS, dạng số) |
| `publisher_id` | VARCHAR | AdMob Publisher ID |
| `approval_state` | VARCHAR | APPROVED / ... |

**firebase_admob_mapping (PostgreSQL)** — Dùng sync `silver.dim_package_admob_mapping` và `dim_app_identifiers`:

| Column | Type | Mô tả |
| --- | --- | --- |
| `admob_app_id` | VARCHAR | AdMob App ID (ca-app-pub-xxx~yyy) |
| `package_name` | VARCHAR | Android: package name; iOS: có thể null (dùng app_store_id trong dim) |

**Luồng sync:** StructureSyncJob / ETL đọc `apps` + `firebase_admob_mapping` → ghi **silver.dim_package_admob_mapping** và **silver.dim_app_identifiers** (gồm **display_name** từ `apps.display_name`). Superset dùng cột **display_name** hoặc **app_display_name** (COALESCE display_name, package_name, app_id) trong query (mục 4.7).

## 3.8 Bảng Bronze Firebase (events)

Dữ liệu Firebase (events) từ **BigQuery → GCS → MediationPro → StarRocks**. Mỗi app một bảng **bronze.fb_{sanitized_app_id}** (vd. `fb_com_earthmap_livesatellite_worldmap_view`), tạo tại runtime (CREATE TABLE IF NOT EXISTS). Tham khảo **docker/starrocks/init-bronze-firebase.sql**, **docs/firebase-project/BIGQUERY-SCHEMA-STORAGE.md**, **docs/firebase-project/HUONG-DAN-CAU-HINH-FIREBASE-MOI-APP.md**.

| Column | Type | Mô tả |
| --- | --- | --- |
| `event_date` | DATE | Ngày event |
| `event_timestamp` | BIGINT | Unix micros |
| `user_pseudo_id` | VARCHAR | User ID (pseudo) |
| `install_date` | DATE | (tính từ user_first_touch) |
| `retention_day` | INT | Ngày thứ N từ install |
| `event_name` | VARCHAR | session_start, first_open, ad_impression, purchase, ... |
| `app_version` | VARCHAR | Từ app_info.version |
| `device_json` | STRING | Device RECORD (JSON) |
| `geo_json` | STRING | Geo RECORD (country, region, city) |
| `traffic_source_json` | STRING | Traffic source (JSON) |
| `event_params_json` | STRING | Event params (JSON) |
| `user_properties_json` | STRING | User properties (JSON) |
| `raw_event_json` | STRING | Toàn bộ event (backup BQ schema) |

**App identifier:** App được xác định bởi **tên bảng** (firebaseAppKey, dạng `com_company_app`). Map với **admob_app_id** qua **silver.dim_app_identifiers** (package_name) hoặc **dim_package_admob_mapping**. **Silver daily_app_engagement** (nếu ETL có): date, app_id (firebaseAppKey hoặc admob_app_id), platform, dau, dav, sessions, new_users; dùng cho Dashboard 7, 8, 11 (mục 12).

---

# 4. Datasets trong Superset

## 4.1 Tổng quan

**Khuyến nghị:** Dataset dùng **dữ liệu từ Silver/Gold** do ETL (SilverGoldTransformJob) populate — đồng nhất với backend, tránh lặp logic dedup và P&L.

**Revenue (doanh thu gộp):** AdMob + AppLovin (đã loại trùng). Nguồn: **AdMob** từ **bronze.admob_table** (ETL aggregate vào silver.daily_app_revenue); **AppLovin** từ **bronze.applovin_revenue** (đã loại network chứa 'admob'/'google'). Silver/Gold thống nhất **app_id = admob_app_id**.

| Dataset | Nguồn chính | Ghi chú |
| --- | --- | --- |
| **ds_unified_revenue** | **silver.daily_app_revenue** | Revenue = AdMob (từ bronze.admob_table) + AppLovin (từ applovin_revenue, đã loại trùng); **app_id = admob_app_id** (join với App). |
| **ds_app_pnl** | **gold.fact_daily_app_metrics** | Revenue + ua_cost (XMP qua dim) + roi; **app_id = admob_app_id**. |
| ds_daily_revenue (AppLovin) | silver (lọc account_id) hoặc bronze | Chi tiết theo network/ad_format → vẫn query bronze. |
| ds_cohort_ltv / ds_ltv_cumulative | bronze.applovin_cohort | Cohort chưa có tầng Silver, giữ query từ Bronze. |
| **ds_firebase_engagement** | **silver.daily_app_engagement** + dim | DAU, DAV, sessions (khi có Firebase); mục 12.1. |
| **ds_arpdau** | silver.daily_app_revenue + daily_app_engagement + dim | Revenue/DAU; mục 12.2, 12.5. |
| ds_firebase_events / ds_firebase_geo | bronze.fb_* (hoặc view union) | Event funnel, geo/device; mục 12.3, 12.4. |

```mermaid
flowchart TB
    subgraph ETL["Silver / Gold (ETL)"]
        S1[silver.daily_app_revenue]
        S2[silver.daily_app_engagement]
        G1[gold.fact_daily_app_metrics]
    end

    subgraph Bronze["Bronze (raw)"]
        B_ADMOB[admob_table]
        B_AL[applovin_revenue]
        B_COHORT[applovin_cohort]
        B_FB[fb_* Firebase events]
    end

    subgraph DS["Datasets"]
        DS1[ds_daily_revenue]
        DS2[ds_unified_revenue]
        DS3[ds_cohort_ltv]
        DS4[ds_ltv_cumulative]
        DS5[ds_app_pnl]
        DS6[ds_firebase_engagement]
        DS7[ds_arpdau]
        DS8[ds_firebase_events / geo]
    end

    B_ADMOB --> S1
    B_AL --> S1
    S1 --> DS2
    S1 --> DS1
    S1 --> DS7
    G1 --> DS5
    B_COHORT --> DS3
    B_COHORT --> DS4
    B_AL --> DS1
    B_FB --> S2
    S2 --> DS6
    S2 --> DS7
    B_FB --> DS8
```

## 4.2 Dataset: ds_daily_revenue

**Cách 1 (khuyến nghị khi chỉ cần tổng theo app/ngày):** Dùng Silver — chỉ lấy phần AppLovin (ETL đã loại trùng).

```sql
-- Từ Silver (đồng bộ ETL): doanh thu AppLovin theo date, app_id, platform, country
SELECT
    date,
    app_id       AS package_name,
    platform,
    country,
    total_revenue   AS revenue,
    total_impressions AS impressions,
    ecpm
FROM silver.daily_app_revenue
WHERE account_id = 'AppLovin'
```

**Cách 2 (khi cần chi tiết network, ad_format):** Query Bronze (Silver không lưu breakdown network/ad_format).

```sql
SELECT
    date,
    platform,
    application,
    network,
    ad_format,
    country,
    SUM(impressions) AS impressions,
    SUM(estimated_revenue) AS revenue,
    CASE WHEN SUM(impressions) > 0
        THEN SUM(estimated_revenue) * 1000 / SUM(impressions)
        ELSE 0 END AS calculated_ecpm
FROM bronze.applovin_revenue
GROUP BY date, platform, application, network, ad_format, country
```

## 4.3 Dataset: ds_unified_revenue

**Khuyến nghị:** Dùng bảng **silver.daily_app_revenue** do ETL (SilverGoldTransformJob) populate — logic dedup (loại AdMob/Google khỏi AppLovin) đã nằm trong ETL, dataset đồng nhất với backend.

- **Doanh thu:** AdMob (ETL từ **bronze.admob_table** vào silver.daily_app_revenue) + AppLovin (từ bronze.applovin_revenue, đã loại network chứa 'admob'/'google').
- **Cột nguồn (source):** Dùng `account_id` — giá trị `'AppLovin'` = AppLovin, các giá trị khác = AdMob (publisher_id).

```mermaid
flowchart LR
    subgraph ETL["ETL SilverGoldTransformJob"]
        S[silver.daily_app_revenue]
    end
    subgraph DS["Superset Dataset"]
        U["ds_unified_revenue"]
    end
    S --> U
```

**Dataset = bảng Silver + JOIN dim để có tên hiển thị app (khuyến nghị):**

```sql
-- Nguồn: silver.daily_app_revenue + silver.dim_app_identifiers (tên app)
-- app_display_name: ưu tiên display_name (sync từ PostgreSQL apps), fallback package_name rồi app_id
SELECT
    r.date,
    r.account_id,
    r.app_id,      -- admob_app_id (ca-app-pub-xxx~yyy)
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, r.app_id) AS app_display_name,
    r.platform,
    r.country,
    r.total_revenue   AS revenue,
    r.total_impressions AS impressions,
    r.ecpm,
    r.fill_rate,
    CASE WHEN r.account_id = 'AppLovin' THEN 'AppLovin' ELSE 'AdMob' END AS source
FROM silver.daily_app_revenue r
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = r.app_id
```

**Mapping cho chart:**

| Chart cần | Cột Silver / Dataset | Ghi chú |
| --- | --- | --- |
| Revenue | `total_revenue` (alias `revenue`) | |
| Impressions | `total_impressions` (alias `impressions`) | |
| eCPM | `ecpm` | |
| Phân theo nguồn (Source Mix) | `source` | AppLovin / AdMob |
| **App (tên hiển thị)** | **`app_display_name`** | Dùng cho trục/legend "App" — từ dim_app_identifiers.display_name (sync từ PostgreSQL), fallback package_name rồi app_id |
| App (ID) | `app_id` | AdMob App ID — khớp PostgreSQL App.AppId |

> ⚠️ **Logic dedup (khi không dùng ETL):** Nếu phải query trực tiếp Bronze, cần loại bỏ AdMob/Google khỏi `applovin_revenue` (xem phiên bản query Bronze trong lịch sử tài liệu hoặc mục 2.2).

## 4.4 Dataset: ds_cohort_ltv

**Nguồn:** Bronze (cohort chưa có tầng Silver trong ETL hiện tại).

```sql
SELECT
    cohort_date, day_number, platform, country, application,
    SUM(installs) AS installs,
    SUM(revenue) AS revenue,
    CASE WHEN SUM(installs) > 0
        THEN SUM(revenue) / SUM(installs)
        ELSE 0 END AS ltv
FROM bronze.applovin_cohort
GROUP BY cohort_date, day_number, platform, country, application
```

## 4.5 Dataset: ds_ltv_cumulative

**Nguồn:** Bronze (cohort chưa có tầng Silver trong ETL hiện tại).

```sql
SELECT
    cohort_date, day_number, platform, country,
    SUM(installs) AS installs,
    SUM(revenue) AS revenue,
    SUM(SUM(revenue)) OVER (
        PARTITION BY cohort_date, platform, country
        ORDER BY day_number
    ) AS cumulative_revenue,
    SUM(SUM(revenue)) OVER (
        PARTITION BY cohort_date, platform, country
        ORDER BY day_number
    ) / NULLIF(MAX(SUM(installs)) OVER (
        PARTITION BY cohort_date, platform, country
    ), 0) AS cumulative_ltv
FROM bronze.applovin_cohort
GROUP BY cohort_date, day_number, platform, country
```

## 4.6 Dataset: ds_app_pnl

**Khuyến nghị:** Dùng bảng **gold.fact_daily_app_metrics** do ETL populate — revenue (unified) + ua_cost (XMP) + roi đã được tính sẵn, đồng nhất với backend.

- **Revenue:** Từ Silver (AdMob + AppLovin đã loại trùng); app_id = admob_app_id.
- **Cost:** Từ bronze.xmp_report, ETL map store_package_id/product_id → admob_app_id qua silver.dim_app_identifiers, rồi join theo date, app_id, platform.
- **ROI:** ETL lưu dạng ratio (revenue / cost); ROAS % = `roi * 100`.

```mermaid
flowchart LR
    subgraph ETL["ETL SilverGoldTransformJob"]
        G[gold.fact_daily_app_metrics]
    end
    subgraph DS["Superset Dataset"]
        P["ds_app_pnl"]
    end
    G --> P
```

**Dataset = bảng Gold + JOIN dim để có tên hiển thị app (khuyến nghị):**

```sql
-- Nguồn: gold.fact_daily_app_metrics + silver.dim_app_identifiers (tên app)
SELECT
    g.date,
    g.account_id,
    g.app_id,      -- admob_app_id, khớp App.AppId
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, g.app_id) AS app_display_name,
    g.platform,
    g.total_revenue   AS revenue,
    g.total_impressions AS impressions,
    g.ua_cost      AS cost,
    g.total_revenue - COALESCE(g.ua_cost, 0) AS profit,
    g.roi          AS roi_ratio,
    CASE WHEN g.ua_cost IS NOT NULL AND g.ua_cost > 0
        THEN g.roi * 100
        ELSE NULL END AS roas_percent
FROM gold.fact_daily_app_metrics g
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = g.app_id
```

**Mapping cho Dashboard P&L:**

| Metric | Cột Gold / Dataset | Ghi chú |
| --- | --- | --- |
| Revenue | `total_revenue` (alias `revenue`) | |
| Cost | `ua_cost` (alias `cost`) | |
| Profit | `total_revenue - ua_cost` | Tính trong query trên |
| ROAS % | `roi * 100` (alias `roas_percent`) | ETL lưu `roi` = revenue/cost (ratio) |
| **App (tên hiển thị)** | **`app_display_name`** | Dùng cho bảng P&L theo app, Bar "ROAS by App" — từ dim_app_identifiers.display_name (hoặc package_name) |

## 4.7 Hiển thị tên đầy đủ App trên Dashboard Superset

- **app_id** trong Silver/Gold là **AdMob App ID** (ca-app-pub-xxx~yyy). Để chart/dashboard hiển thị tên dễ đọc:
  1. **Dùng Dataset đã JOIN dim:** Trong **ds_unified_revenue** và **ds_app_pnl** (mục 4.3, 4.6) dùng `LEFT JOIN silver.dim_app_identifiers` và cột **`app_display_name`** = `COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, app_id)`. Cột **display_name** trong StarRocks được sync từ PostgreSQL **apps.display_name** (SilverGoldTransformJob / SyncAppIdentifiersAsync). Trong Superset chọn dimension **app_display_name** cho trục/legend "App".
  2. **display_name trong StarRocks:** Bảng **silver.dim_app_identifiers** có cột **display_name** (VARCHAR(500)), đồng bộ từ `apps.display_name` khi chạy sync dim. Superset chỉ cần kết nối StarRocks và dùng cột này trong query (đã có trong mẫu trên).
- **Cách cấu hình chart:** Chart → Dimensions → chọn **app_display_name** (thay vì app_id) cho "Group by" / "Series".

## 4.8 Tận dụng dữ liệu Silver/Gold cho Dashboard

- **Silver (daily_app_revenue):** Dùng cho **Revenue Overview** — đã gộp AdMob + AppLovin, loại trùng, thống nhất app_id = admob_app_id. Áp dụng **filter** theo `date` (time range), `platform`, `country`, `account_id` (source) để slice nhanh.
- **Gold (fact_daily_app_metrics):** Dùng cho **P&L** — revenue + ua_cost (XMP) + roi đã tính sẵn. Filter theo `date`, `app_id` / `app_display_name`, `platform`; dùng **time range** (ví dụ Last 7/30 days) để giảm tải và tập trung kỳ báo cáo.
- **Silver (daily_app_engagement) — khi có Firebase:** Dùng cho **Engagement & Retention**, **ARPDAU**, **Engagement vs Revenue** (Dashboard 7, 8, 11). Join với dim để có app_display_name; join với daily_app_revenue để có ARPDAU (revenue/DAU).
- **Bronze (fb_*):** Dùng cho **Event Funnel**, **Geo & Device** (Dashboard 9, 10); map app qua tên bảng (firebaseAppKey) ↔ admob_app_id qua dim.
- **Gợi ý:** Dashboard nên đặt **Time Range** mặc định (ví dụ Last 30 days); thêm filter **App** (app_display_name) và **Platform** để người xem tự chọn; chart "Top Apps" dùng **app_display_name** để dễ đọc.

---

# 5. Dashboard 1: Daily Revenue Overview

## 5.1 Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                       │
│ │ $125,432  │ │45,234,567 │ │   $2.85   │   KPI Summary         │
│ │ Revenue   │ │Impressions│ │  Avg eCPM │                       │
│ └───────────┘ └───────────┘ └───────────┘                       │
├─────────────────────────────────────────────────────────────────┤
│ │              Revenue Trend Line Chart                       │ │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐ ┌───────────────────────┐             │
│ │  Impressions (Area)   │ │    eCPM Trend (Line)  │             │
│ └───────────────────────┘ └───────────────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────┐ ┌──────────┐ ┌──────────┐             │
│ │   Top 10 Apps (Bar)   │ │ Platform │ │  Source  │             │
│ │                       │ │  (Pie)   │ │  (Pie)   │             │
│ └───────────────────────┘ └──────────┘ └──────────┘             │
└─────────────────────────────────────────────────────────────────┘

```

## 5.2 Chi tiết Charts

Dataset **ds_unified_revenue** = Silver + dim (mục 4.3); cột: `revenue`, `impressions`, `ecpm`, **`app_display_name`**, `source`.

| Chart | Type | Dataset | Metric | Config |
| --- | --- | --- | --- | --- |
| 1.1 Total Revenue | Big Number | ds_unified_revenue | `SUM(revenue)` | Format: `$,.0f` |
| 1.2 Total Impressions | Big Number | ds_unified_revenue | `SUM(impressions)` | Format: `,.0f` |
| 1.3 Avg eCPM | Big Number | ds_unified_revenue | `AVG(ecpm)` | Format: `$,.2f` |
| 1.4 Revenue Trend | Line Chart | ds_unified_revenue | `SUM(revenue)` | X: date |
| 1.5 Impressions Trend | Area Chart | ds_unified_revenue | `SUM(impressions)` | X: date |
| 1.6 eCPM Trend | Line Chart | ds_unified_revenue | `AVG(ecpm)` | Color: red |
| 1.7 Top 10 Apps | Bar Chart | ds_unified_revenue | `SUM(revenue)` | Dim: **app_display_name** (tên app đầy đủ) |
| 1.8 Platform Mix | Pie Chart | ds_unified_revenue | `SUM(revenue)` | Dim: platform |
| 1.9 Source Mix | Pie Chart | ds_unified_revenue | `SUM(revenue)` | Dim: source |

---

# 6. Dashboard 2: Network Performance

Silver **không lưu** breakdown theo network/ad_format. Dashboard này cần query **Bronze**: AppLovin từ **applovin_revenue** (có network, ad_format); AdMob theo network/ad_source từ **bronze.mediation_table** (hoặc **bronze.admob_table** theo format), với logic dedup như mục 2.2, hoặc tạo view/bảng Silver chi tiết hơn sau này.

| Chart | Type | Metric | Dimension |
| --- | --- | --- | --- |
| 2.1 Revenue by Network | Bar | `SUM(revenue)` | ad_network |
| 2.2 eCPM by Network | Bar | `AVG(ecpm)` | ad_network |
| 2.3 Network Table | Table | revenue, impressions, ecpm | ad_network |
| 2.4 Network Trend | Line | `SUM(revenue)` | ad_network |
| 2.5 Ad Format Treemap | Treemap | `SUM(revenue)` | ad_format, ad_network |

---

# 7. Dashboard 3: Cohort & LTV Analysis

## 7.1 Khái niệm LTV

```mermaid
flowchart LR
    I["Install: 1000 users"] --> D0["D0: $100"]
    D0 --> D1["D1: $80"]
    D1 --> D7["D7: $50"]

    D0 -.-> L0["LTV D0: $0.10"]
    D1 -.-> L1["Cum LTV D1: $0.18"]
    D7 -.-> L7["Cum LTV D7: $0.23"]

```

**Công thức:** `Cumulative LTV = Tổng Revenue / Số Installs`

## 7.2 Chi tiết Charts

| Chart | Type | Metric | Note |
| --- | --- | --- | --- |
| 3.1 Total Installs | Big Number | `SUM(installs)` | Filter: day_number=0 |
| 3.2 LTV Curve | Line | `AVG(cumulative_ltv)` | X: day_number |
| 3.3 Cohort Heatmap | Pivot Table | `AVG(cumulative_ltv)` | Row: cohort_date, Col: day_number |
| 3.4 Revenue by Day# | Area | `SUM(revenue)` | X: day_number |
| 3.5 D7 LTV by Country | Bar | `AVG(cumulative_ltv)` | Filter: day_number=7 |

---

# 8. Dashboard 4: App P&L Overview

## 8.1 Khái niệm P&L

```mermaid
flowchart TB
    AL["AppLovin: $60K"] --> TR["Total Revenue: $100K"]
    AM["AdMob: $40K"] --> TR
    XMP["XMP Cost: $70K"] --> TC["Total Cost: $70K"]
    TR --> P["Profit: $30K"]
    TC --> P
    TR --> R["ROAS: 142.9%"]
    TC --> R

```

**Công thức:**

- `Profit = Revenue - Cost`
- `ROAS = Revenue / Cost × 100%`

## 8.2 Chi tiết Charts

Dataset **ds_app_pnl** = Gold + dim (mục 4.6); cột: `revenue`, `cost`, `profit`, `roas_percent`, **`app_display_name`**.

| Chart | Type | Metric |
| --- | --- | --- |
| 4.1 Total Revenue | Big Number | `SUM(revenue)` |
| 4.2 Total Cost | Big Number | `SUM(cost)` |
| 4.3 Total Profit | Big Number | `SUM(profit)` |
| 4.4 ROAS | Big Number | `SUM(revenue)/NULLIF(SUM(cost),0)*100` hoặc `AVG(roas_percent)` |
| 4.5 Rev vs Cost | Mixed Line | revenue (green), cost (red) |
| 4.6 Daily Profit | Area | `SUM(profit)` |
| 4.7 App P&L Table | Table | revenue, cost, profit, roas_percent; dimension **app_display_name** |
| 4.8 ROAS by App | Bar | roas_percent; dimension **app_display_name** (reference line 100%) |

---

# 9. Dashboard 5: Ad Network Comparison

| Chart | Type | Metric | Filter |
| --- | --- | --- | --- |
| 5.1 AppLovin Summary | Big Number | `SUM(revenue)` | source='AppLovin' |
| 5.2 AdMob Summary | Big Number | `SUM(revenue)` | source='AdMob' |
| 5.3 Revenue Share | Stacked Area | `SUM(revenue)` | Dim: source |
| 5.4 eCPM Trend | Line | `AVG(ecpm)` | Dim: source |
| 5.5 eCPM by Format | Grouped Bar | `AVG(ecpm)` | Dim: ad_format, source |

---

# 10. Dashboard 6: Điều hành (Executive)

Dashboard dành cho cấp điều hành: tổng quan hiệu quả app/game (Revenue, Cost, P&L), tên app (package_name), **Cost break theo kênh** (XMP module), **Revenue break theo kênh** (AdMob vs AppLovin, đã loại trùng AdMob trong AppLovin), bảng chi tiết theo app theo ngày và tổng theo tháng, kèm biểu đồ và metric tổng quan. Toàn bộ dữ liệu từ StarRocks (Silver/Gold + Bronze XMP).

## 10.1 Mục tiêu dashboard

| Nội dung | Mô tả |
| --- | --- |
| Tên app | **package_name** (app_display_name) từ dim_app_identifiers, dễ đọc cho điều hành |
| Cost theo kênh | Break theo **module** (XMP): Facebook, Google, TikTok, … |
| Revenue theo kênh | Break **AdMob** vs **AppLovin** (đã loại trùng AdMob/Google trong AppLovin theo mục 2.2) |
| Bảng theo app, theo ngày | Dòng = (date, app_display_name, platform); cột = revenue, cost, profit, ROAS; filter time range |
| Tổng theo tháng | Cùng metrics nhưng group theo tháng (year-month) |
| Metric tổng quan | Big number: Total Revenue, Total Cost, Profit, ROAS % |
| Biểu đồ | Revenue by channel (Pie/Bar), Cost by channel (Bar), Trend (Line), Top apps (Bar) |

## 10.2 Datasets cần tạo trên Superset

Tạo **5 dataset** từ StarRocks (SQL Lab → Run → Save as Dataset). Dùng chung **time range filter** (cột `date`) ở dashboard.

### 10.2.1 ds_executive_pnl (P&L theo app, ngày — dùng cho bảng + big number + trend)

Nguồn: **gold.fact_daily_app_metrics** + **silver.dim_app_identifiers** (tên app). Dùng cho: Big Number, Bảng theo app/ngày, Line trend, ROAS by app.

```sql
SELECT
    g.date,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, g.app_id) AS app_display_name,
    g.app_id,
    g.platform,
    g.total_revenue   AS revenue,
    g.ua_cost         AS cost,
    g.total_revenue - COALESCE(g.ua_cost, 0) AS profit,
    g.roi             AS roi_ratio,
    CASE WHEN g.ua_cost IS NOT NULL AND g.ua_cost > 0
        THEN g.roi * 100 ELSE NULL END AS roas_percent
FROM gold.fact_daily_app_metrics g
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = g.app_id
```

- **Metric:** `revenue`, `cost`, `profit`, `roas_percent`.
- **Dimensions:** `date`, `app_display_name`, `platform`.

### 10.2.2 ds_executive_revenue_by_channel (Revenue break theo kênh: AdMob / AppLovin)

Nguồn: **silver.daily_app_revenue** (đã dedup) + dim. Kênh = `account_id`: 'AppLovin' = AppLovin, còn lại = AdMob.

```sql
SELECT
    r.date,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, r.app_id) AS app_display_name,
    r.app_id,
    r.platform,
    CASE WHEN r.account_id = 'AppLovin' THEN 'AppLovin' ELSE 'AdMob' END AS revenue_channel,
    r.total_revenue AS revenue
FROM silver.daily_app_revenue r
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = r.app_id
```

- **Chart:** Pie hoặc Bar — `SUM(revenue)` group by `revenue_channel` (và tùy chọn `app_display_name`).

### 10.2.3 ds_executive_cost_by_channel (Cost break theo kênh UA — XMP module)

Nguồn: **bronze.xmp_report** + **silver.dim_app_identifiers** (map product_id/store_package_id + os → admob_app_id). Kênh = **module** (Facebook, Google, …).

```sql
SELECT
    x.date,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, x.store_package_id, x.product_id, 'Unknown') AS app_display_name,
    d.admob_app_id AS app_id,
    x.os AS platform,
    COALESCE(NULLIF(TRIM(x.module), ''), 'Other') AS cost_channel,
    SUM(x.cost) AS cost
FROM bronze.xmp_report x
LEFT JOIN silver.dim_app_identifiers d
    ON UPPER(TRIM(COALESCE(d.platform,''))) = UPPER(TRIM(COALESCE(x.os,'')))
    AND (d.package_name = x.store_package_id OR d.package_name = x.product_id
        OR (d.app_store_id != '' AND d.app_store_id != '0'
            AND (d.app_store_id = x.product_id OR d.app_store_id = x.store_package_id)))
GROUP BY x.date, d.admob_app_id, COALESCE(d.package_name, x.store_package_id, x.product_id, 'Unknown'), x.os, COALESCE(NULLIF(TRIM(x.module), ''), 'Other')
```

- **Chart:** Bar — `SUM(cost)` group by `cost_channel` (và tùy chọn `app_display_name`).

### 10.2.4 ds_executive_daily_table (Bảng chi tiết theo app, theo ngày)

Có thể dùng lại **ds_executive_pnl** (đã có date, app_display_name, platform, revenue, cost, profit, roas_percent). Trong Superset tạo chart kiểu **Table**: dimensions = date, app_display_name, platform; metrics = SUM(revenue), SUM(cost), SUM(profit), AVG(roas_percent) hoặc custom.

### 10.2.5 ds_executive_monthly (Tổng theo tháng theo app)

Thêm dataset trả về **tháng** và tổng theo app (để chart/table tổng theo tháng).

```sql
SELECT
    DATE_FORMAT(g.date, '%Y-%m') AS month,
    MAX(COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, g.app_id)) AS app_display_name,
    g.app_id,
    g.platform,
    SUM(g.total_revenue)   AS revenue,
    SUM(g.ua_cost)         AS cost,
    SUM(g.total_revenue) - SUM(COALESCE(g.ua_cost, 0)) AS profit,
    CASE WHEN SUM(g.ua_cost) > 0
        THEN SUM(g.total_revenue) / SUM(g.ua_cost) * 100 ELSE NULL END AS roas_percent
FROM gold.fact_daily_app_metrics g
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = g.app_id
GROUP BY DATE_FORMAT(g.date, '%Y-%m'), g.app_id, g.platform
```

- **Chart:** Table hoặc Bar — dimension `month`, `app_display_name`; metrics `revenue`, `cost`, `profit`, `roas_percent`.

## 10.3 Layout Dashboard điều hành (Superset)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dashboard: Executive – Hiệu quả App/Game     [Time Range] [App] [Platform] │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   KPI tổng quan       │
│  │ Revenue  │ │  Cost    │ │  Profit   │ │ ROAS %   │   (ds_executive_pnl)  │
│  │ $xxx,xxx │ │ $xx,xxx  │ │ $xx,xxx   │ │  xxx%    │                       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │ Revenue by channel (Pie/Bar) │  │ Cost by channel (Bar)        │         │
│  │ AdMob vs AppLovin           │  │ Facebook, Google, … (module)  │         │
│  │ ds_executive_revenue_*      │  │ ds_executive_cost_by_channel  │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │ Revenue & Cost trend (Line)  │  │ Top 10 Apps by Revenue (Bar) │         │
│  │ ds_executive_pnl             │  │ ds_executive_pnl              │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Bảng theo app, theo ngày (Table) — ds_executive_pnl                         │
│  Cột: date | app_display_name | platform | revenue | cost | profit | ROAS% │
├─────────────────────────────────────────────────────────────────────────────┤
│  Tổng theo tháng (Table hoặc Bar) — ds_executive_monthly                    │
│  Cột: month | app_display_name | platform | revenue | cost | profit | ROAS% │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 10.4 Chi tiết Charts (Superset)

| # | Chart | Type | Dataset | Metric | Dimension / Ghi chú |
| --- | --- | --- | --- | --- | --- |
| E.1 | Total Revenue | Big Number | ds_executive_pnl | SUM(revenue) | Format $,.0f |
| E.2 | Total Cost | Big Number | ds_executive_pnl | SUM(cost) | Format $,.0f |
| E.3 | Total Profit | Big Number | ds_executive_pnl | SUM(profit) | Format $,.0f |
| E.4 | ROAS % | Big Number | ds_executive_pnl | SUM(revenue)/NULLIF(SUM(cost),0)*100 | Format ,.1f % |
| E.5 | Revenue by channel | Pie hoặc Bar | ds_executive_revenue_by_channel | SUM(revenue) | revenue_channel (AdMob / AppLovin) |
| E.6 | Cost by channel | Bar | ds_executive_cost_by_channel | SUM(cost) | cost_channel (module: Facebook, Google, …) |
| E.7 | Revenue & Cost trend | Line (2 series) | ds_executive_pnl | SUM(revenue), SUM(cost) | X: date |
| E.8 | Top 10 Apps (Revenue) | Bar | ds_executive_pnl | SUM(revenue) | app_display_name, limit 10 |
| E.9 | P&L by app by day | Table | ds_executive_pnl | date, app_display_name, platform, SUM(revenue), SUM(cost), SUM(profit), ROAS | Sort by date desc, app |
| E.10 | P&L by month | Table hoặc Bar | ds_executive_monthly | month, app_display_name, revenue, cost, profit, roas_percent | Tổng theo tháng |

## 10.5 Cấu hình Filters (Superset)

- **Time range:** Cột `date` — đặt filter type **Time range** hoặc **Time grain** cho toàn dashboard.
- **App (tùy chọn):** Filter **app_display_name** (dropdown hoặc search) — áp dụng cho các chart dùng dataset có cột này.
- **Platform (tùy chọn):** Filter **platform** (Android / iOS).

Áp dụng filters cho tất cả chart trong dashboard (scopes đúng dataset và cột).

## 10.6 Các bước tạo Dashboard trên Superset

1. **Kết nối StarRocks** (mục 11.1): `mysql+pymysql://user:pass@host:9030/` (database mặc định có thể để trống hoặc chọn schema).
2. **Tạo 5 dataset:** Vào SQL Lab → lần lượt chạy 5 câu SQL ở mục 10.2 → Save as Dataset (đặt tên ds_executive_pnl, ds_executive_revenue_by_channel, ds_executive_cost_by_channel, ds_executive_monthly; bảng ngày dùng chung ds_executive_pnl).
3. **Tạo Dashboard:** Dashboards → + Dashboard → đặt tên "Executive - Hiệu quả App/Game".
4. **Thêm Filter:** Edit dashboard → Add Filter → Time range (date), tùy chọn App (app_display_name), Platform (platform).
5. **Tạo từng chart** theo bảng 10.4: Chart → chọn dataset → chọn loại chart → cấu hình Metric/Dimension → Save → Add to dashboard.
6. **Sắp xếp layout** theo sơ đồ 10.3; kéo chart vào đúng vị trí.
7. **Save & Publish.**

## 10.7 Lưu ý dữ liệu

- **Revenue:** Đã thống nhất và loại trùng (AdMob + AppLovin, không đếm AdMob/Google trong AppLovin) ở Silver/Gold.
- **Cost:** Chỉ từ XMP (bronze.xmp_report); map về app qua **dim_app_identifiers** (package_name, app_store_id, platform).
- **Tên app:** Dùng **display_name** (hoặc COALESCE display_name, package_name) từ **silver.dim_app_identifiers** — cột display_name được sync từ PostgreSQL apps.display_name.

---

# 11. Hướng dẫn sử dụng Superset

Phần này dành cho **Admin** thiết lập ban đầu (kết nối DB, dataset gốc, phân quyền) và cho **Data Analyst / PO-MKT** sử dụng hàng ngày. Phân quyền được thiết kế theo vai trò và **theo app** (đồng bộ từ hệ thống Mediation) để MKT chỉ xem được app được gán, tránh lộ thông tin giữa các app.

---

## 11.1 Tạo kết nối Database StarRocks (Admin)

**Thực hiện bởi:** Admin (hoặc role có quyền quản lý Data → Databases).

1. Đăng nhập Superset (vd. `http://localhost:8088`) với tài khoản **admin**.
2. Vào **Data → Databases → + Database**.
3. **Database:** chọn **StarRocks** (hoặc MySQL nếu image dùng dialect MySQL cho StarRocks).
4. **Display Name:** ví dụ `StarRocks - MediationPro`.
5. **SQLAlchemy URI:**
   ```text
   starrocks://<user>:<password>@<host>:9030/<database>
   ```
   Hoặc nếu dùng driver MySQL (thường gặp):
   ```text
   mysql+pymysql://<user>:<password>@<host>:9030/<database>
   ```
   Thay `<host>` bằng tên service Docker (vd. `starrocks`) hoặc IP; `<database>` có thể để trống hoặc `silver`/`gold` tùy schema mặc định.
6. **Test Connection** → Save.
7. (Tùy chọn) Bật **Allow DML** nếu cần SQL Lab ghi dữ liệu; với chỉ đọc dashboard có thể tắt.

> ⚠️ **Lỗi `No module named 'MySQLdb'`:** Dùng URI `mysql+pymysql://` và đảm bảo image Superset đã cài `pymysql` / `mysqlclient` (xem Dockerfile superset).

---

## 11.2 Tạo các Dataset gốc (Admin)

Dataset gốc là các dataset **chuẩn** dùng cho toàn bộ dashboard trong tài liệu (mục 4, 10, 12). **Admin** (hoặc **Data Analyst**) tạo một lần, sau đó **PO/MKT** chỉ dùng để tạo chart/dashboard hoặc xem.

**Cách tạo:** **SQL Lab → SQL Editor** → dán query tương ứng → **Run** → **Save → Save as Dataset** (đặt tên và chọn Database vừa kết nối).

| Dataset | Nguồn / Query tham chiếu | Ghi chú |
| --- | --- | --- |
| **ds_unified_revenue** | **mục 4.3** — Silver + dim (app_display_name) | Revenue AdMob + AppLovin theo app/ngày |
| **ds_app_pnl** | **mục 4.6** — Gold fact_daily_app_metrics + dim | P&L, ROI, cost theo app |
| **ds_daily_revenue** | **mục 4.2** — Silver hoặc Bronze AppLovin | Chi tiết theo network/format (Bronze) |
| **ds_cohort_ltv** / **ds_ltv_cumulative** | **mục 4.4** — bronze.applovin_cohort | Cohort, LTV |
| **ds_firebase_engagement** | **mục 12.1** — silver.daily_app_engagement + dim | DAU, DAV, sessions (khi có Firebase) |
| **ds_arpdau** | **mục 12.2** — revenue + engagement + dim | ARPDAU (khi có Firebase) |
| **ds_firebase_events** / **ds_firebase_geo** | **mục 12.3, 12.4** — bronze.fb_* | Funnel, geo/device (khi có Firebase) |
| **ds_executive_*** (Dashboard 6) | **mục 10.2** — 5 dataset Executive | P&L điều hành, revenue/cost theo kênh, theo tháng |

Sau khi tạo xong, nên **phân quyền Dataset** (mục 11.4) để role **Data Analyst** được tạo thêm dataset mới; **PO/MKT** chỉ được dùng dataset có sẵn (và bị áp dụng RLS theo app).

---

## 11.3 Roles có sẵn và cơ chế Groups / Permissions

Superset dùng **Flask-AppBuilder (FAB)** để quản lý **Roles** (trong UI có thể gọi là "roles" hoặc gắn với "groups" tùy phiên bản). Mỗi **user** được gán một hoặc nhiều **role**. Permissions (hơn 200 loại) được gắn với từng role; không nên sửa trực tiếp các **role có sẵn** vì `superset init` sẽ đồng bộ lại và ghi đè thay đổi.

### 11.3.1 Các role có sẵn (không chỉnh sửa)

| Role | Mô tả | Quyền chính (tóm tắt) |
| --- | --- | --- |
| **Admin** | Toàn quyền | Tất cả: Database, Dataset, Chart, Dashboard, User, Role; cấp/revoke quyền; sửa object của người khác. |
| **Alpha** | Truy cập toàn bộ nguồn dữ liệu, có thể tạo/sửa Dataset | Đọc/ghi **Dataset** (data source); đọc/ghi Chart, Dashboard (giới hạn object mình sở hữu); cần role **sql_lab** để dùng SQL Lab. Alpha **không** cấp quyền cho user khác. |
| **Gamma** | Chỉ tiêu thụ nội dung từ nguồn được cấp | **Không** tạo/sửa Dataset; **chỉ xem** Dataset được gán qua role bổ sung. Có thể **tạo/sửa Chart và Dashboard** từ các Dataset đã được cấp. Trong list view chỉ thấy Dashboard/Chart từ Dataset có quyền. |
| **sql_lab** | Truy cập SQL Lab | Cho phép mở SQL Lab. Admin mặc định truy cập mọi Database; **Alpha và Gamma** cần được cấp quyền **từng Database** (qua role bổ sung hoặc permission) để query. |
| **Public** | Anonymous / không đăng nhập | Chỉ xem (embed, permalink, filter); không menu, không SQL Lab, không ghi. Dùng khi bật `AUTH_ROLE_PUBLIC`. |

**Quan trọng:** Không thêm/bớt permission trên **Admin, Alpha, Gamma, sql_lab, Public**. Để tùy biến, tạo **role mới** và gán **kèm** với role chuẩn cho user.

### 11.3.2 Groups và gán Roles cho User

- Trong Superset, **user** có trường **Roles** (danh sách role). Một user có thể có **nhiều role**; quyền thực tế là **hợp (union)** của tất cả role đó.
- "Group" trong ngữ cảnh FAB/Superset thường chính là **role** (hoặc tập role). Cách làm chuẩn: tạo **custom role** cho từng nhóm nghiệp vụ (vd. **PO_MKT**, **DataAnalyst**), rồi gán role chuẩn + custom role cho user.

### 11.3.3 Permission theo resource (tóm tắt)

- **Database:** Cấp theo từng Database → user được query Database đó trong SQL Lab và thấy mọi Dataset thuộc Database đó (trừ khi bị giới hạn bởi role khác).
- **Dataset (Data source):** Mỗi Dataset có permission riêng (vd. `can read on [Dataset name]`). Nếu user **không** có `all_datasource_access` thì chỉ thấy và explore đúng các Dataset được cấp.
- **Chart / Dashboard:** Model permissions như `can add`, `can edit`, `can delete`, `can show`, `can list`. Alpha/Gamma đã có quyền tạo/sửa Chart và Dashboard (Alpha cả Dataset, Gamma thì không).

---

## 11.4 Thiết lập chi tiết: Data Analyst (DA) và PO / MKT

### 11.4.1 Bảng so sánh nhu cầu và cách gán role

| Nhu cầu | Data Analyst (DA) | PO / MKT |
| --- | --- | --- |
| Tạo/sửa **Dataset** (SQL Lab → Save as Dataset) | Có | Không |
| Tạo/sửa **Chart**, **Dashboard** | Có | Có (chỉ từ Dataset đã được cấp) |
| SQL Lab | Có | Tùy chọn (có thể bật nếu chỉ cho chạy query đọc) |
| Chỉ xem dữ liệu **theo app** (phân quyền theo app) | Không bắt buộc (có thể toàn bộ app) | Có — dùng **Row Level Security (RLS)** |

**Cách gán role (khuyến nghị):**

| Vai trò | Roles gán cho User | Ghi chú |
| --- | --- | --- |
| **Data Analyst** | **Alpha** + **sql_lab** | Alpha đã có: đọc/ghi Dataset, đọc/ghi Chart/Dashboard. sql_lab để dùng SQL Lab và Save as Dataset. Cần cấp quyền **Database** (StarRocks) cho role Alpha hoặc qua role bổ sung (xem 11.4.2). |
| **PO / MKT** | **Gamma** + **sql_lab** (tùy chọn) + **một custom role** (vd. **PO_MKT**) | Gamma: không tạo Dataset; có tạo Chart/Dashboard. Custom role **PO_MKT**: chỉ cấp quyền **đọc** các **Dataset** cụ thể (ds_unified_revenue, ds_app_pnl, …). Sau đó cấu hình **RLS** trên role **PO_MKT** để lọc theo app (11.4.4). |

### 11.4.2 Data Analyst (DA) — từng bước

1. **Tạo user (nếu chưa có):** **Settings → List Users → +** (hoặc Security → Users). Điền Username, First/Last name, Email, Password; **Roles** chọn: **Alpha**, **sql_lab**.
2. **Cấp quyền Database (bắt buộc cho Alpha/Gamma):** Admin mặc định thấy mọi Database; Alpha/Gamma cần được cấp từng Database.
   - Vào **Settings → List Roles** → chọn **Alpha** → tab **Permissions**. Trong nhóm **Database Access**, tìm Database StarRocks (vd. "StarRocks - MediationPro") và cấp quyền **can read** (và **can write** nếu cần DML).  
   - Hoặc tạo một **custom role** (vd. **DA_StarRocks**): chỉ thêm permission **can read** (và **can write** nếu cần) trên **Database** StarRocks; gán user **Alpha** + **sql_lab** + **DA_StarRocks**. Cách này không đụng vào Alpha.
3. **Kết quả:** User DA có thể vào **SQL Lab**, chọn Database StarRocks, chạy query, **Save as Dataset**; vào **Data → Datasets** tạo/sửa dataset; tạo Chart và Dashboard.

### 11.4.3 PO / MKT — tạo custom role và cấp Dataset

1. **Tạo role mới:** **Settings → List Roles → +** (hoặc Security → List Roles → Add).
   - **Name:** `PO_MKT` (hoặc tên khác).
   - **Permissions:** Chỉ thêm quyền **đọc** trên **từng Dataset** mà PO/MKT được phép dùng (ds_unified_revenue, ds_app_pnl, ds_executive_pnl, …). Trong dropdown Permissions, tìm mục **Dataset** (hoặc **Data source**) và chọn từng dataset → bật **can read** (không bật can add/can edit/can delete).  
   - **Không** cấp `all_datasource_access`; không cấp quyền ghi Dataset.
2. **Cấp quyền Database (để SQL Lab nếu cần):** Nếu PO/MKT cần mở SQL Lab chỉ đọc, tạo thêm role (vd. **PO_MKT_DB**) với **can read** trên Database StarRocks, gán kèm **PO_MKT** + **Gamma** + **sql_lab**.
3. **Gán user:** **Settings → List Users** → chọn user (vd. MKT) → **Roles**: chọn **Gamma**, **sql_lab** (nếu dùng SQL Lab), **PO_MKT** (và **PO_MKT_DB** nếu dùng bước 2).
4. **Kết quả:** User chỉ thấy các Dashboard/Chart dùng Dataset mà họ có quyền; có thể tạo Chart/Dashboard mới **chỉ từ** các Dataset đó. Để giới hạn **theo app**, bước tiếp theo là RLS (11.4.4).

### 11.4.4 Row Level Security (RLS) — phân quyền theo app

**RLS** = filter theo **role**: với từng **Dataset** và **Role**, bạn khai báo một **clause** (SQL WHERE). Khi user thuộc role đó query dataset đó, clause được nối vào WHERE (các clause của cùng role được AND với nhau).

**Cách cấu hình (từng bước):**

1. Vào **Settings → Row Level Security** (hoặc **Security → Row Level Security**).
2. **+ Add filter** (hoặc Add Row Level Security Filter).
3. **Name:** ví dụ `PO_MKT - ds_unified_revenue - App A,B`.
4. **Filter Type / Table (Dataset):** Chọn **Dataset** (không nhầm với Database). Chọn đúng dataset, ví dụ **ds_unified_revenue**.
5. **Roles:** Chọn role cần áp dụng filter (vd. **PO_MKT**). Có thể chọn nhiều role; mỗi role có thể có nhiều rule trên nhiều dataset.
6. **Clause (SQL):** Điền điều kiện WHERE (không viết chữ `WHERE`), dùng đúng **tên cột** có trong dataset đó, ví dụ:
   ```sql
   app_id IN ('ca-app-pub-123456789~0123456789', 'ca-app-pub-987654321~987654321')
   ```
   hoặc nếu dataset dùng tên hiển thị:
   ```sql
   app_display_name IN ('App A', 'App B')
   ```
7. **Save.**

**Lặp lại** cho **từng dataset** mà role PO_MKT được cấp (ds_unified_revenue, ds_app_pnl, ds_executive_pnl, …): mỗi dataset một bản ghi RLS với **cùng role** và clause tương ứng (cùng danh sách app nếu user xem chung một nhóm app). Danh sách **app_id** hoặc **app_display_name** nên lấy từ **hệ thống Mediation** (bảng phân quyền user–app).

**Lưu ý:**

- Clause phải dùng **đúng tên cột** trong dataset (vd. `app_id`, `app_display_name`, `package_name` tùy query đã tạo dataset).
- Nhiều rule RLS cho **cùng một role** trên **cùng dataset** sẽ được **AND** với nhau — tránh tạo hai clause mâu thuẫn (vd. `app_id = 'a'` và `app_id = 'b'`).
- Có thể đồng bộ RLS từ Mediation bằng script/API (FAB Security API hoặc cập nhật bảng `ab_permission_view`, `row_level_security_filter`) nếu cần tự động hóa theo user–app.

### 11.4.5 Dashboard: chia sẻ dùng chung và quyền chỉ xem (không cho xóa/sửa)

**Vấn đề thường gặp:** Đã cấp quyền Dataset và Chart nhưng user vẫn không thấy dashboard; hoặc khi dashboard **Published** thì user thấy được nhưng lại **xóa/sửa** được, trong khi trong Permissions không thấy mục "Dashboard" để tắt quyền sửa/xóa.

**Giải thích ngắn gọn:**

1. **Quyền Dashboard nằm ở đâu:** Trong Superset, quyền theo **model** (Dashboard, Chart, Dataset, …). Permissions trong **Settings → List Roles → [Role] → Permissions** thường được nhóm theo menu/loại. Cần tìm nhóm có tên **"Dashboard"** hoặc **"Superset" → "Dashboard"** (tùy phiên bản), bên trong có các action: **can show**, **can list**, **can add**, **can edit**, **can delete**. Chỉ cần **can show** và **can list** để user **xem** danh sách và mở dashboard; **can edit** / **can delete** cho phép sửa/xóa.
2. **Tại sao user có thể xóa:** Role **Gamma** mặc định có **can_edit** (và thường **can_delete**) trên **Dashboard**. User có role Gamma + quyền Dataset sẽ thấy mọi dashboard dùng Dataset đó và **có thể sửa/xóa** vì Gamma đã cấp quyền đó. "Public" (Published) chỉ làm dashboard **hiển thị** cho user có quyền — không tách riêng "chỉ xem".
3. **Dashboard phải Published:** User (không phải owner) chỉ thấy dashboard khi dashboard ở trạng thái **Published**. Draft chỉ owner/Admin thấy. "Public" role là cho **anonymous** (không đăng nhập), khác với "Published".

**Cách thiết lập để user dùng chung dashboard nhưng chỉ xem (không xóa/sửa):**

**Cách 1 — Role chỉ có can show / can list trên Dashboard (khuyến nghị)**

- Tạo **custom role** (vd. **PO_MKT_Viewer**) dùng **chỉ** cho user cần xem dashboard, **không** gán **Gamma** cho nhóm này.
- Trong role **PO_MKT_Viewer**:
  - Cấp quyền **đọc** các **Dataset** cần thiết (giống PO_MKT).
  - Trong Permissions, tìm **Dashboard** (hoặc Superset → Dashboard) và **chỉ** bật **can show**, **can list** — **không** bật **can add**, **can edit**, **can delete**.
  - Bật các quyền **Chart**: **can show**, **can list** (để xem chart trong dashboard); không bật can_edit/can_delete nếu muốn chỉ xem.
  - Bật các **View/Menu** cần thiết (vd. Dashboard list, Explore nếu cần).
- Gán cho user: **PO_MKT_Viewer** + **PO_MKT** (dataset + RLS) — **không** gán **Gamma**. Như vậy user thấy dashboard (nhờ quyền Dataset và Dashboard can show/can list) nhưng **không** có quyền sửa/xóa dashboard vì role không có can_edit/can_delete.
- Dashboard cần ở trạng thái **Published** (Edit dashboard → Save → **Publish**).

**Cách 2 — Dùng DASHBOARD_RBAC (phân quyền theo từng dashboard)**

- Bật feature flag trong config Superset (trong **superset_config.py** hoặc biến môi trường nếu hỗ trợ):
  ```python
  FEATURE_FLAGS = {"DASHBOARD_RBAC": True}
  ```
- Sau khi bật, trong **Edit Dashboard** sẽ có mục **"Roles"** (hoặc "Access"): chọn role được phép truy cập dashboard này. User có role đó sẽ thấy dashboard (và đọc được mọi chart/dataset trong dashboard).
- Tạo role **Dashboard_Viewer** chỉ có **Dashboard: can show, can list** (không can_edit, can_delete). Gán **Dashboard_Viewer** vào từng dashboard cần chia sẻ; gán role **Dashboard_Viewer** cho user. User chỉ xem được, không sửa/xóa. Lưu ý: nếu user **đồng thời** có **Gamma**, Gamma vẫn mang theo can_edit/can_delete nên vẫn có thể sửa — do đó user "chỉ xem" nên **chỉ** có role Viewer, không có Gamma.

**Tóm tắt**

| Mục tiêu | Cách làm |
| --- | --- |
| User thấy dashboard | Dashboard **Published** + user có quyền **Dataset** (ít nhất 1 dataset trong dashboard) hoặc có role được gán trong dashboard (khi bật DASHBOARD_RBAC). |
| User chỉ xem, không xóa/sửa | User **không** có role **Gamma** (hoặc bất kỳ role nào có **can_edit**/**can_delete** trên Dashboard). Dùng **custom role** chỉ có **can show**, **can list** trên Dashboard (và quyền đọc Dataset/Chart). |
| Tìm quyền Dashboard trong UI | **Settings → List Roles → [Role] → Permissions** → tìm nhóm **"Dashboard"** (hoặc **Superset** rồi chọn **Dashboard**) → bật/bỏ **can show**, **can list**, **can edit**, **can delete**, **can add**. |

---

## 11.5 Đồng bộ người dùng từ hệ thống Mediation

- Danh sách user (và nhóm app được gán) nên lấy từ **hệ thống Mediation** (chia sẻ theo app để MKT chỉ theo dõi app của mình).
- Cách làm: (1) SSO/LDAP nếu Superset hỗ trợ và Mediation dùng chung directory; hoặc (2) script/API tạo user Superset, gán role **Gamma** + **PO_MKT**, và cập nhật RLS filter (clause) theo bảng user–app trong Mediation.
- Bật **FAB_ADD_SECURITY_API = True** trong config nếu cần dùng REST API cho user/role (xem tài liệu Security của Superset).

---

## 11.6 Tạo Dataset từ SQL (Data Analyst)

1. **SQL Lab → SQL Editor**
2. Chọn **Database** (StarRocks đã kết nối)
3. Viết query (tham chiếu mục 4, 10, 12) → **Run**
4. **Save → Save as Dataset** — đặt tên, chọn schema/database, Save.

Dataset mới sẽ xuất hiện trong **Data → Datasets** và có thể dùng để tạo Chart/Dashboard. User **PO/MKT** chỉ thấy và dùng dataset đã được Admin/DA tạo và được áp dụng RLS.

---

## 11.7 Tạo Dashboard

1. **Dashboards → + Dashboard** → đặt tên
2. **Edit** → kéo Chart từ danh sách (Chart đã tạo từ Dataset) vào layout
3. **Add Filters** (vd. Time Range, App, Platform) — chọn đúng Dataset và cột
4. **Save & Publish**

**PO/MKT:** Có thể tạo Dashboard mới bằng cách **Add Chart** từ các Dataset có sẵn (không tạo Dataset mới). Chỉ thấy dữ liệu đúng app nhờ RLS.

---

# 12. Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
| --- | --- | --- |
| No module MySQLdb | Thiếu driver | `pip install pymysql` + sửa connection |
| Query timeout | Data lớn | Giảm time range, tạo Materialized View |
| Data không khớp | Identifier khác format | Silver/Gold dùng admob_app_id; verify dim đã sync |
| **Revenue cao bất thường** | **Đếm trùng AdMob** | **ETL đã loại AdMob/Google khỏi AppLovin; dùng Silver** |
| **User không thấy dashboard** | Chưa Published hoặc thiếu quyền Dataset | Dashboard phải **Publish**; user cần quyền đọc ít nhất 1 Dataset trong dashboard (mục 11.4.3, 11.4.5). |
| **Trong Permissions không thấy Dashboard** | Quyền Dashboard nằm trong model Dashboard | List Roles → [Role] → Permissions → tìm nhóm **"Dashboard"** hoặc **Superset → Dashboard** (can show, can list, can edit, can delete). |
| **User thấy dashboard nhưng xóa/sửa được** | Role Gamma (hoặc role có can_edit/can_delete trên Dashboard) | Dùng custom role **chỉ** can show + can list trên Dashboard, **không** gán Gamma cho user chỉ xem (mục 11.4.5). |

**Verify identifier theo tầng (Bronze giữ format gốc, Silver/Gold thống nhất admob_app_id):**

```sql
-- Bronze: mỗi nguồn format riêng (AdMob từ admob_table)
SELECT 'AdMob' AS source, app_id AS identifier, COUNT(*) FROM bronze.admob_table GROUP BY app_id
UNION ALL
SELECT 'AppLovin', package_name, COUNT(*) FROM bronze.applovin_revenue GROUP BY package_name
UNION ALL
SELECT 'XMP', product_id, COUNT(*) FROM bronze.xmp_report GROUP BY product_id;

-- Silver/Gold: app_id = admob_app_id (ca-app-pub-xxx~yyy)
SELECT 'Silver' AS layer, app_id, COUNT(*) FROM silver.daily_app_revenue GROUP BY app_id;
SELECT 'Gold', app_id, COUNT(*) FROM gold.fact_daily_app_metrics GROUP BY app_id;
```

**Kiểm tra các network trong AppLovin (để xác định filter):**

```sql
-- Xem danh sách network và revenue
SELECT
    network,
    SUM(estimated_revenue) as total_revenue,
    COUNT(*) as records
FROM bronze.applovin_revenue
GROUP BY network
ORDER BY total_revenue DESC;

-- Các network cần loại bỏ (đã có trong AdMob):
-- 'Google Bidding', 'AdMob', 'Google AdMob', etc.

```

---

# 11. Dữ liệu Firebase (Bronze) và tầng Silver Engagement

Khi pipeline **Firebase → BigQuery → GCS → StarRocks** đã chạy, dữ liệu engagement (events, DAU, DAV, sessions) xuất hiện trong StarRocks. Dùng để xây thêm các dashboard **kết hợp Ad Revenue với Engagement** (ARPDAU, retention, funnel, geo).

## 11.1 Bronze Firebase

- **Lưu trữ:** Mỗi app một bảng **bronze.fb_{sanitized_app_id}** (ví dụ `fb_com_earthmap_livesatellite_worldmap_view`). Ứng dụng tạo bảng khi ghi lần đầu (CREATE TABLE IF NOT EXISTS). Tham khảo **docker/starrocks/init-bronze-firebase.sql**, **docs/firebase-project/BIGQUERY-SCHEMA-STORAGE.md**.
- **Cột chính:** `event_date`, `event_timestamp`, `user_pseudo_id`, `install_date`, `retention_day`, `event_name`, `app_version`, `device_json`, `geo_json`, `traffic_source_json`, `event_params_json`, `user_properties_json`, `raw_event_json`.
- **Định danh app:** Trong bảng fb_*, app được xác định bởi **tên bảng** (firebaseAppKey, dạng package_name: `com_company_app` → `com_company_app`). Để join với Silver/Gold (admob_app_id), dùng **silver.dim_package_admob_mapping** hoặc **silver.dim_app_identifiers** (package_name ↔ admob_app_id).

**Event thường dùng:** `session_start`, `first_open`, `ad_impression` (hoặc tên tùy app), `in_app_purchase`, `purchase`, và custom events. DAU = COUNT(DISTINCT user_pseudo_id) trong ngày có event; DAV = COUNT(DISTINCT user_pseudo_id) có event liên quan quảng cáo (vd. ad_impression).

## 11.2 Silver Engagement (nếu ETL có)

Nếu ETL (Firebase → StarRocks hoặc job riêng) đã tổng hợp sẵn:

- **silver.daily_app_engagement:** `date`, `app_id` (firebaseAppKey hoặc admob_app_id tùy thiết kế), `platform`, `dau`, `dav`, `sessions`, `new_users`. Có thể có thêm `retention_d1`, `retention_d7`.
- **Mapping:** Nếu `app_id` trong bảng là firebaseAppKey (package_name), join **silver.dim_app_identifiers** (theo package_name hoặc bảng mapping) để lấy **admob_app_id** và **app_display_name** khi kết hợp với silver.daily_app_revenue / gold.fact_daily_app_metrics.

Nếu chưa có bảng Silver engagement, có thể tạo **view hoặc dataset Superset** aggregate từ Bronze (union các bảng fb_* với app_id suy ra từ tên bảng), hoặc dùng query trực tiếp lên từng bảng fb_* cho từng app.

## 11.3 Luồng khi có Firebase

```mermaid
flowchart LR
    subgraph Firebase["Firebase / BigQuery"]
        BQ[BigQuery events]
    end
    subgraph Bronze["Bronze"]
        FB[fb_app1, fb_app2, ...]
    end
    subgraph Silver["Silver"]
        ENG[daily_app_engagement]
        REV[daily_app_revenue]
    end
    subgraph Gold["Gold"]
        G[fact_daily_app_metrics]
    end
    subgraph Dim["Dimension"]
        DIM[dim_app_identifiers]
    end
    BQ --> FB
    FB --> ENG
    REV --> G
    ENG --> DIM
    REV --> DIM
    DIM --> G
```

---

# 12. Khuyến nghị Dashboard bổ sung khi có dữ liệu Firebase

Dưới đây là **năm nhóm dashboard** bổ sung, tận dụng dữ liệu Firebase (Bronze events và/hoặc Silver engagement) kết hợp với Revenue/Cost (Silver/Gold). Giả định đã có **silver.daily_app_engagement** (hoặc dataset aggregate từ Bronze); nếu chưa, cần ETL hoặc view union các bảng fb_*.

## 12.1 Dashboard 7: User Engagement & Retention

**Mục tiêu:** Theo dõi DAU, DAV, sessions, new users và retention theo app / ngày / platform; so sánh giữa các app.

| Chart | Type | Metric | Dimension / Ghi chú |
| --- | --- | --- | --- |
| 7.1 Total DAU | Big Number | `SUM(dau)` | Filter time range |
| 7.2 Total Sessions | Big Number | `SUM(sessions)` | |
| 7.3 DAU Trend | Line | `SUM(dau)` | X: date |
| 7.4 DAU by App | Bar | `SUM(dau)` | app_display_name (join dim) |
| 7.5 Sessions by App | Bar | `SUM(sessions)` | app_display_name |
| 7.6 Retention D1/D7 | Line hoặc Table | `AVG(retention_d1)`, `AVG(retention_d7)` | X: date hoặc app_display_name (nếu Silver có cột retention) |
| 7.7 Platform Mix (DAU) | Pie | `SUM(dau)` | platform |

**Dataset gợi ý (ds_firebase_engagement):** Nguồn **silver.daily_app_engagement** + **silver.dim_app_identifiers** (để có app_display_name và thống nhất app_id với Revenue).

```sql
SELECT
    e.date,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, e.app_id) AS app_display_name,
    e.app_id,
    e.platform,
    e.dau,
    e.dav,
    e.sessions,
    e.new_users
    -- e.retention_d1, e.retention_d7 (nếu có)
FROM silver.daily_app_engagement e
LEFT JOIN silver.dim_app_identifiers d ON d.package_name = e.app_id OR d.admob_app_id = e.app_id
```

Nếu chưa có Silver engagement, tạm thời dùng query aggregate từ **một bảng Bronze** (vd. một app) để tạo dataset DAU/DAV theo date; khi đã có đủ bảng fb_* và view union thì chuyển sang dataset trên.

---

## 12.2 Dashboard 8: ARPDAU & Chất lượng Monetization

**Mục tiêu:** Kết hợp **Revenue** (AdMob + AppLovin) với **DAU** (Firebase) → **ARPDAU = Revenue / DAU**; đánh giá chất lượng monetization theo app, không chỉ doanh thu thuần.

| Chart | Type | Metric | Dimension |
| --- | --- | --- | --- |
| 8.1 ARPDAU (Total) | Big Number | `SUM(revenue)/NULLIF(SUM(dau),0)` | — |
| 8.2 ARPDAU by App | Bar | revenue / dau | app_display_name |
| 8.3 ARPDAU Trend | Line | revenue / dau | X: date |
| 8.4 Revenue vs DAU (Scatter) | Scatter | revenue (Y), dau (X) | app_display_name (color) |
| 8.5 Top Apps by ARPDAU | Table | revenue, dau, arpdau | app_display_name |

**Dataset gợi ý (ds_arpdau):** Join **silver.daily_app_revenue** (hoặc gold.fact_daily_app_metrics) với **silver.daily_app_engagement** theo date + app_id (cần map firebaseAppKey ↔ admob_app_id qua dim).

```sql
SELECT
    r.date,
    COALESCE(NULLIF(TRIM(d.display_name), ''), d.package_name, r.app_id) AS app_display_name,
    r.app_id,
    r.platform,
    r.total_revenue AS revenue,
    e.dau,
    e.sessions,
    CASE WHEN COALESCE(e.dau, 0) > 0 THEN r.total_revenue / e.dau ELSE NULL END AS arpdau
FROM silver.daily_app_revenue r
LEFT JOIN silver.daily_app_engagement e ON e.date = r.date AND (e.app_id = r.app_id OR e.app_id = d.package_name)
LEFT JOIN silver.dim_app_identifiers d ON d.admob_app_id = r.app_id
```

(Lưu ý: join e.app_id với r.app_id hoặc d.package_name tùy ETL lưu app_id trong daily_app_engagement là admob_app_id hay firebaseAppKey.)

---

## 12.3 Dashboard 9: Event Funnel & Key Events

**Mục tiêu:** Phân tích lượng event theo tên (session_start, first_open, ad_impression, purchase...), funnel cơ bản, top events theo app.

| Chart | Type | Metric | Dimension |
| --- | --- | --- | --- |
| 9.1 Events by Name | Bar | `COUNT(*)` hoặc `COUNT(DISTINCT user_pseudo_id)` | event_name |
| 9.2 Event Trend | Line | `COUNT(*)` | X: date, series: event_name |
| 9.3 Top Events by App | Table | event_name, count, app_display_name | app_id (join dim) |
| 9.4 Funnel (ví dụ) | Funnel Chart | Số user từng bước | session_start → ad_impression → purchase (tùy event thực tế) |

**Dataset gợi ý (ds_firebase_events):** Nguồn từ **Bronze Firebase**. Nếu có **view** gộp các bảng fb_* với cột `app_id` (tên bảng đã chuẩn hóa): query view đó. Nếu không, tạo dataset từ **một bảng** fb_* (một app) với cột event_date, event_name, user_pseudo_id; sau đó nhân bản hoặc union khi đã có view.

```sql
-- Ví dụ: giả sử có view bronze.firebase_events_all (event_date, app_id, event_name, user_pseudo_id)
SELECT
    event_date AS date,
    app_id,
    event_name,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_pseudo_id) AS unique_users
FROM bronze.firebase_events_all
GROUP BY event_date, app_id, event_name
```

Kết hợp **silver.dim_app_identifiers** (app_id = package_name tương ứng firebaseAppKey) để có **app_display_name**.

---

## 12.4 Dashboard 10: Geo & Device (Firebase)

**Mục tiêu:** Phân tích engagement và (nếu join được) revenue theo **quốc gia / vùng** (từ geo_json) và **device** (từ device_json).

| Chart | Type | Metric | Dimension |
| --- | --- | --- | --- |
| 10.1 DAU by Country | Bar hoặc Map | `SUM(dau)` | country (parse từ geo_json) |
| 10.2 Sessions by Country | Bar | `SUM(sessions)` | country |
| 10.3 Revenue by Country | Bar | `SUM(revenue)` | country (từ Silver/Gold đã có country) |
| 10.4 Device Category | Pie | `COUNT(*)` hoặc DAU | device_category (parse từ device_json) |
| 10.5 Platform × Country | Heatmap | DAU hoặc revenue | platform, country |

**Dataset gợi ý:** 
- **Geo:** Nếu Silver engagement có cột **country** (tách từ geo khi ETL), dùng trực tiếp. Nếu chỉ có Bronze: parse **geo_json** (JSON_EXTRACT hoặc hàm tương đương) lấy `country`; aggregate theo date, app_id, country.
- **Device:** Tương tự, parse **device_json** lấy `device.category` hoặc `mobile_brand_name`; aggregate theo date, app_id, device.

```sql
-- Ví dụ (StarRocks): parse geo_json từ Bronze, aggregate DAU theo country
SELECT
    event_date AS date,
    app_id,
    JSON_UNQUOTE(JSON_EXTRACT(geo_json, '$.country')) AS country,
    COUNT(DISTINCT user_pseudo_id) AS dau
FROM bronze.fb_my_app
WHERE geo_json IS NOT NULL AND geo_json != ''
GROUP BY event_date, app_id, JSON_UNQUOTE(JSON_EXTRACT(geo_json, '$.country'))
```

---

## 12.5 Dashboard 11: Engagement vs Ad Revenue (Correlation)

**Mục tiêu:** So sánh trực tiếp **engagement** (DAU, sessions) với **ad revenue** theo app và theo thời gian; phát hiện app có DAU cao nhưng revenue thấp (hoặc ngược lại).

| Chart | Type | Metric | Dimension |
| --- | --- | --- | --- |
| 11.1 Revenue vs DAU (Dual Axis) | Line | revenue (axis 1), dau (axis 2) | X: date |
| 11.2 Revenue vs DAU by App | Scatter hoặc Bubble | revenue (X), dau (Y), size = sessions | app_display_name |
| 11.3 Table: App × Revenue × DAU × ARPDAU | Table | revenue, dau, sessions, arpdau | app_display_name, date |
| 11.4 Top Apps: Revenue vs Engagement | Bar (grouped) | revenue, dau (2 bars) | app_display_name |

**Dataset:** Dùng lại **ds_arpdau** (mục 12.2) — đã có revenue, dau, sessions, app_display_name, date.

---

## 12.6 Tóm tắt Dataset và nguồn dữ liệu (Firebase)

| Dataset | Nguồn chính | Dùng cho Dashboard |
| --- | --- | --- |
| **ds_firebase_engagement** | silver.daily_app_engagement + dim | 7 (Engagement & Retention) |
| **ds_arpdau** | silver.daily_app_revenue + silver.daily_app_engagement + dim | 8 (ARPDAU), 11 (Engagement vs Revenue) |
| **ds_firebase_events** | bronze firebase (view union fb_* hoặc từng bảng) | 9 (Event Funnel) |
| **ds_firebase_geo** / **ds_firebase_device** | Bronze (parse geo_json, device_json) hoặc Silver nếu ETL đã flatten | 10 (Geo & Device) |

**Lưu ý:** Cần đồng bộ **app_id** giữa Firebase (firebaseAppKey / package_name) và Silver/Gold (admob_app_id) qua **silver.dim_app_identifiers** / **dim_package_admob_mapping** để join đúng và hiển thị **app_display_name** thống nhất với các dashboard Ad Revenue hiện tại.

---

# 13. Phụ lục

## 13.1 Glossary

| Term | Định nghĩa |
| --- | --- |
| eCPM | Revenue trên 1000 impressions |
| ROAS | Return On Ad Spend |
| LTV | Lifetime Value |
| Cohort | Nhóm users theo ngày cài đặt |
| Fill Rate | Tỷ lệ hiển thị quảng cáo |
| DAU | Daily Active Users — số user có ít nhất 1 event trong ngày (Firebase) |
| DAV | Daily Active Viewers — số user có event liên quan quảng cáo (vd. ad_impression) trong ngày |
| ARPDAU | Average Revenue Per DAU = Revenue / DAU (kết hợp Ad Revenue + Firebase engagement) |
| firebaseAppKey | Định danh app trong pipeline Firebase (≈ package_name, dạng com_company_app) |

## 13.2 Color Palette

| Màu | Hex | Sử dụng |
| --- | --- | --- |
| Xanh lá | `#27AE60` | Revenue, Profit |
| Đỏ | `#E74C3C` | Cost, Loss |
| AppLovin | `#FF6B6B` | AppLovin |
| AdMob | `#4ECDC4` | AdMob |
| iOS | `#007AFF` | iOS |
| Android | `#3DDC84` | Android |

## 13.3 Number Formats

| Format | Ví dụ | Sử dụng |
| --- | --- | --- |
| `$,.0f` | $125,432 | Revenue |
| `$,.2f` | $3.45 | eCPM, LTV |
| `,.0f` | 1,234,567 | Impressions |
| `,.1f` | 145.3 | ROAS % |

## 13.4 Benchmarks

| Metric | Poor | Good | Excellent |
| --- | --- | --- | --- |
| eCPM (Rewarded) | <$5 | $10-20 | >$20 |
| Fill Rate | <70% | 80-90% | >90% |
| ROAS | <80% | 100-150% | >150% |
| D7 LTV | <$0.10 | $0.20-0.50 | >$0.50 |

## 13.5 StarRocks: Partition, Index và Migration

Các dataset Superset (mục 4, 10) đều filter theo **time range (date)**. Để giảm timeout và tăng tốc query:

- **Partition:** Bảng lớn (bronze.mediation_table, admob_table, mkt_table, silver.daily_app_revenue, daily_sow_analysis, gold.fact_daily_app_metrics, bronze.fb_*) nên có **PARTITION BY RANGE(date)** (hoặc event_date với fb_*) để partition pruning có hiệu lực.
- **Distribution:** Bronze nên dùng **DISTRIBUTED BY HASH(app_id)** khi tạo bảng mới (query và ETL thường filter theo app_id); bảng fb_* mỗi app một bảng nên có thể HASH(user_pseudo_id) hoặc event_date tùy query pattern.
- **Migration hệ thống hiện tại:** Không thể ALTER thêm partition/đổi distribution; cần tạo bảng mới → copy dữ liệu → đổi tên (swap). Hướng dẫn từng bước: **docker/starrocks/docs/MIGRATION-PARTITION-INDEX.md**. Tham chiếu thêm: **docker/starrocks/docs/JOB-TABLE-KEYS.md** (query pattern API + Superset), **docker/starrocks/partition-production.sql** (DDL mẫu).

---

**© 2025 - Training Document for Internal Use**