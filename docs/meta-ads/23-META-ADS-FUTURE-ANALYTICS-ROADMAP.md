# Meta Ads Future Analytics Roadmap

## 1. Mục tiêu tài liệu
Tài liệu này mô tả phase sau của Meta Ads, tập trung vào raw storage, analytics pipeline và cost attribution. Nội dung dưới đây không thuộc migration PostgreSQL V1.

## 2. In scope của roadmap
- Chuẩn path raw trong MinIO.
- Định nghĩa lane `bronze.meta_* -> silver.meta_* -> gold.*`.
- Cách nối Meta cost vào bảng analytics dùng chung.

## 3. Out of scope của V1 hiện tại
- Không tạo bảng insights daily trong PostgreSQL.
- Không build scheduler sync insights trong backend runtime V1.
- Không build optimizer rule dựa trên CPI/ROAS/CTR.

## 4. Raw storage trong MinIO
Đề xuất bucket/prefix:
- `raw/meta-ads/{organization_id}/{date}/integrations/{integration_id}/adaccounts.json`
- `raw/meta-ads/{organization_id}/{date}/accounts/{meta_ad_account_id}/campaigns.json`
- `raw/meta-ads/{organization_id}/{date}/accounts/{meta_ad_account_id}/adsets.json`
- `raw/meta-ads/{organization_id}/{date}/accounts/{meta_ad_account_id}/ads.json`
- `raw/meta-ads/{organization_id}/{date}/accounts/{meta_ad_account_id}/insights/{level}.json`
- `raw/meta-ads/{organization_id}/{date}/requests/{request_id}/{step}.json`

Nguyên tắc:
- giữ raw request và raw response tách riêng nếu cần
- mỗi object raw phải có metadata: `organization_id`, `integration_id`, `meta_ad_account_id`, `entity_type`, `fetched_at`, `api_version`

## 5. Bronze layer
Đề xuất các bảng bronze trong StarRocks:
- `bronze.meta_ad_accounts_raw`
- `bronze.meta_campaigns_raw`
- `bronze.meta_adsets_raw`
- `bronze.meta_ads_raw`
- `bronze.meta_insights_campaign_raw`
- `bronze.meta_insights_adset_raw`
- `bronze.meta_insights_ad_raw`
- `bronze.meta_creatives_raw`

Nguyên tắc bronze:
- gần raw nhất, chưa business-normalize nhiều
- hỗ trợ reload lại từ MinIO nếu parser thay đổi
- lưu `raw_json`, `ingested_at`, `source_file`, `api_window`

## 6. Silver layer
Đề xuất silver tables:
- `silver.meta_ad_accounts`
- `silver.meta_campaigns`
- `silver.meta_adsets`
- `silver.meta_ads`
- `silver.meta_daily_campaign_insights`
- `silver.meta_daily_adset_insights`
- `silver.meta_daily_ad_insights`
- `silver.meta_app_cost_mapping`

Chuẩn hóa ở silver:
- ép timezone về UTC + giữ timezone gốc của ad account
- chuẩn currency/cost precision
- chuẩn country/platform/placement code
- chuẩn breakdown dimensions
- resolve `app_row_id` qua `meta_app_mappings`
- join `apps`, `dim_app_identifiers`, package/bundle nếu cần attribution

## 7. Gold layer
Đề xuất gold outputs:
- `gold.fact_campaign_performance`
- `gold.fact_adset_performance`
- `gold.fact_ad_performance`
- `gold.daily_app_costs`
- `gold.fact_paid_user_acquisition`

Mục tiêu gold:
- dashboard marketing
- hợp nhất spend Meta với revenue/install từ nguồn khác
- cung cấp input cho rule engine phase sau

## 8. Kết nối với hệ thống analytics hiện tại
Dự án hiện đã có các lane cho raw -> StarRocks -> dashboard. Meta nên nối vào các thành phần sau:
- MinIO raw storage hiện có để chứa JSON raw
- StarRocks bronze/silver/gold làm nơi query analytics
- `silver.dim_app_identifiers` để map app/package/bundle
- `gold.daily_app_costs` để hợp nhất spend quảng cáo theo app/date/source
- `gold.fact_campaign_performance` để hợp nhất KPI campaign-level đa network nếu cần

## 9. Mapping app/cost attribution
Nguồn map chính:
- `meta_app_mappings.app_row_id`
- `meta_app_mappings.meta_application_id`
- `object_store_url`, `store_url_override`, package/bundle override
- `apps.app_id`, `apps.platform`, `apps.display_name`

Quy tắc ưu tiên map app:
1. map trực tiếp qua `meta_app_mappings`
2. fallback package/bundle override
3. fallback URL/domain parsing nếu thực sự cần

## 10. Dimensions và metrics phase sau
Dimensions:
- date
- organization_id
- integration_id
- meta_ad_account_id
- campaign_id
- adset_id
- ad_id
- app_row_id
- country
- platform
- placement
- publisher_platform
- age
- gender

Metrics:
- impressions
- clicks
- spend
- installs nếu có signal phù hợp
- ctr
- cpc
- cpm
- frequency
- reach
- roas nếu join được revenue downstream

## 11. Scheduler roadmap
Các job dự kiến phase sau:
- sync ad accounts metadata: daily hoặc on-demand
- sync campaign/adset/ad structure: hourly hoặc on-demand
- sync insights intraday: mỗi 1-2 giờ
- sync finalized yesterday insights: daily
- transform bronze -> silver -> gold: theo batch schedule sau ingest

## 12. Khi nào mới thêm `meta_sync_runs`
Chỉ thêm khi bắt đầu build analytics/runtime sync thật. Bảng này nên lưu:
- `organization_id`, `integration_id`, `meta_ad_account_id`
- `entity_type`, `time_window_start`, `time_window_end`
- `status`, `attempt_count`, `last_error`
- `started_at`, `finished_at`, `raw_object_count`

## 13. Kết luận
PostgreSQL V1 đã đủ cho create flow và operational mirror. Phase analytics nên đi thẳng vào MinIO + StarRocks thay vì mở thêm bảng report ở PostgreSQL, để tránh:
- duplicate storage
- query nặng trên DB operational
- schema churn khi breakdown dimensions của Meta thay đổi