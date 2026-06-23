# PO Dashboard — API Contract (Phase 1)

> Companion: [`01_Phase1_Implementation_Plan.md`](01_Phase1_Implementation_Plan.md) · [`02_Data_Catalog.md`](02_Data_Catalog.md) · [`04_Implementation_Guide.md`](04_Implementation_Guide.md)

---

## 1. Conventions

- **Base URL**: `/api/apps/{appId}/dashboard`. `appId` = AdMob app id (FE `app.appId`).
- **Auth**: Bearer JWT, requires permission `s-apps:view-details:dashboard`.
- **Query params**:
  - `range`: `today` | `yesterday` | `last7`. Required.
- **Date format**: `yyyy-MM-dd` (theo TZ account đã resolve).
- **Number**: JSON number. `null` khi không có data (KHÔNG dùng `0` giả).
- **Money**: USD, 2 decimals.
- **Percent**: float 0–100 (vd `12.34` = 12.34%).
- **Error**: HTTP 4xx/5xx + body `{ "code": "...", "message": "..." }`.

## 2. Shared types

### 2.1 `DateRange`
```jsonc
{
  "range": "last7",                       // echo input
  "start_date_account_tz": "2026-05-21",
  "end_date_account_tz": "2026-05-27",
  "tz_offset_hours": 8,                   // account timezone
  "display_tz_offset_hours": 7            // luôn = 7 (GMT+7) cho FE display
}
```

### 2.2 `MetaInfo`
```jsonc
{
  "admob_account": {
    "account_id": "pub-1234567890",
    "display_name": "Amobear AdMob",
    "is_default": true
  },
  "currency": "USD",
  "warnings": [
    "adjust_not_configured"               // App thiếu Adjust → Installs + toàn bộ Revenue + Adjust block empty
    // | "firebase_not_configured"        // App thiếu Firebase → Audience + Engagement + Firebase Retention empty
    // | "adjust_ad_revenue_missing"      // App có Adjust nhưng chưa enable ad_revenue tracking
  ]
}
```

### 2.3 `DailyPoint<T>`
```jsonc
{ "date": "2026-05-21", "value": 12345 }   // value có thể null
```

## 3. Endpoints

### 3.1 `GET /summary`
Trả 9 metric cards.

**Response 200**:
```jsonc
{
  "date_range": { /* DateRange */ },
  "meta": { /* MetaInfo */ },
  "metrics": {
    "installs":                       12345,           // nullable
    "new_users":                       9876,
    "install_to_open_rate":            79.99,          // %
    "users_not_opened":                2469,           // = installs - new_users (≥0)
    "total_users":                    23456,           // = active users (SUM dau)
    "returning_users":                13580,
    "avg_engagement_time_minutes":     4.32,
    "engaged_sessions_per_user":       2.15,
    "total_revenue_usd":             567.89
  }
}
```

### 3.2 `GET /user-trend`
**Response 200**:
```jsonc
{
  "date_range": { /* DateRange */ },
  "series": {
    "installs":         [ { "date": "2026-05-21", "value": 1200 }, ... ],
    "new_users":        [ ... ],
    "total_users":      [ ... ],
    "returning_users":  [ ... ]
  }
}
```
Mỗi mảng có độ dài = số ngày trong range (1 / 1 / 7).
Khi Adjust chưa configure: `installs` = `[]`.

### 3.3 `GET /engagement-trend`
```jsonc
{
  "date_range": { /* DateRange */ },
  "series": {
    "avg_engagement_time_minutes":  [ { "date": "...", "value": 4.5 } ],
    "engaged_sessions_per_user":    [ ... ]
  }
}
```

### 3.4 `GET /revenue-trend`
Toàn bộ data từ Adjust `bronze.adjust_report`, ARPU = `all_revenue / dau` (Firebase) JOIN theo `event_date`.

```jsonc
{
  "date_range": { /* DateRange */ },
  "series": {
    "total":  [ { "date": "...", "value": 123.45 } ],   // adjust all_revenue
    "iaa":    [ ... ],                                  // adjust ad_revenue
    "iap":    [ ... ],                                  // adjust revenue
    "sub":    [ ... ],                                  // Phase 1 = null (placeholder)
    "arpu":   [ ... ]                                   // all_revenue / dau (Firebase) per day
  },
  "phase2_notice": ["sub"]
}
```
Khi `adjust_not_configured`: `total`/`iaa`/`iap`/`sub`/`arpu` = `[]`, kèm warning trong meta của summary endpoint. Endpoint này luôn trả `200` với empty series.

### 3.5 `GET /retention`
```jsonc
{
  "date_range": { /* DateRange */ },
  "firebase": {
    "available": true,
    "series": [
      { "install_date": "2026-05-15", "d1": 35.2, "d7": 12.4 }
    ]
  },
  "adjust": {
    "available": true,
    "series": [
      { "install_date": "2026-05-15", "d1": 33.8, "d3": 22.1, "d7": 11.9 }
    ]
  }
}
```
- `install_date` thuộc range filter.
- Khi nguồn nào không có data → `available: false`, `series: []`.

### 3.6 `GET /top-countries`
**Query params**:
- `metric` (required): `iaa` | `iap_sub` | `new_users` | `total_users`.
- `limit` (optional, default 10).

**Nguồn primary value**:
- `iaa`: Adjust `revenue_metrics_json.ad_revenue` GROUP BY `country_code`.
- `iap_sub`: Adjust `revenue_metrics_json.revenue` GROUP BY `country_code` (Phase 1, SUB chưa cộng).
- `new_users`: Firebase `silver.geo.new_users` GROUP BY country → map ISO2 qua `silver.dim_country.country_name_firebase`.
- `total_users`: Firebase `silver.geo.dau` (cùng cách).

**Cột phụ luôn tính cross-source**:
- `arpu_country_usd` = Adjust `SUM(all_revenue)` / Firebase `SUM(dau)`.
- `conversion_rate_percent` = Firebase `SUM(paying_users) * 100 / SUM(dau)`.

**Response 200**:
```jsonc
{
  "date_range": { /* DateRange */ },
  "metric": "iaa",
  "rows": [
    {
      "country_code": "US",
      "country_name": "United States",
      "primary_value": 234.56,             // theo metric đang sort
      "arpu_country_usd": 0.0234,          // có thể null nếu thiếu nguồn còn lại
      "conversion_rate_percent": 2.45
    }
  ]
}
```
Khi metric = `iaa`/`iap_sub` mà `adjust_not_configured` → `rows: []`.
Khi metric = `new_users`/`total_users` mà `firebase_not_configured` → `rows: []`.

### 3.7 `GET /adjust-report`
**Response 200**:
```jsonc
{
  "date_range": { /* DateRange */ },
  "available": true,
  "rows": [
    {
      "channel": "facebook",
      "source":  "spring_promo_2026",
      "installs":        1234,
      "ad_spend_usd":     567.89,
      "cpi_usd":            0.46,
      "roas_d0":           12.3,        // %
      "roas_d1":           25.4,
      "roas_d3":           41.2,
      "roas_d7":           62.7,
      "retention_d1":      34.5,
      "retention_d3":      22.1,
      "retention_d7":      11.4
    }
  ]
}
```
Khi Adjust chưa configure cho app: `available: false`, `rows: []`.

## 4. Error codes

| HTTP | Code | Khi |
|---|---|---|
| 400 | `invalid_range` | `range` không thuộc enum |
| 401 | — | Thiếu/expired token |
| 403 | `forbidden_no_permission` | User không có `s-apps:view-details:dashboard` |
| 404 | `app_not_found` | `appId` không có trong PG `apps` |
| 404 | `admob_account_not_found` | App không link AdMob account (block resolve TZ) |
| 502 | `data_source_unavailable` | StarRocks timeout / lỗi connection |

## 5. Cache headers
- Backend gắn `Cache-Control: private, max-age=300` cho `range=today`, `max-age=1800` cho `yesterday|last7`.
- ETag = hash của response body.

## 6. Performance budget
- p95 mỗi endpoint < 1.5s cold, < 200ms cached.
- Tổng tải khi mở tab (gọi 7 endpoint song song) p95 < 2s.
