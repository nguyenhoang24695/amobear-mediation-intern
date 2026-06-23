# Lưu Đầy Đủ Tất Cả Dimensions và Metrics

## Tổng quan

Đã cập nhật hệ thống để **lưu đầy đủ tất cả dimensions và metrics** từ AdMob report API, không chỉ những cái cần thiết cho SoW calculation. Điều này cho phép:

- Phân tích đa dạng hơn sau này
- Hỗ trợ nhiều use cases khác nhau
- Không cần gọi lại API khi cần thêm dữ liệu
- Linh hoạt trong việc query và reporting

## Dimensions Được Lưu

### Từ AdMob API
- **DATE** - Ngày của data
- **APP** - AdMob App ID (string)
- **AD_UNIT** - AdMob Ad Unit ID (string)
- **MEDIATION_GROUP** - AdMob Mediation Group ID (string, normalized)
- **AD_SOURCE** - Ad Source ID (network ID)
- **AD_SOURCE_INSTANCE** - Ad Source Instance ID (waterfall line ID)
- **COUNTRY** - Country code
- **FORMAT** - Ad format (BANNER, INTERSTITIAL, REWARDED, etc.)
- **PLATFORM** - Platform (ANDROID, IOS)

### Derived (Tính từ DATE)
- **MONTH** - Format: YYYY-MM (e.g., "2024-12")
- **WEEK** - Format: YYYY-WW (e.g., "2024-W50")

## Metrics Được Lưu

### Từ AdMob API
- **ESTIMATED_EARNINGS** → `revenue_micros` (long)
- **OBSERVED_ECPM** → `ecpm_micros` (long)
- **AD_REQUESTS** → `requests` (long)
- **MATCHED_REQUESTS** → Used to calculate `fill_rate`
- **MATCH_RATE** → `match_rate` (double)
- **IMPRESSIONS** → `impressions` (long)
- **CLICKS** → `clicks` (long)
- **IMPRESSION_CTR** → `impression_ctr` (double)

### Derived Metrics (Tính toán)
- **Fill Rate** → `fill_rate` = matched_requests / requests
- **CTR** → `ctr` = clicks / impressions (nếu không có IMPRESSION_CTR)
- **eCPM** → `ecpm_micros` = OBSERVED_ECPM hoặc (revenue / impressions * 1000)

## Schema Updates

### Bảng `performance_data`

**Các cột mới được thêm:**
```sql
format VARCHAR(50),           -- Ad Format
platform VARCHAR(20),        -- Platform (ANDROID, IOS)
month VARCHAR(10),           -- Month (YYYY-MM)
week VARCHAR(10),            -- Week (YYYY-WW)
impression_ctr DOUBLE PRECISION  -- Impression CTR
```

**Unique Index được cập nhật:**
```sql
CREATE UNIQUE INDEX ix_performance_data_unique 
ON performance_data (
    date, publisher_id, app_id, ad_unit_id, 
    mediation_group_id, ad_source_id, ad_source_instance_id, 
    country_code, format, platform
);
```

## API Request

Tất cả jobs hiện tại request **đầy đủ dimensions và metrics**:

```json
{
  "reportSpec": {
    "dimensions": [
      "DATE",
      "APP",
      "AD_UNIT",
      "MEDIATION_GROUP",
      "AD_SOURCE",
      "AD_SOURCE_INSTANCE",
      "COUNTRY",
      "FORMAT",
      "PLATFORM"
    ],
    "metrics": [
      "ESTIMATED_EARNINGS",
      "OBSERVED_ECPM",
      "AD_REQUESTS",
      "MATCHED_REQUESTS",
      "MATCH_RATE",
      "IMPRESSIONS",
      "CLICKS",
      "IMPRESSION_CTR"
    ]
  }
}
```

## Lợi ích

1. **Đầy đủ dữ liệu**: Không cần gọi lại API khi cần thêm dimensions/metrics
2. **Linh hoạt**: Có thể query theo bất kỳ dimension nào
3. **Phân tích đa dạng**: Hỗ trợ nhiều use cases khác nhau
4. **Tương lai-proof**: Dễ dàng mở rộng cho các tính năng mới

## Use Cases Hỗ Trợ

Với đầy đủ dimensions và metrics, hệ thống có thể hỗ trợ:

1. **SoW Calculation** - Group by mediation_group, ad_source, ad_source_instance
2. **Country Analysis** - Group by country để phân tích theo địa lý
3. **Format Analysis** - Group by format để phân tích theo loại ad
4. **Platform Analysis** - Group by platform để phân tích Android vs iOS
5. **App-level Analysis** - Group by app để phân tích từng app
6. **Ad Unit Analysis** - Group by ad_unit để phân tích từng ad unit
7. **Time-based Analysis** - Group by month/week để phân tích xu hướng
8. **CTR Analysis** - Sử dụng impression_ctr để phân tích click performance
9. **Waterfall Line Revenue 30D** - Group by ad_source_instance để tính `Revenue 30D` cho từng line trong Mediation Group detail

## Waterfall Revenue Notes

### 1. Revenue 30D cho Waterfall line trong Mediation Group detail

Implementation hiện tại dùng:

- Nguồn: `bronze.mediation_table`
- Metric: `SUM(estimated_earnings)`
- Group by: `ad_source_instance_id`
- Normalize line id: lấy phần sau `:asi:` của `ad_source_instance_id`
- Filter:
  - `app_id = <admob app id>`
  - `mediation_group_id = <full id>` hoặc short id sau `:mg:`
  - `ad_source_id = 1215381445328257950` (AdMob waterfall)
  - `ad_source_instance_id` khác null và có pattern `:asi:`
- Window: 30 ngày, inclusive

Điểm quan trọng:

- `AD_SOURCE_INSTANCE` là line-level identifier đúng cho waterfall source trong MG detail.
- Nếu `performance-sync` chưa nạp `AD_SOURCE_INSTANCE`, `Revenue 30D` theo line sẽ sai hoặc bằng 0.

### 2. Revenue 30D cho waterfall ad unit ở app/global list

Đây là granularity khác với waterfall line:

- Identifier: `admobNetworkWaterfallAdUnitId`
- Revenue không query trực tiếp bằng `admobNetworkWaterfallAdUnitId` trong bronze
- Flow đúng:
  - Resolve `admobNetworkWaterfallAdUnitId -> ad_unit_id[]` từ PostgreSQL (`ad_unit_waterfall_mappings`)
  - Query `bronze.mediation_table` theo `ad_unit_id`
  - Aggregate ngược revenue về waterfall ad unit

Cache app-level dùng cho granularity này:

- Redis key: `dashboard:app:{appId}:waterfalladunits:30days`
- Dùng cho app waterfall list và global waterfall list
- Không dùng cho line-level revenue trong MG detail

## Migration

Cần tạo migration để thêm các cột mới:

```sql
ALTER TABLE performance_data 
    ADD COLUMN IF NOT EXISTS format VARCHAR(50),
    ADD COLUMN IF NOT EXISTS platform VARCHAR(20),
    ADD COLUMN IF NOT EXISTS month VARCHAR(10),
    ADD COLUMN IF NOT EXISTS week VARCHAR(10),
    ADD COLUMN IF NOT EXISTS impression_ctr DOUBLE PRECISION;

-- Update unique index
DROP INDEX IF EXISTS ix_performance_data_unique;
CREATE UNIQUE INDEX ix_performance_data_unique 
ON performance_data (
    date, publisher_id, app_id, ad_unit_id, 
    mediation_group_id, ad_source_id, ad_source_instance_id, 
    country_code, format, platform
);
```

## Jobs Đã Cập Nhật

- ✅ `PerformanceSyncJob` - Request và lưu đầy đủ
- ✅ `PerformanceInitialSyncJob` - Request và lưu đầy đủ
- ✅ `ReportQueueProcessorJob` - Parse và lưu đầy đủ
