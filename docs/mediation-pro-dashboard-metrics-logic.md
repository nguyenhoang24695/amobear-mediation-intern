# Mediation Pro - Dashboard Metrics Calculation Logic

## 1. Tổng quan kiến trúc dữ liệu

### 1.1 Data Flow

```
AdMob API → Sync Job (Hangfire) → PostgreSQL → Aggregation Job → Redis Cache → API → Frontend
```

### 1.2 Data Sources

| Source | Dữ liệu | Tần suất sync |
|--------|---------|---------------|
| AdMob Reporting API | Revenue, Impressions, eCPM, Fill Rate | Mỗi 15 phút |
| AdMob Mediation API | Apps, Ad Units, Mediation Groups | Mỗi 1 giờ |
| Internal System | Alerts, Activities, User actions | Real-time |

### 1.3 Time Range Definitions

```csharp
public enum DateRangeType
{
    Today,          // 00:00 hôm nay → now
    Yesterday,      // 00:00 hôm qua → 23:59:59 hôm qua
    Last3Days,      // 00:00 (today - 2) → now
    Last7Days,      // 00:00 (today - 6) → now
    Last14Days,     // 00:00 (today - 13) → now
    Last30Days,     // 00:00 (today - 29) → now
    ThisMonth,      // 00:00 ngày 1 tháng này → now
    LastMonth,      // 00:00 ngày 1 tháng trước → 23:59:59 ngày cuối tháng trước
    Custom          // User-defined start/end
}

public class DateRange
{
    public DateTime StartDate { get; set; }  // Inclusive, UTC
    public DateTime EndDate { get; set; }    // Inclusive, UTC
    public DateRangeType Type { get; set; }
    
    // Previous period for comparison
    public DateTime PreviousStartDate { get; set; }
    public DateTime PreviousEndDate { get; set; }
}
```

### 1.4 Comparison Period Logic

```csharp
public DateRange GetComparisonPeriod(DateRange current)
{
    var duration = current.EndDate - current.StartDate;
    
    return current.Type switch
    {
        DateRangeType.Today => new DateRange
        {
            // So sánh với hôm qua cùng thời điểm
            StartDate = current.StartDate.AddDays(-1),
            EndDate = current.EndDate.AddDays(-1)
        },
        DateRangeType.Yesterday => new DateRange
        {
            // So sánh với ngày trước đó
            StartDate = current.StartDate.AddDays(-1),
            EndDate = current.EndDate.AddDays(-1)
        },
        DateRangeType.Last7Days => new DateRange
        {
            // So sánh với 7 ngày trước đó
            StartDate = current.StartDate.AddDays(-7),
            EndDate = current.EndDate.AddDays(-7)
        },
        _ => new DateRange
        {
            // Mặc định: so sánh với khoảng thời gian tương đương trước đó
            StartDate = current.StartDate - duration - TimeSpan.FromDays(1),
            EndDate = current.StartDate.AddDays(-1)
        }
    };
}
```

---

## 2. Database Schema cho Metrics

### 2.1 Raw Data Tables

```sql
-- Dữ liệu thô từ AdMob, lưu theo ngày
CREATE TABLE daily_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    app_id UUID NOT NULL REFERENCES apps(id),
    ad_unit_id UUID REFERENCES ad_units(id),
    mediation_group_id UUID REFERENCES mediation_groups(id),
    ad_network VARCHAR(50),          -- 'admob', 'meta', 'unity', etc.
    ad_format VARCHAR(30),           -- 'banner', 'interstitial', 'rewarded', 'native', 'app_open'
    country_code VARCHAR(2),         -- 'US', 'VN', etc.
    date DATE NOT NULL,
    
    -- Raw metrics từ AdMob
    ad_requests BIGINT DEFAULT 0,
    matched_requests BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    estimated_revenue DECIMAL(18, 6) DEFAULT 0,  -- Lưu 6 decimal cho chính xác
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_daily_metrics UNIQUE (app_id, ad_unit_id, ad_network, country_code, date)
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
CREATE INDEX idx_daily_metrics_app ON daily_metrics(app_id, date);
CREATE INDEX idx_daily_metrics_org ON daily_metrics(organization_id, date);

-- Dữ liệu aggregated theo giờ (cho real-time dashboard)
CREATE TABLE hourly_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    app_id UUID NOT NULL,
    hour_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Truncated to hour
    
    ad_requests BIGINT DEFAULT 0,
    matched_requests BIGINT DEFAULT 0,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    estimated_revenue DECIMAL(18, 6) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_hourly_metrics UNIQUE (app_id, hour_timestamp)
);

CREATE INDEX idx_hourly_metrics_timestamp ON hourly_metrics(hour_timestamp);
```

### 2.2 Pre-aggregated Tables

```sql
-- Aggregated metrics theo App + Date (tính trước để query nhanh)
CREATE TABLE app_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    app_id UUID NOT NULL REFERENCES apps(id),
    date DATE NOT NULL,
    
    total_ad_requests BIGINT DEFAULT 0,
    total_matched_requests BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_revenue DECIMAL(18, 6) DEFAULT 0,
    
    -- Pre-calculated metrics
    fill_rate DECIMAL(5, 2),          -- Percentage: 0.00 - 100.00
    ecpm DECIMAL(10, 4),              -- eCPM in USD
    ctr DECIMAL(5, 4),                -- Click-through rate
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_app_daily_summary UNIQUE (app_id, date)
);

-- Aggregated metrics theo Organization + Date
CREATE TABLE org_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    date DATE NOT NULL,
    
    total_apps INT DEFAULT 0,
    total_ad_units INT DEFAULT 0,
    total_ad_requests BIGINT DEFAULT 0,
    total_matched_requests BIGINT DEFAULT 0,
    total_impressions BIGINT DEFAULT 0,
    total_clicks BIGINT DEFAULT 0,
    total_revenue DECIMAL(18, 6) DEFAULT 0,
    
    fill_rate DECIMAL(5, 2),
    average_ecpm DECIMAL(10, 4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uq_org_daily_summary UNIQUE (organization_id, date)
);

-- Aggregated metrics theo Ad Network + Date
CREATE TABLE network_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    ad_network VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    
    total_impressions BIGINT DEFAULT 0,
    total_revenue DECIMAL(18, 6) DEFAULT 0,
    ecpm DECIMAL(10, 4),
    fill_rate DECIMAL(5, 2),
    
    CONSTRAINT uq_network_daily_summary UNIQUE (organization_id, ad_network, date)
);
```

---

## 3. Công thức tính toán Metrics

### 3.1 Base Metrics Formulas

```csharp
public class MetricsCalculator
{
    /// <summary>
    /// Fill Rate = (Matched Requests / Ad Requests) × 100
    /// Ý nghĩa: Tỷ lệ request được fill bởi ad network
    /// </summary>
    public decimal CalculateFillRate(long adRequests, long matchedRequests)
    {
        if (adRequests == 0) return 0;
        return Math.Round((decimal)matchedRequests / adRequests * 100, 2);
    }
    
    /// <summary>
    /// eCPM = (Revenue / Impressions) × 1000
    /// Ý nghĩa: Effective Cost Per Mille - doanh thu trên 1000 impressions
    /// </summary>
    public decimal CalculateEcpm(decimal revenue, long impressions)
    {
        if (impressions == 0) return 0;
        return Math.Round(revenue / impressions * 1000, 4);
    }
    
    /// <summary>
    /// CTR = (Clicks / Impressions) × 100
    /// Ý nghĩa: Click-through Rate
    /// </summary>
    public decimal CalculateCtr(long clicks, long impressions)
    {
        if (impressions == 0) return 0;
        return Math.Round((decimal)clicks / impressions * 100, 4);
    }
    
    /// <summary>
    /// Percentage Change = ((Current - Previous) / Previous) × 100
    /// </summary>
    public decimal CalculatePercentageChange(decimal current, decimal previous)
    {
        if (previous == 0)
        {
            if (current == 0) return 0;
            return 100; // 100% increase from 0
        }
        return Math.Round((current - previous) / previous * 100, 2);
    }
    
    /// <summary>
    /// Average eCPM across multiple apps/units
    /// Weighted by impressions, not simple average
    /// </summary>
    public decimal CalculateWeightedAverageEcpm(IEnumerable<(decimal revenue, long impressions)> data)
    {
        var totalRevenue = data.Sum(d => d.revenue);
        var totalImpressions = data.Sum(d => d.impressions);
        
        if (totalImpressions == 0) return 0;
        return Math.Round(totalRevenue / totalImpressions * 1000, 4);
    }
}
```

### 3.2 Dashboard Key Metrics

```csharp
public class DashboardKeyMetrics
{
    // Metric values
    public decimal Revenue { get; set; }
    public decimal AverageEcpm { get; set; }
    public long Impressions { get; set; }
    public decimal FillRate { get; set; }
    
    // Comparison với previous period
    public decimal RevenueChange { get; set; }      // Percentage
    public decimal EcpmChange { get; set; }
    public decimal ImpressionsChange { get; set; }
    public decimal FillRateChange { get; set; }     // Percentage points, not %
    
    // Sparkline data (7 ngày gần nhất)
    public List<decimal> RevenueSparkline { get; set; }
    public List<decimal> EcpmSparkline { get; set; }
    public List<long> ImpressionsSparkline { get; set; }
    public List<decimal> FillRateSparkline { get; set; }
}

public class DashboardMetricsService
{
    /// <summary>
    /// Lấy key metrics cho dashboard header
    /// </summary>
    public async Task<DashboardKeyMetrics> GetKeyMetricsAsync(
        Guid organizationId, 
        DateRange dateRange)
    {
        // 1. Lấy metrics cho current period
        var currentMetrics = await GetAggregatedMetricsAsync(organizationId, dateRange);
        
        // 2. Lấy metrics cho previous period (để so sánh)
        var previousRange = GetComparisonPeriod(dateRange);
        var previousMetrics = await GetAggregatedMetricsAsync(organizationId, previousRange);
        
        // 3. Lấy daily data cho 7 ngày gần nhất (cho sparkline)
        var last7Days = await GetDailyMetricsAsync(organizationId, 
            DateTime.UtcNow.Date.AddDays(-6), DateTime.UtcNow.Date);
        
        return new DashboardKeyMetrics
        {
            // Current values
            Revenue = currentMetrics.TotalRevenue,
            AverageEcpm = CalculateWeightedAverageEcpm(currentMetrics),
            Impressions = currentMetrics.TotalImpressions,
            FillRate = CalculateFillRate(currentMetrics.TotalAdRequests, currentMetrics.TotalMatchedRequests),
            
            // Changes (so với previous period)
            RevenueChange = CalculatePercentageChange(
                currentMetrics.TotalRevenue, previousMetrics.TotalRevenue),
            EcpmChange = CalculatePercentageChange(
                CalculateWeightedAverageEcpm(currentMetrics), 
                CalculateWeightedAverageEcpm(previousMetrics)),
            ImpressionsChange = CalculatePercentageChange(
                currentMetrics.TotalImpressions, previousMetrics.TotalImpressions),
            // Fill rate change là percentage points, không phải percentage
            FillRateChange = currentMetrics.FillRate - previousMetrics.FillRate,
            
            // Sparklines
            RevenueSparkline = last7Days.Select(d => d.TotalRevenue).ToList(),
            EcpmSparkline = last7Days.Select(d => d.Ecpm).ToList(),
            ImpressionsSparkline = last7Days.Select(d => d.TotalImpressions).ToList(),
            FillRateSparkline = last7Days.Select(d => d.FillRate).ToList()
        };
    }
}
```

---

## 4. Dashboard API Endpoints

### 4.1 API Structure

```csharp
[ApiController]
[Route("api/v1/dashboard")]
public class DashboardController : ControllerBase
{
    /// <summary>
    /// GET /api/v1/dashboard/key-metrics
    /// Lấy 4 metrics chính ở header dashboard
    /// </summary>
    [HttpGet("key-metrics")]
    public async Task<DashboardKeyMetricsResponse> GetKeyMetrics(
        [FromQuery] DateRangeType range = DateRangeType.Today,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var dateRange = BuildDateRange(range, startDate, endDate);
        return await _dashboardService.GetKeyMetricsAsync(_currentUser.OrganizationId, dateRange);
    }
    
    /// <summary>
    /// GET /api/v1/dashboard/revenue-overview
    /// Lấy data cho Revenue Overview chart
    /// </summary>
    [HttpGet("revenue-overview")]
    public async Task<RevenueOverviewResponse> GetRevenueOverview(
        [FromQuery] DateRangeType range = DateRangeType.Last7Days,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string metric = "revenue") // revenue, ecpm, impressions
    {
        var dateRange = BuildDateRange(range, startDate, endDate);
        return await _dashboardService.GetRevenueOverviewAsync(
            _currentUser.OrganizationId, dateRange, metric);
    }
    
    /// <summary>
    /// GET /api/v1/dashboard/top-apps
    /// Lấy top apps by revenue
    /// </summary>
    [HttpGet("top-apps")]
    public async Task<TopAppsResponse> GetTopApps(
        [FromQuery] DateRangeType range = DateRangeType.Last7Days,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 5)
    {
        var dateRange = BuildDateRange(range, startDate, endDate);
        return await _dashboardService.GetTopAppsAsync(
            _currentUser.OrganizationId, dateRange, limit);
    }
    
    /// <summary>
    /// GET /api/v1/dashboard/revenue-by-network
    /// Lấy revenue breakdown by ad network
    /// </summary>
    [HttpGet("revenue-by-network")]
    public async Task<RevenueByNetworkResponse> GetRevenueByNetwork(
        [FromQuery] DateRangeType range = DateRangeType.Last7Days,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var dateRange = BuildDateRange(range, startDate, endDate);
        return await _dashboardService.GetRevenueByNetworkAsync(
            _currentUser.OrganizationId, dateRange);
    }
    
    /// <summary>
    /// GET /api/v1/dashboard/recent-activities
    /// Lấy recent alerts/activities
    /// </summary>
    [HttpGet("recent-activities")]
    public async Task<RecentActivitiesResponse> GetRecentActivities(
        [FromQuery] int limit = 10)
    {
        return await _dashboardService.GetRecentActivitiesAsync(
            _currentUser.OrganizationId, limit);
    }
}
```

### 4.2 Response DTOs

```csharp
// === KEY METRICS ===
public class DashboardKeyMetricsResponse
{
    public KeyMetricItem Revenue { get; set; }
    public KeyMetricItem AverageEcpm { get; set; }
    public KeyMetricItem Impressions { get; set; }
    public KeyMetricItem FillRate { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class KeyMetricItem
{
    public decimal Value { get; set; }
    public string FormattedValue { get; set; }  // "$12,847.56" or "2.84M"
    public decimal Change { get; set; }          // Percentage change
    public string ChangeDirection { get; set; }  // "up", "down", "neutral"
    public List<decimal> Sparkline { get; set; } // 7 data points
}

// === REVENUE OVERVIEW ===
public class RevenueOverviewResponse
{
    public string Metric { get; set; }  // "revenue", "ecpm", "impressions"
    public List<ChartDataPoint> Data { get; set; }
    public ChartSummary Summary { get; set; }
}

public class ChartDataPoint
{
    public DateTime Date { get; set; }
    public decimal Value { get; set; }
    public decimal? ComparisonValue { get; set; }  // Previous period
}

public class ChartSummary
{
    public decimal Total { get; set; }
    public decimal Average { get; set; }
    public decimal Min { get; set; }
    public decimal Max { get; set; }
    public decimal Change { get; set; }
}

// === TOP APPS ===
public class TopAppsResponse
{
    public List<TopAppItem> Apps { get; set; }
    public int TotalApps { get; set; }
}

public class TopAppItem
{
    public Guid AppId { get; set; }
    public string AppName { get; set; }
    public string PackageName { get; set; }
    public string Platform { get; set; }
    public string IconUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal Ecpm { get; set; }
    public long Impressions { get; set; }
    public decimal Change { get; set; }  // vs previous period
    public int Rank { get; set; }
}

// === REVENUE BY NETWORK ===
public class RevenueByNetworkResponse
{
    public List<NetworkRevenueItem> Networks { get; set; }
    public decimal TotalRevenue { get; set; }
}

public class NetworkRevenueItem
{
    public string NetworkId { get; set; }    // "admob", "meta", "unity"
    public string NetworkName { get; set; }  // "AdMob Bidding", "Meta", "Unity Ads"
    public string IconUrl { get; set; }
    public decimal Revenue { get; set; }
    public decimal Percentage { get; set; }  // % of total
    public decimal Ecpm { get; set; }
    public long Impressions { get; set; }
}

// === RECENT ACTIVITIES ===
public class RecentActivitiesResponse
{
    public List<ActivityItem> Activities { get; set; }
    public int UnreadCount { get; set; }
}

public class ActivityItem
{
    public Guid Id { get; set; }
    public string Type { get; set; }        // "alert", "optimization", "sync", "user"
    public string Severity { get; set; }    // "critical", "warning", "info", "success"
    public string Title { get; set; }
    public string Description { get; set; }
    public DateTime Timestamp { get; set; }
    public string RelativeTime { get; set; }  // "2 hours ago"
    public bool IsRead { get; set; }
    
    // Links to related resources
    public string ResourceType { get; set; }  // "app", "mediation_group", "alert"
    public Guid? ResourceId { get; set; }
    public string ResourceUrl { get; set; }
}
```

---

## 5. SQL Queries cho Dashboard

### 5.1 Key Metrics Query

```sql
-- Lấy aggregated metrics cho một organization trong date range
WITH metrics AS (
    SELECT 
        SUM(total_ad_requests) as total_ad_requests,
        SUM(total_matched_requests) as total_matched_requests,
        SUM(total_impressions) as total_impressions,
        SUM(total_clicks) as total_clicks,
        SUM(total_revenue) as total_revenue
    FROM org_daily_summary
    WHERE organization_id = @organizationId
      AND date >= @startDate
      AND date <= @endDate
)
SELECT 
    total_revenue,
    total_impressions,
    -- Fill Rate
    CASE 
        WHEN total_ad_requests = 0 THEN 0 
        ELSE ROUND(total_matched_requests::decimal / total_ad_requests * 100, 2)
    END as fill_rate,
    -- eCPM (weighted average)
    CASE 
        WHEN total_impressions = 0 THEN 0 
        ELSE ROUND(total_revenue / total_impressions * 1000, 4)
    END as average_ecpm
FROM metrics;
```

### 5.2 Sparkline Data Query

```sql
-- Lấy daily data cho 7 ngày gần nhất (sparkline)
SELECT 
    date,
    total_revenue,
    CASE WHEN total_impressions = 0 THEN 0 
         ELSE ROUND(total_revenue / total_impressions * 1000, 4) 
    END as ecpm,
    total_impressions,
    CASE WHEN total_ad_requests = 0 THEN 0 
         ELSE ROUND(total_matched_requests::decimal / total_ad_requests * 100, 2) 
    END as fill_rate
FROM org_daily_summary
WHERE organization_id = @organizationId
  AND date >= CURRENT_DATE - INTERVAL '6 days'
  AND date <= CURRENT_DATE
ORDER BY date ASC;
```

### 5.3 Top Apps Query

```sql
-- Top apps by revenue
WITH app_metrics AS (
    SELECT 
        app_id,
        SUM(total_revenue) as revenue,
        SUM(total_impressions) as impressions,
        CASE WHEN SUM(total_impressions) = 0 THEN 0 
             ELSE ROUND(SUM(total_revenue) / SUM(total_impressions) * 1000, 4) 
        END as ecpm
    FROM app_daily_summary
    WHERE organization_id = @organizationId
      AND date >= @startDate
      AND date <= @endDate
    GROUP BY app_id
),
app_metrics_previous AS (
    SELECT 
        app_id,
        SUM(total_revenue) as revenue_prev
    FROM app_daily_summary
    WHERE organization_id = @organizationId
      AND date >= @prevStartDate
      AND date <= @prevEndDate
    GROUP BY app_id
)
SELECT 
    a.id as app_id,
    a.name as app_name,
    a.package_name,
    a.platform,
    a.icon_url,
    COALESCE(m.revenue, 0) as revenue,
    COALESCE(m.ecpm, 0) as ecpm,
    COALESCE(m.impressions, 0) as impressions,
    CASE 
        WHEN COALESCE(p.revenue_prev, 0) = 0 THEN 0
        ELSE ROUND((m.revenue - p.revenue_prev) / p.revenue_prev * 100, 2)
    END as change_percentage,
    ROW_NUMBER() OVER (ORDER BY COALESCE(m.revenue, 0) DESC) as rank
FROM apps a
LEFT JOIN app_metrics m ON a.id = m.app_id
LEFT JOIN app_metrics_previous p ON a.id = p.app_id
WHERE a.organization_id = @organizationId
  AND a.is_active = true
ORDER BY revenue DESC
LIMIT @limit;
```

### 5.4 Revenue by Network Query

```sql
-- Revenue breakdown by ad network
WITH network_totals AS (
    SELECT 
        ad_network,
        SUM(total_revenue) as revenue,
        SUM(total_impressions) as impressions
    FROM network_daily_summary
    WHERE organization_id = @organizationId
      AND date >= @startDate
      AND date <= @endDate
    GROUP BY ad_network
),
total AS (
    SELECT SUM(revenue) as total_revenue FROM network_totals
)
SELECT 
    n.ad_network as network_id,
    -- Map network_id to display name
    CASE n.ad_network
        WHEN 'admob_bidding' THEN 'AdMob Bidding'
        WHEN 'admob_waterfall' THEN 'AdMob Waterfall'
        WHEN 'meta' THEN 'Meta Audience Network'
        WHEN 'unity' THEN 'Unity Ads'
        WHEN 'applovin' THEN 'AppLovin'
        WHEN 'ironsource' THEN 'ironSource'
        WHEN 'vungle' THEN 'Vungle'
        WHEN 'chartboost' THEN 'Chartboost'
        WHEN 'mintegral' THEN 'Mintegral'
        WHEN 'pangle' THEN 'Pangle'
        ELSE n.ad_network
    END as network_name,
    n.revenue,
    n.impressions,
    CASE WHEN n.impressions = 0 THEN 0 
         ELSE ROUND(n.revenue / n.impressions * 1000, 4) 
    END as ecpm,
    CASE WHEN t.total_revenue = 0 THEN 0 
         ELSE ROUND(n.revenue / t.total_revenue * 100, 2) 
    END as percentage
FROM network_totals n
CROSS JOIN total t
ORDER BY n.revenue DESC;
```

### 5.5 Revenue Overview (Chart Data) Query

```sql
-- Daily data cho Revenue Overview chart
SELECT 
    date,
    CASE @metric
        WHEN 'revenue' THEN total_revenue
        WHEN 'ecpm' THEN CASE WHEN total_impressions = 0 THEN 0 
                             ELSE total_revenue / total_impressions * 1000 END
        WHEN 'impressions' THEN total_impressions
    END as value
FROM org_daily_summary
WHERE organization_id = @organizationId
  AND date >= @startDate
  AND date <= @endDate
ORDER BY date ASC;
```

---

## 6. Caching Strategy

### 6.1 Redis Cache Keys

```csharp
public static class CacheKeys
{
    // Dashboard Key Metrics - TTL: 5 minutes
    public static string DashboardKeyMetrics(Guid orgId, DateRangeType range) 
        => $"dashboard:key_metrics:{orgId}:{range}";
    
    // Dashboard Key Metrics với custom range - TTL: 5 minutes
    public static string DashboardKeyMetricsCustom(Guid orgId, DateTime start, DateTime end) 
        => $"dashboard:key_metrics:{orgId}:custom:{start:yyyyMMdd}:{end:yyyyMMdd}";
    
    // Sparkline data (7 days) - TTL: 15 minutes
    public static string DashboardSparkline(Guid orgId) 
        => $"dashboard:sparkline:{orgId}";
    
    // Top Apps - TTL: 10 minutes
    public static string TopApps(Guid orgId, DateRangeType range, int limit) 
        => $"dashboard:top_apps:{orgId}:{range}:{limit}";
    
    // Revenue by Network - TTL: 10 minutes
    public static string RevenueByNetwork(Guid orgId, DateRangeType range) 
        => $"dashboard:revenue_network:{orgId}:{range}";
    
    // Revenue Overview Chart - TTL: 15 minutes
    public static string RevenueOverview(Guid orgId, DateRangeType range, string metric) 
        => $"dashboard:revenue_overview:{orgId}:{range}:{metric}";
    
    // Recent Activities - TTL: 2 minutes (cần refresh thường xuyên)
    public static string RecentActivities(Guid orgId) 
        => $"dashboard:activities:{orgId}";
}
```

### 6.2 Cache Implementation

```csharp
public class DashboardCacheService
{
    private readonly IRedisCache _cache;
    private readonly IDashboardRepository _repository;
    
    public async Task<DashboardKeyMetricsResponse> GetKeyMetricsAsync(
        Guid organizationId, 
        DateRange dateRange)
    {
        var cacheKey = dateRange.Type == DateRangeType.Custom
            ? CacheKeys.DashboardKeyMetricsCustom(organizationId, dateRange.StartDate, dateRange.EndDate)
            : CacheKeys.DashboardKeyMetrics(organizationId, dateRange.Type);
        
        // Try get from cache
        var cached = await _cache.GetAsync<DashboardKeyMetricsResponse>(cacheKey);
        if (cached != null)
        {
            return cached;
        }
        
        // Calculate from database
        var result = await CalculateKeyMetricsAsync(organizationId, dateRange);
        
        // Cache với TTL khác nhau tùy range
        var ttl = dateRange.Type switch
        {
            DateRangeType.Today => TimeSpan.FromMinutes(5),      // Today cần refresh thường xuyên
            DateRangeType.Yesterday => TimeSpan.FromHours(1),    // Yesterday không đổi nhiều
            DateRangeType.Last7Days => TimeSpan.FromMinutes(15),
            DateRangeType.Last30Days => TimeSpan.FromMinutes(30),
            _ => TimeSpan.FromMinutes(10)
        };
        
        await _cache.SetAsync(cacheKey, result, ttl);
        return result;
    }
    
    // Invalidate cache khi có data mới từ AdMob
    public async Task InvalidateDashboardCacheAsync(Guid organizationId)
    {
        var pattern = $"dashboard:*:{organizationId}:*";
        await _cache.DeleteByPatternAsync(pattern);
    }
}
```

### 6.3 Background Jobs (Hangfire)

```csharp
public class DashboardAggregationJob
{
    /// <summary>
    /// Job chạy mỗi 15 phút để aggregate data
    /// </summary>
    [AutomaticRetry(Attempts = 3)]
    public async Task AggregateOrganizationMetricsAsync(Guid organizationId)
    {
        var today = DateTime.UtcNow.Date;
        
        // 1. Aggregate daily metrics cho hôm nay
        await AggregateAppDailySummaryAsync(organizationId, today);
        await AggregateOrgDailySummaryAsync(organizationId, today);
        await AggregateNetworkDailySummaryAsync(organizationId, today);
        
        // 2. Invalidate cache
        await _cacheService.InvalidateDashboardCacheAsync(organizationId);
        
        // 3. Pre-warm cache cho common queries
        await PreWarmCacheAsync(organizationId);
    }
    
    private async Task PreWarmCacheAsync(Guid organizationId)
    {
        // Pre-warm các query phổ biến
        var commonRanges = new[] { DateRangeType.Today, DateRangeType.Last7Days };
        
        foreach (var range in commonRanges)
        {
            var dateRange = BuildDateRange(range);
            await _dashboardService.GetKeyMetricsAsync(organizationId, dateRange);
            await _dashboardService.GetTopAppsAsync(organizationId, dateRange, 5);
            await _dashboardService.GetRevenueByNetworkAsync(organizationId, dateRange);
        }
    }
}

// Đăng ký recurring job
public void ConfigureHangfireJobs()
{
    // Aggregate metrics mỗi 15 phút
    RecurringJob.AddOrUpdate<DashboardAggregationJob>(
        "aggregate-metrics",
        job => job.AggregateAllOrganizationsAsync(),
        "*/15 * * * *"); // Every 15 minutes
    
    // Full re-aggregate mỗi ngày lúc 1:00 AM
    RecurringJob.AddOrUpdate<DashboardAggregationJob>(
        "daily-full-aggregate",
        job => job.FullReaggregateAsync(),
        "0 1 * * *"); // At 1:00 AM daily
}
```

---

## 7. Service Implementation

### 7.1 Dashboard Service

```csharp
public interface IDashboardService
{
    Task<DashboardKeyMetricsResponse> GetKeyMetricsAsync(Guid orgId, DateRange range);
    Task<RevenueOverviewResponse> GetRevenueOverviewAsync(Guid orgId, DateRange range, string metric);
    Task<TopAppsResponse> GetTopAppsAsync(Guid orgId, DateRange range, int limit);
    Task<RevenueByNetworkResponse> GetRevenueByNetworkAsync(Guid orgId, DateRange range);
    Task<RecentActivitiesResponse> GetRecentActivitiesAsync(Guid orgId, int limit);
}

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _repository;
    private readonly IDashboardCacheService _cache;
    private readonly IAlertRepository _alertRepository;
    private readonly MetricsCalculator _calculator;
    
    public async Task<DashboardKeyMetricsResponse> GetKeyMetricsAsync(
        Guid organizationId, 
        DateRange dateRange)
    {
        // 1. Lấy current period metrics
        var current = await _repository.GetAggregatedMetricsAsync(
            organizationId, dateRange.StartDate, dateRange.EndDate);
        
        // 2. Lấy previous period metrics
        var previous = await _repository.GetAggregatedMetricsAsync(
            organizationId, dateRange.PreviousStartDate, dateRange.PreviousEndDate);
        
        // 3. Lấy sparkline data
        var sparklineData = await _repository.GetDailyMetricsAsync(
            organizationId, 
            DateTime.UtcNow.Date.AddDays(-6), 
            DateTime.UtcNow.Date);
        
        // 4. Build response
        return new DashboardKeyMetricsResponse
        {
            Revenue = BuildKeyMetricItem(
                current.TotalRevenue,
                previous.TotalRevenue,
                sparklineData.Select(d => d.TotalRevenue).ToList(),
                FormatCurrency
            ),
            AverageEcpm = BuildKeyMetricItem(
                _calculator.CalculateEcpm(current.TotalRevenue, current.TotalImpressions),
                _calculator.CalculateEcpm(previous.TotalRevenue, previous.TotalImpressions),
                sparklineData.Select(d => d.Ecpm).ToList(),
                FormatCurrency
            ),
            Impressions = BuildKeyMetricItem(
                current.TotalImpressions,
                previous.TotalImpressions,
                sparklineData.Select(d => (decimal)d.TotalImpressions).ToList(),
                FormatNumber
            ),
            FillRate = BuildKeyMetricItem(
                _calculator.CalculateFillRate(current.TotalAdRequests, current.TotalMatchedRequests),
                _calculator.CalculateFillRate(previous.TotalAdRequests, previous.TotalMatchedRequests),
                sparklineData.Select(d => d.FillRate).ToList(),
                FormatPercentage,
                isPercentagePoints: true  // Fill rate change is in percentage points
            ),
            LastUpdated = DateTime.UtcNow
        };
    }
    
    private KeyMetricItem BuildKeyMetricItem(
        decimal currentValue,
        decimal previousValue,
        List<decimal> sparkline,
        Func<decimal, string> formatter,
        bool isPercentagePoints = false)
    {
        var change = isPercentagePoints
            ? currentValue - previousValue  // Percentage points
            : _calculator.CalculatePercentageChange(currentValue, previousValue);
        
        return new KeyMetricItem
        {
            Value = currentValue,
            FormattedValue = formatter(currentValue),
            Change = change,
            ChangeDirection = change > 0 ? "up" : change < 0 ? "down" : "neutral",
            Sparkline = sparkline
        };
    }
    
    public async Task<RecentActivitiesResponse> GetRecentActivitiesAsync(
        Guid organizationId, 
        int limit)
    {
        // Lấy recent alerts
        var alerts = await _alertRepository.GetRecentAsync(organizationId, limit);
        
        var activities = alerts.Select(a => new ActivityItem
        {
            Id = a.Id,
            Type = "alert",
            Severity = a.Severity.ToString().ToLower(),
            Title = a.Title,
            Description = a.Description,
            Timestamp = a.CreatedAt,
            RelativeTime = GetRelativeTime(a.CreatedAt),
            IsRead = a.IsRead,
            ResourceType = a.ResourceType,
            ResourceId = a.ResourceId,
            ResourceUrl = BuildResourceUrl(a.ResourceType, a.ResourceId)
        }).ToList();
        
        return new RecentActivitiesResponse
        {
            Activities = activities,
            UnreadCount = activities.Count(a => !a.IsRead)
        };
    }
    
    private string GetRelativeTime(DateTime timestamp)
    {
        var diff = DateTime.UtcNow - timestamp;
        
        if (diff.TotalMinutes < 1) return "Just now";
        if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} minutes ago";
        if (diff.TotalHours < 24) return $"{(int)diff.TotalHours} hours ago";
        if (diff.TotalDays < 7) return $"{(int)diff.TotalDays} days ago";
        return timestamp.ToString("MMM d, yyyy");
    }
}
```

---

## 8. Number Formatting Helpers

```csharp
public static class FormatHelpers
{
    /// <summary>
    /// Format currency: $12,847.56, $1.2M, $3.5B
    /// </summary>
    public static string FormatCurrency(decimal value)
    {
        if (value >= 1_000_000_000)
            return $"${value / 1_000_000_000:F1}B";
        if (value >= 1_000_000)
            return $"${value / 1_000_000:F2}M";
        if (value >= 1_000)
            return $"${value:N2}";
        return $"${value:F2}";
    }
    
    /// <summary>
    /// Format number: 2.84M, 156K, 1,234
    /// </summary>
    public static string FormatNumber(decimal value)
    {
        if (value >= 1_000_000_000)
            return $"{value / 1_000_000_000:F2}B";
        if (value >= 1_000_000)
            return $"{value / 1_000_000:F2}M";
        if (value >= 1_000)
            return $"{value / 1_000:F1}K";
        return $"{value:N0}";
    }
    
    /// <summary>
    /// Format percentage: 94.2%, 100%
    /// </summary>
    public static string FormatPercentage(decimal value)
    {
        return $"{value:F1}%";
    }
    
    /// <summary>
    /// Format eCPM: $4.52
    /// </summary>
    public static string FormatEcpm(decimal value)
    {
        return $"${value:F2}";
    }
    
    /// <summary>
    /// Format change: +8.2%, -2.1%, 0%
    /// </summary>
    public static string FormatChange(decimal value)
    {
        var prefix = value > 0 ? "+" : "";
        return $"{prefix}{value:F1}%";
    }
}
```

---

## 9. Summary: Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DASHBOARD DATA FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. DATA COLLECTION (Every 15 min)                                          │
│     AdMob API → Sync Job → daily_metrics table                              │
│                                                                             │
│  2. AGGREGATION (Every 15 min)                                              │
│     daily_metrics → Aggregation Job → app_daily_summary                     │
│                                   → org_daily_summary                       │
│                                   → network_daily_summary                   │
│                                                                             │
│  3. CACHING (After aggregation)                                             │
│     Aggregated data → Pre-warm Job → Redis Cache                            │
│                                                                             │
│  4. API RESPONSE                                                            │
│     Request → Check Cache → If miss: Query DB → Cache → Return              │
│                          → If hit: Return cached data                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                          CACHE TTL STRATEGY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Today's data:        5 minutes   (changes frequently)                      │
│  Yesterday's data:    1 hour      (stable, rarely changes)                  │
│  Last 7 days:         15 minutes                                            │
│  Last 30 days:        30 minutes                                            │
│  Recent Activities:   2 minutes   (needs to be fresh)                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. API Usage Examples

### Frontend API Calls

```typescript
// Dashboard page - Load all data
async function loadDashboard(dateRange: DateRangeType) {
  const [keyMetrics, revenueOverview, topApps, networkRevenue, activities] = 
    await Promise.all([
      api.get('/dashboard/key-metrics', { params: { range: dateRange } }),
      api.get('/dashboard/revenue-overview', { params: { range: dateRange, metric: 'revenue' } }),
      api.get('/dashboard/top-apps', { params: { range: dateRange, limit: 5 } }),
      api.get('/dashboard/revenue-by-network', { params: { range: dateRange } }),
      api.get('/dashboard/recent-activities', { params: { limit: 10 } }),
    ]);
  
  return { keyMetrics, revenueOverview, topApps, networkRevenue, activities };
}

// Change date range - Only reload relevant data
async function onDateRangeChange(newRange: DateRangeType) {
  const [keyMetrics, revenueOverview, topApps, networkRevenue] = 
    await Promise.all([
      api.get('/dashboard/key-metrics', { params: { range: newRange } }),
      api.get('/dashboard/revenue-overview', { params: { range: newRange, metric: currentMetric } }),
      api.get('/dashboard/top-apps', { params: { range: newRange, limit: 5 } }),
      api.get('/dashboard/revenue-by-network', { params: { range: newRange } }),
    ]);
  
  // Recent activities không phụ thuộc date range, không cần reload
}

// Change chart metric (Revenue/eCPM/Impressions)
async function onMetricChange(metric: 'revenue' | 'ecpm' | 'impressions') {
  const revenueOverview = await api.get('/dashboard/revenue-overview', { 
    params: { range: currentRange, metric } 
  });
}
```
