# PO Dashboard — Slicing Plan (Phase 1)

> Companion: [`01_Phase1_Implementation_Plan.md`](01_Phase1_Implementation_Plan.md) · [`02_Data_Catalog.md`](02_Data_Catalog.md) · [`03_API_Contract.md`](03_API_Contract.md) · [`04_Implementation_Guide.md`](04_Implementation_Guide.md)
> Chia toàn bộ implement thành **6 slice end-to-end** + **Slice 7 (Qonversion IAP/SUB, 3 sub-slice)** + **Slice 7.4 (Firebase Retention Hotfix)** + **Slice 7.5 (Adjust Retention Wiring Fix)** + **Slice 7.6 (Adjust Cohort Window Extension)** + **Slice 7.7 (Retention Cohort Tables redesign)** + **Slice 8 (Qonversion Product Reports via Chart API, 5 sub-slice)**, mỗi slice là 1 prompt cho agent.
> Created: 2026-05-27 · Slice 7 added: 2026-05-28 · Slice 7.4-7.6 added: 2026-05-28 · Slice 7.7 added: 2026-06-01 · Slice 8 added: 2026-06-08
> **Slice 8** chi tiết ở doc riêng: [`08_Qonversion_Product_Reports.md`](08_Qonversion_Product_Reports.md) (nguồn = Qonversion **Chart API**, KHÁC pipeline event của Slice 7).

---

## 0. Tổng quan

| Slice | Tên | BE files | FE files | Dep | Demo output |
|---|---|---|---|---|---|
| 1 | Foundation | 8 | 5 | — | Tab "Dashboard" hiện, filter bar render, placeholder content |
| 2 | Summary + Metric Cards | 4 | 3 | 1 | 9 metric cards với data thật |
| 3 | User Trend + Engagement Trend | 4 | 4 | 1 | 2 chart đầu render data |
| 4 | Revenue Trend + Retention | 4 | 3 | 1 | 2 chart còn lại |
| 5 | Top Country (4 tables) | 3 | 2 | 1 | 4 bảng Top Country |
| 6 | Adjust Report + Polish | 2 | 3 | 1, 2-5 | Adjust report block + tests + caching |
| 7.1 | Qonversion provider + Revenue trend rewire | 4 | 1 | 4 | `iap`, `sub` series có data thật từ Qon; `total` = IAA+IAP+SUB |
| 7.2 | Top Country IAP+SUB rewire sang Qon | 2 | 0 | 5, 7.1 | Bảng Top Country by IAP+SUB có data thật từ Qon |
| 7.3 | Polish Qon (warning, badge, docs) | 2 | 2 | 7.1, 7.2 | Bỏ badge "Phase 2"; warning `QonversionNotConfigured`; cập nhật docs |
| 7.4 | Firebase Retention Hotfix | 3 | 1 | 4 | Fix `MAX(retention_rate)` → latest `event_date`; nới cohort window cho D7 |
| 7.5 | Adjust Retention Wiring Fix | 2 | 1 | 4, 6 | Đọc đúng cột `cohort_non_cumulative_metrics_json`; bỏ D1 (Adjust chưa fetch); convert decimal → percentage |
| 7.6 | Adjust Cohort Window Extension | 1 | 0 | 4, 7.5 | Mở rộng Adjust query window về `start-7` (giống Firebase 7.4) → recover D3 history |
| 7.7 | Retention Cohort Tables redesign | 3 | 2 | 4, 7.5 | Đổi line chart → 2 bảng cohort: Firebase daily 1D-7D + Adjust mốc 3D/7D/14D/... |
| 8.0 | **Pre-task: reverse-engineer Qonversion Chart API** | — | — | — | Endpoint + params + response shape cho 4 chart (Subscriptions/New-User-to-Trial/Trial-to-Paid/Refunds), xác nhận có numerator/denominator. **Blocker cho 8.1-8.4** |
| 8.1 | Chart crawler client + job + bronze table | ~4 | 0 | 8.0 | Raw chart JSON theo product → MinIO + `bronze.qonversion_chart_metrics_raw` |
| 8.2 | Transform bronze→silver | ~2 | 0 | 8.1 | `silver.qonversion_product_metrics_daily` có data, map admob_app_id |
| 8.3 | Provider + endpoint `/qonversion-products` | ~3 | 0 | 8.2 | API trả 4 report theo product |
| 8.4 | FE 4 bảng "Qonversion report" + polish | 0 | ~3 | 8.3 | UI section "Qonversion report"; empty state; tests |

**Dependency graph**:
```
Slice 1 (Foundation)
    │
    ├── Slice 2 (Summary)
    ├── Slice 3 (User/Engagement Trend)
    ├── Slice 4 (Revenue/Retention) ──┐
    ├── Slice 5 (Top Country) ────────┤
    └── Slice 6 (Adjust Report + Polish)
              └── depends also on 2-5 being merged for end-to-end test
                                      │
                                      ▼
                            Slice 7.1 (Qon provider + Revenue rewire)
                                      │
                                      ▼
                            Slice 7.2 (Top Country IAP+SUB rewire)
                                      │
                                      ▼
                            Slice 7.3 (Polish)

Slice 4 (Retention) ──── Slice 7.4 (Firebase Retention Hotfix)
   (độc lập với 7.1-7.3, có thể chạy song song)

Slice 4 + Slice 6 ─────── Slice 7.5 (Adjust Retention Wiring Fix)
   (độc lập với 7.1-7.4, có thể chạy song song)
        │
        ▼
Slice 7.5 ─────────────── Slice 7.6 (Adjust Cohort Window Extension)
   (chỉ chạm AppDashboardService.BuildRetentionAsync — gộp chung với 7.4 nếu muốn)
```

**Parallel hint**: Sau khi merge Slice 1, có thể spawn Slice 2-5 song song trong worktree khác nhau (mỗi slice chạm file khác nhau). Slice 6 chạy cuối. Slice 7.x phải tuần tự (7.1 → 7.2 → 7.3) vì đều chạm `AppDashboardService.cs`. Slice 7.4 chỉ phụ thuộc Slice 4, có thể chạy độc lập song song với Slice 7.x. Slice 7.5 độc lập với 7.4 (đụng method khác trong `AdjustDashboardProvider`, không đụng `FirebaseDashboardProvider`) — có thể chạy parallel với 7.4 hoặc 7.x. Slice 7.6 đụng cùng method `BuildRetentionAsync` như Slice 7.4 (dòng extend window) → nên merge SAU 7.4 + 7.5 để tránh conflict; thực tế có thể gộp 7.6 vào 7.4 nếu làm cùng lúc.

**Estimate per slice**: ~0.5 → 1.5 ngày dev. Mỗi prompt ~3-7 file mới, an toàn cho context window.

---

## SLICE 1 — Foundation

### 1.1 Goal
Dựng skeleton end-to-end để slice sau cắm vào. Tab "Dashboard" xuất hiện cho role có quyền, filter bar render, các block khác là placeholder "Coming in next slice".

### 1.2 Prerequisites
- DA đã chạy 2 pre-task verify ([`01 §10`](01_Phase1_Implementation_Plan.md)) → confirm data có sẵn.

### 1.3 Files to create

**Backend** (8):
```
backend/MediationPro.Infrastructure/Migrations/
  20260528000000_SeedDashboardTabPermission.cs

backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/
  DashboardRange.cs                     # enum + parser
  DashboardDateRangeDto.cs
  DashboardMetaDto.cs
  DashboardSummaryDto.cs                # placeholder shape, fields = nullable
  DashboardWarning.cs                   # const class các warning code

backend/MediationPro.Core/Interfaces/Dashboard/
  IAppDashboardMetaProvider.cs

backend/MediationPro.Core/Services/Dashboard/
  AppDashboardRangeResolver.cs

backend/MediationPro.Infrastructure/Dashboard/
  AppDashboardMetaProvider.cs           # PostgreSQL resolve admob account
```

**Frontend** (5):
```
frontend/types/app-dashboard.ts          # tất cả type cho 7 endpoint, dù slice này chưa dùng hết
frontend/lib/api/services/appDashboard.ts # tất cả 7 method (slice sau chỉ gọi)
frontend/components/apps/app-detail/
  app-dashboard-tab.tsx                  # entry, render filter + placeholder
  dashboard/
    dashboard-filter-bar.tsx
    hooks/use-dashboard-range.ts
    format.ts                            # tất cả 4 format helper
    empty-states.tsx                     # 5 empty state components
```

### 1.4 Files to modify
- [`frontend/components/apps/app-detail-content.tsx`](../../frontend/components/apps/app-detail-content.tsx): thêm `canViewDashboard`, `allowedTabs`, `<TabsTrigger>`, `<TabsContent>` (theo [`04 §5.3`](04_Implementation_Guide.md)).

### 1.5 Definition of Done
- [ ] `dotnet build` pass.
- [ ] Migration apply thành công, `permissions` có row mới + `role_permissions` có 3 row (Admin, Owner, PO).
- [ ] `pnpm typecheck` + `pnpm lint` pass.
- [ ] Login với user role Admin → vào `/apps/<appId>?tab=dashboard` → tab xuất hiện, filter bar render với 3 preset, click đổi range → URL update `?range=...`.
- [ ] Login với role không có quyền → tab ẩn.
- [ ] Format utils có 4 hàm: `formatCount`, `formatUsd`, `formatPercent`, `formatMinutes`.
- [ ] Type `frontend/types/app-dashboard.ts` cover đủ 7 response DTO (FE dùng dần ở slice sau).

### 1.6 Prompt template (copy-paste để spawn agent)

```
Implement Slice 1 (Foundation) của PO Dashboard Phase 1.

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §1, §3, §6, §7
- docs/po-dashboard-metric/03_API_Contract.md §2 (shared types)
- docs/po-dashboard-metric/04_Implementation_Guide.md §1, §2, §3, §4.1-4.3, §5.1-5.6
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 1 section)

Scope: Foundation only — skeleton để slice sau cắm vào.

Files to create:
- 8 BE files (xem checklist slice 1 §1.3)
- 5 FE files (xem checklist slice 1 §1.3)

Files to modify:
- frontend/components/apps/app-detail-content.tsx (thêm tab dashboard)

KHÔNG được làm trong slice này:
- BE provider Firebase/Adjust (slice 2+)
- BE service orchestrator (slice 2+)
- BE controller endpoints (slice 2+)
- FE metric cards/charts/tables (slice 2-5)

Validation:
- dotnet build (backend)
- pnpm typecheck (frontend)
- Manual: tab "Dashboard" xuất hiện, filter bar đổi được range, URL persist.

Definition of Done: slice 1 §1.5 checklist.

Stop và hỏi tôi nếu gặp ambiguity. Không đoán.
```

---

## SLICE 2 — Summary + Metric Cards

### 2.1 Goal
9 metric cards hiển thị data thật từ `GET /summary` endpoint.

### 2.2 Prerequisites
- Slice 1 đã merge.

### 2.3 Files to create

**Backend** (4):
```
backend/MediationPro.Core/Interfaces/Dashboard/
  IFirebaseDashboardProvider.cs         # chỉ method GetSummaryAsync + ProbeAppRegistryAsync
  IAdjustDashboardProvider.cs           # chỉ method GetAdjustIdAsync + GetSummaryAsync
  IAppDashboardService.cs               # chỉ method GetSummaryAsync

backend/MediationPro.Infrastructure/Dashboard/
  FirebaseDashboardProvider.cs          # impl GetSummaryAsync + ProbeAppRegistryAsync
  AdjustDashboardProvider.cs            # impl GetAdjustIdAsync + GetSummaryAsync

backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                # impl GetSummaryAsync orchestrator

backend/MediationPro.Api/Controllers/
  AppDashboardController.cs             # 1 endpoint /summary
```

> Lưu ý: tạo các interface đầy đủ method từ đầu cho slice sau dùng (tránh phải sửa interface nhiều lần), nhưng **chỉ implement** method của slice hiện tại. Method khác throw `NotImplementedException`.

**Frontend** (3):
```
frontend/components/apps/app-detail/dashboard/
  metric-cards.tsx                      # 9 card với formatting
  hooks/use-dashboard-summary.ts        # gọi API summary
```
+ Wire vào `app-dashboard-tab.tsx` (sửa file slice 1).

### 2.4 Files to modify
- `backend/MediationPro.Api/Program.cs`: DI register `IFirebaseDashboardProvider`, `IAdjustDashboardProvider`, `IAppDashboardService`.
- `frontend/components/apps/app-detail/app-dashboard-tab.tsx`: thay placeholder bằng `<MetricCards>`.

### 2.5 Definition of Done
- [ ] `GET /api/apps/{appId}/dashboard/summary?range=last7` trả JSON khớp [`03 §3.1`](03_API_Contract.md).
- [ ] Test với 1 app có cả Firebase + Adjust → 9 card hiển thị data đầy đủ.
- [ ] Test với 1 app không có Adjust → Installs / Install-to-open / Users not opened / Total revenue card hiển thị `—`, warning `adjust_not_configured` xuất hiện ở meta.
- [ ] Cache Redis hit lần 2 trong < 5 phút.
- [ ] Unit test `AppDashboardService.GetSummaryAsync` cover 3 case: full data / no adjust / no firebase.
- [ ] FE component test `metric-cards.test.tsx` cover render với null + render đầy đủ.

### 2.6 Prompt template

```
Implement Slice 2 (Summary + Metric Cards) của PO Dashboard Phase 1.

Prerequisite: Slice 1 đã merge (Foundation).

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §1, §4.2
- docs/po-dashboard-metric/02_Data_Catalog.md §2.1, §3.1-3.3
- docs/po-dashboard-metric/03_API_Contract.md §3.1
- docs/po-dashboard-metric/04_Implementation_Guide.md §4.4-4.8, §5.5
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 2 section)

Scope: Implement /summary endpoint + MetricCards component end-to-end.

Files to create:
- 4 BE files (xem slice 2 §2.3)
- 3 FE files (xem slice 2 §2.3)

Files to modify:
- backend/MediationPro.Api/Program.cs (DI)
- frontend/components/apps/app-detail/app-dashboard-tab.tsx (wire MetricCards)

Interface design: tạo IFirebaseDashboardProvider + IAdjustDashboardProvider + IAppDashboardService với đầy đủ method của Phase 1 (để slice sau implement tiếp). Method ngoài scope slice này throw NotImplementedException.

KHÔNG làm trong slice này:
- 6 endpoint còn lại
- Chart, table, Adjust report block

Validation:
- dotnet build + dotnet test pass
- pnpm typecheck + pnpm test pass
- Manual: 9 metric card hiển thị data đúng cho 2 app khác nhau.

Definition of Done: slice 2 §2.5 checklist.

Stop và hỏi nếu Adjust JSON path khác với 02_Data_Catalog.md §3.3 (DA verify nếu có sai khác).
```

---

## SLICE 3 — User Trend + Engagement Trend

### 3.1 Goal
2 chart `User trend` (Installs + 3 user series) và `Engagement trend` (Avg engagement time + Engaged sessions/user) hiển thị data theo ngày.

### 3.2 Prerequisites
- Slice 1 merged.

### 3.3 Files to create

**Backend** (4 — bao gồm method bổ sung cho provider đã có):
```
# Implement (không tạo file mới, chỉ thêm method vào interface có sẵn từ slice 2):
- IFirebaseDashboardProvider.GetDailyEngagementAsync (engagement metrics theo ngày)
- IFirebaseDashboardProvider.GetDailyUsersAsync (dau, new_users theo ngày)
- IAdjustDashboardProvider.GetDailyInstallsAsync
- IAppDashboardService.GetUserTrendAsync
- IAppDashboardService.GetEngagementTrendAsync
- AppDashboardController.UserTrend endpoint
- AppDashboardController.EngagementTrend endpoint
```

> Slice này thêm method vào file đã có (slice 2). KHÔNG tạo file BE mới.

**Frontend** (4):
```
frontend/components/apps/app-detail/dashboard/
  charts/user-trend-chart.tsx
  charts/engagement-trend-chart.tsx
  hooks/use-dashboard-series.ts          # generic hook dùng cho cả 4 chart
```
+ Wire vào `app-dashboard-tab.tsx`.

### 3.4 Files to modify
- `app-dashboard-tab.tsx`: thay placeholder bằng 2 chart.

### 3.5 Definition of Done
- [ ] `GET /user-trend?range=last7` + `/engagement-trend?range=last7` trả JSON khớp [`03 §3.2-3.3`](03_API_Contract.md).
- [ ] User trend chart: 4 series (Installs, New users, Total users, Returning users) render đúng màu (xem [`04 §5.7`](04_Implementation_Guide.md)).
- [ ] App không có Adjust → series `installs = []`, chart vẫn render 3 series còn lại.
- [ ] Engagement chart: 2 series, secondary Y-axis cho `engaged_sessions_per_user`.
- [ ] Hover tooltip hiển thị format đúng (số người dùng dạng số, thời gian dạng phút).

### 3.6 Prompt template

```
Implement Slice 3 (User Trend + Engagement Trend) của PO Dashboard Phase 1.

Prerequisite: Slice 1 + Slice 2 merged.

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §4.3
- docs/po-dashboard-metric/02_Data_Catalog.md §2.1, §3.4 (daily installs query)
- docs/po-dashboard-metric/03_API_Contract.md §3.2, §3.3
- docs/po-dashboard-metric/04_Implementation_Guide.md §4.4, §4.5, §5.7
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 3 section)

Scope: 2 endpoint trend + 2 chart component.

Files to modify (KHÔNG tạo BE file mới — extend interface có sẵn):
- backend/MediationPro.Core/Interfaces/Dashboard/IFirebaseDashboardProvider.cs
- backend/MediationPro.Core/Interfaces/Dashboard/IAdjustDashboardProvider.cs
- backend/MediationPro.Core/Interfaces/Dashboard/IAppDashboardService.cs
- backend/MediationPro.Infrastructure/Dashboard/FirebaseDashboardProvider.cs
- backend/MediationPro.Infrastructure/Dashboard/AdjustDashboardProvider.cs
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs
- backend/MediationPro.Api/Controllers/AppDashboardController.cs

Files to create:
- 4 FE files (xem slice 3 §3.3)

KHÔNG làm trong slice này:
- Revenue, Retention, Top Country, Adjust report

Validation: slice 3 §3.5 DoD.

Stop và hỏi nếu Firebase silver.engagement không có data cho test app.
```

---

## SLICE 4 — Revenue Trend + Retention

### 4.1 Goal
2 chart `Revenue` (Total/IAA/IAP/SUB/ARPU) và `Retention rate` (Firebase D1/D7 + Adjust D1/D3/D7).

### 4.2 Prerequisites
- Slice 1 merged.

### 4.3 Files to create

**Backend** (extend interface có sẵn):
```
# Thêm method:
- IAdjustDashboardProvider.GetDailyRevenueAsync
- IAdjustDashboardProvider.GetRetentionAsync (cohort D1/D3/D7)
- IFirebaseDashboardProvider.GetRetentionAsync (D1/D7 từ gold.retention_overview)
- IFirebaseDashboardProvider.GetDailyDauAsync (cho ARPU cross-source JOIN)
- IAppDashboardService.GetRevenueTrendAsync
- IAppDashboardService.GetRetentionAsync
- AppDashboardController.RevenueTrend endpoint
- AppDashboardController.Retention endpoint
```

**Frontend** (3):
```
frontend/components/apps/app-detail/dashboard/
  charts/revenue-chart.tsx
  charts/retention-chart.tsx             # 2 series source (Firebase + Adjust) khác màu
```
+ Wire vào `app-dashboard-tab.tsx`.

### 4.4 Definition of Done
- [ ] `GET /revenue-trend` + `/retention` trả JSON khớp [`03 §3.4-3.5`](03_API_Contract.md).
- [ ] Revenue chart: 4 series visible (Total, IAA, IAP, ARPU) + SUB legend có badge "Phase 2".
- [ ] ARPU = `all_revenue / dau` per day (JOIN cross-source).
- [ ] Retention chart hiển thị 2 group series: Firebase (blue tones, 2 line) + Adjust (orange tones, 3 line), legend rõ ràng.
- [ ] App không có Adjust → revenue chart empty, retention chart chỉ hiện Firebase series.

### 4.5 Prompt template

```
Implement Slice 4 (Revenue Trend + Retention) của PO Dashboard Phase 1.

Prerequisite: Slice 1 + Slice 2 merged.

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §4.3
- docs/po-dashboard-metric/02_Data_Catalog.md §2.3 (Firebase retention), §3.4 (Adjust daily revenue + retention)
- docs/po-dashboard-metric/03_API_Contract.md §3.4, §3.5
- docs/po-dashboard-metric/04_Implementation_Guide.md §4.4, §4.5, §5.7
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 4 section)

Scope: 2 endpoint + 2 chart.

QUAN TRỌNG: ARPU cross-source JOIN
- Backend: query Adjust daily all_revenue + Firebase daily dau, JOIN theo event_date trong service.
- Khi 1 ngày thiếu dau hoặc all_revenue → ARPU = null (không phải 0).

Retention 2 series:
- Firebase: gold.retention_overview, D1 + D7.
- Adjust: bronze.adjust_report cohort_metrics_json, D1 + D3 + D7.

Files to modify (extend interface slice 2 + thêm endpoint mới ở controller):
- 6 BE files trong namespace Dashboard
- frontend/components/apps/app-detail/app-dashboard-tab.tsx

Files to create:
- 2 FE chart components

Validation: slice 4 §4.4 DoD.

Stop và hỏi nếu gold.retention_overview thiếu data cho app test.
```

---

## SLICE 5 — Top Country (4 tables)

### 5.1 Goal
4 bảng Top Country (IAA / IAP+SUB / New Users / Total Users), mỗi bảng top 10 + 2 cột phụ ARPU/Conversion rate.

### 5.2 Prerequisites
- Slice 1 merged.

### 5.3 Files to create

**Backend** (extend):
```
# Thêm method:
- IFirebaseDashboardProvider.GetCountryAsync
- IAdjustDashboardProvider.GetCountryRevenueAsync
- IAppDashboardService.GetTopCountriesAsync  (cross-source JOIN)
- AppDashboardController.TopCountries endpoint (?metric=iaa|iap_sub|new_users|total_users)
```

**Frontend** (2):
```
frontend/components/apps/app-detail/dashboard/
  tables/top-country-table.tsx           # generic, dùng 4 lần với props metric khác
  hooks/use-top-country.ts
```
+ Wire 4 lần vào `app-dashboard-tab.tsx`.

### 5.4 Definition of Done
- [ ] `GET /top-countries?metric=iaa&range=last7` trả top 10 + cột phụ khớp [`03 §3.6`](03_API_Contract.md).
- [ ] Cross-source JOIN qua `silver.dim_country.country_name_firebase` cho `new_users`/`total_users` metric.
- [ ] 4 bảng render với title rõ ràng.
- [ ] App không có Adjust → IAA + IAP+SUB table empty với label rõ. New users + Total users table vẫn hiển thị.
- [ ] Country `Unknown`/`null` đã filter (verify trong test).
- [ ] Cột phụ `ARPU per country` = USD, `Conversion rate` = %.

### 5.5 Prompt template

```
Implement Slice 5 (Top Country tables) của PO Dashboard Phase 1.

Prerequisite: Slice 1 + Slice 2 merged.

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §4.4
- docs/po-dashboard-metric/02_Data_Catalog.md §3.5, §3.6 (cross-source JOIN QUAN TRỌNG)
- docs/po-dashboard-metric/03_API_Contract.md §3.6
- docs/po-dashboard-metric/04_Implementation_Guide.md §4.4, §4.5
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 5 section)

Scope: 1 endpoint + 1 generic component dùng 4 lần.

QUAN TRỌNG: country naming bridge
- Adjust country_code = ISO2 ("US")
- Firebase country = full name ("United States")
- JOIN qua silver.dim_country: dc.country_code ↔ Adjust, dc.country_name_firebase ↔ Firebase
- Filter NULL / empty country.

Files to modify:
- 4 BE files (extend interface từ slice 2)

Files to create:
- frontend/components/apps/app-detail/dashboard/tables/top-country-table.tsx
- frontend/components/apps/app-detail/dashboard/hooks/use-top-country.ts

Wire 4 instance trong app-dashboard-tab.tsx với props metric=iaa|iap_sub|new_users|total_users.

Validation: slice 5 §5.4 DoD.

Stop và hỏi nếu silver.dim_country coverage thiếu (pre-task 10.3 chưa pass).
```

---

## SLICE 6 — Adjust Report + Polish

### 6.1 Goal
Adjust report block (cuối tab) + caching toàn bộ + tests + responsive polish.

### 6.2 Prerequisites
- Slice 1 merged. Tốt nhất là Slice 2-5 đã merge để test integration đầy đủ.

### 6.3 Files to create

**Backend** (extend):
```
# Thêm method cuối cùng:
- IAdjustDashboardProvider.GetReportAsync
- IAppDashboardService.GetAdjustReportAsync
- AppDashboardController.AdjustReport endpoint

# Cross-cutting:
- Caching layer (IDistributedCache) cho tất cả 7 endpoint
- Response cache headers
```

**Frontend** (3):
```
frontend/components/apps/app-detail/dashboard/
  tables/adjust-report-table.tsx
  hooks/use-adjust-report.ts
```
+ Tests cho các component chính (nếu slice trước skip).
+ Responsive polish (mobile/tablet breakpoint).

### 6.4 Definition of Done
- [ ] `GET /adjust-report` trả JSON khớp [`03 §3.7`](03_API_Contract.md).
- [ ] Bảng hiển thị: Channel, Source, Installs, Ad spend, CPI, ROAS D0/D1/D3/D7, Retention D1/D3/D7.
- [ ] App không có Adjust → block hiển thị empty state `AdjustNotConfigured`.
- [ ] Caching: lần 2 trong TTL (5min today / 30min yesterday|last7) trả < 200ms.
- [ ] Cache header `Cache-Control: private, max-age=...` đúng giá trị.
- [ ] BE unit test cover orchestration cho tất cả 7 endpoint.
- [ ] FE component test cho metric cards + top country table + revenue chart (3 component chính).
- [ ] Mobile responsive: tab dashboard ổn ở viewport 768px.
- [ ] DoD toàn Phase 1 ở [`01 §12`](01_Phase1_Implementation_Plan.md) đều ✅.

### 6.5 Prompt template

```
Implement Slice 6 (Adjust Report + Polish) của PO Dashboard Phase 1 — slice cuối.

Prerequisite: Slice 1 merged. Slice 2-5 nên merge xong để test integration.

Đọc trước:
- docs/po-dashboard-metric/01_Phase1_Implementation_Plan.md §4.5, §5.4, §12 (DoD)
- docs/po-dashboard-metric/02_Data_Catalog.md §3.7
- docs/po-dashboard-metric/03_API_Contract.md §3.7, §5 (cache headers), §6 (perf)
- docs/po-dashboard-metric/04_Implementation_Guide.md §4.5, §4.8 (caching), §6 (testing)
- docs/po-dashboard-metric/05_Slicing_Plan.md (slice 6 section)

Scope:
1. Adjust report endpoint + table component
2. Caching layer cho TẤT CẢ 7 endpoint (không chỉ slice này)
3. Cache headers
4. Test coverage cuối cùng
5. Responsive polish

Files to modify:
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (wrap với cache)
- backend/MediationPro.Api/Controllers/AppDashboardController.cs (cache headers + endpoint mới)
- AdjustDashboardProvider.cs (thêm GetReportAsync)

Files to create:
- 3 FE files (table + hook + tests)

Cache key pattern: app-dashboard:{appId}:{range}:{section}
TTL: today=5min, yesterday|last7=30min

Validation: 
- Toàn bộ Phase 1 DoD ở 01_Phase1_Implementation_Plan.md §12 phải pass.
- Manual E2E test 3 app khác nhau (full data / no Adjust / GMT+8 timezone).
- Performance: p95 < 1.5s cold, < 200ms cached.

Stop và hỏi nếu performance benchmark fail (cần xây silver.adjust_daily ở Phase 2).
```

---

## SLICE 7 — Qonversion IAP/SUB Integration

> **Context**: Sau khi Slice 1-6 deploy, phát hiện chart "Revenue trend" và "Top Country by IAP+SUB" rỗng vì đang đọc `bronze.adjust_report.$.revenue` (mà Adjust **không** track IAP cho project này). Nguồn IAP thật là **Qonversion**, pipeline đã có sẵn đẩy vào `silver.qonversion_events_clean` + `gold.app_iap_daily` + đã merge vào `gold.daily_overview`. Slice 7 wire dashboard vào nguồn đúng.
>
> **Phương án thống nhất** (đã chốt với PO 2026-05-28):
> 1. IAP và SUB **tách thành 2 series riêng**, aggregate từ `silver.qonversion_events_clean` theo `event_name`.
> 2. `total` revenue ở trend chart = `iaa (Adjust) + iap (Qon) + sub (Qon)`.
> 3. `metrics.totalRevenueUsd` ở summary cũng cộng cả 3 nguồn.

---

### SLICE 7.1 — Qonversion provider + Revenue trend rewire

#### 7.1.1 Goal
Tạo `IQonversionDashboardProvider` đọc StarRocks, wire vào `BuildRevenueTrendAsync` để chart Revenue trend hiển thị `iap`, `sub` từ Qon và `total` cộng đủ 3 nguồn (IAA+IAP+SUB). Summary `totalRevenueUsd` cũng đổi công thức.

#### 7.1.2 Prerequisites
- Slice 4 merged (Revenue trend endpoint đã tồn tại).
- Confirm app target có Qon data:
  ```sql
  SELECT COUNT(*), MIN(event_date), MAX(event_date)
  FROM silver.qonversion_events_clean s
  JOIN silver.dim_app_identifiers d
    ON LOWER(TRIM(d.admob_app_id)) = LOWER('<admob_app_id>')
   AND LOWER(TRIM(s.app_id)) IN (LOWER(d.package_name), LOWER(d.app_store_id), LOWER(d.admob_app_id))
  WHERE s.is_duplicate = 0;
  ```
- Confirm `silver.qonversion_events_clean.country` là **ISO2** (chạy `SELECT DISTINCT country FROM silver.qonversion_events_clean LIMIT 20`). Nếu là full name → join via `dim_country.country_name_firebase` (giống Firebase).

#### 7.1.3 Files to create

**Backend** (4):
```
backend/MediationPro.Core/Interfaces/Dashboard/
  IQonversionDashboardProvider.cs         # interface + 3 record DTO
                                          #   QonSummaryRow(IapNetUsd, SubNetUsd, PayingUsers)
                                          #   QonDailyRevenueRow(Date, IapNetUsd, SubNetUsd)

backend/MediationPro.Infrastructure/Dashboard/
  QonversionDashboardProvider.cs          # impl, 3 method: HasIapAsync, GetSummaryAsync, GetDailyRevenueAsync

backend/MediationPro.Core.Tests/Dashboard/
  QonversionDashboardProviderTests.cs     # mock MySQL via Testcontainers hoặc skip nếu không có infra

backend/MediationPro.Api.Tests/Controllers/
  AppDashboardControllerTests.RevenueTrend.cs (extend file cũ)
```

**Frontend** (1):
```
frontend/components/apps/app-detail/dashboard/charts/
  revenue-chart.test.tsx (extend)         # case: sub series có data
```

#### 7.1.4 Files to modify
```
backend/MediationPro.Api/Program.cs                          # DI register QonversionDashboardProvider
backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                  # inject IQonversionDashboardProvider
                                          # BuildRevenueTrendAsync: thêm Qon, total = iaa+iap+sub
                                          # BuildSummaryAsync: totalRevenueUsd = adjust.iaa + qon.iap + qon.sub
backend/MediationPro.Core.Tests/Dashboard/
  AppDashboardServiceTests.cs             # mock IQonversionDashboardProvider, fix expectations
```

#### 7.1.5 Provider SQL contract

**Event-name → bucket**:
- IAP one-time: `non_renewing_purchase`, `in_app_purchase` (`revenue_sign = 1`)
- IAP refund: `in_app_refunded` (`revenue_sign = -1`) → trừ vào IAP
- SUB recognized: `subscription_started, trial_converted, subscription_renewed, subscription_upgraded, subscription_reactivated` (`revenue_sign = 1`)
- SUB refund: `subscription_refunded` (`revenue_sign = -1`) → trừ vào SUB

Silver flags: `is_revenue_event = 1` cho tất cả event revenue ở trên (xem `docs/qon/126_QONVERSION_INTEGRATION_v1.md` §9.2).

**GetDailyRevenueAsync**:
```sql
SELECT
  s.event_date,
  SUM(CASE
        WHEN s.event_name IN ('non_renewing_purchase', 'in_app_purchase') AND s.revenue_sign = 1
        THEN ABS(COALESCE(s.revenue_usd,0))
        WHEN s.event_name = 'in_app_refunded'
        THEN -ABS(COALESCE(s.revenue_usd,0))
        ELSE 0 END) AS iap_net,
  SUM(CASE
        WHEN s.event_name IN ('subscription_started','trial_converted','subscription_renewed','subscription_upgraded','subscription_reactivated')
        THEN ABS(COALESCE(s.revenue_usd,0))
        WHEN s.event_name = 'subscription_refunded'
        THEN -ABS(COALESCE(s.revenue_usd,0))
        ELSE 0 END) AS sub_net
FROM silver.qonversion_events_clean s
JOIN silver.dim_app_identifiers d
  ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(@admobAppId))
 AND (
   LOWER(TRIM(s.app_id)) = LOWER(TRIM(COALESCE(d.package_name,'')))
   OR LOWER(TRIM(s.app_id)) = LOWER(TRIM(COALESCE(d.app_store_id,'')))
   OR LOWER(TRIM(s.app_id)) = LOWER(TRIM(d.admob_app_id))
 )
WHERE s.event_date BETWEEN @start AND @end
  AND s.is_duplicate = 0
GROUP BY s.event_date
ORDER BY s.event_date;
```

**HasIapAsync** (probe — quyết định warning):
```sql
SELECT 1 FROM gold.app_iap_daily
WHERE app_id = @admobAppId
LIMIT 1;
```

**GetSummaryAsync**: gộp 1 hàng từ daily, hoặc 1 query SUM tương tự daily nhưng bỏ `GROUP BY event_date`.

#### 7.1.6 Logic service (Revenue trend)

```csharp
var qonRows = await _qonversionProvider.GetDailyRevenueAsync(appId, start, end, ct);
var qonByDate = qonRows.ToDictionary(r => r.Date);

Iap = BuildSeries(dates, date => qonByDate.TryGetValue(date, out var q) ? q.IapNetUsd : null),
Sub = BuildSeries(dates, date => qonByDate.TryGetValue(date, out var q) ? q.SubNetUsd : null),
Total = BuildSeries(dates, date => {
    var iaa = revenueByDate.TryGetValue(date, out var a) ? a.Iaa : null;
    var iap = qonByDate.TryGetValue(date, out var q) ? q.IapNetUsd : null;
    var sub = q?.SubNetUsd;
    return SafeSum(iaa, iap, sub);   // null nếu cả 3 đều null; ngược lại coi null = 0
}),
Arpu = BuildSeries(dates, date => CalculateArpu(/* tổng mới */, dauByDate[date]?.Dau)),
```

> `SafeSum(decimal? a, decimal? b, decimal? c)`: nếu tất cả null → return null; ngược lại coalesce null = 0 rồi cộng. Tránh hiển thị 0 giả cho ngày không có data nào.

#### 7.1.7 Definition of Done
- [ ] `GET /revenue-trend?range=last7` cho app có Qon trả `series.iap` và `series.sub` có giá trị > 0 ở các ngày Qon track.
- [ ] `series.total[i]` = `series.iaa[i] + series.iap[i] + series.sub[i]` (skipping null).
- [ ] `summary.metrics.totalRevenueUsd` = sum của tất cả `total[i]` trong range (sai số làm tròn ≤ $0.01).
- [ ] App không có Qon (HasIapAsync = false): `series.iap` và `series.sub` toàn null; không throw.
- [ ] App có Qon nhưng range chưa có event: `series.iap`/`sub` toàn null cho range đó.
- [ ] BE test `AppDashboardServiceTests` được update — không bị fail vì shape `total` đổi.
- [ ] FE chart render mượt với 5 series (Total, IAA, IAP, SUB, ARPU) — không cần đổi component, chỉ verify test.
- [ ] `dotnet test` xanh; `pnpm typecheck` xanh.

#### 7.1.8 Prompt template

```
Implement Slice 7.1 (Qonversion provider + Revenue trend rewire) của PO Dashboard.

Context: Adjust không track IAP/SUB cho project này; data IAP/SUB nằm ở pipeline Qonversion → silver.qonversion_events_clean → gold.app_iap_daily (xem Infrastructure/StarRocks/StarRocksTransformService.Qonversion.cs để hiểu schema). 
Currently RevenueTrend lấy IAP từ bronze.adjust_report.$.revenue (toàn 0), SUB luôn null. Slice 7.1 đổi nguồn sang Qonversion, tách 2 series riêng.

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md (SLICE 7.1 section — chính)
- backend/MediationPro.Infrastructure/StarRocks/StarRocksTransformService.Qonversion.cs (schema reference)
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (BuildRevenueTrendAsync hiện tại)
- backend/MediationPro.Infrastructure/Dashboard/AdjustDashboardProvider.cs (pattern provider)

Scope:
1. Tạo IQonversionDashboardProvider + impl (3 method: HasIapAsync, GetSummaryAsync, GetDailyRevenueAsync).
2. SQL theo §7.1.5 — tách IAP (`non_renewing_purchase`, `in_app_purchase`, trừ `in_app_refunded`) và SUB (subscription_* + trừ refund). 
   Map app qua silver.dim_app_identifiers (giống RunQonversionSilverToGoldAsync).
3. Register DI ở Program.cs (singleton/scoped giống AdjustDashboardProvider).
4. Inject vào AppDashboardService. Update BuildRevenueTrendAsync và BuildSummaryAsync:
   - Iap, Sub từ Qon
   - Total = IAA + IAP + SUB (helper SafeSum: null nếu tất cả null)
   - Summary.totalRevenueUsd = adjust.iaa + qon.iap + qon.sub
5. Update AppDashboardServiceTests (mock IQonversionDashboardProvider).
6. Update controller tests nếu cần.

Files to create: 4 BE files (interface + impl + 2 test files).
Files to modify: Program.cs, AppDashboardService.cs, AppDashboardServiceTests.cs, revenue-chart.test.tsx (extend).

Validation:
- dotnet build, dotnet test (all green)
- pnpm typecheck (no new error)
- Manual: gọi GET /api/apps/{appId}/dashboard/revenue-trend?range=last7 cho app target → series.iap/sub có data.

Stop và hỏi nếu:
- silver.qonversion_events_clean.country không phải ISO2 (cần đổi JOIN dim_country).
- Mapping app_id qua dim_app_identifiers không tìm thấy admob_app_id của app target.
- Phải đổi shape DTO RevenueTrendSeries (không nên — DTO sub đã có sẵn).
```

---

### SLICE 7.2 — Top Country IAP+SUB rewire sang Qon

#### 7.2.1 Goal
Bảng "Top Country by IAP + SUB Revenue" chuyển từ Adjust (`$.revenue`) sang Qon (aggregate `silver.qonversion_events_clean` theo country). Các metric khác (IAA, new_users, total_users) **không đổi**.

#### 7.2.2 Prerequisites
- Slice 5 merged.
- Slice 7.1 merged (provider đã có sẵn).

#### 7.2.3 Files to create
```
backend/MediationPro.Core.Tests/Dashboard/
  AppDashboardServiceTests.TopCountryIapSub.cs (extend file cũ)
```

#### 7.2.4 Files to modify
```
backend/MediationPro.Core/Interfaces/Dashboard/
  IQonversionDashboardProvider.cs         # thêm GetCountryRevenueAsync
backend/MediationPro.Infrastructure/Dashboard/
  QonversionDashboardProvider.cs          # impl method mới
backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                  # BuildTopCountriesAsync: branch metric=iap_sub đi qua Qon
                                          # IsAdjustTopCountryMetric: chỉ còn "iaa"
```

#### 7.2.5 Provider SQL

```sql
SELECT
  s.country AS country_code,
  COALESCE(NULLIF(dc.country_name,''), s.country) AS country_name,
  SUM(CASE
        WHEN s.event_name IN ('non_renewing_purchase', 'in_app_purchase') AND s.revenue_sign = 1
        THEN ABS(COALESCE(s.revenue_usd,0))
        WHEN s.event_name = 'in_app_refunded'
        THEN -ABS(COALESCE(s.revenue_usd,0))
        ELSE 0 END) AS iap_net,
  SUM(CASE
        WHEN s.event_name IN ('subscription_started','trial_converted','subscription_renewed','subscription_upgraded','subscription_reactivated')
        THEN ABS(COALESCE(s.revenue_usd,0))
        WHEN s.event_name = 'subscription_refunded'
        THEN -ABS(COALESCE(s.revenue_usd,0))
        ELSE 0 END) AS sub_net
FROM silver.qonversion_events_clean s
JOIN silver.dim_app_identifiers d
  ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(@admobAppId))
 AND LOWER(TRIM(s.app_id)) IN (
       LOWER(TRIM(COALESCE(d.package_name,''))),
       LOWER(TRIM(COALESCE(d.app_store_id,''))),
       LOWER(TRIM(d.admob_app_id))
     )
LEFT JOIN silver.dim_country dc ON dc.country_code = s.country
WHERE s.event_date BETWEEN @start AND @end
  AND s.is_duplicate = 0
  AND s.country IS NOT NULL AND s.country <> ''
GROUP BY s.country, COALESCE(NULLIF(dc.country_name,''), s.country)
HAVING (iap_net + sub_net) > 0
ORDER BY (iap_net + sub_net) DESC;
```

> Nếu pre-task confirm Qon trả full name thay vì ISO2: đổi JOIN sang `dim_country.country_name_firebase` (giống `FirebaseDashboardProvider.GetCountryAsync`).

#### 7.2.6 Logic service

Trong `BuildTopCountriesAsync`:
```csharp
if (metric == "iap_sub")
{
    var qonCountryRows = await _qonversionProvider.GetCountryRevenueAsync(appId, start, end, ct);
    var rows = qonCountryRows
        .Select(r => new DashboardTopCountryRowDto {
            CountryCode = r.CountryCode,
            CountryName = r.CountryName ?? r.CountryCode,
            PrimaryValue = SafeSum(r.IapNetUsd, r.SubNetUsd),  // = iap + sub
            ArpuCountryUsd = ...,    // cần Firebase DAU nếu muốn giữ ARPU country (optional Phase)
            ConversionRatePercent = ...
        })
        .Where(r => r.PrimaryValue is > 0)
        .OrderByDescending(r => r.PrimaryValue)
        .Take(limit)
        .ToList();
    return new DashboardTopCountriesDto { ..., Rows = rows };
}
// các metric khác giữ nguyên branch cũ
```

Sửa `IsAdjustTopCountryMetric`:
```csharp
private static bool IsAdjustTopCountryMetric(string metric) => metric is "iaa";
// "iap_sub" đã chuyển sang Qon, không còn yêu cầu Adjust available.
```

#### 7.2.7 Definition of Done
- [ ] `GET /top-countries?metric=iap_sub&range=last7` cho app có Qon: trả danh sách country có revenue > 0, sort DESC.
- [ ] App **không** có Adjust nhưng **có** Qon: vẫn ra data (không còn return rỗng vì `!hasAdjust`).
- [ ] App **không** có Qon: trả `rows: []` + không throw.
- [ ] `series.primary` mỗi row = IAP + SUB của country đó (đối chiếu được với SQL §7.2.5).
- [ ] BE test mới cover 3 case: có Qon, không Qon, mixed (Adjust có nhưng Qon không).
- [ ] Cache key vẫn giống pattern `top-countries:{metric}:{limit}` — invalidate sau Refresh.

#### 7.2.8 Prompt template

```
Implement Slice 7.2 (Top Country IAP+SUB rewire sang Qon) của PO Dashboard.

Prerequisite: Slice 5 và Slice 7.1 đã merge. IQonversionDashboardProvider đã tồn tại.

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md (SLICE 7.2 section)
- backend/MediationPro.Infrastructure/Dashboard/QonversionDashboardProvider.cs (provider hiện tại)
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (BuildTopCountriesAsync)

Scope:
1. Thêm method GetCountryRevenueAsync vào IQonversionDashboardProvider + impl.
2. SQL theo §7.2.5 (LEFT JOIN dim_country, HAVING iap+sub > 0).
3. Sửa AppDashboardService.BuildTopCountriesAsync: branch metric == "iap_sub" đi qua Qon thay vì Adjust.
4. Sửa IsAdjustTopCountryMetric: chỉ còn "iaa".
5. Thêm test 3 case (có Qon, không Qon, không Adjust nhưng có Qon).

Files to modify: IQonversionDashboardProvider.cs, QonversionDashboardProvider.cs, AppDashboardService.cs, AppDashboardServiceTests.cs.

Validation: dotnet test xanh; manual test endpoint top-countries metric=iap_sub.

Stop và hỏi nếu Qon country dùng full name thay vì ISO2 (đổi JOIN).
```

---

### SLICE 7.3 — Polish Qon (warning, badge, docs)

#### 7.3.1 Goal
Cập nhật phần UX/docs cho việc tích hợp Qon: bỏ badge "Phase 2" cạnh SUB, thêm warning `QonversionNotConfigured`, update docs cho lập trình viên kế nhiệm.

#### 7.3.2 Prerequisites
- Slice 7.1 + 7.2 merged.

#### 7.3.3 Files to create
```
docs/po-dashboard-metric/
  07_Qonversion_Integration.md            # tài liệu mô tả nguồn IAP/SUB, mapping, troubleshooting
```

#### 7.3.4 Files to modify
```
backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/
  DashboardWarning.cs                     # thêm const QonversionNotConfigured
backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                  # BuildSummaryAsync: push warning nếu !HasIapAsync
                                          # BuildRevenueTrendAsync: xoá phase2_notice "sub" (đã có data thật)
backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/
  DashboardRevenueTrendDto.cs             # field phase2_notice giữ lại (có thể list rỗng) hoặc xoá
frontend/components/apps/app-detail/dashboard/charts/
  revenue-chart.tsx                       # bỏ badge "Phase 2" cạnh SUB
  revenue-chart.test.tsx                  # update test (không expect "Phase 2")
docs/po-dashboard-metric/
  01_Phase1_Implementation_Plan.md        # §11 Out-of-scope: gạch bỏ "Qonversion"
  02_Data_Catalog.md                      # mục Revenue trend + Top Country IAP — đổi data source
```

#### 7.3.5 Definition of Done
- [ ] Summary của app không có Qon → `meta.warnings` chứa `qonversion_not_configured`.
- [ ] Summary của app có Qon → không có warning đó.
- [ ] Revenue chart UI: không còn badge "Phase 2" cạnh SUB.
- [ ] Revenue trend response: không còn `phase2_notice: ["sub"]` (hoặc field đã xoá khỏi DTO).
- [ ] Doc `07_Qonversion_Integration.md` tồn tại, mô tả:
   - Pipeline tổng quan (raw → bronze → silver → gold).
   - Mapping app qua `dim_app_identifiers`.
   - Phân loại event_name (IAP one-time vs SUB).
   - Troubleshooting: app không thấy IAP → check `silver.dim_app_identifiers.admob_app_id` đã link.
- [ ] Cập nhật `01_Phase1_Implementation_Plan.md §11` để gạch bỏ Qonversion khỏi "Out of scope".
- [ ] Cập nhật `02_Data_Catalog.md` cho 2 block bị đổi nguồn.
- [ ] `dotnet test` + `pnpm typecheck` xanh.

#### 7.3.6 Prompt template

```
Implement Slice 7.3 (Polish Qonversion integration) của PO Dashboard.

Prerequisite: Slice 7.1 + 7.2 đã merge.

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md (SLICE 7.3 section)
- backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/DashboardWarning.cs
- frontend/components/apps/app-detail/dashboard/charts/revenue-chart.tsx (badge "Phase 2")

Scope:
1. Thêm warning const QonversionNotConfigured.
2. Push warning trong BuildSummaryAsync khi !_qonversionProvider.HasIapAsync.
3. Bỏ phase2_notice "sub" khỏi BuildRevenueTrendAsync (vì giờ SUB đã có data thật).
4. FE: bỏ badge "Phase 2" cạnh SUB trong revenue-chart.tsx, update test.
5. Tạo docs/po-dashboard-metric/07_Qonversion_Integration.md (template ở §7.3.4).
6. Cập nhật:
   - 01_Phase1_Implementation_Plan.md §11: gạch Qonversion khỏi Out-of-scope.
   - 02_Data_Catalog.md: đổi nguồn cho Revenue trend (iap, sub) + Top Country IAP+SUB.

Validation: dotnet test xanh, pnpm typecheck xanh, manual check FE không còn badge "Phase 2".

Stop và hỏi nếu phải breaking-change schema phase2_notice (FE typing).
```

---

### SLICE 7.4 — Firebase Retention Hotfix

> **Context**: Sau khi Slice 4 deploy, phát hiện 2 vấn đề trên Retention chart:
> 1. **Latent bug**: `FirebaseDashboardProvider.GetRetentionAsync` dùng `MAX(retention_rate)` để dedupe nhiều snapshot của cùng cohort. `gold.retention_overview` ghi nhiều row cho cùng `(install_date, retention_day)` với `event_date` khác nhau (snapshot theo ngày pipeline chạy). `MAX(rate)` **tình cờ** ra đúng giá trị mới nhất vì rate tăng đơn điệu khi có thêm data về, nhưng SAI logic — phải pick theo `MAX(event_date)`. Nếu pipeline dedup làm rate giảm, BE sẽ giữ stale value.
> 2. **D7 không hiển thị trong `last7`**: range mặc định = `today-6..today`. D7 cần cohort `install_date ≤ today-7` → không có install_date nào trong visible window có D7 → chart luôn rỗng D7 series.
>
> **Bằng chứng đã verify ở production** (app `ca-app-pub-9820030150756925~3641492417`, install_date `2026-05-21`):
>
> | event_date | retention_day | retention_rate | active / total_new |
> |---|---|---|---|
> | 2026-05-23 | 3 | 1.71 | 146 / 8543 |
> | 2026-05-24 | 3 | **6.03** | 515 / 8543 ← latest |
> | 2026-05-24 | 4 | 0.20 | 17 / 8543 |
> | 2026-05-25 | 4 | **4.24** | 362 / 8543 ← latest |

#### 7.4.1 Goal

Fix 2 issue:
1. SQL dedupe theo latest `event_date` thay vì `MAX(retention_rate)`.
2. Nới query window về `start - 7 days` để cohort vừa đủ tuổi D7 lọt vào series (giữ visible `dateRange` không đổi).
3. (UX) Caption trên `RetentionChart` giải thích D7 cohort age requirement.

#### 7.4.2 Prerequisites
- Slice 4 merged.
- KHÔNG cần Slice 7.1-7.3.

#### 7.4.3 Files to modify

**Backend** (3):
```
backend/MediationPro.Infrastructure/Dashboard/
  FirebaseDashboardProvider.cs            # GetRetentionAsync: thay SQL dùng window function
backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                  # BuildRetentionAsync: mở rộng start về start.AddDays(-7) cho Firebase
backend/MediationPro.Core.Tests/Dashboard/
  AppDashboardServiceTests.cs             # update stub Firebase capture range, thêm 1 test mới
```

**Frontend** (1):
```
frontend/components/apps/app-detail/dashboard/charts/
  retention-chart.tsx                     # thêm caption: "D7 retention requires cohort install_date ≥ 7 days before today"
```

#### 7.4.4 Provider SQL fix

`FirebaseDashboardProvider.GetRetentionAsync`:

```sql
-- TRƯỚC (sai):
SELECT install_date,
       MAX(CASE WHEN retention_day = 1 THEN retention_rate END) AS d1,
       MAX(CASE WHEN retention_day = 7 THEN retention_rate END) AS d7
FROM gold.retention_overview
WHERE app_id = @appId AND install_date BETWEEN @start AND @end
GROUP BY install_date
ORDER BY install_date;

-- SAU (đúng - đã verify trên StarRocks):
SELECT install_date,
       MAX(CASE WHEN retention_day = 1 THEN retention_rate END) AS d1,
       MAX(CASE WHEN retention_day = 7 THEN retention_rate END) AS d7
FROM (
  SELECT install_date, retention_day, retention_rate,
         ROW_NUMBER() OVER (
           PARTITION BY install_date, retention_day
           ORDER BY event_date DESC
         ) AS rn
  FROM gold.retention_overview
  WHERE app_id = @appId
    AND install_date BETWEEN @start AND @end
) t
WHERE rn = 1
GROUP BY install_date
ORDER BY install_date;
```

Giữ nguyên signature, parameter binding (`@appId`, `@start`, `@end`), record mapping.

#### 7.4.5 Service logic — mở rộng cohort window

`AppDashboardService.BuildRetentionAsync`:

```csharp
private async Task<DashboardRetentionDto> BuildRetentionAsync(string appId, DashboardRange range, CancellationToken ct)
{
    var (_, dateRange, start, end) = await ResolveDateRangeAsync(appId, range, ct).ConfigureAwait(false);

    // Firebase D7 cần install_date <= today-7. Mở rộng query window về quá khứ 7 ngày
    // để cohort vừa đủ tuổi lọt vào, nhưng KHÔNG đổi dateRange visible window.
    var firebaseCohortStart = start.AddDays(-7);
    var firebaseRows = await _firebaseProvider.GetRetentionAsync(appId, firebaseCohortStart, end, ct).ConfigureAwait(false);

    // Adjust giữ nguyên window — Adjust D1/D3/D7 do crawler kéo về theo ngày,
    // không có khái niệm cohort maturity ở BE.
    var adjustId = await _adjustProvider.GetAdjustIdAsync(appId, ct).ConfigureAwait(false);
    var adjustRows = string.IsNullOrWhiteSpace(adjustId)
        ? Array.Empty<AdjustRetentionRow>()
        : await _adjustProvider.GetRetentionAsync(adjustId!, start, end, ct).ConfigureAwait(false);

    return new DashboardRetentionDto
    {
        DateRange = dateRange,   // visible window giữ nguyên
        Firebase = new DashboardFirebaseRetentionSourceDto
        {
            Available = firebaseRows.Count > 0,
            Series = firebaseRows.Select(row => new DashboardFirebaseRetentionPointDto
            {
                InstallDate = row.InstallDate.ToString("yyyy-MM-dd"),
                D1 = row.D1,
                D7 = row.D7
            }).ToList()
        },
        // Adjust block giữ nguyên...
    };
}
```

> Series Firebase trả về sẽ có thêm các `install_date` < `dateRange.start_date_account_tz` — đó là chủ ý. FE chart sẽ tự nở x-axis. Nếu sau này muốn clip về visible window thì làm ở FE component, không bắt buộc ở slice này.

#### 7.4.6 Test updates

`AppDashboardServiceTests.cs`:

1. **Mở rộng `StubFirebaseProvider`** để capture range được gọi:
   ```csharp
   public DateOnly? LastRetentionStart { get; private set; }
   public DateOnly? LastRetentionEnd { get; private set; }
   public Task<IReadOnlyList<FirebaseRetentionRow>> GetRetentionAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct)
   {
       LastRetentionStart = start;
       LastRetentionEnd = end;
       return Task.FromResult(Retention);
   }
   ```

2. **Test mới `GetRetentionAsync_QueriesFirebaseWithExtendedCohortWindow`**:
   - Resolve `last7` range → expect `start = today-6, end = today`.
   - Assert `fixture.Firebase.LastRetentionStart == start.AddDays(-7)`.
   - Assert `fixture.Firebase.LastRetentionEnd == end`.
   - Adjust window không đổi: `fixture.Adjust.LastRetentionStart == start` (nếu cần capture, thêm property tương tự).

3. **Update `GetRetentionAsync_WithFirebaseAndAdjust_ReturnsBothSources`** (nếu cần): stub trả về 1 row `install_date = visible start - 5` (nằm trong cohort window mở rộng nhưng ngoài visible start). Assert `Firebase.Series` chứa row đó (BE trả nguyên, không clip).

#### 7.4.7 Frontend caption

`retention-chart.tsx`: dưới legend hoặc subtitle, thêm dòng nhỏ (Tailwind `text-xs text-slate-500`):

> *D7 retention requires cohort install_date ≥ 7 days before today.*

Không cần đổi logic chart hay shape data.

#### 7.4.8 Definition of Done

- [ ] `dotnet build` pass.
- [ ] `dotnet test --filter "FullyQualifiedName~Dashboard"` pass — bao gồm test mới `GetRetentionAsync_QueriesFirebaseWithExtendedCohortWindow`.
- [ ] `pnpm typecheck` pass.
- [ ] Manual: `GET /api/apps/{appId}/dashboard/retention?range=last7` với app target → `firebase.series` chứa ít nhất 1 row `install_date = today-7` (hoặc cũ hơn) có `d7 != null`.
- [ ] D1 từng ngày trong response khớp với raw SQL `WHERE rn=1`. Đối chiếu với app `ca-app-pub-9820030150756925~3641492417`:
   - install_date `2026-05-21`: D1 = 5.55, D7 = 0.47.
- [ ] Caption "D7 retention requires cohort install_date ≥ 7 days before today" render được trên RetentionChart.
- [ ] KHÔNG đổi:
   - DTO shape (`DashboardRetentionDto`, `DashboardFirebaseRetentionPointDto`, `DashboardAdjustRetentionPointDto`).
   - Cache key (vẫn `app-dashboard:{appId}:{range}:retention`).
   - Adjust query window.

#### 7.4.9 Prompt template

```
Implement Slice 7.4 (Firebase Retention Hotfix) của PO Dashboard Phase 1.

Prerequisite: Slice 4 đã merge (Retention endpoint tồn tại). Không cần Slice 7.1-7.3.

Context (BẮT BUỘC đọc trước):
- docs/po-dashboard-metric/05_Slicing_Plan.md §SLICE 7.4 (chính, đầy đủ SQL + logic).
- backend/MediationPro.Infrastructure/Dashboard/FirebaseDashboardProvider.cs (method GetRetentionAsync hiện tại).
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (BuildRetentionAsync hiện tại).
- backend/MediationPro.Core.Tests/Dashboard/AppDashboardServiceTests.cs (StubFirebaseProvider + test retention).

Vấn đề:
1. gold.retention_overview lưu nhiều snapshot cho cùng cohort (composite key có cột event_date). 
   MAX(retention_rate) tình cờ ra đúng nhờ rate tăng đơn điệu, nhưng sai logic.
2. last7 visible window = today-6..today → install_date có D7 (today-7) bị clip khỏi range → D7 series luôn rỗng trên chart.

Scope:
1. Sửa FirebaseDashboardProvider.GetRetentionAsync — pivot trên subquery ROW_NUMBER() OVER (PARTITION BY install_date, retention_day ORDER BY event_date DESC) = 1 (SQL ở §7.4.4).
2. Sửa AppDashboardService.BuildRetentionAsync — gọi Firebase provider với (start.AddDays(-7), end). Adjust giữ nguyên (start, end). dateRange trong response không đổi.
3. Cập nhật StubFirebaseProvider trong AppDashboardServiceTests — capture LastRetentionStart/LastRetentionEnd.
4. Thêm test GetRetentionAsync_QueriesFirebaseWithExtendedCohortWindow: assert Firebase được gọi với start.AddDays(-7).
5. FE: thêm caption "D7 retention requires cohort install_date ≥ 7 days before today" trên RetentionChart.

KHÔNG:
- KHÔNG đổi shape DTO (DashboardRetentionDto, DashboardFirebaseRetentionPointDto).
- KHÔNG đổi cache key.
- KHÔNG đụng Adjust retention (sẽ xử lý slice sau khi xác định nguyên nhân JSON null).
- KHÔNG refactor các method khác trong FirebaseDashboardProvider.

Validation:
- dotnet build + dotnet test pass (bao gồm test mới).
- pnpm typecheck pass.
- Reconcile manual với app ca-app-pub-9820030150756925~3641492417 range last7:
   - install_date 2026-05-21 phải có D1 = 5.55, D7 = 0.47.

Definition of Done: §7.4.8 checklist.

Stop và hỏi nếu:
- StarRocks không hỗ trợ ROW_NUMBER() OVER với PARTITION + ORDER (chuyển sang JOIN với subquery MAX(event_date)).
- Cohort window mở rộng làm vỡ test khác (chỉ stub cũ — verify trước).
```

---

### SLICE 7.5 — Adjust Retention Wiring Fix

> **Context**: Sau khi Slice 4 + Slice 6 deploy, phát hiện Retention chart (Adjust series) và cột Retention D1/D3/D7 trong Adjust Report table **luôn rỗng**, dù pipeline crawler đã kéo về data đầy đủ. Nguyên nhân: BE đọc dữ liệu **sai cột** + **sai day** + **sai unit** so với cách crawler ghi xuống StarRocks.
>
> **3 bug đã verify trên production** (app `ca-app-pub-9820030150756925~3641492417`, 2026-05-28):
>
> | # | Bug | Bằng chứng |
> |---|---|---|
> | 1 | BE đọc cột `cohort_metrics_json` (chứa CohortCumulative — ROAS/LTV) thay vì `cohort_non_cumulative_metrics_json` (nơi `retention_rate` thật sự lưu trữ theo `AdjustMetricCategory.CohortNonCumulativeMetricBases`). | Query `json_keys(cohort_non_cumulative_metrics_json)` → có `retention_rate_d0/d3/d7/...`. Query `json_keys(cohort_metrics_json)` → chỉ có `revenue_total_per_user_d*`, `roas_*`, `lifetime_value_*`. |
> | 2 | BE đọc `retention_rate_d1` nhưng `AdjustParquetMetricGroups.UACohortDays = {0,3,7,14,21,30,45,60,90,120}` — **không có `1`**. Key `retention_rate_d1` không bao giờ tồn tại. | Source: `backend/MediationPro.Infrastructure/Adjust/AdjustParquetMetricGroups.cs` line 47. |
> | 3 | Adjust trả `retention_rate` ở dạng **decimal 0..1** (vd: `0.1333` = 13.33%). Firebase trả ở dạng **percentage 0..100** (vd: `5.55`). BE không convert → FE `formatPercent` hiển thị 0.13% thay vì 13.33%. | Sample app `ewuypt5gfe9s`: `retention_rate_d0 = 1.0`, `retention_rate_d3 = 0.1333`. |

#### 7.5.1 Goal

Sửa 3 bug:
1. Đọc đúng cột `cohort_non_cumulative_metrics_json` cho cả `GetRetentionAsync` lẫn `GetReportAsync`.
2. Bỏ D1 (set NULL) — Adjust chưa fetch d1; documentation rõ trong code comment để team data biết phải làm gì.
3. Multiply 100.0 để chuyển decimal → percentage, đồng nhất unit với Firebase.

#### 7.5.2 Prerequisites
- Slice 4 merged (Retention endpoint tồn tại).
- Slice 6 merged (Adjust Report table tồn tại, có cột retention_d1/d3/d7).
- KHÔNG cần Slice 7.1-7.4.

#### 7.5.3 Files to modify

**Backend** (2):
```
backend/MediationPro.Infrastructure/Dashboard/
  AdjustDashboardProvider.cs              # 2 method: GetRetentionAsync + GetReportAsync
backend/MediationPro.Core.Tests/Dashboard/
  AppDashboardServiceTests.cs             # update stub adjust retention + thêm test
```

**Frontend** (1):
```
frontend/components/apps/app-detail/dashboard/charts/
  retention-chart.tsx                     # note "Adjust D1 chưa khả dụng"
```

#### 7.5.4 Provider SQL fix

`AdjustDashboardProvider.GetRetentionAsync`:

```sql
-- TRƯỚC (sai cột + sai day + sai unit):
SELECT ar.`date` AS install_date,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d1')) AS d1,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d3')) AS d3,
       AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d7')) AS d7
FROM bronze.adjust_report ar
WHERE ar.app_token = @adjustId AND ar.`date` BETWEEN @start AND @end
GROUP BY ar.`date`
ORDER BY ar.`date`;

-- SAU (đúng - đã verify):
-- Note: D1 = NULL vì AdjustParquetMetricGroups.UACohortDays không có ngày 1.
--       Ticket riêng cho team data: thêm 1 vào UACohortDays + backfill.
SELECT ar.`date` AS install_date,
       NULL AS d1,
       AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d3')) * 100.0 AS d3,
       AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d7')) * 100.0 AS d7
FROM bronze.adjust_report ar
WHERE ar.app_token = @adjustId
  AND ar.`date` BETWEEN @start AND @end
  AND ar.cohort_non_cumulative_metrics_json IS NOT NULL
  AND ar.cohort_non_cumulative_metrics_json != '{}'
GROUP BY ar.`date`
ORDER BY ar.`date`;
```

Mapping reader: `AdjustRetentionRow.D1 = GetNullableDecimal(reader, 1)` (giờ sẽ là null vì SELECT NULL).

`AdjustDashboardProvider.GetReportAsync` — sửa tương tự 3 dòng retention:

```sql
-- TRƯỚC:
AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d1')) AS retention_d1,
AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d3')) AS retention_d3,
AVG(get_json_double(ar.cohort_metrics_json, '$.retention_rate_d7')) AS retention_d7

-- SAU:
NULL AS retention_d1,
AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d3')) * 100.0 AS retention_d3,
AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d7')) * 100.0 AS retention_d7
```

Giữ nguyên các cột khác (ROAS, installs, ad_spend — vẫn đọc đúng từ `cohort_metrics_json` cho ROAS, `conversion_metrics_json` cho installs, etc.).

#### 7.5.5 Test updates

`AppDashboardServiceTests.cs`:

1. **Update test `GetRetentionAsync_WithFirebaseAndAdjust_ReturnsBothSources`**: stub Adjust trả `AdjustRetentionRow(install_date, D1: null, D3: 13.33m, D7: 8.5m)`. Assert:
   - `result.Adjust.Series[0].D1 == null`
   - `result.Adjust.Series[0].D3 == 13.33m`
   - `result.Adjust.Series[0].D7 == 8.5m`

2. **Thêm test mới `GetRetentionAsync_AdjustD1AlwaysNull`**: stub trả 3 rows với D3/D7 có giá trị, D1 = null. Assert series Adjust toàn bộ point có D1 = null.

3. **Thêm test cho Adjust Report `GetAdjustReportAsync_RetentionD1AlwaysNull`**: stub `AdjustReportRow(..., RetentionD1: null, RetentionD3: 13.33m, RetentionD7: 8.5m)`. Assert output row có `RetentionD1 = null`.

> Lưu ý: Test ở service level chỉ verify mapping. Phép `* 100.0` được test ngầm qua reconcile manual (DoD).

#### 7.5.6 Frontend caption (optional polish)

`retention-chart.tsx`: dưới legend Adjust series (hoặc subtitle), thêm note nhỏ:

> *Adjust D1 chưa khả dụng — Adjust pipeline hiện chỉ tracking cohort D3/D7/D14/...*

Không cần đổi logic chart. Nếu series D1 toàn null, recharts tự skip render line — chỉ vẽ D3 + D7.

#### 7.5.7 Definition of Done

- [ ] `dotnet build` pass.
- [ ] `dotnet test --filter "FullyQualifiedName~Dashboard"` pass, bao gồm test mới.
- [ ] `pnpm typecheck` pass.
- [ ] Manual reconcile app target `ca-app-pub-9820030150756925~3641492417` range `last7`:
   - Endpoint `/api/apps/{appId}/dashboard/retention?range=last7` → `adjust.series` chứa rows với D1 = null, D3/D7 là số % (vd: install_date `2026-05-22` D3 ≈ 13.33).
   - Endpoint `/api/apps/{appId}/dashboard/adjust-report?range=last7` → table có cột `retention_d1` = null, `retention_d3`/`retention_d7` là số % thật.
- [ ] FE Retention chart: Adjust D3 + D7 line render (không phải toàn null), D1 hidden hoặc note rõ.
- [ ] Caption "Adjust D1 chưa khả dụng" hiển thị (nếu apply polish).
- [ ] KHÔNG đổi:
   - DTO shape (`DashboardAdjustRetentionPointDto.D1` vẫn là `decimal?`, chỉ luôn null).
   - Cache key.
   - Firebase retention query (đã handle ở Slice 7.4).
   - Crawler/ingestion (ticket riêng).

#### 7.5.8 Prompt template

```
Implement Slice 7.5 (Adjust Retention Wiring Fix) của PO Dashboard Phase 1.

Prerequisite: Slice 4 + Slice 6 đã merge. Không phụ thuộc Slice 7.1-7.4.

Context — 3 bug đã verify trên StarRocks production (2026-05-28):

Bug #1 — Đọc sai cột:
Crawler AdjustParquetSyncJob lưu retention_rate vào cột
`bronze.adjust_report.cohort_non_cumulative_metrics_json`
(theo AdjustMetricCategory.CohortNonCumulativeMetricBases line 104).
BE hiện đọc từ `cohort_metrics_json` (CohortCumulative — chứa ROAS/LTV) → luôn null.

Verify với app 'ewuypt5gfe9s', date '2026-05-15':
  noncum_keys chứa retention_rate_d0, retention_rate_d3, retention_rate_d7, ...
  cohort_metrics_json chỉ chứa revenue_total_per_user_d*, roas_*, lifetime_value_*.

Bug #2 — Sai day:
Crawler chỉ fetch cohort days {0, 3, 7, 14, 21, 30, 45, 60, 90, 120}
(AdjustParquetMetricGroups.UACohortDays line 47).
→ retention_rate_d1 không tồn tại. BE hiện request d1 → luôn null.

Bug #3 — Unit mismatch:
Adjust trả retention_rate dạng decimal 0..1 (vd: 0.1333 = 13.33%).
Firebase trả retention_rate dạng percentage 0..100 (vd: 5.55 = 5.55%).
BE chưa convert; FE formatPercent giả định input là percentage.

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md §SLICE 7.5 (chính)
- backend/MediationPro.Infrastructure/Dashboard/AdjustDashboardProvider.cs
  (method GetRetentionAsync + GetReportAsync)
- backend/MediationPro.Infrastructure/Adjust/AdjustParquetMetricGroups.cs (tham khảo cohort days)
- backend/MediationPro.Infrastructure/Adjust/AdjustMetricCategory.cs (mapping metric → column)

Scope:

1. Sửa AdjustDashboardProvider.GetRetentionAsync — SQL mới (xem §7.5.4):
   - Đọc cột cohort_non_cumulative_metrics_json
   - NULL AS d1 (kèm comment trong code: "Crawler chưa fetch d1 — ticket data riêng")
   - * 100.0 để chuyển decimal → percentage cho d3, d7
   - Filter cohort_non_cumulative_metrics_json IS NOT NULL AND != '{}'

2. Sửa AdjustDashboardProvider.GetReportAsync — đổi 3 dòng retention tương tự (xem §7.5.4).
   Giữ nguyên các dòng khác (ROAS, installs, ad_spend).

3. Update AppDashboardServiceTests:
   - Test GetRetentionAsync_WithFirebaseAndAdjust_ReturnsBothSources: stub Adjust D1=null.
   - Thêm test GetRetentionAsync_AdjustD1AlwaysNull.
   - Thêm test GetAdjustReportAsync_RetentionD1AlwaysNull.

4. (Polish) FE retention-chart.tsx: caption "Adjust D1 chưa khả dụng" 
   dưới legend Adjust series.

KHÔNG được làm:
- KHÔNG đổi shape DTO DashboardAdjustRetentionPointDto / DashboardAdjustReportRowDto 
  (D1 vẫn là decimal? nullable, chỉ luôn null).
- KHÔNG đổi crawler/ingestion (Slice scope dashboard only).
  Việc thêm 1 vào UACohortDays là TICKET RIÊNG cho team data.
- KHÔNG đổi Firebase retention query (Slice 7.4 đã handle).
- KHÔNG đổi cache key.

Validation:

- dotnet build, dotnet test pass.
- pnpm typecheck pass.
- Reconcile manual với app target 'ca-app-pub-9820030150756925~3641492417'
  range last7:
  - GET /retention → adjust.series chứa rows install_date 2026-05-22,
    D1 = null, D3 ≈ 13.33 (= 13.33%), D7 = 0 (chưa matured).
  - GET /adjust-report → table cột retention D3/D7 có giá trị % thật.

Definition of Done: §7.5.7 checklist.

Stop và hỏi nếu:
- Crawler UACohortDays đã được thay đổi (thêm 1) → có thể bỏ NULL AS d1,
  đọc retention_rate_d1 thật.
- DTO field D1 không cho phép null (BE shape lỗi compile).
- Test fixture cũ không update được vì stub provider có signature khác.
```

---

### SLICE 7.6 — Adjust Cohort Window Extension

> **Context**: Sau khi Slice 7.5 sửa Adjust đọc đúng cột retention, chart vẫn thiếu data:
> Adjust D3 chỉ vẽ vài ngày gần nhất và thiếu install_date có D3 thật. Nguyên nhân:
> Slice 7.4 đã mở rộng **Firebase** query window về `start-7` (để bắt cohort đủ tuổi D7),
> nhưng **Adjust** vẫn dùng window gốc `start..end` → install_date sớm (đã matured D3/D7)
> bị clip khỏi Adjust series.
>
> **Bằng chứng đã verify** (app `ca-app-pub-9820030150756925~3641492417`, today=2026-06-01,
> range last7 = `5/26..6/01`):
>
> | install_date | D3 thật (bronze) | Trong Adjust window 5/26..6/01? |
> |---|---|---|
> | 5/22 | 4.04% | ❌ bị clip |
> | 5/23 | 3.03% | ❌ bị clip |
> | 5/24 | 0.97% | ❌ bị clip |
> | 5/25-5/31 | ~0% | ✅ trong window |
>
> → Extend Adjust window về `start-7` (5/19) recover 3 ngày D3 (5/22-5/24).

> **⚠️ Lưu ý quan trọng — D7/D14 vẫn = 0 sau Slice 7.6**:
> Verify cho thấy `retention_rate_d7` = 0 và `cohort_size_d7` = 0 cho MỌI install_date,
> kể cả cohort đã 10-17 ngày tuổi (cả app target lẫn app lớn `ewuypt5gfe9s`). Root cause:
> **Adjust crawler không re-crawl cohort sau khi matured** (`AdjustParquetSyncJob` chỉ crawl
> install_date trong window T+0 và T+1..T+5, ngắn hơn D7 maturity). retention_rate_d7 bị
> đóng băng ở 0 vì lúc crawl cohort chưa đủ 7 ngày. → Đây là **ticket riêng cho team data**
> (xem cuối section), KHÔNG phải bug Slice 7.6. Sau khi crawler fix + backfill, D7 tự hiển thị
> mà không cần đổi dashboard.

#### 7.6.1 Goal
Mở rộng Adjust retention query window về `start.AddDays(-7)` (đồng nhất với Firebase ở Slice 7.4),
để install_date đã matured D3 lọt vào series. Visible `dateRange` giữ nguyên.

#### 7.6.2 Prerequisites
- Slice 4 merged (Retention endpoint).
- Slice 7.5 merged (Adjust đọc đúng cột retention).
- (Khuyến nghị) Slice 7.4 merged — vì cùng chạm `BuildRetentionAsync`. Nếu làm cùng lúc, gộp 7.6 vào 7.4.

#### 7.6.3 Files to modify

**Backend** (1):
```
backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs                  # BuildRetentionAsync: Adjust dùng cohortStart = start-7
backend/MediationPro.Core.Tests/Dashboard/
  AppDashboardServiceTests.cs             # update test extended window cho cả Adjust
```

#### 7.6.4 Service logic

`AppDashboardService.BuildRetentionAsync` — dùng chung `cohortStart` cho cả 2 nguồn:

```csharp
// Retention cohort cần install_date đủ tuổi để D7/D3 matured (D7 cần install_date <= today-7).
// Mở rộng query window về quá khứ 7 ngày cho CẢ Firebase lẫn Adjust để cohort vừa đủ tuổi
// lọt vào series, nhưng KHÔNG đổi dateRange visible window.
var cohortStart = start.AddDays(-7);
var firebaseRows = await _firebaseProvider.GetRetentionAsync(appId, cohortStart, end, ct).ConfigureAwait(false);

var adjustId = await _adjustProvider.GetAdjustIdAsync(appId, ct).ConfigureAwait(false);
var adjustRows = string.IsNullOrWhiteSpace(adjustId)
    ? Array.Empty<AdjustRetentionRow>()
    : await _adjustProvider.GetRetentionAsync(adjustId!, cohortStart, end, ct).ConfigureAwait(false);
```

#### 7.6.5 Test updates

`AppDashboardServiceTests.cs` — rename + mở rộng test cũ:

```csharp
[Fact]
public async Task GetRetentionAsync_QueriesBothSourcesWithExtendedCohortWindow()
{
    var fixture = Fixture();
    var result = await fixture.Service.GetRetentionAsync("app-1", DashboardRange.Last7, CancellationToken.None);

    var visibleStart = DateOnly.Parse(result.DateRange.StartDateAccountTz);
    var visibleEnd = DateOnly.Parse(result.DateRange.EndDateAccountTz);
    Assert.Equal(visibleStart.AddDays(-7), fixture.Firebase.LastRetentionStart);
    Assert.Equal(visibleEnd, fixture.Firebase.LastRetentionEnd);
    Assert.Equal(visibleStart.AddDays(-7), fixture.Adjust.LastRetentionStart);  // ← Slice 7.6
    Assert.Equal(visibleEnd, fixture.Adjust.LastRetentionEnd);
}
```

(Stub `StubAdjustProvider` đã capture `LastRetentionStart/End` từ Slice 7.4 — không cần thêm.)

#### 7.6.6 Definition of Done

- [ ] `dotnet build` pass.
- [ ] `dotnet test --filter "FullyQualifiedName~Dashboard"` pass.
- [ ] Manual reconcile app `ca-app-pub-9820030150756925~3641492417` range `last7`:
   - `GET /retention` → `adjust.series` chứa install_date 5/22, 5/23, 5/24 với D3 ≈ 4.04 / 3.03 / 0.97.
- [ ] D7 vẫn null/0 — đã document là chờ ticket data (KHÔNG coi là fail DoD).
- [ ] KHÔNG đổi: DTO shape, cache key, visible `dateRange`.

#### 7.6.7 Prompt template

```
Implement Slice 7.6 (Adjust Cohort Window Extension) của PO Dashboard Phase 1.

Prerequisite: Slice 4 + Slice 7.5 merged. Khuyến nghị Slice 7.4 merged (cùng chạm BuildRetentionAsync).

Context:
Slice 7.4 đã mở rộng Firebase retention window về start-7 (để bắt cohort matured D7).
Adjust vẫn dùng window gốc start..end → install_date sớm (đã matured D3) bị clip khỏi
Adjust series. Verify: install_date 5/22-5/24 có D3 thật (4.04/3.03/0.97%) nhưng nằm ngoài
Adjust window 5/26..6/01.

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md §SLICE 7.6
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (BuildRetentionAsync)

Scope:
1. AppDashboardService.BuildRetentionAsync: dùng chung biến cohortStart = start.AddDays(-7)
   cho cả Firebase lẫn Adjust GetRetentionAsync call (xem §7.6.4).
2. Update test GetRetentionAsync_QueriesFirebaseWithExtendedCohortWindow → rename thành
   GetRetentionAsync_QueriesBothSourcesWithExtendedCohortWindow, assert Adjust cũng dùng start-7.

KHÔNG:
- KHÔNG đổi DTO shape, cache key, visible dateRange.
- KHÔNG đụng crawler (vấn đề D7=0 là ticket data riêng).
- KHÔNG sửa AdjustDashboardProvider SQL (Slice 7.5 đã đúng).

Validation:
- dotnet build + dotnet test pass.
- Reconcile: GET /retention range last7 cho app target → adjust.series có install_date
  5/22-5/24 với D3 > 0.

Definition of Done: §7.6.6.

Lưu ý: D7 vẫn = 0 sau slice này (crawler chưa re-crawl matured cohort) — KHÔNG phải bug.

Stop và hỏi nếu BuildRetentionAsync đã được Slice 7.4 sửa khác với mô tả (merge conflict).
```

#### 7.6.8 Ticket riêng cho team data (Adjust D7/D14 = 0)

```
Title: Adjust crawler — re-crawl cohort cho matured install dates (retention_rate_d7/d14 đang = 0)

Root cause:
AdjustParquetSyncJob chỉ crawl install_date window T+0 (SyncToday) và T+1..T+5 (SyncT1ToT5).
Cohort metrics retention_rate_d7/d14/d21... cần re-query sau khi cohort matured (D7 cần
install_date + 7 ngày), nhưng window T+5 < 7 → retention_rate_d7 bị đóng băng ở 0.

Bằng chứng (2026-06-01):
- App ca-app-pub-9820030150756925~3641492417, install_date 5/22 (10 ngày tuổi):
  retention_rate_d7 = "0", cohort_size_d7 = "0".
- App ewuypt5gfe9s (cohort lớn ~3200/ngày), install_date 5/15-5/25: D7 = 0, D14 = 0 toàn bộ.
- D3 có data (vì D3 matured trong window T+5).

Action:
1. Thêm job re-crawl cohort cho install_date range [today-N, today] mỗi ngày, N >= 14
   (bắt D7/D14) hoặc N >= 120 (full AdjustParquetMetricGroups.UACohortDays).
2. Hoặc mở rộng SyncT1ToT5 → SyncT1ToT14+ để cohort matured được refresh.
3. Backfill historic: re-crawl install_date [today-120, today] một lần.

Verify post-fix:
  SELECT AVG(get_json_double(cohort_non_cumulative_metrics_json,'$.retention_rate_d7'))*100
  FROM bronze.adjust_report WHERE `date` = today-8;  -- phải > 0

Lưu ý chi phí: re-crawl tăng số request Adjust API — cân nhắc tần suất.

Owner: Team data ingestion
Priority: Medium — chặn Adjust D7/D14 retention trên dashboard
Liên quan: ticket "thêm 1 vào UACohortDays cho retention_rate_d1" (Slice 7.5)
```

---

### SLICE 7.7 — Retention Cohort Tables (redesign)

> **Context**: PO yêu cầu đổi block Retention từ **line chart gộp** (Firebase + Adjust chung 1 chart)
> sang **2 bảng cohort riêng biệt** dạng ma trận tam giác + heatmap (giống Cohort analysis của Adjust/Qonversion):
> mỗi row = 1 install_date, mỗi cột = 1 mốc retention day, + hàng Total.
>
> **Bất đối xứng dữ liệu** (đã chốt với PO):
> - **Firebase** (`gold.retention_overview`) có daily granularity (`retention_day` = 0,1,2,...) → bảng cột **1D→7D**.
> - **Adjust** (`cohort_non_cumulative_metrics_json`) chỉ có mốc `{d3,d7,d14,d21,d30,d45,d60,d90,d120}` (crawler không fetch daily — Slice 7.5/7.6) → bảng cột riêng **3D/7D/14D/21D/30D/45D/60D/90D/120D**.
>
> **Supersede**: Slice 7.7 thay thế hoàn toàn line chart cũ → logic mở rộng window `-7` của Slice 7.4/7.6
> không còn áp dụng (cohort table dùng install_date = visible range, ô chưa matured hiển thị "—").
> Slice 7.4 (Firebase dedup latest `event_date`) và Slice 7.5 (Adjust đọc đúng cột + ×100) **vẫn giữ** —
> được port vào SQL cohort mới.

#### 7.7.1 Goal
Thay `RevenueChart`-style line retention bằng 2 component bảng cohort. BE reshape `/retention` response
thành 2 `cohort` object (firebase + adjust), mỗi cái có `day_offsets`, `rows[]`, `total`.

#### 7.7.2 Prerequisites
- Slice 4 merged. Slice 7.5 merged (Adjust column/unit fix được port vào cohort SQL).
- Verify Firebase `gold.retention_overview` có `retention_day` tới 7:
  ```sql
  SELECT DISTINCT retention_day FROM gold.retention_overview
  WHERE app_id = '<admob_app_id>' ORDER BY retention_day;
  ```
  Nếu chỉ tới d5 → cột 6D/7D sẽ "—" (chấp nhận, sẽ đầy dần khi pipeline ingest).

#### 7.7.3 Files

**Backend** (3 modify):
```
backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/DashboardSummaryDto.cs
  # Bỏ DashboardFirebase/AdjustRetentionSourceDto + PointDto.
  # Thêm DashboardCohortDto { Available, DayOffsets, Rows, Total } + DashboardCohortRowDto { InstallDate, Users, Retention[] }.
backend/MediationPro.Core/Interfaces/Dashboard/IFirebaseDashboardProvider.cs + IAdjustDashboardProvider.cs
  # Bỏ GetRetentionAsync + Firebase/AdjustRetentionRow.
  # Thêm GetCohortRetentionAsync + FirebaseCohortRow/AdjustCohortRow (InstallDate, Users, IReadOnlyDictionary<int,decimal?> RetentionByDay).
backend/MediationPro.Infrastructure/Dashboard/FirebaseDashboardProvider.cs + AdjustDashboardProvider.cs
  # Impl GetCohortRetentionAsync (SQL §7.7.4).
backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs
  # BuildRetentionAsync: build 2 cohort DTO + helper BuildCohort + WeightedRetention (Total weighted theo Users).
```

**Backend tests**:
```
backend/MediationPro.Core.Tests/Dashboard/AppDashboardServiceTests.cs
  # Stub: Cohort list thay Retention; GetCohortRetentionAsync; capture LastCohortMaxDay.
  # Rewrite 4 test: cohort shape, weighted total, visible-range window, no-adjust.
backend/MediationPro.Api.Tests/Controllers/AppDashboardControllerTests.cs
  # Retention assert: Firebase/Adjust.Rows + DayOffsets (thay .Series).
```

**Frontend** (1 new + 2 modify):
```
frontend/types/app-dashboard.ts
  # RetentionResponse → { firebase: CohortSource, adjust: CohortSource }; CohortSource { available, day_offsets, rows, total }; CohortRow { install_date, users, retention[] }.
frontend/components/apps/app-detail/dashboard/tables/cohort-table.tsx   # MỚI — bảng cohort + heatmap, reusable.
frontend/components/apps/app-detail/dashboard/charts/retention-chart.tsx # render 2 <CohortTable> (giữ export name RetentionChart).
frontend/components/apps/app-detail/dashboard/charts/trend-charts.test.tsx # update retention() factory + 2 test cohort.
```

#### 7.7.4 Provider SQL

**Firebase** (`GetCohortRetentionAsync`, maxDay = 7) — port dedup latest event_date (Slice 7.4), pivot ở C#:
```sql
SELECT install_date, retention_day, total_new_users, retention_rate
FROM (
  SELECT install_date, retention_day, total_new_users, retention_rate,
         ROW_NUMBER() OVER (PARTITION BY install_date, retention_day ORDER BY event_date DESC) AS rn
  FROM gold.retention_overview
  WHERE app_id = @appId AND install_date BETWEEN @start AND @end
    AND retention_day BETWEEN 0 AND @maxDay
) t WHERE rn = 1
ORDER BY install_date, retention_day;
```
- `retention_rate` đã là percentage 0..100 (không ×100).
- `retention_day = 0` → cohort size (`total_new_users`) làm cột Users, không phải cột retention.

**Adjust** (`GetCohortRetentionAsync`) — port column/unit fix (Slice 7.5), build động theo `{3,7,14,21,30,45,60,90,120}`:
```sql
SELECT
  ar.`date` AS install_date,
  SUM(get_json_double(ar.conversion_metrics_json, '$.installs')) AS users,
  AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d3'))  * 100.0 AS d3,
  AVG(get_json_double(ar.cohort_non_cumulative_metrics_json, '$.retention_rate_d7'))  * 100.0 AS d7,
  ... (d14, d21, d30, d45, d60, d90, d120)
FROM bronze.adjust_report ar
WHERE ar.app_token = @adjustId AND ar.`date` BETWEEN @start AND @end
  AND ar.cohort_non_cumulative_metrics_json IS NOT NULL
  AND ar.cohort_non_cumulative_metrics_json <> '{}'
GROUP BY ar.`date`
ORDER BY ar.`date`;
```

#### 7.7.5 Service logic
```csharp
private static readonly int[] FirebaseCohortDays = { 1, 2, 3, 4, 5, 6, 7 };
private static readonly int[] AdjustCohortDays   = { 3, 7, 14, 21, 30, 45, 60, 90, 120 };
private const int FirebaseCohortMaxDay = 7;

// BuildRetentionAsync: visible range (KHÔNG -7). BuildCohort(dayOffsets, rows) → align retention[] theo dayOffsets.
// Total row = weighted avg theo Users: Σ(users × ret) / Σ(users có ret != null), round 2. InstallDate = "Total".
```

#### 7.7.6 FE cohort table
- `cohort-table.tsx`: header `Install date | Users | <dayLabels>`; mỗi cell heatmap `rgba(147,51,234, alpha)` với alpha tỷ lệ `value/max`; null → "—"; hàng Total in đậm; sticky cột install_date; horizontal scroll.
- `retention-chart.tsx`: 2 `<CohortTable>` (Firebase + Adjust), Adjust kèm note "chỉ tracking mốc 3D/7D/... không có daily".

#### 7.7.7 Definition of Done
- [ ] `dotnet build` + `dotnet test --filter Dashboard` pass (32+).
- [ ] `pnpm test` dashboard pass; `tsc --noEmit` không lỗi mới ở file đụng.
- [ ] Manual app target range `last7`:
   - Firebase table: 7 row install_date, cột 1D-7D, hàng Total weighted.
   - Adjust table: cột 3D/7D/14D/...; 3D có giá trị cho install_date đủ tuổi.
- [ ] D7/D14 Adjust vẫn "—"/0 — chờ ticket data (§7.6.8), không phải bug.
- [ ] Cache key `:retention` + endpoint path không đổi.

#### 7.7.8 Prompt template
```
Implement Slice 7.7 (Retention Cohort Tables redesign) của PO Dashboard.

Prerequisite: Slice 4 + Slice 7.5 merged. Supersede line chart của Slice 7.4/7.6
(giữ dedup latest event_date của 7.4 + column/unit fix của 7.5, bỏ window -7).

Đọc trước:
- docs/po-dashboard-metric/05_Slicing_Plan.md §SLICE 7.7 (chính)
- backend/MediationPro.Core/Services/Dashboard/AppDashboardService.cs (BuildRetentionAsync)
- backend/MediationPro.Infrastructure/Dashboard/FirebaseDashboardProvider.cs + AdjustDashboardProvider.cs

Scope:
1. DTO: thay retention point DTOs bằng DashboardCohortDto + DashboardCohortRowDto (§7.7.3).
2. Provider: thay GetRetentionAsync bằng GetCohortRetentionAsync (§7.7.4). Firebase maxDay=7;
   Adjust days {3,7,14,21,30,45,60,90,120}. Records FirebaseCohortRow/AdjustCohortRow
   (InstallDate, Users, IReadOnlyDictionary<int,decimal?> RetentionByDay).
3. Service BuildRetentionAsync: visible range, BuildCohort + WeightedRetention (Total weighted theo Users).
4. FE: types CohortSource/CohortRow; cohort-table.tsx (heatmap); retention-chart.tsx render 2 table.
5. Tests: rewrite stub + 4 service test + controller retention assert + FE trend-charts retention factory/tests.

KHÔNG:
- KHÔNG đổi cache key / endpoint path.
- KHÔNG đụng crawler (D7/D14 = 0 là ticket data §7.6.8).
- KHÔNG đổi GetReportAsync (Adjust Report table — Slice 7.5 đã đúng).

Validation: §7.7.7. Lưu ý interpolated raw SQL string cần $$ nếu chứa literal '{}'.

Stop và hỏi nếu gold.retention_overview không có retention_day daily tới 7 (cột 6D/7D rỗng — confirm chấp nhận).
```

---

## Sau khi cả 6 slice merge — checklist final

- [ ] Slice 1-6 đều ✅ DoD riêng.
- [ ] Phase 1 DoD tổng ([`01 §12`](01_Phase1_Implementation_Plan.md)) pass đủ 9 mục.
- [ ] Reconcile 1 ngày với raw `bronze.adjust_report` để verify revenue card chính xác 100%.
- [ ] UAT với PO 1 buổi → ghi feedback vào doc mới (`docs/po-dashboard-metric/06_UAT_Feedback.md` nếu có).
- [ ] Tạo task riêng cho các "Out of scope" item ở [`01 §11`](01_Phase1_Implementation_Plan.md) (~~Qonversion~~ → đã chuyển sang Slice 7, Crashlytics, Export, Auto-refresh, `silver.adjust_daily`).

## Sau khi Slice 7.1 → 7.3 merge — checklist Qonversion

- [ ] Slice 7.1, 7.2, 7.3 đều ✅ DoD riêng.
- [ ] App target `ca-app-pub-9820030150756925~3641492417`: Revenue chart có data IAP/SUB; Top Country by IAP+SUB hiển thị danh sách quốc gia.
- [ ] Reconcile 1 ngày: tổng `series.total` của Revenue chart ≈ `silver.daily_app_revenue.total_revenue + gold.app_iap_daily.iap_net_revenue_usd` (sai số làm tròn ≤ $0.01).
- [ ] App không có Qon: warning `qonversion_not_configured` xuất hiện, không lỗi.
- [ ] `02_Data_Catalog.md` reflect đúng nguồn data hiện tại.

## Sau khi Slice 7.4 merge — checklist Firebase Retention Hotfix

- [ ] Slice 7.4 ✅ DoD riêng (§7.4.8).
- [ ] App target `ca-app-pub-9820030150756925~3641492417` range `last7`:
   - Firebase series chứa `install_date = today-7` (`2026-05-21` tại thời điểm verify).
   - D1 = 5.55, D7 = 0.47 cho install_date đó.
- [ ] D1 các ngày khác khớp giữa BE response và raw SQL `WHERE rn=1`.
- [ ] RetentionChart hiển thị caption D7 cohort age requirement.
- [ ] Unit test `GetRetentionAsync_QueriesFirebaseWithExtendedCohortWindow` pass.
- [ ] Cache key + DTO shape không đổi → không cần invalidate cache cũ ở môi trường khác.

## Sau khi Slice 7.5 merge — checklist Adjust Retention Wiring Fix

- [ ] Slice 7.5 ✅ DoD riêng (§7.5.7).
- [ ] App target `ca-app-pub-9820030150756925~3641492417` range `last7`:
   - `GET /retention` → `adjust.series` D3 có giá trị % (vd: install_date `2026-05-22` ≈ 13.33%), D1 = null toàn series.
   - `GET /adjust-report` → cột retention_d3, retention_d7 hiển thị số % thật.
- [ ] Retention chart vẽ được line Adjust D3 + D7 (không phải toàn null line).
- [ ] Adjust Report table cột Retention không còn toàn `—`.
- [ ] Unit test cover D1 = null + D3/D7 có giá trị (decimal đã convert sang percentage).
- [ ] Cache key + DTO shape không đổi.
- [ ] Ticket riêng đã raise cho team data: "Thêm `1` vào `AdjustParquetMetricGroups.UACohortDays` + backfill historic data" — link vào doc nếu có.

## Sau khi Slice 7.6 merge — checklist Adjust Cohort Window Extension

- [ ] Slice 7.6 ✅ DoD riêng (§7.6.6).
- [ ] App target `ca-app-pub-9820030150756925~3641492417` range `last7`:
   - `GET /retention` → `adjust.series` chứa install_date 5/22, 5/23, 5/24 với D3 > 0 (≈ 4.04/3.03/0.97%).
- [ ] Test `GetRetentionAsync_QueriesBothSourcesWithExtendedCohortWindow` pass (cả Firebase + Adjust dùng start-7).
- [ ] D7 vẫn null/0 — đã document là chờ ticket data, không coi là fail.
- [ ] Ticket riêng đã raise cho team data: "Adjust crawler re-crawl matured cohort" (§7.6.8).
- [ ] Cache key + DTO shape + visible dateRange không đổi.

> **Lưu ý**: Slice 7.7 thay line chart bằng cohort table → logic mở rộng window `-7` của 7.4/7.6 không còn dùng (table dùng visible range). Dedup latest event_date (7.4) + Adjust column/unit fix (7.5) được port vào SQL cohort. Test `GetRetentionAsync_QueriesBothSourcesWithExtendedCohortWindow` được thay bằng `GetRetentionAsync_QueriesFirebaseWithVisibleRangeAndMaxDay`.

## Sau khi Slice 7.7 merge — checklist Retention Cohort Tables

- [ ] Slice 7.7 ✅ DoD riêng (§7.7.7).
- [ ] Retention block hiển thị 2 bảng cohort riêng: Firebase (1D-7D) + Adjust (3D/7D/14D/...).
- [ ] App target range `last7`: Firebase table 7 row install_date + heatmap + hàng Total weighted.
- [ ] Adjust table cột 3D có giá trị cho install_date đủ tuổi; cột daily (1D/2D/...) không tồn tại (đúng — Adjust thiếu).
- [ ] `dotnet test` 32+ pass; FE dashboard tests pass.
- [ ] DTO/endpoint/cache key reshape có chủ đích — FE đã đồng bộ (RetentionResponse mới).

---

## Phụ lục — Worktree parallel pattern (tùy chọn)

Khi đã merge Slice 1, có thể parallel Slice 2-5 (Slice 6 chạy cuối):

```
Spawn Agent A: Slice 2 (Summary)         → worktree A
Spawn Agent B: Slice 3 (User/Engagement) → worktree B
Spawn Agent C: Slice 4 (Revenue/Retent.) → worktree C
Spawn Agent D: Slice 5 (Top Country)     → worktree D
```

Mỗi agent dùng prompt template trong slice tương ứng. Sau khi tất cả xong, merge tuần tự (theo thứ tự 2 → 3 → 4 → 5) để giải conflict ở `app-dashboard-tab.tsx` (mỗi slice thêm 1 block UI), `AppDashboardController.cs` (mỗi slice thêm endpoint), `AppDashboardService.cs` (mỗi slice thêm method).

**Conflict expected**: chủ yếu ở 3 file shared trên — đều là "append" nên dễ resolve manual.

Sau khi merge → spawn Slice 6 trên main.
