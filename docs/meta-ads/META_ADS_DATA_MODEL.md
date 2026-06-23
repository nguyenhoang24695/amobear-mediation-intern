# Meta Ads Data Model for Mediation Pro

## 1. Mục tiêu

Tài liệu này mô tả **cấu trúc dữ liệu chuẩn** khi tích hợp Meta Marketing API vào Mediation Pro Platform, khớp với kiến trúc **MinIO + StarRocks (bronze/silver/gold)** trong `99 - MEDIATION PRO PLATFORM.md`.  
Mục tiêu:

- Định nghĩa rõ **bảng StarRocks** sẽ tạo (bronze/silver/gold).
- Chuẩn hoá **field names** theo Meta Marketing API mới (v24.0+).
- Đảm bảo đủ dữ liệu để:
  - Lên Camp (tạo campaign/adset/ad từ UI).
  - Tính **cost / installs / ROAS** ở `gold.fact_campaign_roi`.

## 2. Nguồn dữ liệu từ Meta Marketing API

Sử dụng các endpoint chính (Graph API v24.0+):

- `GET /me/adaccounts` – danh sách ad accounts.
- `GET /{ad_account_id}/campaigns` – campaigns.
- `GET /{ad_account_id}/adsets` – ad sets.
- `GET /{ad_account_id}/ads` – ads.
- `GET /{ad_account_id}/insights` – performance (spend, impressions, installs, revenue signals nếu có).
- `GET /{ad_creative_id}` / `GET /{ad_account_id}/adcreatives` – creatives (tham khảo, Phase 2).

### 2.1. Field tối thiểu khi pull

**Ad Account (`/me/adaccounts`):**

- `id`
- `account_id`
- `name`
- `currency`
- `timezone_name`
- `business` (id, name – nếu cần mapping business)

**Campaigns (`/{ad_account_id}/campaigns`):**

- `id`
- `account_id`
- `name`
- `status` (ACTIVE, PAUSED, DELETED, ...)
- `effective_status`
- `objective` (OUTCOME_AWARENESS, LINK_CLICKS, APP_INSTALLS, ... – theo API hiện tại)
- `buying_type` (AUCTION, ...)
- `special_ad_categories`
- `created_time`
- `start_time`
- `stop_time`
- `daily_budget`
- `lifetime_budget`

**Ad Sets (`/{ad_account_id}/adsets`):**

- `id`
- `campaign_id`
- `name`
- `status`, `effective_status`
- `bid_strategy` (LOWEST_COST_WITH_BID_CAP, COST_CAP, ...)
- `daily_budget`, `lifetime_budget`
- `billing_event` (IMPRESSIONS, LINK_CLICKS, ...)
- `optimization_goal` (APP_INSTALLS, LINK_CLICKS, ...)
- `start_time`, `end_time`
- `promoted_object` (app_id, pixel, custom_event – dùng để map sang app trong hệ thống)
- `targeting` (country, age, gender, placements – lưu dạng JSON)

**Ads (`/{ad_account_id}/ads`):**

- `id`
- `adset_id`
- `campaign_id`
- `name`
- `status`, `effective_status`
- `creative` (id, name)
- `tracking_specs` (JSON, nếu cần)

**Insights (`/{ad_account_id}/insights`):**

Dimension tối thiểu:

- `date_start`, `date_stop`
- `account_id`
- `campaign_id`
- `adset_id`
- `ad_id`

Metrics:

- `impressions`
- `clicks`
- `spend`
- `installs` / `mobile_app_install` (tùy API field)
- `cpc`, `cpm`
- `actions` (JSON – để lấy conversion event nếu cần)

## 3. Thiết kế bảng StarRocks

### 3.1. Bronze Layer (raw, gần với API)

Các bảng bronze lưu gần như full JSON từ API, giúp dễ debug và mở rộng:

#### 3.1.1. `bronze.meta_accounts`

- `date` (DATE) – ngày sync.
- `raw` (JSON) – full object từ `/me/adaccounts`.
- `account_id` (STRING) – extracted.
- `name` (STRING)
- `currency` (STRING)
- `timezone_name` (STRING)

#### 3.1.2. `bronze.meta_campaigns`

- `date` (DATE) – ngày sync.
- `account_id` (STRING)
- `campaign_id` (STRING)
- `raw` (JSON) – full campaign object.

#### 3.1.3. `bronze.meta_adsets`

- `date`
- `account_id`
- `adset_id`
- `campaign_id`
- `raw` (JSON)

#### 3.1.4. `bronze.meta_ads`

- `date`
- `account_id`
- `ad_id`
- `adset_id`
- `campaign_id`
- `raw` (JSON)

#### 3.1.5. `bronze.meta_insights`

- `date` (DATE) – `date_start`.
- `account_id`
- `campaign_id`
- `adset_id`
- `ad_id`
- `raw` (JSON) – giữ full metrics/actions từ API.

> Raw JSON giúp **replay transform** khi đổi logic, không cần gọi lại Meta API.

### 3.2. Silver Layer (cleaned / normalized)

#### 3.2.1. `silver.meta_campaigns`

Chuẩn hoá campaign, 1 row / campaign:

- `campaign_id` (STRING, PK)
- `account_id` (STRING)
- `business_id` (STRING, optional)
- `name` (STRING)
- `status` (STRING)
- `effective_status` (STRING)
- `objective` (STRING)
- `buying_type` (STRING)
- `special_ad_categories` (ARRAY<STRING>)
- `created_time` (DATETIME UTC)
- `start_time` (DATETIME UTC)
- `stop_time` (DATETIME UTC)
- `daily_budget` (BIGINT, original currency micros nếu cần)
- `lifetime_budget` (BIGINT)
- `currency` (STRING)
- `app_id` (STRING, nullable) – **map sang app trong hệ thống** dựa trên `promoted_object` / naming rules.

#### 3.2.2. `silver.meta_adsets`

- `adset_id` (STRING, PK)
- `campaign_id` (STRING)
- `account_id` (STRING)
- `name` (STRING)
- `status`, `effective_status`
- `bid_strategy` (STRING)
- `daily_budget`, `lifetime_budget`
- `billing_event` (STRING)
- `optimization_goal` (STRING)
- `start_time`, `end_time`
- `promoted_app_id` (STRING, từ `promoted_object.app_id`)
- `country` (ARRAY<STRING>)
- `age_min`, `age_max` (INT)
- `genders` (ARRAY<STRING>)
- `placements` (ARRAY<STRING>)
- `targeting_json` (JSON RAW)

#### 3.2.3. `silver.meta_ads`

- `ad_id` (STRING, PK)
- `adset_id` (STRING)
- `campaign_id` (STRING)
- `account_id` (STRING)
- `name` (STRING)
- `status`, `effective_status`
- `creative_id` (STRING)
- `creative_name` (STRING)

#### 3.2.4. `silver.meta_daily_campaign_insights`

Granularity: **1 row / day / campaign** (tối giản để feed gold ROI).

- `date` (DATE)
- `account_id`
- `campaign_id`
- `app_id` (STRING, sau khi map)
- `impressions` (BIGINT)
- `clicks` (BIGINT)
- `spend` (DECIMAL(18,4)) – chuẩn hóa về **USD** (hoặc currency chuẩn của hệ thống).
- `installs` (BIGINT)
- `cpc` (DECIMAL(18,4))
- `cpm` (DECIMAL(18,4))
- `ctr` (DECIMAL(10,4))
- `raw_actions` (JSON) – nếu cần phân tích thêm conversion.

> Bảng này sẽ join với **gold.fact_daily_app_metrics** / LTV để tạo `gold.fact_campaign_roi`.

### 3.3. Gold Layer – `gold.fact_campaign_roi`

Đã được mô tả trong doc 99, nhưng riêng với Meta cần đảm bảo các field:

- `date`
- `campaign_id`
- `app_id`
- `source` = `'meta'`
- `spend` (từ `silver.meta_daily_campaign_insights`)
- `installs`
- `d7_revenue` / `ltv_d7` (join từ revenue/LTV tables)
- `roas_d7` = `d7_revenue / spend`
- `cpi` = `spend / installs`

## 4. Data để Lên Camp (UI)

Để màn hình tạo Camp (Campaign Setup UI) hoạt động, API cần trả:

- **Danh sách ad accounts** (cho dropdown chọn account):
  - Từ `silver.meta_accounts` hoặc `bronze.meta_accounts`.

- **Danh sách apps trong hệ thống**:
  - Từ bảng app config (PostgreSQL) + mapping sang Meta `promoted_object.app_id`.

- **Các enum/meta từ Meta API** (cache):
  - `objective` values (OUTCOME_AWARENESS, APP_INSTALLS, ...).
  - `optimization_goal`, `billing_event`, `bid_strategy`.
  - Template targeting (country groups, age presets).

Khi user tạo campaign mới, backend sẽ:

1. Nhận payload từ UI (campaign + adset + ads minimal).
2. Gọi lần lượt:
   - `POST /act_{ad_account_id}/campaigns`
   - `POST /act_{ad_account_id}/adsets`
   - `POST /act_{ad_account_id}/ads`
3. Lưu lại vào **PostgreSQL** (config/mapping) và **StarRocks bronze/silver** trong sync job kế tiếp.

## 5. Quy ước đặt tên / mapping

- **app_id** nội bộ luôn là **AppId** trong Mediation Pro, mapping sang:
  - Meta `promoted_object.app_id`.
  - Có thể dùng thêm `campaign.name` pattern (ví dụ: `{AppName}_{Country}_{Platform}_{Objective}`) để hỗ trợ debug.

- **timezone**: luôn convert mọi `created_time`, `start_time`, `date_start` về **UTC** ở silver layer; UI sẽ convert sang local timezone theo account/app.

- **currency**: `spend` convert về **USD** (hoặc currency chuẩn) để có thể cộng gộp giữa networks; lưu thêm field `spend_original` + `currency_original` nếu cần audit.

---

Tài liệu này là base cho:

- Thiết kế jobs Meta Worker (ingestion vào MinIO + StarRocks).
- Thiết kế API/UI lên Camp với Meta.
- Mapping sang `silver.daily_app_costs` và `gold.fact_campaign_roi` trong kiến trúc chung của Mediation Pro.

