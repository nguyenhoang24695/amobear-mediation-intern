# PO Dashboard Metric — Phase 1 Implementation Plan

> **Source request**: [`Request_PO_Dashboard_Metric_ 25_05_2026.md`](Request_PO_Dashboard_Metric_%2025_05_2026.md)
> **Companion docs**: [`02_Data_Catalog.md`](02_Data_Catalog.md) · [`03_API_Contract.md`](03_API_Contract.md) · [`04_Implementation_Guide.md`](04_Implementation_Guide.md)
> **Created**: 2026-05-27 · **Last updated**: 2026-05-28 (v4 — revenue source = Adjust + Qonversion)
> **Status**: Ready to implement (không còn pre-task BLOCKER)

---

## 1. Quyết định đã chốt

| # | Vấn đề | Quyết định cuối |
|---|---|---|
| 1 | Filter thời gian | `Today`, `Yesterday`, `Last 7 days` |
| 2 | Retention | 2 nguồn riêng — Firebase D1/D7 (`gold.retention_overview`) và Adjust D1/D3/D7 (`cohort_metrics_json`) |
| 3 | Installs | Adjust `conversion_metrics_json.installs`. Không fallback. |
| 4 | Top Country | Top 10, cột phụ `ARPU/country`, `Conversion rate` |
| 5 | ARPU | `Total revenue Adjust / Active users (Firebase dau)` |
| 6 | Crash-free users | **Bỏ khỏi Phase 1** |
| 7 | Timezone | `admob_accounts.timezone_offset_hours` map qua `apps.publisher_id` → quy đổi GMT+7 cho FE |
| 8 | Currency | USD |
| 9 | Granularity | Theo ngày |
| 10 | Permission | Tab `dashboard` trong màn App detail, gate bởi role |
| 11 | Qonversion IAP/SUB | Integrated in Slice 7.x |
| 12 | Conversion rate (top country) | `paying_users / dau` cùng country (Firebase) |
| 13 | Active users | `silver.engagement.dau` (Firebase) |
| 14 | Empty Adjust copy | "Adjust syncs daily (T+1). Try Yesterday or Last 7 days." |
| 15 | Default range | `Last 7 days` |
| 16 | URL persist | `?range=...` |
| 17 | Auto-refresh | Không — manual button |
| 18 | Export CSV | Out of scope |
| 19 | Multi AdMob account / app | `is_default = true`, fallback `enabled` đầu tiên theo `id` |
| 20 | Lọc Country `Unknown`/null | Có |
| **21** | **Revenue source (IAP + IAA + SUB + ARPU + ROAS)** | **Adjust IAA** (`ad_revenue`) + **Qonversion IAP/SUB** (`silver.qonversion_events_clean` / `gold.app_iap_daily`); ROAS remains Adjust `cohort_metrics_json` |
| **22** | App không có Adjust | Toàn bộ revenue card + chart + Adjust report + Installs đều empty (warning `adjust_not_configured`). Audience/Engagement/Firebase Retention vẫn render. |

---

## 2. Dữ liệu — Tóm tắt (chi tiết: [`02_Data_Catalog.md`](02_Data_Catalog.md))

**Phase 1 dùng 3 nguồn chính**, không phụ thuộc `silver.daily_app_revenue` (AdMob) hay `gold.daily_overview`:

| Nguồn | Lấy gì | Bảng |
|---|---|---|
| **Firebase** (đã có pipeline) | New users, Total users (DAU), Returning users, Engagement, IAP user count, Country breakdown audience, Retention D1/D7 | `silver.engagement`, `silver.geo`, `gold.retention_overview` |
| **Adjust** (đã có pipeline) | Installs, **IAA revenue**, ROAS D0..D7, Retention D1/D3/D7, Channel/Source breakdown, Country IAA breakdown | `bronze.adjust_report` (JSON metrics) + `silver.dim_app_identifiers.adjust_id` |
| **Qonversion** (đã có pipeline) | **IAP revenue**, **SUB revenue**, Top Country IAP+SUB | `silver.qonversion_events_clean`, `gold.app_iap_daily`, `silver.dim_app_identifiers` |
| **PostgreSQL** | App → AdMob account → `timezone_offset_hours` | `apps`, `admob_accounts` |

> **Không còn pre-task BLOCKER**: Revenue dashboard lấy IAA từ Adjust và IAP/SUB từ Qonversion, không cần fix `gold.daily_overview` cho Phase 1.

---

## 3. Vị trí trong sản phẩm

- Tab mới `dashboard` (label "Dashboard") trong [`AppDetailContent`](../../frontend/components/apps/app-detail-content.tsx:111).
- Đặt ngay sau `overview`.
- Permission key: `s-apps:view-details:dashboard`.
- Route: `/apps/[id]?tab=dashboard&range=last7`.

---

## 4. Phạm vi Phase 1

### 4.1 Filter bar
- 3 preset: `Today` / `Yesterday` / `Last 7 days`.
- Refresh button (manual).
- Badge: "GMT+7 · USD · {AdMob account display_name}".

### 4.2 Metric cards (9 thẻ — bỏ Crash-free)

| # | Card | Công thức | Nguồn |
|---|---|---|---|
| 1 | Installs | `SUM(installs)` Adjust | Adjust |
| 2 | New users | `SUM(new_users)` | Firebase `silver.engagement` |
| 3 | Install-to-open rate | `New users / Installs * 100` | BE tính |
| 4 | Users not opened | `Installs - New users` (≥ 0) | BE tính |
| 5 | Total users | `SUM(dau)` | Firebase |
| 6 | Returning users | `SUM(dau) - SUM(new_users)` | Firebase |
| 7 | Avg engagement time / active user | `SUM(total_engagement_msec) / SUM(dau) / 60000` | Firebase |
| 8 | Engaged sessions / active user | `SUM(sessions) / SUM(dau)` | Firebase |
| 9 | Total revenue (USD) | Adjust IAA + Qonversion IAP + Qonversion SUB | Adjust + Qonversion |

### 4.3 Charts (line, theo ngày)

- **User trend**: Installs (Adjust), New users / Total users / Returning users (Firebase).
- **Engagement trend**: Avg engagement time, Engaged sessions per user (Firebase).
- **Revenue**: Total = Adjust IAA + Qonversion IAP + Qonversion SUB; IAA (`ad_revenue`) từ Adjust; IAP/SUB từ Qonversion; ARPU = Total / Firebase DAU — JOIN cross-source theo `event_date`.
- **Retention rate**:
  - Firebase series: D1, D7 (`gold.retention_overview`).
  - Adjust series: D1, D3, D7 (`cohort_metrics_json.retention_rate_d{n}`).

### 4.4 Top Country tables (Top 10)

Tất cả lấy country từ Adjust hoặc Firebase tùy metric, JOIN sang `silver.dim_country` để lấy display name:

| Bảng | Sort by | Nguồn primary | Cột phụ |
|---|---|---|---|
| Top by IAA revenue | Adjust `SUM(ad_revenue) GROUP BY country_code` | Adjust | ARPU, Conversion rate |
| Top by IAP+SUB revenue | Qonversion `SUM(iap_net + sub_net) GROUP BY country` | Qonversion | ARPU, Conversion rate |
| Top by New users | Firebase `SUM(new_users) GROUP BY country` | Firebase | ARPU, Conversion rate |
| Top by Total users | Firebase `SUM(dau) GROUP BY country` | Firebase | ARPU, Conversion rate |

- `ARPU/country` = (Adjust IAA + Qonversion IAP/SUB) / Firebase SUM(dau), join theo ISO2 country code. Firebase country = full name → cần map qua `silver.dim_country.country_name_firebase` → ISO2 để match Adjust/Qonversion.
- `Conversion rate` = `Firebase SUM(paying_users) / Firebase SUM(dau) * 100` cùng country.

### 4.5 Adjust report block

Bảng: Installs, Ad spend, CPI, ROAS D0/D1/D3/D7, Retention D1/D3/D7. Group by `network` (channel) + `campaign` (source).

### 4.6 Empty / error states

- App không có Adjust mapping (`silver.dim_app_identifiers.adjust_id = ''`):
  - Empty: Installs, Install-to-open rate, Users not opened, User trend (Installs series), Revenue (toàn bộ chart + Total revenue card), Top Country by IAA/IAP, Adjust report.
  - Vẫn render: New/Total/Returning users, Engagement, Firebase Retention, Top Country by New/Total users.
- App không có Firebase data:
  - Empty: Audience/Engagement cards, Firebase Retention, Top Country by users.
- Range không có data → "No data for selected range".

---

## 5. Backend

### 5.1 Controller & endpoints

- File: `backend/MediationPro.Api/Controllers/AppDashboardController.cs`.
- Base route: `api/apps/{appId}/dashboard`.
- 7 GET endpoints — xem [`03_API_Contract.md`](03_API_Contract.md).

### 5.2 Service & providers

- `IAppDashboardService` + `AppDashboardService` (orchestrator).
- **3 provider** (giảm từ 4 — bỏ AdMob revenue provider):
  - `IFirebaseDashboardProvider` — `silver.engagement` / `silver.geo` / `gold.retention_overview`.
  - `IAdjustDashboardProvider` — `bronze.adjust_report` parse JSON, JOIN `silver.dim_app_identifiers.adjust_id`. Tất cả revenue/ROAS/cohort retention/installs.
  - `IAppDashboardMetaProvider` — PG resolve AdMob account + timezone.

### 5.3 Range resolution

- BE nhận `range=today|yesterday|last7`.
- Resolve theo timezone account (`UTC + timezone_offset_hours`).
- Trả ISO date theo TZ account + `tz_offset_hours`. FE shift sang GMT+7 hiển thị.

### 5.4 Caching

- Redis `IDistributedCache`.
- Key: `app-dashboard:{appId}:{range}:{section}`.
- TTL: `Today` = 5 phút; `Yesterday`/`Last7` = 30 phút.

### 5.5 Permission

- Key: `s-apps:view-details:dashboard`.
- Seed cho roles: `Admin`, `Owner`, `PO`.

---

## 6. Frontend

### 6.1 Cấu trúc file

```
frontend/components/apps/app-detail/
  app-dashboard-tab.tsx
  dashboard/
    dashboard-filter-bar.tsx
    metric-cards.tsx
    charts/
      user-trend-chart.tsx
      engagement-trend-chart.tsx
      revenue-chart.tsx
      retention-chart.tsx
    tables/
      top-country-table.tsx
      adjust-report-table.tsx
    hooks/
      use-dashboard-range.ts
      use-dashboard-summary.ts
      use-dashboard-series.ts
      use-top-country.ts
      use-adjust-report.ts
    types.ts
    empty-states.tsx
    format.ts
```

### 6.2 Tích hợp tab

Sửa [`app-detail-content.tsx`](../../frontend/components/apps/app-detail-content.tsx:98): thêm `canViewDashboard`, `<TabsTrigger>`, `<TabsContent>` (xem chi tiết [`04_Implementation_Guide.md §5.3`](04_Implementation_Guide.md)).

### 6.3 API client

`frontend/lib/api/services/appDashboard.ts` + types ở `frontend/types/app-dashboard.ts`.

### 6.4 Format

- Số ≥ 10K → `12.3K`, ≥ 1M → `1.2M`.
- Tiền: `$1,234.56` (USD, 2 decimals).
- %: `45.6%`.
- Engagement: `Xm Ys` < 60p, `Xh Ym` ≥ 60p.

---

## 7. Permission & role

Migration mới: seed `s-apps:view-details:dashboard` cho `Admin`, `Owner`, `PO`. Helper FE giữ nguyên.

---

## 8. Testing plan

### Backend
- Unit test mỗi provider + service: case Adjust available / not configured / Firebase missing.
- Verify Adjust JSON parsing trả đúng số: kiểm với sample fixture (1 ngày dữ liệu thật).
- Controller test: authorize đúng, response khớp contract.

### Frontend
- Component test charts/tables/cards với mock data.
- Empty state test (3 case: no Adjust / no Firebase / no data in range).
- Snapshot test cho metric cards.
- Manual: vào `/apps/<appId>?tab=dashboard&range=last7`:
  - 2 app có cả Adjust + Firebase → render đầy đủ.
  - 1 app chỉ có Firebase → revenue/Installs block empty đúng cách.
  - 1 app TZ khác GMT+8 → check filter `Today` boundary.

### Performance
- p95 mỗi endpoint < 1.5s cold; nếu query Adjust JSON quá chậm → escalate xây `silver.adjust_daily` ở Phase 2.

---

## 9. Rủi ro & phụ thuộc

| Rủi ro | Mức | Mitigation |
|---|---|---|
| Query JSON `bronze.adjust_report` chậm với `Last 7 days` × nhiều dimension | Trung | Benchmark trước. Nếu > 1.5s/request → Phase 2 build `silver.adjust_daily` aggregate. |
| App có Adjust SDK nhưng chưa enable `ad_revenue` tracking | Trung | Sample query 5 app trước rollout. Trả `null` chứ không phải `0` để FE phân biệt "chưa setup" vs "0 thật sự". |
| Firebase country = full name (Czechia) vs Adjust country = ISO2 (CZ) | Trung | Bắt buộc JOIN qua `silver.dim_country.country_name_firebase` ↔ `country_code`. Verify mapping coverage. |
| Multi AdMob account / app | Thấp | Đã chốt: `is_default = true` |
| Firebase bronze table chưa tồn tại với app mới | Thấp | Probe `meta.app_registry` trước, show empty state |
| Timezone boundary edge case (00:00 GMT+7 với app GMT+8) | Thấp | Test boundary với app GMT-8/+8/+9 |

---

## 10. Pre-implementation tasks

### 10.1 Verify data availability (nửa ngày DA)

- Sample query trên `bronze.adjust_report` để confirm các metric đang có data thực:
  - `installs`, `ad_revenue` (revenue_metrics_json)
  - `roas_d0`, `roas_d1`, `roas_d3`, `roas_d7` (cohort_metrics_json)
  - `retention_rate_d1`, `retention_rate_d3`, `retention_rate_d7` (cohort_metrics_json)
- Sample 5 app khác nhau × 3 ngày khác nhau.
- Nếu app nào thiếu `ad_revenue` → list ra để PO confirm có chấp nhận empty cho app đó.

### 10.2 Permission seed migration

- Thêm migration EF Core seed `s-apps:view-details:dashboard` vào permissions + role_permissions cho `Admin`, `Owner`, `PO`.

### 10.3 Country mapping coverage check (nửa ngày DA)

- Verify `silver.dim_country.country_name_firebase` cover ≥ 95% country xuất hiện trong `silver.geo` và `silver.dim_country.country_code` cover ≥ 95% country trong `bronze.adjust_report`.
- Nếu thiếu → backfill mapping.

---

## 11. Out of scope (Phase 1)

- Crashlytics.
- ~~Qonversion IAP/SUB dashboard integration~~ (done in Slice 7.x).
- ~~Detailed subscription drill-down~~ → **Qonversion product-level reports (Subscriptions / New-User-to-Trial / Trial-to-Paid / Refunds by product)** được đưa vào scope qua **Slice 8.x**, lấy data từ **Qonversion Chart API**. Spec: [`08_Qonversion_Product_Reports.md`](08_Qonversion_Product_Reports.md).
- Export CSV/Excel, scheduled email.
- Auto-refresh / realtime.
- Drill-down chart → detail.
- Alert threshold trên dashboard.
- `silver.adjust_daily` aggregate (Phase 2 nếu performance không đủ).
- Cross-source revenue reconciliation (AdMob payout vs Adjust ad_revenue).

---

## 12. Definition of Done (Phase 1)

- [ ] Tab `Dashboard` xuất hiện đúng vị trí cho role có permission.
- [ ] 3 preset filter hoạt động đúng theo timezone AdMob.
- [ ] 9 metric cards + 4 charts + 4 top country tables + Adjust report block render với data thật của ≥ 2 app khác nhau.
- [ ] Empty state đúng cho 3 case: thiếu Adjust, thiếu Firebase, range no data.
- [ ] Revenue card khớp 100% với Adjust IAA + Qonversion IAP/SUB raw aggregate (reconcile 1 ngày).
- [ ] Cache hit ≥ 80% cho repeated request trong TTL.
- [ ] [`03_API_Contract.md`](03_API_Contract.md) khớp impl thật.
- [ ] BE test pass (unit + integration).
- [ ] FE test pass (component + snapshot).
