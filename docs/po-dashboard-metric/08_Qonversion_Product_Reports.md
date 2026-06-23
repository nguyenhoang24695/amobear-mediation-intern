# PO Dashboard — Qonversion Product Reports (Chart API)

> **Nguồn yêu cầu**: [`Request_PO_Dashboard_Metric_ 25_05_2026.md`](Request_PO_Dashboard_Metric_%2025_05_2026.md) — section *Qonversion report*.
> **Companion**: [`05_Slicing_Plan.md`](05_Slicing_Plan.md) · [`07_Qonversion_Integration.md`](07_Qonversion_Integration.md) · [`02_Data_Catalog.md`](02_Data_Catalog.md) · [`03_API_Contract.md`](03_API_Contract.md)
> **Created**: 2026-06-08
> **Status**: Spec — chờ pre-task reverse-engineer Chart API trước khi implement.
> **Quyết định nguồn (đã chốt với PO)**: cả 4 report lấy **100% từ Chart API của Qonversion dashboard**, KHÔNG tính lại từ `silver.qonversion_events_clean`. Mục tiêu: số khớp tuyệt đối với giao diện Analytics → Charts mà PO đang xem.

---

## 0. Vì sao KHÔNG dùng pipeline event hiện có

`silver.qonversion_events_clean` (nguồn IAP/SUB revenue của Slice 7.x) **chỉ chứa event vòng đời tiền tệ** (`subscription_started`, `trial_started`, `trial_converted`, `subscription_renewed`, `subscription_refunded`, …). Nó **không có** dân số "new user" (user cài app nhưng chưa mua/chưa trial → không có dòng nào). Vì vậy:

- **New-User-to-Trial Conversion** (mẫu số = tổng new users) **không thể tính** từ event stream.
- Các tỷ lệ khác (Trial-to-Paid, Refund rate, Active Subscriptions) nếu tự tính sẽ **lệch** so với dashboard Qonversion do khác định nghĩa nội bộ của họ (timezone, dedup, refund window, cách đếm active).

→ Để "thể hiện y như giao diện Qonversion", phải lấy **chính số Qonversion đã tính sẵn** qua Chart API. Đây là API **khác** với API raw-data export mà crawler hiện tại đang dùng (xem §3).

---

## 1. Bốn report PO yêu cầu → chart Qonversion tương ứng

Tất cả group theo **Product** (chart có dropdown *Group by* → Product) và granularity **Daily**.

| # | Report PO | Cột PO yêu cầu | Chart Qonversion (Analytics → Charts) |
|---|---|---|---|
| 1 | **Subscriptions by Product** | Product id · Active Subscriptions · New Subscriptions | nhóm **Subscriptions** (Active Subscriptions + New Subscriptions) |
| 2 | **New-User-to-Trial by Product** | Product id · Conversion rate | **New users → New-User-to-Trial Conversion** |
| 3 | **Trial-to-Paid by Product** | Product id · Conversion rate · Revenue | **Trials → Trial-to-Paid Conversion** + chart Revenue |
| 4 | **Refunds by Product** | Product id · Refunds · Refunds rate | **Refund Keeper / Refunds** |

---

## 2. Định nghĩa metric (đã chốt với PO)

Vì lấy từ Chart API, **giá trị hiển thị = giá trị Qonversion trả về**. Các quyết định dưới đây áp cho cách **gộp theo khoảng thời gian (range)** và cách lưu trữ:

| Metric | Định nghĩa / quy tắc range | Ghi chú |
|---|---|---|
| Active Subscriptions | **Chỉ đếm trong range** (theo chốt PO #1) — không cộng dồn point-in-time | Lấy series daily của chart, gộp theo cách Qonversion định nghĩa cho khoảng đã chọn |
| New Subscriptions | Tổng new subscriptions trong range, theo product | |
| New-User-to-Trial Conversion rate | = giá trị chart Qonversion (mẫu số "new users" do Qonversion tính). **Độc lập Firebase** | API v4 trả `total` (wavg rate) + `totalWeight` (≈ denominator cả range). Gộp range đúng = xem chiến lược pull §A.6 |
| Trial-to-Paid Conversion rate | = giá trị chart Qonversion | Như trên |
| Trial-to-Paid Revenue | Revenue gắn với trial-to-paid theo product | Đơn vị USD |
| Refunds | Số refund trong range theo product | |
| Refunds rate | **= refunds / (số purchase cùng product trong range)** (theo chốt PO #3) | Nếu chart Qonversion định nghĩa khác → ưu tiên số Qonversion và ghi rõ công thức họ dùng; lưu `totalWeight` khi có |

> **QUY TẮC VÀNG khi lưu tỷ lệ**: API v4 **không trả numerator/denominator trực tiếp**. Với chart `measure=percent, totalType=wavg`, API trả `total` (weighted-avg rate cho range) + `totalWeight` (≈ denominator của range). Numerator cả range ≈ `ROUND(total × totalWeight)`. **Tuyệt đối không** lấy trung bình cộng các `value` ngày — sẽ sai. Để gộp range tùy ý đúng → dùng **chiến lược per-day pull** (§A.6 Câu 1). Nếu chỉ pull một lần theo range → chỉ lưu ở mức range, không tái gộp sang range khác.

---

## 3. Nguồn dữ liệu — Chart API (KHÁC raw-data export)

### 3.1 Hạ tầng crawler tái dùng được (~80%)

Crawler hiện tại ([`QonversionWebCrawlerJob`](../../backend/MediationPro.Jobs/QonversionWebCrawlerJob.cs), [`QonversionWebCrawlerClient`](../../backend/MediationPro.Infrastructure/Qonversion/QonversionWebCrawlerClient.cs)) gọi **`api/v1/exports`** (trang `reports/raw-data/generate`) → CSV event thô. Tái dùng:

| Thành phần | Vai trò |
|---|---|
| `QonversionAccount.DashboardCookie` + `DashboardAccountUid` (entity [`QonversionAccount`](../../backend/MediationPro.Core/Entities/QonversionAccount.cs), migration `AddQonversionDashboardCookieFields`) | Auth cookie tới `dash.qonversion.io` |
| `AddDashboardHeaders` pattern (origin/referer/user-agent), xử lý 401/403 cookie hết hạn | Header gọi dashboard |
| `apps.qonversion_crawler` + `apps.qonversion_params.projectKey` + `apps.platform` | Scoping app/project/platform |
| MinIO `amobear-datalake` raw storage; [`QonversionStarRocksWriter`](../../backend/MediationPro.Infrastructure/StarRocks/QonversionStarRocksWriter.cs) (Stream Load → fallback MySQL) | Lưu raw + ghi StarRocks |
| Lịch Hangfire (incremental/rolling window) | Scheduling |
| Map app qua `silver.dim_app_identifiers` (package/store id → admob_app_id) | Chuẩn hóa app id |

### 3.2 PRE-TASK BẮT BUỘC — reverse-engineer Chart API

Endpoint chart/analytics của Qonversion **chưa có trong codebase** và **không public**. Trước khi implement, phải xác định request/response thực tế:

1. Đăng nhập `dash.qonversion.io` bằng account đang dùng cho crawler.
2. Mở DevTools → Network, vào từng chart trong §1 với **Group by = Product**, granularity **Daily**, range 7d/30d.
3. Ghi lại với mỗi chart:
   - URL + method (vd `GET/POST api/v1/charts/...` hoặc `/metrics/...`).
   - Query/body: chart id/slug, `from_timestamp`/`to_timestamp`, `platform`, `group_by=product`, `granularity=daily`, `project`, `account`.
   - **Response JSON shape**: mảng theo ngày × product; với chart tỷ lệ phải xác định có trả kèm **numerator/denominator** (count) hay chỉ %.
   - Đối chiếu nút **"Chart data"** (export) — thường trả bảng có cả count lẫn rate; nếu có, ưu tiên endpoint này vì đủ num/den.
4. Ghi kết quả vào **§3.2-Appendix** của doc này (điền vào sau pre-task) trước khi viết code.

> Nếu Qonversion có **Data/Metrics API chính thức** (REST, kèm API key) cho các metric này → ưu tiên dùng thay cookie-crawl (ổn định hơn). Kiểm tra `QonversionApiClient` + tài liệu Qonversion trong bước pre-task.

---

## 4. Pipeline mới (mirror pattern crawler hiện có)

```
Qonversion Chart API
   │ (cookie dashboard)
   ▼
QonversionChartApiClient            (mới — hoặc thêm method vào QonversionWebCrawlerClient)
   │  GetChartSeriesAsync(project, platform, chart, from, to, groupBy=product, granularity=daily)
   ▼
QonversionChartCrawlerJob           (mới — mirror QonversionWebCrawlerJob: iterate apps qonversion_crawler=true)
   │  → lưu raw JSON vào MinIO (raw/qonversion/charts/...)
   │  → ghi bronze.qonversion_chart_metrics_raw
   ▼
StarRocksTransformService.QonversionCharts  (mới — bronze→silver, dedup + map app qua dim_app_identifiers)
   ▼
silver.qonversion_product_metrics_daily
   ▼
IQonversionProductReportProvider    (mới — đọc silver)
   ▼
AppDashboardController endpoint(s)  (mới)
   ▼
FE: section "Qonversion report" (4 bảng)
```

### 4.1 Bảng StarRocks mới

> **Cập nhật sau §A.8**: Schema điều chỉnh để khớp dữ liệu thật từ API v4 (trả `total`/`totalWeight`/`totalType`/`measure`, không trả `numerator`/`denominator` trực tiếp). Chiến lược pull (a) hoặc (b) — xem §A.6 Câu 1 — quyết định cách điền `numerator`/`denominator`.

**`bronze.qonversion_chart_metrics_raw`** (long format, 1 dòng / ngày-hoặc-range / product / metric):
```sql
ingested_at      DATETIME,
source_channel   VARCHAR,          -- 'qonversion_api_v4'
qon_project_key  VARCHAR,
platform         VARCHAR,          -- 'iOS' | 'Android'
report_date      DATE,             -- ngày (chiến lược a) hoặc range end date (chiến lược b)
chart_key        VARCHAR,          -- chart_code v4: 'active-subscriptions', 'user-to-trial', ...
series_label     VARCHAR,          -- series[].label = raw product_id
metric_key       VARCHAR,          -- 'active_subscriptions' | 'new_user_to_trial_rate' | ...
metric_value     DECIMAL,          -- series[].total (chiến lược b) hoặc data[].value (chiến lược a)
total_weight     DECIMAL NULL,     -- series[].totalWeight (denominator của wavg, nullable)
total_type       VARCHAR(10),      -- 'sum' | 'wavg' — đọc từ response
measure          VARCHAR(10),      -- 'usd' | 'count' | 'percent'
numerator        DECIMAL NULL,     -- chỉ điền với chiến lược (a) per-day: ROUND(metric_value × total_weight)
denominator      DECIMAL NULL,     -- chỉ điền với chiến lược (a) per-day: = total_weight
raw_payload      JSON,
sync_batch_id    VARCHAR
```

**`silver.qonversion_product_metrics_daily`** (đã map app + dedup):
```sql
report_date      DATE,
admob_app_id     VARCHAR,
platform         VARCHAR,
product_id       VARCHAR,          -- = series_label từ bronze
metric_key       VARCHAR,          -- active_subscriptions | new_subscriptions | new_user_to_trial_rate |
                                   --   trial_to_paid_rate | trial_to_paid_revenue_usd | refunds | refund_rate
metric_value     DECIMAL,
total_weight     DECIMAL NULL,     -- denominator (wavg); NULL cho count/usd metrics
numerator        DECIMAL NULL,     -- chỉ có khi dùng chiến lược per-day pull
denominator      DECIMAL NULL,     -- chỉ có khi dùng chiến lược per-day pull
updated_at       DATETIME
```
- Dedup: `ROW_NUMBER() OVER (PARTITION BY report_date, qon_project_key, platform, product_id, metric_key ORDER BY ingested_at DESC)`.
- Map `admob_app_id` qua `silver.dim_app_identifiers` y như [`StarRocksTransformService.Qonversion.RunQonversionSilverToGoldAsync`](../../backend/MediationPro.Infrastructure/StarRocks/StarRocksTransformService.Qonversion.cs:77) (package_name / app_store_id / admob_app_id).
- Long format (metric_key) để thêm metric mới sau này không phải đổi schema.

---

## 5. Backend — Provider + Endpoint

### 5.1 Provider

`IQonversionProductReportProvider` + impl đọc `silver.qonversion_product_metrics_daily`, group theo `product_id`, gộp range theo §2 (rate = `Σ num / Σ den`).

### 5.2 Endpoint (mở rộng `AppDashboardController`)

Đề xuất 1 endpoint, chọn report bằng query:
```
GET /api/apps/{appId}/dashboard/qonversion-products?report={report}&range={range}
report ∈ subscriptions | new_user_to_trial | trial_to_paid | refunds
```
Response (ví dụ `report=subscriptions`):
```json
{
  "report": "subscriptions",
  "dateRange": { "startDate": "2026-06-01", "endDate": "2026-06-08" },
  "rows": [
    { "productId": "com.app.premium.yearly", "activeSubscriptions": 1234, "newSubscriptions": 56 }
  ],
  "meta": { "warnings": [] }
}
```
- Mỗi report có shape cột riêng (xem §1). Thêm vào [`03_API_Contract.md`](03_API_Contract.md) §3.8.
- Empty / chưa cấu hình crawler chart → `rows: []` + warning `qonversion_charts_not_configured`.
- Cache Redis cùng pattern `app-dashboard:{appId}:{range}:qon-{report}`; TTL như các section khác.

---

## 6. Frontend

- Section mới **"Qonversion report"** ở cuối tab Dashboard, 4 bảng (mirror `top-country-table.tsx`):
  - Subscriptions by Product · New-User-to-Trial by Product · Trial-to-Paid by Product · Refunds by Product.
- Format: rate `45.6%`, revenue `$1,234.56`, count dạng số.
- Empty state khi `qonversion_charts_not_configured`.
- Type mới trong `frontend/types/app-dashboard.ts`; hook `use-qonversion-products.ts`; client method.

---

## 7. Slicing (Slice 8.x — thêm vào [`05_Slicing_Plan.md`](05_Slicing_Plan.md))

| Slice | Tên | Output |
|---|---|---|
| **8.0** | **Pre-task: reverse-engineer Chart API** | Điền §3.2-Appendix: endpoint + params + response shape cho 4 chart, xác nhận có num/den |
| 8.1 | Chart crawler client + job + bronze table | Raw chart JSON theo product vào MinIO + `bronze.qonversion_chart_metrics_raw` |
| 8.2 | Transform bronze→silver + `silver.qonversion_product_metrics_daily` | Silver có data, map admob_app_id đúng |
| 8.3 | Provider + endpoint `/qonversion-products` | API trả 4 report theo product |
| 8.4 | FE 4 bảng "Qonversion report" + polish | UI hiển thị; empty state; tests |

- 8.0 là **blocker** cho 8.1–8.4. Không code khi chưa có response shape thật.
- 8.1→8.4 tuần tự (mỗi slice 1 prompt cho agent).

---

## 8. KHÔNG được làm

- Không tính 4 report từ `silver.qonversion_events_clean` (đã chốt dùng Chart API — tránh số lệch dashboard).
- Không trung bình cộng tỷ lệ ngày để ra tỷ lệ range (dùng `Σ num / Σ den`).
- Không log/đưa `DashboardCookie` ra response hay log.
- Không sửa pipeline IAP/SUB revenue hiện có (Slice 7.x) — đây là pipeline song song, bảng riêng.

---

## 9. Acceptance criteria

1. 4 bảng hiển thị đúng cột PO yêu cầu, group theo product.
2. Với 1 app có crawler chart bật: số trong từng bảng **khớp dashboard Qonversion** (đối chiếu cùng range/granularity, sai số làm tròn).
3. New-User-to-Trial hiển thị được, **không phụ thuộc Firebase**.
4. Tỷ lệ khi đổi range = `Σ num / Σ den` (verify bằng 1 range nhiều ngày).
5. App chưa bật crawler chart → `rows: []` + warning, UI không vỡ.
6. Không rò rỉ cookie; `dotnet build` + `dotnet test` xanh; FE `typecheck`/`test` xanh.

---

## 10. Câu hỏi mở (giải quyết trong Slice 8.0)

- Chart API có trả **numerator/denominator** cho các tỷ lệ không? (quyết định cách gộp range — §2).
- "Active Subscriptions" Qonversion định nghĩa chính xác thế nào khi group by product + Daily? (đối chiếu với chốt "chỉ đếm trong range").
- "Refunds rate" của chart Qonversion mẫu số là gì? (so với chốt PO: refunds / purchases cùng product) — nếu khác, ghi rõ và ưu tiên số Qonversion.
- Qonversion có **Data/Metrics API chính thức** (API key) thay cookie-crawl không? (ổn định hơn).
- Product id Qonversion ↔ product hiển thị: cần map tên đẹp không, hay show raw product_id (PO chỉ yêu cầu Product id → mặc định show raw).

---

## §3.2-Appendix — Chart API Reference Shape (spec v4) + Chiến lược Cookie-crawl

> **Nguồn shape**: OpenAPI spec v4 (`rest-api-v4.yaml`) làm tham chiếu cấu trúc; **ĐÃ có network capture thật** (xem A.0) — A.0 là nguồn ĐÚNG, ưu tiên hơn A.1–A.5.
> **Auth thực tế**: **Cookie-crawl** (tái dùng `QonversionAccount.DashboardCookie` + `AddDashboardHeaders`). Dashboard `dash.qonversion.io` gọi API nội bộ bằng cookie session.

---

### A.0 — ✅ VERIFIED từ network capture thật (2026-06-08) — SUPERSEDES A.1–A.5 khi khác

Đã bắt request thật từ dashboard (đã đăng nhập, **Group by = Product**, chart New-User-to-Trial). Các fact dưới là CHÍNH XÁC; phần A.1–A.5 (dựa trên spec v4) có **host/path SAI** so với thực tế — dùng A.0.

**Endpoint thật (KHÁC v4 mà draft giả định):**
```
GET https://dash.qonversion.io/api/v1/analytics/chart/{chart_code}
```
- Host = `dash.qonversion.io` (KHÔNG phải `api.qonversion.io`); path `/api/v1/analytics/chart/...` (**v1**, "chart" số ít).
- API nội bộ của dashboard, **cookie-authed** → đúng hướng cookie-crawl.

**Params thật** (verify với `user-to-trial-conversion`):
`unit=day` · `segmentation=product_id` · `environment=1` · `project={projectKey}` (vd `LalX6NG_` = `apps.qonversion_params.projectKey`) · `currency=USD` · `from`/`to` (Unix giây).

**✅ MV-1 RESOLVED:** `user-to-trial-conversion` **CÓ** hỗ trợ `segmentation=product_id` → report #2 "by product" KHẢ THI, không cần bàn lại scope PO.

**Response envelope KHÁC v4:** bọc trong `{"success": true, "data": { ...chart... }}` → parser đọc `.data`. Bên trong `data` khớp shape v4 (code/from/to/unit/environment/seriesRelation/maxSeries/`totalType`/`measure`/segmentation/`series[]`).

**series[] thật** (mẫu, đã sanitize):
```json
{ "label": "qon_sub_week_v2:qon-sub-week-v2:qon-sub-week-v2-trial",
  "total": 0.31, "totalPrev": 0.24, "totalWeight": 957, "totalPrevWeight": 1669,
  "data": [ { "start_time": 1780876800, "value": 0.31 } ] }
```
Chart `user-to-trial-conversion`: `totalType="wavg"`, `measure="percent"`.

**Xác nhận then chốt:**
1. `totalWeight` (957) = **denominator** của range query → numerator suy ra được. ✅
2. Request mẫu là **1 ngày** (from..to = 1 ngày) → `data[]` 1 điểm + `totalWeight` ứng đúng ngày → **chiến lược per-day pull (A.6 §a) hoạt động**.
3. ⚠️ **Đơn vị percent**: `value`/`total` ĐÃ là **số phần trăm trực tiếp** (`0.31` = **0.31%**, KHÔNG phải 31%). Bằng chứng: trục Y chart 0–0.8%, headline 0.06%.
   - Hiển thị `{value}%` trực tiếp, **KHÔNG ×100**.
   - **Numerator = `ROUND(total/100 × totalWeight)`** (≈ 0.0031×957 ≈ 3), KHÔNG phải `total×totalWeight`.
4. `label` = chuỗi ghép `{product}:{store_product_id}:{…-trial}`, không phải product_id sạch. Khi hiển thị "Product id": đề xuất giữ cả label hoặc tách phần trước dấu `:` đầu (chốt khi làm FE 8.4).

**✅ ĐÃ verify TẤT CẢ 7 chart code (network thật, range 7 ngày, `segmentation=product_id`):**

| Report | chart_code ĐÚNG | measure | totalType | seg product_id | `total` của series nghĩa là |
|---|---|---|---|---|---|
| New-User-to-Trial | `user-to-trial-conversion` | percent | wavg | ✅ | rate range (wavg) + `totalWeight`=denominator |
| Active Subscriptions | `active-subscriptions` | count | sum* | ✅ (17 series) | **end-of-period** (`total`=lastPoint, KHÔNG phải tổng) |
| New Subscriptions | `new-subscriptions` | count | sum | ✅ (22) | tổng new subs trong range |
| Trial-to-Paid rate | `trial-to-paid` | percent | wavg | ✅ (5) | rate range + `totalWeight`=denominator (số trial) |
| Trial-to-Paid Revenue | `proceeds` | usd | sum | ✅ (8) | **tổng proceeds/product** (KHÔNG riêng trial) |
| Refunds | `refunds` | **usd** | sum | ✅ (2) | **số TIỀN refund (USD)**, KHÔNG phải count |
| Refund Rate | `refund-rate` | percent | wavg | ✅ (8) | rate + `totalWeight`=denominator |

\* `trial-to-paid-conversion` → **HTTP 400** (sai code); code đúng là `trial-to-paid`. Lưu ý KHÁC với New-User-to-Trial (dùng `user-to-trial-conversion` có hậu tố `-conversion`). Mỗi code phải dùng đúng tên.

**Chốt được từ data thật:**
- **Mọi chart hỗ trợ `segmentation=product_id`** → cả 4 report by-product KHẢ THI.
- **`series[].total` = đúng con số Qonversion hiển thị cho range** → dùng `total` trực tiếp làm giá trị range, bất kể `totalType`. Per-day dùng `data[]`.
- **active-subscriptions**: `total`=178 = `lastPoint`=178 trong khi `firstPoint`=210 ⇒ `total` là **end-of-period** (số active cuối kỳ), KHÔNG phải tổng 8 ngày. → "Active trong range" = `total`. KHÔNG sum daily.
- **percent là số % trực tiếp** (user-to-trial `0.31`→0.31%; trial-to-paid `20`→20%). ⇒ numerator = `ROUND(total/100 × totalWeight)`.

**✅ 2 điểm PO ĐÃ chốt (2026-06-08):**
1. **Trial-to-Paid "Revenue"** = **tổng proceeds/product** (chart `proceeds`). Không tách riêng trial-converted.
2. **"Refunds"** = **số TIỀN refund (USD)** (chart `refunds`, measure=usd). Không cần count.

---

### A.1 Quyết định nguồn — Cookie-crawl (KHÔNG dùng Secret Key v4)

**Quyết định đã chốt**: KHÔNG có Secret Key xác nhận → dùng **cookie-crawl** như crawler raw-data hiện có.

**Sự thật nền**: Dashboard `dash.qonversion.io` render các chart bằng cách gọi API analytics với **cookie session**. Endpoint nhiều khả năng là `api.qonversion.io/v4/analytics/charts/{chart_code}` (cookie-authed thay vì Bearer), nhưng **host/path/auth phải bắt từ Network thật** trước Slice 8.1.

#### Tái dùng từ crawler raw-data hiện có:
- `QonversionAccount.DashboardCookie` + `DashboardAccountUid` — auth cookie tới dashboard
- `AddDashboardHeaders` pattern (Cookie, origin, referer, user-agent) — thêm header `chart/analytics` referer
- Xử lý 401/403 cookie hết hạn → cùng cơ chế renew như `QonversionWebCrawlerClient`

#### API v4 (Secret Key Bearer) — Reference shape only
- **Base URL tham chiếu**: `https://api.qonversion.io/v4`
- **Endpoint shape**: `GET /v4/analytics/charts/{chart_code}` — dùng làm mẫu kỳ vọng của response
- **KHÔNG phải nguồn gọi thực tế** (chưa xác nhận Secret Key hoạt động với v4 analytics)

#### ~~API v1 (Project API Key)~~ — CHƯA VERIFY, BỎ QUA
> **(CHƯA VERIFY — không có trong OpenAPI spec v4 chính thức; có thể là legacy. Bỏ qua.)**

**→ Chiến lược**: Cookie-crawl giống `QonversionWebCrawlerClient`, nhưng endpoint chart thay vì `/exports`.

---

### A.2 Mapping 4 report PO → Chart code (ĐÃ verify network thật)

> Endpoint thật: `GET https://dash.qonversion.io/api/v1/analytics/chart/{chart_code}` (cookie, `project={projectKey}`). Xem A.0.

| # | Report PO | chart_code ĐÚNG | measure | Ghi chú |
|---|---|---|---|---|
| 1a | Active Subscriptions by Product | `active-subscriptions` | count | `total`=end-of-period |
| 1b | New Subscriptions by Product | `new-subscriptions` | count | `total`=tổng range |
| 2 | New-User-to-Trial Conversion by Product | `user-to-trial-conversion` | percent | có `-conversion` |
| 3a | Trial-to-Paid Conversion by Product | `trial-to-paid` | percent | KHÔNG có `-conversion` (suffix → 400) |
| 3b | Trial-to-Paid Revenue by Product | `proceeds` | usd | = tổng proceeds/product (⚠️ PO chốt) |
| 4a | Refunds by Product | `refunds` | usd | = $ refund, KHÔNG phải count (⚠️ PO chốt) |
| 4b | Refund Rate by Product | `refund-rate` | percent | mẫu số = Qonversion def |

---

### A.3 Request Parameters (kỳ vọng theo spec v4 — phải verify từ Network thật)

> ⚠️ Params bên dưới dựa trên OpenAPI spec v4. Khi bắt được Network thật (xem A.9), đối chiếu và cập nhật bất kỳ sai lệch.

| Parameter | Loại | Bắt buộc | Giá trị để dùng | Ghi chú |
|---|---|---|---|---|
| `chart_code` | path | ✅ | Xem bảng A.2 | |
| `from` | query | ❌ | Unix timestamp (seconds) | Default: 7 ngày trước `to` |
| `to` | query | ❌ | Unix timestamp (seconds) | Default: hiện tại |
| `unit` | query | ❌ | `day` | `hour`/`day`/`week`/`month` |
| `environment` | query | ❌ | `1` (production) | `0`=sandbox, `1`=production |
| `segmentation` | query | ❌ | `product_id` | **Để group by Product — phải verify hỗ trợ từng chart** |
| `currency` | query | ❌ | `USD` | Chỉ áp dụng cho chart revenue |
| `max_series` | query | ❌ | `500` | Max 500; default 50 |
| `filter[target_platform][]` | query | ❌ | `iOS` hoặc `Android` | Filter by platform |

**Headers — cookie-crawl (theo `AddDashboardHeaders`):**
```
Cookie: <DashboardCookie>          # QonversionAccount.DashboardCookie
origin: https://dash.qonversion.io
referer: https://dash.qonversion.io/analytics/charts/<chart_code>?account=<DashboardAccountUid>
user-agent: Mozilla/5.0 ...
```
> **Nếu dùng được Secret Key v4** (sau khi verify MV-2 trong A.9): thay bằng `Authorization: Bearer <sk_...>` — không cần cookie/origin/referer.

---

### A.4 Mẫu Request (cookie-crawl — phải cập nhật sau khi bắt Network thật)

> ⚠️ URLs/params kỳ vọng theo spec v4. Thay `<COOKIE>`, `<PROJECT_KEY>`, `<ACCOUNT_UID>` bằng giá trị thật. Sau khi bắt HAR → so sánh và cập nhật nếu khác.

```bash
# Active Subscriptions, group by product, daily, 7 ngày gần nhất
# Auth: cookie-crawl (pattern AddDashboardHeaders)
curl -s \
  -H "Cookie: <DASHBOARD_COOKIE>" \
  -H "origin: https://dash.qonversion.io" \
  -H "referer: https://dash.qonversion.io/analytics/charts/active-subscriptions?account=<ACCOUNT_UID>" \
  -H "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://api.qonversion.io/v4/analytics/charts/active-subscriptions?unit=day&segmentation=product_id&environment=1&from=1748736000&to=1749340800"
```

```bash
# New-User-to-Trial Conversion, group by product
# ⚠️ MUST-VERIFY: user-to-trial có hỗ trợ segmentation=product_id không? Xem A.9 MV-1
curl -s \
  -H "Cookie: <DASHBOARD_COOKIE>" \
  -H "origin: https://dash.qonversion.io" \
  -H "referer: https://dash.qonversion.io/analytics/charts/user-to-trial?account=<ACCOUNT_UID>" \
  -H "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://api.qonversion.io/v4/analytics/charts/user-to-trial?unit=day&segmentation=product_id&environment=1&from=1748736000&to=1749340800"
```

```bash
# Refund Rate, group by product
curl -s \
  -H "Cookie: <DASHBOARD_COOKIE>" \
  -H "origin: https://dash.qonversion.io" \
  -H "referer: https://dash.qonversion.io/analytics/charts/refund-rate?account=<ACCOUNT_UID>" \
  -H "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://api.qonversion.io/v4/analytics/charts/refund-rate?unit=day&segmentation=product_id&environment=1&from=1748736000&to=1749340800"
```

---

### A.5 Response JSON Shape (sanitized, từ OpenAPI spec chính thức)

Tất cả chart dùng cùng một envelope. Khi `segmentation=product_id`, mỗi phần tử trong `series[]` là một product:

```json
{
  "object": "analytics_chart",
  "url": "/v4/analytics/charts/active-subscriptions",
  "code": "active-subscriptions",
  "from": 1748736000,
  "to": 1749340800,
  "unit": "day",
  "environment": 1,
  "currency": "",
  "measure": "count",
  "totalType": "sum",
  "seriesRelation": "partsOfWhole",
  "maxSeries": 50,
  "segmentation": "product_id",
  "series": [
    {
      "label": "com.example.app.premium.monthly",
      "total": 1234.0,
      "totalPrev": 1100.0,
      "data": [
        { "start_time": 1748736000, "value": 1200.0 },
        { "start_time": 1748822400, "value": 1234.0 }
      ]
    },
    {
      "label": "com.example.app.premium.yearly",
      "total": 456.0,
      "totalPrev": 400.0,
      "data": [
        { "start_time": 1748736000, "value": 450.0 },
        { "start_time": 1748822400, "value": 456.0 }
      ]
    }
  ],
  "summarySeries": {
    "label": "Total",
    "total": 1690.0,
    "data": [
      { "start_time": 1748736000, "value": 1650.0 },
      { "start_time": 1748822400, "value": 1690.0 }
    ]
  }
}
```

**Với chart tỷ lệ** (`user-to-trial`, `trial-to-paid`, `refund-rate`): `measure = "percent"`, `value` là giá trị thập phân (ví dụ: `0.456` = 45.6%):

```json
{
  "code": "user-to-trial",
  "measure": "percent",
  "totalType": "wavg",
  "series": [
    {
      "label": "com.example.app.premium.monthly",
      "total": 0.456,
      "totalWeight": 10000.0,
      "data": [
        { "start_time": 1748736000, "value": 0.45 },
        { "start_time": 1748822400, "value": 0.46 }
      ]
    }
  ]
}
```

**Product ID field**: `series[].label` chứa raw product_id từ App Store/Google Play (ví dụ: `com.example.app.premium.monthly`).

---

### A.6 Giải đáp 5 câu hỏi mở (§10)

#### Câu 1: Có numerator/denominator không?

**❌ KHÔNG.** API v4 **không trả `numerator` hay `denominator`** trong response. Spec `V4AnalyticsSeriesDataPoint` chỉ có `start_time` + `value` (không có weight theo ngày). `V4AnalyticsSeries` có `totalWeight` nhưng đây là weight **của cả range đã query**, không phải của từng ngày.

**Cơ chế API cho chart tỷ lệ** (`measure=percent`, `totalType=wavg`):
- `series[].data[].value` = tỷ lệ của ngày đó (không kèm weight ngày)
- `series[].total` = weighted-average rate của **toàn bộ range query**
- `series[].totalWeight` = tổng denominator của **toàn bộ range query** (≈ tổng users/subscriptions trong range)
- **Numerator cả range ≈ `ROUND(total/100 × totalWeight)`** — chỉ tính được ở mức range, không phải mức ngày. **Lưu ý ÷100** vì `total` đã ở đơn vị percent (xem A.0 §3: `0.31` = 0.31%).

**⚠️ 2 lỗi cần tránh**:
- `ROUND(value_ngày × totalWeight_range)` — SAI: nhân tỷ lệ ngày với weight toàn range.
- `ROUND(total × totalWeight)` (thiếu ÷100) — SAI: cho ra số gấp 100× vì `total` là percent, không phải fraction.

**Hai chiến lược pull — chọn một trước Slice 8.1:**

**(a) Per-day pull** ← Khuyến nghị:
- Gọi API với `from = to = ngày N` (range 1 ngày), `unit=day` → mỗi call cho 1 ngày
- Mỗi ngày là 1 series với `total` = rate ngày đó, `totalWeight` = denominator ngày đó
- Lưu: `metric_value=total`, `total_weight=totalWeight`, `numerator=ROUND(total×totalWeight)`, `denominator=totalWeight`
- Gộp range bất kỳ sau này: `Σ numerator / Σ denominator` → **đúng**
- Nhược: N lần gọi API cho N ngày; rate limit 30 req/min

**(b) Per-range pull** ← Đơn giản hơn:
- Gọi API một lần với range nhiều ngày (vd `last7`)
- Lưu `metric_value=total`, `total_weight=totalWeight` **ở mức range** (không tách theo ngày)
- **Không thể tái gộp sang range khác** — chỉ hiển thị đúng range đã pull
- Phù hợp nếu FE chỉ cần xem các range cố định (today / last7 / last30)

#### Câu 2: "Active Subscriptions" Qonversion định nghĩa thế nào?

**Chưa verify `totalType` từ response thật**. Phân tích từ semantics:
- Active Subscriptions là **metric tồn kho (stock)** — số lượng tại một thời điểm, không phải flow
- Theo tài liệu Qonversion và thông lệ analytics: Active Subscriptions = **số active ở cuối kỳ** (end-of-period snapshot)
- Nếu đúng end-of-period: `data[-1].value` (điểm cuối range) phản ánh đúng "đang active", còn `total` (nếu `totalType=sum`) sẽ là tổng các snapshot ngày — **không có ý nghĩa thực tế**

> ⚠️ **MUST-VERIFY** (xem A.9): Gọi `/meta` hoặc nhìn response thật để xác nhận `totalType` của `active-subscriptions`. Giả định:
> - Nếu `totalType=sum` → `total` là tổng snapshot ngày (không dùng `total`, chỉ lưu daily `value`)
> - Nếu `totalType=wavg` hoặc endpoint định nghĩa khác → xử lý theo response
>
> **Hiển thị**: Nhiều khả năng nên dùng `data[-1].value` (snapshot cuối range) thay vì `total`. Cần chốt với PO sau khi có response thật.

#### Câu 3: "Refund Rate" mẫu số của Qonversion là gì?

Qonversion chart `refund-rate`: `measure: "percent"`. Từ tài liệu analytics chính thức:
> "Refund Rate" = refunded subscriptions / total subscriptions (không phải purchases)

**Khác với chốt PO** (refunds / purchases cùng product). Cụ thể:
- **Qonversion**: `refund_rate = refunded_subscriptions / total_subscriptions_in_range`
- **PO muốn**: `refund_rate = refunds / purchases_same_product`

**Xử lý**: Lưu cả hai:
- `refunds` (count) từ chart `refunds` → đây là số refund tuyệt đối, đúng với PO
- `refund_rate` từ chart `refund-rate` → giá trị Qonversion (có thể khác PO)
- Hiển thị `refund_rate` theo Qonversion, tooltip ghi rõ "Theo định nghĩa Qonversion"

#### Câu 4: Nên dùng nguồn nào — cookie-crawl hay API v4 Secret Key?

**Quyết định đã chốt: Cookie-crawl là nguồn chính** (không có Secret Key xác nhận).

| | Cookie-crawl dashboard (CHỌN) | API v4 Secret Key (dự phòng) |
|---|---|---|
| Auth | Cookie session — tái dùng `DashboardCookie` + `AddDashboardHeaders` | ❌ Chưa có Secret Key xác nhận hoạt động với v4 analytics |
| Cơ chế hết hạn | Cookie expire → cùng renew flow như `QonversionWebCrawlerClient` (401/403 throw → admin cập nhật) | Secret Key không hết hạn — nhưng không có để dùng |
| Endpoint | Nhiều khả năng `api.qonversion.io/v4/analytics/charts/{code}` (verify bằng HAR) | `api.qonversion.io/v4/analytics/charts/{code}` (confirmed từ spec) |
| Segmentation by product | ⚠️ Hỗ trợ tuỳ chart — cần verify UI/HAR (xem A.9 MV-1) | ⚠️ Hỗ trợ tuỳ chart — cần verify `/meta` |
| Đã có credential | ✅ `DashboardCookie` + `DashboardAccountUid` trong DB | ❌ `SecretKey` chưa verify dùng được analytics v4 |

**→ Slice 8.1 implement theo cookie-crawl**; nếu sau này có Secret Key hoạt động → đổi auth, giữ nguyên endpoint và response parsing.

#### Câu 5: Product id hiển thị

`series[].label` = raw product ID từ App Store/Google Play (string). PO chỉ yêu cầu Product ID → **show raw**, không cần map tên đẹp.

---

### A.7 Metric key cuối cùng cho schema silver

Dựa trên API thực tế, danh sách `metric_key` cho `silver.qonversion_product_metrics_daily`:

| metric_key | chart_code (verified) | measure | `total` = | Cần lưu thêm |
|---|---|---|---|---|
| `active_subscriptions` | `active-subscriptions` | `count` | **end-of-period** | — (dùng `total`, không sum daily) |
| `new_subscriptions` | `new-subscriptions` | `count` | tổng range | — |
| `new_user_to_trial_rate` | `user-to-trial-conversion` | `percent` | wavg rate | `denominator`=`totalWeight`; numerator=`ROUND(total/100×totalWeight)` |
| `trial_to_paid_rate` | `trial-to-paid` | `percent` | wavg rate | `denominator`=`totalWeight`; numerator=`ROUND(total/100×totalWeight)` |
| `trial_to_paid_revenue_usd` | `proceeds` | `usd` | tổng range | ⚠️ = tổng proceeds/product (KHÔNG riêng trial — PO chốt) |
| `refunds_usd` | `refunds` | `usd` | tổng range | ⚠️ = $ refund (KHÔNG phải count — PO chốt nếu cần count) |
| `refund_rate` | `refund-rate` | `percent` | wavg rate | `denominator`=`totalWeight`; mẫu số theo def Qonversion ≠ PO |

---

### A.8 Đề xuất cập nhật schema (§4.1)

Schema đã được cập nhật trực tiếp ở §4.1 để khớp dữ liệu thật từ API v4. Tóm tắt thay đổi so với draft ban đầu:

**`bronze.qonversion_chart_metrics_raw`** — thêm/sửa cột:
- Thêm `total_weight DECIMAL NULL` = `series[].totalWeight` từ API
- Thêm `total_type VARCHAR(10)` = `'sum'|'wavg'` đọc từ response
- Thêm `measure VARCHAR(10)` = `'usd'|'count'|'percent'`
- Thêm `series_label VARCHAR` = `series[].label` (= product_id)
- `numerator`/`denominator`: **chỉ điền khi dùng chiến lược (a) per-day pull**:
  - `numerator = ROUND(metric_value × total_weight)` — đây là numerator của **1 ngày**, valid khi mỗi call = 1 ngày
  - `denominator = total_weight` — denominator của 1 ngày
  - **KHÔNG dùng công thức này** nếu `metric_value` là rate của range nhiều ngày

**`silver.qonversion_product_metrics_daily`** — thêm cột `total_weight`, diễn giải:
- `totalType=sum` (count/usd metrics): `numerator=NULL`, `denominator=NULL`, `total_weight=NULL`
- `totalType=wavg` (rate metrics) + chiến lược (a): `numerator=ROUND(value×weight)`, `denominator=weight`, `total_weight=weight`
- `totalType=wavg` + chiến lược (b): `metric_value=total_range`, `total_weight=totalWeight_range`, `numerator=NULL`, `denominator=NULL`

---

### A.9 ⚠️ MUST-VERIFY trước Slice 8.1

Các mục sau **phải được xác nhận** trước khi viết code client. **Chị bắt HAR/Network, không cần Secret Key.**

#### MV-0 (HARD BLOCKER) — Bắt Network thật cho 4 chart

Mở `dash.qonversion.io` bằng browser đang đăng nhập, DevTools → Network, vào từng chart với **Group by = Product**, **Daily**, range 7d. Ghi lại (sanitize cookie/token trước khi dán vào doc):

1. **Host + path đầy đủ + method** (có đúng là `api.qonversion.io/v4/analytics/charts/...` không?)
2. **Cách auth thật**: `Cookie` header, có cần `origin`/`referer`/CSRF không?
3. **Query params thật**: chart_code, from/to, unit, segmentation, environment
4. **Response shape thật**: có `series[].label`=product_id, `total`, `totalWeight`, `data[]` không? (so với A.5)

Nếu **không bắt được HAR** (no browser access) → Slice 8.1 **phải gửi yêu cầu cho PO/dev đang đăng nhập** lấy HAR trước.

#### MV-1 (BLOCKER) — Segmentation `product_id` cho từng chart (vía UI)

Trong dashboard, bật **Group by = Product** cho từng chart:

| Chart | Thử Group by Product? | Kết quả |
|---|---|---|
| Active Subscriptions | ❓ | [ghi vào đây sau khi verify] |
| **New-User-to-Trial** | ❓ | [⚠️ Nếu không có → STOP] |
| Trial-to-Paid | ❓ | [ghi vào đây sau khi verify] |
| Refund Rate | ❓ | [ghi vào đây sau khi verify] |

**Nếu `New-User-to-Trial` KHÔNG cho group by Product:**
→ **STOP — Report #2 "New-User-to-Trial by Product" bất khả thi.** Ghi rõ ở đầu doc và báo PO quyết định scope thay thế trước khi tiếp tục Slice 8.1.

#### MV-2 — Xác nhận `totalType` và `measure` từng chart

Từ response HAR (MV-0), ghi lại:

| Chart | `measure` thật | `totalType` thật | Ghi chú |
|---|---|---|---|
| `active-subscriptions` | ❓ | ❓ | Nếu `totalType=sum`: dùng `data[-1].value`, không dùng `total` |
| `user-to-trial` | ❓ | ❓ | |
| `trial-to-paid` | ❓ | ❓ | |
| `refund-rate` | ❓ | ❓ | |
| `refunds` | ❓ | ❓ | |
| `new-subscriptions` | ❓ | ❓ | |
| `proceeds` | ❓ | ❓ | Có filter `revenue_event` được không? |

#### MV-3 — `trial_to_paid_revenue_usd`

Từ response chart `proceeds` (MV-0): có `filter[revenue_event][]` hoạt động không (lọc chỉ `trial_converted`)? Nếu không → cần dùng chart khác hoặc tính xấp xỉ.

#### Đã xác nhận (không cần verify thêm)
- **Timezone**: UTC (ghi rõ trong tài liệu Qonversion). `start_time` là UTC Unix seconds.
- **Product ID field**: `series[].label` = raw product_id string.
- **Product ID hiển thị**: show raw, không map tên đẹp (PO yêu cầu).
- **Shape tham chiếu**: OpenAPI spec v4 (`V4AnalyticsChart` → `V4AnalyticsSeries` → `V4AnalyticsSeriesDataPoint`) — dùng làm mẫu kỳ vọng, xác nhận lại bằng HAR thật.
