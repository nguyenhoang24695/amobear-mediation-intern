# PO Dashboard — Implementation Guide (Phase 1)

> Companion: [`01_Phase1_Implementation_Plan.md`](01_Phase1_Implementation_Plan.md) · [`02_Data_Catalog.md`](02_Data_Catalog.md) · [`03_API_Contract.md`](03_API_Contract.md)
> Revenue/ROAS/Adjust Retention lấy hoàn toàn từ Adjust → **không cần fix** `gold.daily_overview`.

---

## 1. Order of work

```
Step 1 — Pre-task (verify data + permission catalog)
   1.1 DA verify Adjust có ad_revenue / revenue / cohort metrics cho các app target
   1.2 Permission catalog migration

Step 2 — Backend
   2.1 DTOs + types (Core)
   2.2 Providers (Infrastructure)
   2.3 Service (Core)
   2.4 Controller + caching + permission attr (Api)
   2.5 Unit + integration tests

Step 3 — Frontend
   3.1 Types + API client
   3.2 Tab skeleton + filter bar + integration vào app-detail-content
   3.3 Metric cards
   3.4 Charts (User trend → Engagement → Revenue → Retention)
   3.5 Top country tables (1 generic component, dùng 4 lần)
   3.6 Adjust report block
   3.7 Empty/error states + format utils
   3.8 Component tests

Step 4 — QA
   4.1 Manual test 2+ app khác timezone, có/không Adjust
   4.2 Performance check (p95 < 1.5s cold)
   4.3 Permission test
```

---

## 2. File checklist

### Backend
```
backend/MediationPro.Core/DTOs/Dashboard/AppDashboard/
  DashboardSummaryDto.cs
  DashboardSeriesDto.cs
  DashboardRetentionDto.cs
  DashboardTopCountryDto.cs
  DashboardAdjustReportDto.cs
  DashboardMetaDto.cs
  DashboardDateRangeDto.cs
  DashboardRange.cs

backend/MediationPro.Core/Interfaces/Dashboard/
  IAppDashboardService.cs
  IFirebaseDashboardProvider.cs
  IAdjustDashboardProvider.cs
  IAppDashboardMetaProvider.cs

backend/MediationPro.Core/Services/Dashboard/
  AppDashboardService.cs
  AppDashboardRangeResolver.cs

backend/MediationPro.Infrastructure/Dashboard/
  FirebaseDashboardProvider.cs
  AdjustDashboardProvider.cs
  AppDashboardMetaProvider.cs

backend/MediationPro.Api/Controllers/
  AppDashboardController.cs

backend/MediationPro.Infrastructure/Migrations/
  20260528000000_RegisterDashboardTabPermission.cs
```

> Bỏ `AdMobRevenueDashboardProvider` và `FixGoldDailyOverviewRevenue` migration so với draft trước.

### Frontend
```
frontend/types/app-dashboard.ts
frontend/lib/api/services/appDashboard.ts

frontend/components/apps/app-detail/
  app-dashboard-tab.tsx
  dashboard/
    dashboard-filter-bar.tsx
    metric-cards.tsx
    format.ts
    types.ts
    empty-states.tsx
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
```

---

## 3. Pre-task 1.1 — DA verify Adjust data

Chạy sample query trên StarRocks (dev environment):

```sql
-- 1. App nào có Adjust mapping
SELECT admob_app_id, adjust_id
FROM silver.dim_app_identifiers
WHERE adjust_id <> ''
LIMIT 10;

-- 2. Trong 7 ngày gần nhất, app có data revenue/cohort không?
SELECT
  d.admob_app_id,
  COUNT(*)                                                                      AS rows,
  SUM(get_json_double(ar.conversion_metrics_json, '$.installs'))                AS installs,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.ad_revenue'))              AS ad_revenue,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.revenue'))                 AS iap_revenue,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.all_revenue'))             AS all_revenue,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.retention_rate_d1'))       AS ret_d1,
  AVG(get_json_double(ar.cohort_metrics_json,     '$.roas_d7'))                 AS roas_d7
FROM bronze.adjust_report ar
JOIN silver.dim_app_identifiers d ON d.adjust_id = ar.app_token
WHERE ar.`date` >= CURRENT_DATE() - INTERVAL 7 DAY
GROUP BY d.admob_app_id
ORDER BY all_revenue DESC;
```

Nếu app nào `ad_revenue IS NULL` hoặc `= 0` toàn bộ → flag với PO. Phase 1 sẽ hiển thị warning `adjust_ad_revenue_missing` cho app đó.

---

## 4. Backend code — chi tiết

### 4.1 Enum `DashboardRange`

```csharp
namespace MediationPro.Core.DTOs.Dashboard.AppDashboard;

public enum DashboardRange { Today, Yesterday, Last7 }

public static class DashboardRangeParser
{
    public static DashboardRange Parse(string? raw) => raw?.ToLowerInvariant() switch
    {
        "today"     => DashboardRange.Today,
        "yesterday" => DashboardRange.Yesterday,
        "last7"     => DashboardRange.Last7,
        _ => throw new ArgumentException("invalid_range")
    };
}
```

### 4.2 `AppDashboardRangeResolver`

```csharp
public sealed class AppDashboardRangeResolver
{
    public DashboardDateRangeDto Resolve(DashboardRange range, int tzOffsetHours)
    {
        var nowAcc = DateTime.UtcNow.AddHours(tzOffsetHours);
        var todayAcc = DateOnly.FromDateTime(nowAcc);
        var (start, end) = range switch
        {
            DashboardRange.Today     => (todayAcc, todayAcc),
            DashboardRange.Yesterday => (todayAcc.AddDays(-1), todayAcc.AddDays(-1)),
            DashboardRange.Last7     => (todayAcc.AddDays(-6), todayAcc),
            _ => throw new InvalidOperationException()
        };
        return new DashboardDateRangeDto
        {
            Range = range.ToString().ToLowerInvariant(),
            StartDateAccountTz = start.ToString("yyyy-MM-dd"),
            EndDateAccountTz   = end.ToString("yyyy-MM-dd"),
            TzOffsetHours      = tzOffsetHours,
            DisplayTzOffsetHours = 7
        };
    }
}
```

### 4.3 `IAppDashboardMetaProvider`

```csharp
public interface IAppDashboardMetaProvider
{
    Task<AppDashboardMeta?> ResolveAsync(string appId, CancellationToken ct);
}

public sealed record AppDashboardMeta(
    string AppId,
    string AccountId,
    string AccountDisplayName,
    bool IsDefaultAccount,
    int TimezoneOffsetHours);
```

Implementation (PostgreSQL via EF Core hoặc Dapper):
```csharp
const string sql = @"
SELECT acc.account_id, acc.display_name, acc.is_default, acc.timezone_offset_hours
FROM apps a
JOIN admob_accounts acc ON acc.account_id = a.publisher_id
WHERE a.app_id = @AppId AND acc.enabled = TRUE
ORDER BY acc.is_default DESC, acc.id ASC
LIMIT 1";
```

### 4.4 `IFirebaseDashboardProvider`

```csharp
public interface IFirebaseDashboardProvider
{
    Task<bool>                                          ProbeAppRegistryAsync(string appId, CancellationToken ct);
    Task<FirebaseSummaryRow?>                           GetSummaryAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<FirebaseDailyUsersRow>>          GetDailyUsersAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<FirebaseDailyEngagementRow>>     GetDailyEngagementAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<FirebaseDailyDauRow>>            GetDailyDauAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);   // dùng cho ARPU JOIN
    Task<IReadOnlyList<FirebaseRetentionRow>>           GetRetentionAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<FirebaseCountryRow>>             GetCountryAsync(string appId, DateOnly start, DateOnly end, CancellationToken ct);
}
```

`ProbeAppRegistryAsync` dùng probe nhẹ trên Firebase silver summary, không phụ thuộc `meta.app_registry`:
```sql
SELECT 1
FROM silver.engagement
WHERE app_id = @AppId
LIMIT 1
```

`meta.app_registry` chỉ dùng khi cần route Firebase raw bronze table, không phải dependency bắt buộc của summary endpoint.

`GetSummaryAsync`:
```sql
SELECT
  SUM(dau)                  AS total_users,
  SUM(new_users)            AS new_users,
  SUM(dau) - SUM(new_users) AS returning_users,
  SUM(total_engagement_msec)/ NULLIF(SUM(dau), 0) / 60000.0 AS avg_eng_min,
  SUM(sessions) * 1.0     / NULLIF(SUM(dau), 0)            AS eng_sessions_per_user,
  SUM(paying_users)         AS paying_users
FROM silver.engagement
WHERE app_id = @AppId AND event_date BETWEEN @Start AND @End
```

Connection: `MySqlConnector` (StarRocks tương thích MySQL protocol). Tham khảo [`FirebaseSilverGoldAggregator.ExecuteDeleteThenInsertAsync`](../../backend/MediationPro.Infrastructure/StarRocks/FirebaseSilverGoldAggregator.cs:584).

### 4.5 `IAdjustDashboardProvider`

```csharp
public interface IAdjustDashboardProvider
{
    Task<string?>                                  GetAdjustIdAsync(string appId, CancellationToken ct);
    Task<AdjustSummaryRow?>                        GetSummaryAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<AdjustDailyInstallsRow>>    GetDailyInstallsAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<AdjustDailyRevenueRow>>     GetDailyRevenueAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<AdjustRetentionRow>>        GetRetentionAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<AdjustCountryRevenueRow>>   GetCountryRevenueAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
    Task<IReadOnlyList<AdjustReportRow>>           GetReportAsync(string adjustId, DateOnly start, DateOnly end, CancellationToken ct);
}

public sealed record AdjustSummaryRow(
    long? Installs,
    decimal? IaaRevenue,
    decimal? IapRevenue,
    decimal? AllRevenue);

public sealed record AdjustDailyRevenueRow(DateOnly Date, decimal? Iaa, decimal? Iap, decimal? Total);
```

`GetSummaryAsync`:
```sql
SELECT
  SUM(get_json_double(ar.conversion_metrics_json, '$.installs'))    AS installs,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.ad_revenue'))  AS iaa,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.revenue'))     AS iap,
  SUM(get_json_double(ar.revenue_metrics_json,    '$.all_revenue')) AS total
FROM bronze.adjust_report ar
WHERE ar.app_token = @AdjustId AND ar.`date` BETWEEN @Start AND @End
```

`GetDailyRevenueAsync`:
```sql
SELECT ar.`date`,
       SUM(get_json_double(ar.revenue_metrics_json, '$.ad_revenue'))  AS iaa,
       SUM(get_json_double(ar.revenue_metrics_json, '$.revenue'))     AS iap,
       SUM(get_json_double(ar.revenue_metrics_json, '$.all_revenue')) AS total
FROM bronze.adjust_report ar
WHERE ar.app_token = @AdjustId AND ar.`date` BETWEEN @Start AND @End
GROUP BY ar.`date`
ORDER BY ar.`date`
```

`GetReportAsync`:
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
WHERE ar.app_token = @AdjustId AND ar.`date` BETWEEN @Start AND @End
GROUP BY ar.network, ar.campaign
HAVING SUM(get_json_double(ar.conversion_metrics_json, '$.installs')) > 0
ORDER BY installs DESC
LIMIT 200
```

### 4.6 `AppDashboardService`

```csharp
public async Task<DashboardSummaryDto> GetSummaryAsync(string appId, DashboardRange range, CancellationToken ct)
{
    var meta = await _meta.ResolveAsync(appId, ct)
               ?? throw new DashboardException("admob_account_not_found");
    var dr = _rangeResolver.Resolve(range, meta.TimezoneOffsetHours);
    var start = DateOnly.Parse(dr.StartDateAccountTz);
    var end   = DateOnly.Parse(dr.EndDateAccountTz);

    var warnings = new List<string>();

    var hasFb = await _firebase.ProbeAppRegistryAsync(appId, ct);
    if (!hasFb) warnings.Add("firebase_not_configured");

    var adjustId = await _adjust.GetAdjustIdAsync(appId, ct);
    var hasAdjust = !string.IsNullOrEmpty(adjustId);
    if (!hasAdjust) warnings.Add("adjust_not_configured");

    var fb     = hasFb     ? await _firebase.GetSummaryAsync(appId, start, end, ct) : null;
    var adjust = hasAdjust ? await _adjust.GetSummaryAsync(adjustId!, start, end, ct) : null;

    if (hasAdjust && (adjust?.IaaRevenue is null || adjust.IaaRevenue == 0))
        warnings.Add("adjust_ad_revenue_missing");

    decimal? installToOpenRate = (adjust?.Installs > 0 && fb?.NewUsers is not null)
        ? Math.Round((decimal)fb.NewUsers.Value * 100 / adjust.Installs.Value, 2)
        : (decimal?)null;
    long? notOpened = (adjust?.Installs is not null && fb?.NewUsers is not null)
        ? Math.Max(0, adjust.Installs.Value - fb.NewUsers.Value)
        : (long?)null;

    return new DashboardSummaryDto
    {
        DateRange = dr,
        Meta = new DashboardMetaDto
        {
            AdmobAccount = new AdmobAccountDto(meta.AccountId, meta.AccountDisplayName, meta.IsDefaultAccount),
            Currency = "USD",
            Warnings = warnings
        },
        Metrics = new DashboardMetricsDto
        {
            Installs                  = adjust?.Installs,
            NewUsers                  = fb?.NewUsers,
            InstallToOpenRate         = installToOpenRate,
            UsersNotOpened            = notOpened,
            TotalUsers                = fb?.TotalUsers,
            ReturningUsers            = fb?.ReturningUsers,
            AvgEngagementTimeMinutes  = fb?.AvgEngagementMinutes,
            EngagedSessionsPerUser    = fb?.EngagedSessionsPerUser,
            TotalRevenueUsd           = adjust?.AllRevenue is not null
                                         ? Math.Round(adjust.AllRevenue.Value, 2)
                                         : (decimal?)null
        }
    };
}
```

> **KHÔNG** fallback Installs sang Firebase, **KHÔNG** fallback revenue sang AdMob report. Thiếu Adjust → trả `null` + warning.

Tương tự cho `GetUserTrendAsync`, `GetRevenueTrendAsync` (JOIN daily revenue Adjust với daily dau Firebase để tính ARPU), `GetTopCountriesAsync` (cross-source JOIN — xem [`02_Data_Catalog.md §3.6`](02_Data_Catalog.md)), `GetRetentionAsync`, `GetAdjustReportAsync`.

### 4.7 Controller

```csharp
[ApiController]
[Authorize]
[Route("api/apps/{appId}/dashboard")]
public sealed class AppDashboardController : ControllerBase
{
    private readonly IAppDashboardService _service;
    private readonly IPermissionService _perm;

    public AppDashboardController(IAppDashboardService service, IPermissionService perm)
    { _service = service; _perm = perm; }

    private void EnsurePermission()
    {
        if (!_perm.HasScreenFunction("s-apps", "view-details:dashboard"))
            throw new ForbiddenException("forbidden_no_permission");
    }

    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> Summary(
        string appId, [FromQuery] string range, CancellationToken ct)
    {
        EnsurePermission();
        return await _service.GetSummaryAsync(appId, DashboardRangeParser.Parse(range), ct);
    }

    // /user-trend, /engagement-trend, /revenue-trend, /retention,
    // /top-countries (?metric=...), /adjust-report — tương tự.
}
```

DI trong [`Program.cs`](../../backend/MediationPro.Api/Program.cs):
```csharp
services.AddScoped<IAppDashboardMetaProvider, AppDashboardMetaProvider>();
services.AddScoped<IFirebaseDashboardProvider, FirebaseDashboardProvider>();
services.AddScoped<IAdjustDashboardProvider, AdjustDashboardProvider>();
services.AddScoped<AppDashboardRangeResolver>();
services.AddScoped<IAppDashboardService, AppDashboardService>();
```

### 4.8 Caching

```csharp
var cacheKey = $"app-dashboard:{appId}:{range}:summary";
var cached = await _cache.GetStringAsync(cacheKey, ct);
if (cached != null) return JsonSerializer.Deserialize<DashboardSummaryDto>(cached)!;

var result = await BuildSummaryAsync(...);
var ttl = range == DashboardRange.Today ? TimeSpan.FromMinutes(5) : TimeSpan.FromMinutes(30);
await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result),
    new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl }, ct);
return result;
```

### 4.9 Permission / role handling

File: `20260528000000_RegisterDashboardTabPermission.cs`.

Mục tiêu của migration này chỉ là đăng ký permission key mới cho tab Dashboard:

```text
s-apps:view-details:dashboard
```

Không tự động insert quyền này vào `role_permissions` cho bất kỳ role nào (`Admin`, `Owner`, `PO`, ...). Việc gán quyền cho role sẽ được xử lý thủ công trong màn Permission Management sau khi deploy.

Quy tắc runtime:

- `super_admin` được xem tab Dashboard mà không cần gán permission thủ công.
- Các role còn lại chỉ xem được tab khi role có permission `s-apps:view-details:dashboard`.
- Backend vẫn phải check permission cho mọi endpoint dashboard; frontend ẩn tab chỉ là UX, không thay thế kiểm tra backend.
- Nếu role chưa được gán permission, tab Dashboard phải bị ẩn và API phải trả forbidden khi gọi trực tiếp.

---

## 5. Frontend code — chi tiết

### 5.1 Types

`frontend/types/app-dashboard.ts`:
```ts
export type DashboardRange = "today" | "yesterday" | "last7";

export interface DashboardDateRange {
  range: DashboardRange;
  start_date_account_tz: string;
  end_date_account_tz: string;
  tz_offset_hours: number;
  display_tz_offset_hours: number;
}

export type DashboardWarning =
  | "adjust_not_configured"
  | "firebase_not_configured"
  | "adjust_ad_revenue_missing";

export interface DashboardMeta {
  admob_account: { account_id: string; display_name: string; is_default: boolean };
  currency: "USD";
  warnings: DashboardWarning[];
}

export interface DashboardSummary {
  date_range: DashboardDateRange;
  meta: DashboardMeta;
  metrics: {
    installs: number | null;
    new_users: number | null;
    install_to_open_rate: number | null;
    users_not_opened: number | null;
    total_users: number | null;
    returning_users: number | null;
    avg_engagement_time_minutes: number | null;
    engaged_sessions_per_user: number | null;
    total_revenue_usd: number | null;
  };
}

export interface DailyPoint { date: string; value: number | null; }
export interface SeriesResponse<TKey extends string> {
  date_range: DashboardDateRange;
  series: Record<TKey, DailyPoint[]>;
  phase2_notice?: string[];
}

export type UserTrendSeries       = SeriesResponse<"installs" | "new_users" | "total_users" | "returning_users">;
export type EngagementTrendSeries = SeriesResponse<"avg_engagement_time_minutes" | "engaged_sessions_per_user">;
export type RevenueTrendSeries    = SeriesResponse<"total" | "iaa" | "iap" | "sub" | "arpu">;

export interface RetentionResponse {
  date_range: DashboardDateRange;
  firebase: { available: boolean; series: Array<{ install_date: string; d1: number | null; d7: number | null }> };
  adjust:   { available: boolean; series: Array<{ install_date: string; d1: number | null; d3: number | null; d7: number | null }> };
}

export interface TopCountryRow {
  country_code: string;
  country_name: string;
  primary_value: number | null;
  arpu_country_usd: number | null;
  conversion_rate_percent: number | null;
}
export interface TopCountriesResponse {
  date_range: DashboardDateRange;
  metric: "iaa" | "iap_sub" | "new_users" | "total_users";
  rows: TopCountryRow[];
}

export interface AdjustReportRow {
  channel: string; source: string;
  installs: number | null; ad_spend_usd: number | null; cpi_usd: number | null;
  roas_d0: number | null; roas_d1: number | null; roas_d3: number | null; roas_d7: number | null;
  retention_d1: number | null; retention_d3: number | null; retention_d7: number | null;
}
export interface AdjustReportResponse {
  date_range: DashboardDateRange;
  available: boolean;
  rows: AdjustReportRow[];
}
```

### 5.2 API client

`frontend/lib/api/services/appDashboard.ts`:
```ts
import { apiClient } from "@/lib/api/client";
import type {
  DashboardRange, DashboardSummary, UserTrendSeries, EngagementTrendSeries,
  RevenueTrendSeries, RetentionResponse, TopCountriesResponse, AdjustReportResponse,
} from "@/types/app-dashboard";

export const appDashboardApi = {
  summary:           (appId: string, range: DashboardRange) =>
    apiClient.get<DashboardSummary>(`/api/apps/${appId}/dashboard/summary`, { params: { range } }),
  userTrend:         (appId: string, range: DashboardRange) =>
    apiClient.get<UserTrendSeries>(`/api/apps/${appId}/dashboard/user-trend`, { params: { range } }),
  engagementTrend:   (appId: string, range: DashboardRange) =>
    apiClient.get<EngagementTrendSeries>(`/api/apps/${appId}/dashboard/engagement-trend`, { params: { range } }),
  revenueTrend:      (appId: string, range: DashboardRange) =>
    apiClient.get<RevenueTrendSeries>(`/api/apps/${appId}/dashboard/revenue-trend`, { params: { range } }),
  retention:         (appId: string, range: DashboardRange) =>
    apiClient.get<RetentionResponse>(`/api/apps/${appId}/dashboard/retention`, { params: { range } }),
  topCountries:      (appId: string, range: DashboardRange,
                      metric: "iaa" | "iap_sub" | "new_users" | "total_users") =>
    apiClient.get<TopCountriesResponse>(`/api/apps/${appId}/dashboard/top-countries`, { params: { range, metric } }),
  adjustReport:      (appId: string, range: DashboardRange) =>
    apiClient.get<AdjustReportResponse>(`/api/apps/${appId}/dashboard/adjust-report`, { params: { range } }),
};
```

### 5.3 Tab integration

Trong [`app-detail-content.tsx`](../../frontend/components/apps/app-detail-content.tsx):

```tsx
import { AppDashboardTab } from "./app-detail/app-dashboard-tab"

const canViewDashboard = hasAppDetailTab("dashboard")

const allowedTabs = [
  canViewOverview && "overview",
  canViewDashboard && "dashboard",
  // ... existing tabs giữ nguyên
]

{canViewDashboard ? (
  <TabsTrigger value="dashboard" className="shrink-0 flex-none px-4 data-[state=active]:bg-white">
    Dashboard
  </TabsTrigger>
) : null}

{canViewDashboard && app?.appId ? (
  <TabsContent value="dashboard" className="mt-6">
    <AppDashboardTab appId={app.appId} />
  </TabsContent>
) : null}
```

### 5.4 Tab entry

```tsx
"use client"
import { DashboardFilterBar } from "./dashboard/dashboard-filter-bar"
import { MetricCards }       from "./dashboard/metric-cards"
import { UserTrendChart }    from "./dashboard/charts/user-trend-chart"
import { EngagementTrendChart } from "./dashboard/charts/engagement-trend-chart"
import { RevenueChart }      from "./dashboard/charts/revenue-chart"
import { RetentionChart }    from "./dashboard/charts/retention-chart"
import { TopCountryTable }   from "./dashboard/tables/top-country-table"
import { AdjustReportTable } from "./dashboard/tables/adjust-report-table"
import { useDashboardRange } from "./dashboard/hooks/use-dashboard-range"

export function AppDashboardTab({ appId }: { appId: string }) {
  const { range, setRange } = useDashboardRange()

  return (
    <div className="flex flex-col gap-6">
      <DashboardFilterBar appId={appId} range={range} onRangeChange={setRange} />
      <MetricCards appId={appId} range={range} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserTrendChart       appId={appId} range={range} />
        <EngagementTrendChart appId={appId} range={range} />
        <RevenueChart         appId={appId} range={range} />
        <RetentionChart       appId={appId} range={range} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCountryTable appId={appId} range={range} metric="iaa"          title="Top Country by IAA Revenue" />
        <TopCountryTable appId={appId} range={range} metric="iap_sub"      title="Top Country by IAP + SUB Revenue" />
        <TopCountryTable appId={appId} range={range} metric="new_users"    title="Top Country by New Users" />
        <TopCountryTable appId={appId} range={range} metric="total_users"  title="Top Country by Total Users" />
      </div>

      <AdjustReportTable appId={appId} range={range} />
    </div>
  )
}
```

### 5.5 Hooks

`use-dashboard-range.ts`:
```ts
import { useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import type { DashboardRange } from "@/types/app-dashboard"

const VALID: DashboardRange[] = ["today", "yesterday", "last7"]

export function useDashboardRange() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const raw = sp.get("range") as DashboardRange | null
  const range: DashboardRange = raw && VALID.includes(raw) ? raw : "last7"
  const setRange = useCallback((r: DashboardRange) => {
    const next = new URLSearchParams(sp.toString())
    next.set("range", r)
    router.push(`${pathname}?${next.toString()}`, { scroll: false })
  }, [sp, router, pathname])
  return { range, setRange }
}
```

### 5.6 Format utils

```ts
export function formatCount(n: number | null): string {
  if (n == null) return "—"
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 10_000)    return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString("en-US")
}
export function formatUsd(n: number | null): string {
  if (n == null) return "—"
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 })
}
export function formatPercent(n: number | null, digits = 2): string {
  if (n == null) return "—"
  return `${n.toFixed(digits)}%`
}
export function formatMinutes(min: number | null): string {
  if (min == null) return "—"
  if (min < 60) { const m = Math.floor(min); const s = Math.round((min - m) * 60); return `${m}m ${s}s` }
  const h = Math.floor(min / 60); const m = Math.round(min - h * 60); return `${h}h ${m}m`
}
```

### 5.7 Charts

Dùng `recharts` `ComposedChart` (pattern hiện có ở [`app-performance-tab.tsx`](../../frontend/components/apps/app-detail/app-performance-tab.tsx)).
Màu cố định:
- Installs: `#3b82f6` · New users: `#10b981` · Total users: `#8b5cf6` · Returning users: `#f59e0b`
- IAA: `#06b6d4` · IAP: `#ec4899` · SUB: `#94a3b8` (placeholder) · Total: `#3b82f6` · ARPU: dashed secondary axis
- Retention Firebase D1/D7: blue tones · Adjust D1/D3/D7: orange tones

### 5.8 Empty states

```tsx
export function AdjustNotConfigured() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Adjust account is not configured for this app — install, revenue, ROAS and Adjust retention are unavailable.
    </div>
  )
}
export function AdjustAdRevenueMissing() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      Adjust ad_revenue tracking is not enabled for this app — IAA revenue may be missing.
    </div>
  )
}
export function AdjustDelayed() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      Adjust syncs daily (T+1). Try <strong>Yesterday</strong> or <strong>Last 7 days</strong>.
    </div>
  )
}
export function FirebaseNotConfigured() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      Firebase data is not configured for this app.
    </div>
  )
}
export function NoData({ label }: { label: string }) {
  return <div className="text-sm text-slate-500 py-8 text-center">{label}</div>
}
```

---

## 6. Testing

### Backend
- `AppDashboardServiceTests` mock 3 provider:
  - Adjust missing → installs/revenue = null, warning `adjust_not_configured`.
  - Firebase missing → audience/engagement = null, warning `firebase_not_configured`.
  - Adjust có nhưng `ad_revenue = 0` → warning `adjust_ad_revenue_missing`.
  - Range = today → resolver gọi đúng start/end.
- `AdjustDashboardProviderTests` (integration optional): test JSON parsing với fixture.

### Frontend
- `metric-cards.test.tsx`: render với data đầy đủ + render với 1 vài field null (hiển thị `—`).
- `top-country-table.test.tsx`: format ARPU, conversion rate.
- `use-dashboard-range.test.ts`: URL invalid → default `last7`.

### Manual E2E
1. App có cả Firebase + Adjust → toàn bộ block render.
2. App chỉ có Firebase, không có Adjust → Installs + Revenue + Adjust block empty, audience/engagement OK.
3. App TZ GMT+8 — kiểm tra `Today` ở Việt Nam lúc 23h khớp expected.
4. `super_admin` xem được tab Dashboard không cần gán permission; role thường không có `s-apps:view-details:dashboard` → tab ẩn hoàn toàn và API trả forbidden nếu gọi trực tiếp.

---

## 7. Estimate (so với Option A trước, gọn hơn vì không cần fix `gold.daily_overview`)

| Hạng mục | FE | BE | Note |
|---|---|---|---|
| Pre-task 1.1 DA verify Adjust data | — | 0.5 ngày | |
| Permission catalog + manual role assignment note | — | 0.5 ngày | Không auto gán vào `role_permissions` |
| DTO + Service + 3 Provider + Controller | — | 3.5 ngày | Adjust provider phức tạp hơn (nhiều JSON path) |
| BE unit + integration test | — | 1.5 ngày | |
| FE skeleton + filter + integration | 1 ngày | — | |
| FE metric cards | 0.5 ngày | — | |
| FE 4 charts | 2 ngày | — | |
| FE 4 top country tables (1 component generic) | 1 ngày | — | |
| FE Adjust report block | 0.5 ngày | — | |
| FE empty states + format + polish | 0.5 ngày | — | |
| FE component test | 1 ngày | — | |
| QA manual + perf | 0.5 ngày | 0.5 ngày | |
| **Tổng** | **7 ngày** | **6.5 ngày** | Có thể song song |

→ Wall-clock ~ **1.5 tuần** với 1 BE + 1 FE chạy song song sau khi `03_API_Contract.md` được duyệt.
