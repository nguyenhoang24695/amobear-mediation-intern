# Database Schema Update - Dùng AdMob ID Trực Tiếp

## Tổng quan

Đã thay đổi cấu trúc database để dùng **AdMob ID (string) trực tiếp** thay vì foreign key (int) cho các bảng reference. Điều này giúp:
- Đồng nhất với AdMob API (không cần map)
- Tránh confusion về sau
- Dễ query và grouping
- Đảm bảo đủ dữ liệu để tính SoW

## Thay đổi Schema

### Bảng `performance_data`

**Trước:**
```sql
app_id INTEGER REFERENCES apps(id),
ad_unit_id INTEGER REFERENCES ad_units(id),
mediation_group_id INTEGER REFERENCES mediation_groups(id),
```

**Sau:**
```sql
app_id VARCHAR(255), -- AdMob App ID (string)
ad_unit_id VARCHAR(255), -- AdMob Ad Unit ID (string)
mediation_group_id VARCHAR(255), -- AdMob Mediation Group ID (string)
ad_source_instance_id VARCHAR(255), -- Ad Source Instance ID (mới)
```

### Các cột bị loại bỏ (NULL vì không có trong dimensions mới)

- `app_id` - NULL (không có APP dimension)
- `ad_unit_id` - NULL (không có AD_UNIT dimension)
- `country_code` - NULL (không có COUNTRY dimension)
- `clicks` - NULL (không có CLICKS metric)
- `ctr` - NULL (không có CLICKS để tính CTR)

### Các cột mới

- `ad_source_instance_id` - Để phân biệt các waterfall lines trong cùng một ad source

## Dimensions và Metrics

### Dimensions (theo Postman)
- `DATE`
- `MEDIATION_GROUP`
- `AD_SOURCE`
- `AD_SOURCE_INSTANCE`

### Metrics (theo Postman)
- `ESTIMATED_EARNINGS`
- `OBSERVED_ECPM`
- `AD_REQUESTS`
- `MATCHED_REQUESTS`
- `MATCH_RATE`
- `IMPRESSIONS`

## Dữ liệu đủ để tính SoW

Với cấu trúc mới, dữ liệu đủ để tính SoW vì:
- ✅ `mediation_group_id` (string) - Group theo MG
- ✅ `ad_source_id` (string) - Phân biệt ad sources
- ✅ `ad_source_instance_id` (string) - Phân biệt waterfall lines
- ✅ `revenue_micros` - Tính SoW
- ✅ `impressions` - Metrics
- ✅ `ecpm_micros` - Metrics
- ✅ `match_rate` - Metrics
- ✅ `fill_rate` - Metrics

## Migration Script

Đã tạo script migration: `scripts/migrate-performance-data-to-admob-ids.sql`

**Lưu ý:**
- Backup database trước khi chạy
- Nếu có partitions, cần chạy lại cho từng partition
- Script sẽ:
  1. Thêm cột mới (string)
  2. Copy data từ bảng reference
  3. Drop cột cũ (foreign key)
  4. Rename cột mới
  5. Recreate indexes

## SoW Calculation

SoW được tính dựa trên:
- Group by: `mediation_group_id` (string)
- Phân biệt: `ad_source_id` + `ad_source_instance_id`
- Tính: `SoW = ad_source_revenue / total_mg_revenue`

## Lợi ích

1. **Đồng nhất**: Dùng cùng key với AdMob API
2. **Đơn giản**: Không cần map foreign key
3. **Hiệu suất**: Query trực tiếp bằng AdMob ID
4. **Rõ ràng**: Dễ hiểu và maintain

## Indexes

Đã cập nhật indexes để phù hợp với string columns:
- `ix_performance_data_mg_date` - (mediation_group_id, date)
- `ix_performance_data_mg_adsource_date` - (mediation_group_id, ad_source_id, date)
- `ix_performance_data_unique` - Composite unique index
