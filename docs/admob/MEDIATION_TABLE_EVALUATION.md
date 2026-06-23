# Đánh giá mediation_table so với AdMob API (accounts.mediationReport.generate)

Tài liệu tham chiếu: [AdMob API – Metrics and Dimensions](https://developers.google.com/admob/api/v1/report-metrics-dimensions), [Method: accounts.mediationReport.generate (v1beta)](https://developers.google.com/admob/api/reference/rest/v1beta/accounts.mediationReport/generate). API hiện tại dùng **v1alpha** (fallback v1beta); spec dimensions/metrics Mediation report giống nhau giữa v1alpha và v1beta.

---

## 1. Hiện trạng implementation

### 1.1 Dimensions đang dùng (PerformanceSyncService – ReportDimensionsMediation)

| Dimension        | Mô tả (theo Google) | Đang dùng |
|-----------------|----------------------|-----------|
| DATE            | Ngày YYYYMMDD        | Có        |
| AD_SOURCE       | ID nguồn quảng cáo (network) | Có |
| AD_UNIT         | ID ad unit           | Có        |
| MEDIATION_GROUP | ID mediation group   | Có        |
| APP             | ID ứng dụng          | Có        |
| COUNTRY         | Mã CLDR (US, VN…)    | Có        |
| FORMAT          | banner, native…     | Có        |
| PLATFORM        | Android, iOS         | Có        |

**Tổng: 8 dimensions.**

### 1.2 Metrics đang dùng (ReportMetricsAll)

| Metric            | Mô tả (theo Google)     | Đang dùng |
|-------------------|--------------------------|-----------|
| AD_REQUESTS       | Số request               | Có        |
| CLICKS            | Số lần click             | Có        |
| ESTIMATED_EARNINGS| Doanh thu ước tính (micros) | Có     |
| IMPRESSIONS       | Số lần hiển thị          | Có        |
| MATCHED_REQUESTS  | Số request có ad trả về  | Có        |
| MATCH_RATE        | Tỷ lệ match              | Có        |
| OBSERVED_ECPM     | eCPM ước tính bên thứ 3 (micros) | Có |

**Tổng: 7 metrics.** `show_rate` đang tính trong code: `impressions / matched_requests`.

---

## 2. So sánh với tài liệu AdMob (Mediation report)

### 2.1 Dimensions có trong API nhưng chưa dùng

| Dimension           | Report Type | Ghi chú |
|---------------------|------------|---------|
| **AD_SOURCE_INSTANCE** | Mediation | **Rất nên bổ sung.** Phân biệt từng instance trong mediation (vd: "AdMob (default)", instance tùy chỉnh). Cần cho phân tích waterfall/optimization theo instance. |
| APP_VERSION_NAME   | Mediation  | **Incompatible** với ESTIMATED_EARNINGS và OBSERVED_ECPM. Nếu cần phân tích theo version app thì phải tạo request riêng (bỏ 2 metric đó) hoặc report phụ. |
| MOBILE_OS_VERSION  | Mediation  | Incompatible với ESTIMATED_EARNINGS, OBSERVED_ECPM. Hữu ích cho debug theo OS. |
| GMA_SDK_VERSION    | Mediation  | Incompatible với ESTIMATED_EARNINGS, OBSERVED_ECPM. Hữu ích cho phân tích theo SDK. |
| SERVING_RESTRICTION| Mediation  | Chế độ phục vụ (vd: "Non-personalized ads"). Hữu ích nếu cần tách personalized vs non-personalized. |
| MONTH, WEEK        | Mediation  | Time dimension thay thế DATE; thường không cần thêm vì đã có DATE. |

### 2.2 Metrics có trong API nhưng chưa dùng

| Metric          | Mô tả (theo Google)     | Ghi chú |
|-----------------|--------------------------|---------|
| **IMPRESSION_CTR** | Tỷ lệ clicks/impressions | Có sẵn từ API; nên thêm để nhất quán và phân tích CTR ở mediation level. Hiện có thể suy ra từ CLICKS/IMPRESSIONS. |

**Lưu ý:** IMPRESSION_RPM, SHOW_RATE trong doc thuộc **Network** report, không phải Mediation; Mediation chỉ có các metric liệt kê trên.

---

## 3. Đề xuất bổ sung cho phân tích sâu Mediation

### 3.1 Ưu tiên cao (nên làm ngay)

1. **Thêm dimension AD_SOURCE_INSTANCE**
   - **Lý do:** Phân tích theo từng instance (waterfall, A/B instance, so sánh eCPM theo instance). Hiện chỉ có AD_SOURCE (network), không đủ cho tối ưu waterfall.
   - **Ảnh hưởng:** Cần bổ sung cột `ad_source_instance_id`, `ad_source_instance_name` vào `mediation_table` và vào `MediationTableRow`; cập nhật `ReportDimensionsMediation`; cập nhật `hash_key` (thêm ad_source_instance_id); cập nhật transformer và schema StarRocks.

2. **Thêm metric IMPRESSION_CTR**
   - **Lý do:** Metric chuẩn từ API, thuận tiện cho dashboard/alert theo CTR mediation.
   - **Ảnh hưởng:** Thêm vào `ReportMetricsAll` (hoặc dùng riêng cho mediation nếu không muốn ảnh hưởng admob_table/mkt_table); thêm cột `impression_ctr` vào `mediation_table` và DTO/transformer.

### 3.2 Ưu tiên trung bình (tùy product)

3. **SERVING_RESTRICTION**
   - Chỉ cần nếu có yêu cầu báo cáo/so sánh personalized vs non-personalized. Thêm dimension + cột `serving_restriction` (và cập nhật hash_key nếu muốn tách dòng theo restriction).

### 3.3 Phân tích theo app version / OS / SDK (tùy chọn)

4. **APP_VERSION_NAME / MOBILE_OS_VERSION / GMA_SDK_VERSION**
   - Theo tài liệu, **không dùng chung** với ESTIMATED_EARNINGS và OBSERVED_ECPM. Có hai hướng:
   - **Cách A:** Giữ nguyên report chính (có earnings + observed_ecpm), không thêm các dimension này.
   - **Cách B:** Tạo **report phụ** cho mediation (vd: `mediation_table_by_version`) với dimensions có APP_VERSION_NAME (hoặc MOBILE_OS_VERSION, GMA_SDK_VERSION), metrics chỉ gồm AD_REQUESTS, CLICKS, IMPRESSIONS, MATCHED_REQUESTS, MATCH_RATE (không có ESTIMATED_EARNINGS, OBSERVED_ECPM). Dùng cho phân tích rollout/version hoặc debug OS/SDK.

---

## 4. Tóm tắt so sánh nhanh

| Hạng mục           | Hiện tại (mediation_table) | Theo tài liệu Mediation | Đề xuất |
|--------------------|----------------------------|--------------------------|---------|
| Dimensions         | 8 (DATE, AD_SOURCE, AD_UNIT, MEDIATION_GROUP, APP, COUNTRY, FORMAT, PLATFORM) | Thêm AD_SOURCE_INSTANCE, APP_VERSION_NAME, MOBILE_OS_VERSION, GMA_SDK_VERSION, SERVING_RESTRICTION | Thêm **AD_SOURCE_INSTANCE** (+ IMPRESSION_CTR); tùy chọn SERVING_RESTRICTION và report phụ theo version/OS/SDK. |
| Metrics            | 7 + show_rate (tính từ impressions/matched_requests) | Thêm IMPRESSION_CTR (Mediation) | Thêm **IMPRESSION_CTR**. |
| API version        | v1alpha (fallback v1beta)  | v1beta doc, spec tương thích    | Giữ nguyên. |
| Incompatibility    | Không dùng APP_VERSION_NAME, MOBILE_OS_VERSION, GMA_SDK_VERSION với earnings/ecpm | Doc nêu rõ incompatible        | Nếu thêm các dimension đó thì dùng report riêng, bỏ ESTIMATED_EARNINGS/OBSERVED_ECPM. |

---

## 5. Kết luận

- Implementation hiện tại **đã khớp** với tài liệu AdMob cho 8 dimensions và 7 metrics đang dùng; `show_rate` tính từ dữ liệu có sẵn là hợp lý.
- Để **phân tích sâu Mediation** (waterfall, instance-level, CTR):
  - **Nên bổ sung:** dimension **AD_SOURCE_INSTANCE** và metric **IMPRESSION_CTR**.
  - **Có thể bổ sung:** dimension **SERVING_RESTRICTION** nếu cần tách personalized/non-personalized.
  - **Phân tích theo version/OS/SDK:** dùng report phụ với bộ metrics không chứa ESTIMATED_EARNINGS và OBSERVED_ECPM.

File này có thể dùng làm checklist khi cập nhật `PerformanceSyncService`, `AdmobReportTablesTransformer`, `MediationTableRow`, schema StarRocks `bronze.mediation_table` và hash_key.

---

## 6. Migration cho DB đã tồn tại (đã triển khai 3.1)

**Tự động:** Migration EF nằm cùng `MediationPro.Infrastructure/Migrations/` (20260228100000_StarRocksMediationTableAddAdSourceInstanceAndImpressionCtr). DDL StarRocks chạy trong `StarRocksSchemaInitializer` khi khởi động (ALTER TABLE idempotent).

**Chạy tay:** Script `scripts/starrocks/20260228100000_mediation_table_add_ad_source_instance_and_impression_ctr.sql` hoặc chạy từng lệnh:

```sql
ALTER TABLE bronze.mediation_table ADD COLUMN ad_source_instance_id VARCHAR(255) AFTER ad_source_id;
ALTER TABLE bronze.mediation_table ADD COLUMN ad_source_instance_name VARCHAR(255) AFTER ad_source_instance_id;
ALTER TABLE bronze.mediation_table ADD COLUMN impression_ctr DOUBLE AFTER impressions;
```

Sau đó sync lại (Performance Sync Job) để nạp dữ liệu mới với dimension AD_SOURCE_INSTANCE và metric IMPRESSION_CTR.
