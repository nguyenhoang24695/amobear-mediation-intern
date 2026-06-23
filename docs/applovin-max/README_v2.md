# AppLovin MAX API Integration v2 - Mediation Pro

## Package Contents

```
├── AppLovin_MAX_API_Integration_v2.md              # Technical documentation
├── AppLovin_MAX_API_v2.postman_collection.json     # Postman Collection
├── AppLovin_MAX_Environment_v2.postman_environment.json  # Environment
└── README_v2.md                                    # This file
```

## What's New in v2

- **Fixed column names**: Sử dụng `ad_unit_waterfall_name` thay vì `ad_unit` (theo official docs)
- **Correct API endpoints**: User-Level API endpoint đúng là `/max/userAdRevenueReport`
- **Column compatibility notes**: Documented khi nào `attempts`/`responses`/`fill_rate` available
- **Cohort day values**: Fixed set (0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 18, 21, 24, 27, 30, 45)
- **45-day request window**: All date parameters must be within last 45 days

## Quick Start

### 1. Import vào Postman

1. Mở Postman
2. Click **Import**
3. Import cả 2 file:
   - `AppLovin_MAX_API_v2.postman_collection.json`
   - `AppLovin_MAX_Environment_v2.postman_environment.json`

### 2. Configure API Keys

1. Vào **Environments** sidebar
2. Chọn **AppLovin MAX - Mediation Pro v2**
3. Update values:

| Variable | Nơi lấy |
|----------|---------|
| `report_api_key` | Dashboard → Account → General → Keys → **Report Key** |
| `management_api_key` | Dashboard → Account → General → Keys → **Management Key** |
| `package_name` | Package name của app (e.g., `com.company.app`) |
| `max_ad_unit_id` | MAX Ad Unit ID (16 char hex, e.g., `deb878533ea4e76a`) |

4. Click **Save**

### 3. Select Environment

- Góc trên phải Postman → Chọn **AppLovin MAX - Mediation Pro v2**

### 4. Test

1. Run **01 - Health Checks → Verify Report API Key**
2. If status 200 → API Key valid ✅

## Collection Structure

```
AppLovin MAX API Collection v2
│
├── 01 - Health Checks
│   ├── Verify Report API Key
│   └── Verify Management API Key
│
├── 02 - Revenue Reporting API (17 requests)
│   ├── Basic - Day + Application + Revenue
│   ├── Full Breakdown - All Dimensions
│   ├── By Network (with Fill Rate)     ⚠️ Fill rate chỉ available với network column
│   ├── By Country
│   ├── By Ad Format
│   ├── By Platform
│   ├── By Ad Unit Waterfall            ✅ Đúng column name
│   ├── By Device Type
│   ├── Hourly Data (Last 30 Days)
│   ├── Monthly Trend
│   ├── Filter - Android Only
│   ├── Filter - iOS Only
│   ├── Filter - By Ad Unit ID
│   ├── Filter - Non-Zero Values
│   ├── Pagination Example
│   ├── CSV Export
│   └── Ad Requests (No Network Filter) ⚠️ requests không dùng được với network column
│
├── 03 - Cohort API
│   ├── Revenue Cohort - 7 Day
│   ├── Revenue Cohort - 30 Day
│   ├── Impression Cohort
│   └── Session Cohort
│
├── 04 - User-Level Ad Revenue API
│   └── User Revenue Report              ✅ Đúng endpoint /max/userAdRevenueReport
│
└── 05 - Ad Unit Management API
    ├── List All Ad Units
    ├── Get Ad Unit Details
    ├── Get Ad Unit with All Fields
    ├── Create Ad Unit
    └── Update Ad Unit
```

## Important Column Notes (Official)

### Revenue Reporting API Columns

**Dimensions:**
- `day`, `hour` (hour chỉ available 30 ngày gần nhất)
- `application`, `package_name`, `store_id`
- `platform` (android, fireos, ios)
- `country`
- `ad_format` (INTER, BANNER, REWARD, MREC, APP_OPEN, NATIVE)
- `max_ad_unit_id`, `ad_unit_waterfall_name` ✅
- `max_ad_unit_test`, `max_placement`
- `network`, `network_placement`, `custom_network_name`
- `device_type` (phone, tablet, other)
- `has_idfa`

**Metrics:**
- `impressions`, `estimated_revenue`, `ecpm`
- `requests` ⚠️ KHÔNG dùng được với network/network_placement/max_placement
- `attempts`, `responses`, `fill_rate` ⚠️ CHỈ dùng được với network/network_placement

### Cohort API

**Cohort Day Values (fixed):** 0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 18, 21, 24, 27, 30, 45

**Endpoints:**
- `/maxCohort` - Revenue
- `/maxCohort/imp` - Impressions
- `/maxCohort/session` - Sessions

## Auto-calculated Date Variables

Pre-request script tự động tính:

| Variable | Value |
|----------|-------|
| `yesterday` | T-1 |
| `two_days_ago` | T-2 (cho User-Level API cần 8h delay) |
| `week_ago` | T-7 |
| `two_weeks_ago` | T-14 |
| `month_ago` | T-30 |
| `max_window_start` | T-44 (trong 45-day window) |

## Troubleshooting

### Error 401
- Kiểm tra API key đúng loại (Report Key vs Management Key)
- Report Key dùng cho Reporting APIs
- Management Key dùng cho Ad Unit Management API

### Error 400 - Invalid columns
- Kiểm tra tên column chính xác (e.g., `ad_unit_waterfall_name` không phải `ad_unit`)
- Kiểm tra column compatibility (e.g., `fill_rate` cần `network` column)

### No data returned
- Data có độ trễ 1-2 giờ
- User-Level API cần 8 giờ sau UTC day end
- Dates phải trong 45-day window

### Rate Limiting
- Đợi và retry
- Implement exponential backoff

## Official Documentation

- Revenue Reporting API: https://support.axon.ai/en/max/reporting-apis/revenue-reporting-api/
- Cohort API: https://support.axon.ai/en/max/reporting-apis/cohort-api/
- User-Level API: https://support.axon.ai/en/max/reporting-apis/user-level-ad-revenue-api/
- Ad Unit Management: https://support.axon.ai/en/max/advanced-features/ad-unit-management-api/

---

**Version:** 2.0  
**Updated:** 2025-02-03  
**Source:** Official AppLovin Documentation (support.axon.ai)
