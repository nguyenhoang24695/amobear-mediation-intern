# Đối chiếu schema BigQuery (GCS) với lưu trữ StarRocks Firebase

## Cột đang lưu (bronze.fb_*)

| Cột StarRocks | Nguồn BigQuery | Ghi chú |
|---------------|----------------|---------|
| event_date | event_date | |
| event_timestamp | event_timestamp | |
| user_pseudo_id | user_pseudo_id | |
| install_date | (tính từ user_first_touch_timestamp) | |
| retention_day | (tính từ event_timestamp, install_date) | |
| event_name | event_name | |
| app_version | app_info.version | Schema BQ: version nằm trong RECORD app_info |
| device_json | device (RECORD) | Nguyên JSON |
| geo_json | geo (RECORD) | Nguyên JSON |
| traffic_source_json | traffic_source (RECORD) | Nguyên JSON |
| event_params_json | event_params (REPEATED RECORD) | Nguyên JSON |
| user_properties_json | user_properties (REPEATED RECORD) | Nguyên JSON |
| **raw_event_json** | **Toàn bộ event** | Chứa mọi field theo schema BQ (event_previous_timestamp, event_value_in_usd, user_id, privacy_info, user_ltv, stream_id, platform, event_dimensions, ecommerce, items, batch_*, app_info đầy đủ, v.v.) |

## Kết luận

- **Query nhanh / DAU-DAV:** Dùng các cột scalar và các cột *_json (device, geo, event_params, user_properties, traffic_source).
- **Không mất dữ liệu so với BQ:** Toàn bộ event từ nguồn được lưu trong **raw_event_json**. Mọi field trong schema BigQuery (event_previous_timestamp, event_value_in_usd, user_id, privacy_info, user_ltv, stream_id, platform, event_dimensions, ecommerce, items, batch_*, publisher, app_info full, …) đều nằm trong JSON này.

## Bảng đã tạo trước khi thêm raw_event_json

Nếu bảng bronze.fb_* đã tồn tại và chưa có cột `raw_event_json`, chạy trên StarRocks (cho từng bảng):

```sql
ALTER TABLE bronze.fb_<tên_bảng> ADD COLUMN raw_event_json STRING NULL;
```

Sau đó pipeline ghi mới sẽ điền cột này; dữ liệu cũ để NULL hoặc backfill nếu cần.
