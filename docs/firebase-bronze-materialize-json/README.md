# PROMPT — Materialize JSON fields ở Bronze để bỏ parse lặp 7× ở Silver (Firebase)

> Tài liệu này là **prompt giao cho agent implement**. Mục tiêu: chuyển việc parse JSON từ **7 lần / app / ngày**
> (ở tầng Silver aggregation) về **1 lần / row lúc ingestion** (trong .NET, nơi JSON **đã được parse sẵn**),
> bằng cách thêm các **cột typed** vào bảng bronze và cho Silver đọc cột thay vì gọi `get_json_string`.

---

## 1. Bối cảnh & lý do (đã điều tra, đã verify)

### Vấn đề hiệu năng
`FirebaseSilverGoldAggregator.AggregateSilverAsync` chạy **7 câu** `INSERT ... SELECT ... FROM bronze.fb_xxx`
(engagement, geo, device, retention_cohort, ad_metrics, iap_metrics, event_summary). Mỗi câu **tự quét lại cùng
slice bronze của ngày đó và tự parse lại JSON** bằng `get_json_string()` trên các cột STRING JSON
(`event_params_json`, `geo_json`, `device_json`, `raw_event_json`).
- `get_json_string()` rất nặng CPU; lại bị gọi **lặp**: `geo_json.$.country` parse ở 3 bảng; `device_json` ở 2 bảng;
  nhiều field của `event_params_json` parse nhiều lần ngay trong cùng 1 query.
- Số liệu thực tế (StarRocks): có app bronze **37.7M rows / ~6 GB** → đây là phần ăn thời gian nhất của job.

### Cơ hội
Pipeline ingestion (`FirebaseEventTransformer.MapElement`) **đã parse** raw JSON thành các `JsonElement`
(`device`, `geo`, `event_params`...) trước khi serialize lại thành chuỗi JSON để ghi bronze
(`backend/MediationPro.Infrastructure/Firebase/FirebaseEventTransformer.cs:91-98`). Trích các scalar field ngay tại
đây **gần như miễn phí** (không parse thêm). Sau đó Silver chỉ đọc cột → **0 lần** `get_json_string`.

### Quyết định
- **Thêm cột typed (materialized) vào bronze**, populate lúc ingestion. **GIỮ** các cột JSON gốc
  (`*_json`) để không mất dữ liệu / vẫn debug được — thay đổi **chỉ thêm cột**, không bỏ cột.
- **Migration an toàn, không bắt buộc backfill**: Silver dùng `COALESCE(<cột mới>, get_json_string(<json>, ...))`.
  Row mới (đã có cột) → không parse; row cũ (cột NULL) → fallback parse (vẫn đúng số liệu). Xem mục 5.

---

## 2. Các cột cần materialize (suy ra từ ĐÚNG mọi `get_json_string` trong 7 query Silver)

> Đặt tên snake_case, **nullable**. Ngữ nghĩa trích phải **khớp tuyệt đối** với COALESCE hiện có để **không lệch số
> liệu**. Trong event_params đã chuẩn hóa, một field có thể là **object** `{string_value|int_value|double_value}`
> **hoặc** scalar phẳng → phải thử nhánh `.xxx_value` trước rồi tới giá trị phẳng (đúng như COALESCE cũ).

| Cột bronze mới | Kiểu | Nguồn JSON | Quy tắc trích (khớp query cũ) |
|---|---|---|---|
| `ga_session_id`        | VARCHAR | event_params_json | `$.ga_session_id` |
| `engagement_time_msec` | BIGINT  | event_params_json | COALESCE(`$.engagement_time_msec.int_value`, `$.engagement_time_msec`) → CAST BIGINT |
| `ad_format_raw`        | VARCHAR | event_params_json | COALESCE(`$.ad_format.string_value`, `$.ad_format`) — **chỉ phần JSON**; CASE theo event_name GIỮ ở Silver |
| `ad_placement`         | VARCHAR | event_params_json | `$.ad_placement.string_value` |
| `ad_value_usd`         | DOUBLE  | event_params_json | COALESCE(`$.value.double_value`, `$.value`) → CAST DOUBLE |
| `geo_country`          | VARCHAR | geo_json          | `$.country` |
| `device_brand`         | VARCHAR | device_json       | `$.mobile_brand_name` |
| `device_model`         | VARCHAR | device_json       | `$.mobile_model_name` |
| `os_version`           | VARCHAR | device_json       | `$.operating_system_version` |
| `device_language`      | VARCHAR | device_json       | `$.language` |
| `event_value_usd`      | DOUBLE  | raw_event_json    | `$.event_value_in_usd` → CAST DOUBLE |

→ 11 cột này phủ **toàn bộ** `get_json_string` trong 7 query Silver. Sau bước này Silver không còn câu nào parse JSON
(trừ nhánh fallback transitional, mục 5).

---

## 3. Việc cần làm — Ingestion (populate cột mới)

> ⚠️ Có **nhiều touch-point**. Bỏ sót bất kỳ chỗ schema/binding nào sẽ làm cột mới ra NULL toàn bộ. Đặc biệt
> **đường temp-table + merge** dễ bị quên — nếu temp/merge không mang cột, merge sẽ ghi NULL đè lên.

### 3.1 Model row
`backend/MediationPro.Core/DTOs/Firebase/FirebaseEventRow.cs`: thêm 11 property tương ứng (nullable:
`string?`, `long?`, `double?`).

### 3.2 Transformer (trích từ JsonElement đã parse — không parse lại)
`backend/MediationPro.Infrastructure/Firebase/FirebaseEventTransformer.cs`, trong `MapElement` (~dòng 91-98 đã có
`dev`/`geo`/`ep` element):
- Viết helper trích scalar từ `JsonElement` theo đúng quy tắc bảng mục 2 (thử object `.string_value`/`.int_value`/
  `.double_value` trước, rồi scalar phẳng; trả `null` nếu thiếu). Tái dùng style helper sẵn có trong file
  (`TryGetProp`, `GetStringOrNumber`...).
- Set 11 field vào object `new FirebaseEventRow { ... }` (~dòng 140-158).
- `event_value_usd` lấy từ `raw_event_json` element (chính là `el` — đã có).
- Lưu ý: dùng lại element đã parse (`dev`, `geo`, `ep`); **không** gọi `JsonDocument.Parse` lần nữa.

### 3.3 Schema bronze — bảng chính
`backend/MediationPro.Infrastructure/StarRocks/StarRocksFirebaseWriter.cs`:
- `EnsureTableForAppAsync` CREATE TABLE (~dòng 222-255): thêm 11 cột mới (nullable) vào cuối danh sách cột.
- Bảng đã tồn tại: thêm runtime ALTER theo đúng pattern `EnsureRemarkColumnExistsAsync` (~dòng 275-289) — viết
  `EnsureMaterializedColumnsExistAsync` kiểm tra từng cột trong `information_schema.columns`, thiếu thì
  `ALTER TABLE ... ADD COLUMN`. Gọi nó ở nhánh "table already exists" (dòng 216) cạnh chỗ gọi
  `EnsureRemarkColumnExistsAsync`.

### 3.4 Schema bronze — temp table
- `CreateTempTableAsync` CREATE TABLE (~dòng 618-642): thêm **đúng 11 cột** (cùng kiểu, nullable) để khớp bảng chính.

### 3.5 Merge temp → main
- `MergeFromTempTableAsync` (~dòng 707-732): thêm 11 cột vào **cả** danh sách cột INSERT (709-711) **và** mệnh đề
  SELECT (dùng `MAX(<col>) AS <col>` như các cột khác). Bỏ sót chỗ này = cột bị NULL sau merge.

### 3.6 Writers (binding dữ liệu)
Thêm 11 field vào **tất cả** đường ghi:
- `WriteEventsViaStreamLoadAsync` — object mapping (~dòng 477-495).
- `WriteEventsViaMySqlAsync` — danh sách cột (514), placeholders `(?,...)` (518), và phần `cmd.Parameters.Add` (540-555),
  đúng thứ tự, đúng `MySqlDbType` (`Int64` cho bigint, `Double` cho double, `VarChar` cho string; null → `DBNull`).
- Các biến thể dùng cho **temp table**: `WriteEventsViaStreamLoadInternalAsync` /
  `WriteEventsViaMySqlInternalAsync` (~dòng 766+) — cập nhật **giống hệt**.

---

## 4. Việc cần làm — Silver (đọc cột, bỏ parse)

`backend/MediationPro.Infrastructure/StarRocks/FirebaseSilverGoldAggregator.cs` — sửa 7 hàm `InsertSilver*`
(~dòng 196-391): thay mỗi `get_json_string(<json>, '<path>')` bằng cột tương ứng, bọc COALESCE fallback (mục 5).

Bảng thay thế (áp cho cả SELECT và GROUP BY):
- `get_json_string(geo_json, '$.country')` → `geo_country` — ở `InsertSilverGeoAsync`, `InsertSilverAdMetricsAsync`, `InsertSilverIapMetricsAsync`.
- `get_json_string(device_json, '$.mobile_brand_name')` → `device_brand`; `'$.mobile_model_name'` → `device_model`;
  `'$.operating_system_version'` → `os_version`; `'$.language'` → `device_language` — ở `InsertSilverDeviceAsync`,
  `device_model` còn ở `InsertSilverIapMetricsAsync`.
- `get_json_string(event_params_json, '$.ga_session_id')` → `ga_session_id` — `InsertSilverEngagementAsync`.
- `CAST(COALESCE(get_json_string(... '$.engagement_time_msec.int_value'), get_json_string(... '$.engagement_time_msec'), '0') AS BIGINT)`
  → `COALESCE(engagement_time_msec, 0)` — `InsertSilverEngagementAsync`, `InsertSilverRetentionCohortAsync`.
- ad_format: giữ `CASE WHEN event_name='ad_impression1' THEN 'rewarded' ... WHEN event_name='ad_impression' THEN
  COALESCE(ad_format_raw, 'standard') ELSE COALESCE(ad_format_raw, 'all') END` — `InsertSilverAdMetricsAsync` (thay
  phần `COALESCE(get_json_string(...ad_format...))` bằng `ad_format_raw`).
- `get_json_string(event_params_json, '$.ad_placement.string_value')` → `ad_placement` — `InsertSilverAdMetricsAsync`.
- `CAST(COALESCE(get_json_string(... '$.value.double_value'), get_json_string(... '$.value'), '0') AS DOUBLE)`
  → `COALESCE(ad_value_usd, 0)` — `InsertSilverAdMetricsAsync`.
- `CAST(COALESCE(get_json_string(raw_event_json, '$.event_value_in_usd'), '0') AS DOUBLE)`
  → `COALESCE(event_value_usd, 0)` — `InsertSilverGeoAsync`, `InsertSilverDeviceAsync`, `InsertSilverRetentionCohortAsync`, `InsertSilverIapMetricsAsync`.

> `event_summary` không dùng get_json_string → không đổi.
> ⚠️ Khi đổi field trong GROUP BY phải đổi **đồng bộ** ở cả SELECT và GROUP BY (StarRocks yêu cầu khớp), giữ đúng
> thứ tự cột insert vào silver.

---

## 5. Chiến lược migration (an toàn, không bắt buộc backfill)

Bronze là **DUPLICATE KEY** ⇒ **không UPDATE được** ⇒ không thể backfill cột cho row cũ bằng `UPDATE`.
Giải pháp: trong các câu Silver, mỗi cột mới bọc **COALESCE với fallback parse cũ**:
```
-- ví dụ country:
COALESCE(geo_country, get_json_string(geo_json, '$.country'))
-- engagement_time_msec:
COALESCE(engagement_time_msec, CAST(COALESCE(get_json_string(event_params_json,'$.engagement_time_msec.int_value'), get_json_string(event_params_json,'$.engagement_time_msec'),'0') AS BIGINT))
```
- **Row mới** (cột đã populate sau khi deploy) → COALESCE trả cột ngay, **không** parse (StarRocks short-circuit per-row).
- **Row cũ** (cột NULL) → fallback `get_json_string` → **số liệu vẫn đúng**, không cần reload gấp.
- (Tùy chọn, tăng tốc dữ liệu lịch sử) reload các dải ngày "nóng" từ MinIO qua
  `FirebasePipelineJob.RunDateRangeAsync(start, end, skipExport: true)` để populate cột cho row cũ; partition cũ
  hết hạn theo retention (36 tháng) sẽ tự rụng.
- (Follow-up sau khi reload đủ) có thể bỏ nhánh fallback `get_json_string` để SQL gọn + nhanh tối đa — **không**
  làm trong PR này.

---

## 6. Acceptance criteria
- Sau deploy, ingest 1 ngày mới → query bronze thấy 11 cột mới có giá trị (so khớp với `get_json_string` tương ứng
  trên cùng row: phải bằng nhau).
- Silver cho ngày mới ra **đúng cùng số liệu** như trước khi đổi (so sánh trước/sau trên 1 app có data; sai số 0).
- Silver cho ngày cũ (chưa reload) vẫn đúng số liệu nhờ fallback.
- `EXPLAIN`/log cho thấy query Silver ngày mới không còn scan-parse JSON cho các field đã materialize (hoặc đo
  thời gian: giảm rõ rệt trên app lớn).
- Đường temp-table + merge mang đủ cột (test: ingest qua path stream-load lẫn mysql đều populate cột).

## 7. Kiểm thử
- **Unit** transformer: object `{string_value:"x"}` → "x"; scalar phẳng → giá trị; thiếu field → null; số trong
  `int_value`/`double_value` → đúng kiểu; khớp từng dòng bảng mục 2.
- **Integration**: ingest 1 batch nhỏ qua cả 2 writer (stream-load & mysql) + qua temp/merge → assert 11 cột.
- **Regression số liệu**: chạy Silver trước/sau trên cùng app+ngày, so từng cột của 7 bảng silver — phải trùng.

## 8. Ràng buộc
- **Chỉ thêm cột**, không bỏ cột JSON gốc, không đổi key/partition của bronze.
- Cột mới nullable; mọi nơi chịu được NULL.
- Không đổi chữ ký public của writer/aggregator.
- Ngữ nghĩa trích phải **khớp tuyệt đối** COALESCE cũ (tránh lệch DAU/doanh thu/format).
- Giữ COALESCE-fallback trong Silver ở PR này (an toàn cho dữ liệu lịch sử).

## 9. Tệp đụng tới
| Tầng | File | Thay đổi |
|---|---|---|
| Model | `MediationPro.Core/DTOs/Firebase/FirebaseEventRow.cs` | +11 property nullable |
| Transform | `MediationPro.Infrastructure/Firebase/FirebaseEventTransformer.cs` | Helper trích scalar + set 11 field (dùng element đã parse) |
| Schema/Writer | `MediationPro.Infrastructure/StarRocks/StarRocksFirebaseWriter.cs` | CREATE main (222) + ALTER runtime (~275) + CREATE temp (618) + merge SELECT (707) + 4 writer mapping (477, 514, *Internal* ~766) |
| Silver | `MediationPro.Infrastructure/StarRocks/FirebaseSilverGoldAggregator.cs` | 7 `InsertSilver*` (196-391): cột + COALESCE fallback, đồng bộ SELECT/GROUP BY |

## 10. Tham chiếu code (đã verify)
- Silver dùng `get_json_string`: `FirebaseSilverGoldAggregator.cs` engagement 196-218, geo 221-242, device 245-270,
  retention 273-293, ad_metrics 296-331, iap 334-367, event_summary 374-390.
- Transformer parse sẵn element: `FirebaseEventTransformer.cs:91-98`, return row 140-158.
- Writer: stream-load main 462-508 (mapping 477-495), mysql main 510-568 (cột 514, params 540-555),
  CREATE main 201-262, ALTER pattern 275-289, temp CREATE 600-652, merge 680-744, biến thể *Internal* ~764+.
- Row model: `FirebaseEventRow.cs`.
