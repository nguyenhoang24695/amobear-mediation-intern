---
name: Migrate Jobs Airflow Hangfire
overview: "Chuyển đổi hệ thống job hiện tại (78 Hangfire jobs) sang kiến trúc hai tầng: giữ ~15 job đơn giản ở Hangfire, chuyển ~63 job pipeline sang Apache Airflow thông qua 8 DAG, bao gồm thiết lập docker-compose mới cho Airflow và tạo Internal Jobs API cho Airflow gọi vào .NET."
todos:
  - id: docker-airflow
    content: Tao docker-compose config cho Airflow (webserver, scheduler, worker, init) + Dockerfile + entrypoint
    status: completed
  - id: postgres-init-airflow
    content: Them database airflow vao docker/postgres/init-databases.sql
    status: completed
  - id: internal-jobs-api
    content: Tao InternalJobsController (route /internal/jobs/{jobKey}/run) voi API key auth, refactor tu JobsTestController
    status: completed
  - id: internal-api-config
    content: Them config InternalApi (ApiKey, AllowedHosts) vao appsettings.json va middleware xac thuc
    status: completed
  - id: dotnet-http-operator
    content: Viet custom Airflow operator DotnetHttpOperator goi .NET Internal API
    status: completed
  - id: dag-performance-admob
    content: Viet DAG performance_admob_pipeline.py (loi doanh thu)
    status: completed
  - id: dag-daily-digest
    content: Viet DAG daily_digest_pipeline.py (sensor cho performance + digest chain)
    status: completed
  - id: dag-appsflyer
    content: Viet DAG appsflyer_pipeline.py
    status: completed
  - id: dag-appmetrica
    content: Viet DAG appmetrica_pipeline.py
    status: completed
  - id: dag-qonversion
    content: Viet DAG qonversion_pipeline.py
    status: completed
  - id: dag-apple-store
    content: Viet DAG apple_store_pipeline.py
    status: completed
  - id: dag-firebase
    content: Viet DAG firebase_pipeline.py
    status: completed
  - id: dag-meta-tiktok
    content: Viet DAG meta_tiktok_pipeline.py
    status: completed
  - id: disable-hangfire-migration
    content: Tao migration disable Hangfire jobs da migrate sang Airflow
    status: completed
  - id: dag-factory
    content: Xay dung DAG Factory (YAML -> DAG dong) cho admin tu tao pipeline
    status: completed
isProject: false
---

# Kế hoạch chuyển đổi Job System: Hangfire + Apache Airflow

Dựa trên [tài liệu giải pháp](docs/toi%20uu%20job%20hangfire/giai-phap-toi-uu-job-system.md), kế hoạch này chia thành **4 giai đoạn** (~3 tháng), chuyển ~63/78 job sang Airflow DAG và giữ ~15 job đơn giản ở Hangfire.

---

## Giai đoạn 1 — Nền tảng (tuần 1-3)

### 1.1 Docker Compose cho Airflow

Thêm các service Airflow vào `docker-compose.yml` hiện tại (hoặc tạo `docker-compose.airflow.yml` riêng dùng `extends`):

- **airflow-postgres**: DB metadata riêng (database `airflow` trong PostgreSQL đã có, thêm vào [docker/postgres/init-databases.sql](docker/postgres/init-databases.sql))
- **airflow-webserver**: Airflow 2.9+ webserver (port 8080)
- **airflow-scheduler**: Airflow scheduler
- **airflow-worker**: CeleryExecutor worker (dùng Redis đã có làm broker)
- **airflow-init**: Init DB + tạo admin user

Cấu trúc thư mục mới:

```
docker/airflow/
  Dockerfile                  # Airflow 2.9+ với custom operators
  requirements.txt            # Python deps (requests, etc.)
  airflow.cfg (hoặc env vars)
  entrypoint.sh
airflow/
  dags/                       # DAG files (Python)
    performance_admob_pipeline.py
    daily_digest_pipeline.py
    appsflyer_pipeline.py
    appmetrica_pipeline.py
    qonversion_pipeline.py
    apple_store_pipeline.py
    meta_tiktok_pipeline.py
    firebase_pipeline.py
  plugins/
    operators/
      dotnet_http_operator.py   # Custom operator gọi .NET API
      starrocks_sql_operator.py # Chạy SQL trên StarRocks
  config/
    dag_factory/                # YAML configs cho DAG động (giai đoạn 4)
```

### 1.2 Internal Jobs API Controller

Tách từ [JobsTestController](backend/MediationPro.Api/Controllers/JobsTestController.cs) (1840 dòng, route `api/v1/jobs-test`) thành controller mới cho internal/production use:

- Tạo `InternalJobsController` tại `backend/MediationPro.Api/Controllers/InternalJobsController.cs`
- Route: `POST /internal/jobs/{jobKey}/run` — dùng cho cả Airflow và Hangfire
- Auth: API Key hoặc mTLS (header `X-Internal-Api-Key` kiểm tra theo config `InternalApi:ApiKey`)
- Hỗ trợ parameter: `?date=yyyy-MM-dd`, `?startDate=...&endDate=...` cho backfill
- Response chuẩn: `{ "jobKey": "...", "status": "completed|failed", "durationMs": ..., "error": "..." }`
- Logic vẫn gọi các job class hiện tại (`PerformanceSyncJob`, `SilverGoldTransformJob`, ...) — **không viết lại logic nghiệp vụ**

Pattern hiện tại trong `JobsTestController` đã inject tất cả job classes (dòng 62-113), chỉ cần refactor thành lookup dictionary `jobKey -> Func<Task>`.

### 1.3 Custom Airflow Operator: `DotnetHttpOperator`

Operator Python gọi .NET Internal Jobs API:

```python
class DotnetHttpOperator(BaseOperator):
    def __init__(self, job_key, params=None, timeout=600, **kwargs):
        ...
    def execute(self, context):
        # POST http://mediationpro-backend:5000/internal/jobs/{job_key}/run
        # Truyền data_interval_start/end từ Airflow context
        # Retry logic + timeout + logging
```

### 1.4 Cấu hình auth giữa Airflow va .NET

- Thêm section `InternalApi` vào [appsettings.json](backend/MediationPro.Api/appsettings.json):
  ```json
  "InternalApi": {
    "ApiKey": "...",
    "AllowedHosts": ["airflow-worker", "localhost"]
  }
  ```
- Middleware/filter kiểm tra `X-Internal-Api-Key` cho route `/internal/*`

---

## Giai đoạn 2 — Migrate pipeline loi (tuần 3-6)

### 2.1 DAG 6: `performance_admob_pipeline` (uu tien cao nhat)

Job hiện tại trong [HangfireJobScheduleService.cs](backend/MediationPro.Api/Services/HangfireJobScheduleService.cs) (dòng 29-39):
- `performance-sync-today` -> `PerformanceSyncJob.SyncTodayAsync`
- `performance-sync-recent` -> `PerformanceSyncJob.SyncLast3DaysAsync`
- `performance-sync-admob-revenue-today/recent` (migration 20260522)
- `silver-gold-transform-job` -> `SilverGoldTransformJob.RunTransformAsync`
- `sow-calculator-job`, `waterfall-recommendation-job`, `waterfall-apply-policy-job`
- `alert-calculation-job`
- `dashboard-cache-today/7/14/30`

DAG Airflow: tạo dependency chain thay vì dựa vào cron timing.

### 2.2 DAG 7: `daily_digest_pipeline`

Job hiện tại (dòng 75-85):
- `dau-dav-calculation-job` -> `DauDavCalculationJob`
- `daily-app-insight-job` -> `DailyAppInsightJob`
- Tất cả digest: `ua-daily-digest-job`, `po-daily-digest-job`, `da-daily-digest-job`, `devops-daily-digest-job`, `mediation-daily-digest-job`, `qa-daily-digest-job`, `bod-daily-digest-job`
- `bod-weekly-portfolio-aggregate-job`

DAG Airflow: dùng Sensor chờ performance pipeline hoàn tất trước khi chạy digest.

### 2.3 DAG 2: `appsflyer_pipeline`

Job hiện tại (dòng 42-59):
- `appsflyer-installs-report-today/t3-t1/lookback-weekly`
- `appsflyer-master-sync-today/t3-t1/lookback-weekly`
- `appsflyer-master-cohort-weekly`

### 2.4 DAG 1: `appmetrica_pipeline`

Job hiện tại (dòng 87-91):
- `appmetrica-daily-stats`, `appmetrica-logs-today`, `appmetrica-logs-backfill`
- `appmetrica-datastream-events-last3days`, `appmetrica-game-silver-gold`

**Chiến lược dual-run**: Mỗi DAG chạy song song với Hangfire 2 tuần, đối chiếu kết quả, sau đó tắt cron Hangfire tương ứng (set `enabled = false` trong DB).

---

## Giai đoạn 3 — Migrate phần còn lại (tuần 6-9)

### 3.1 DAG 4: `qonversion_pipeline`

Job (dòng 94-99): `qonversion-web-crawler-*`, `qonversion-bronze-to-silver`, `qonversion-silver-to-gold`, `gcs-qonversion-sync`, `qonversion-reconciliation`

### 3.2 DAG 3: `apple_store_pipeline`

Job (dòng 101-105): `apple-store-mapping-sync`, `apple-store-sales-sync`, `apple-store-analytics-sync`, `apple-store-finance-sync`, `apple-store-reconciliation`

### 3.3 DAG 8: `firebase_pipeline`

Job (dòng 48-50): `firebase-pipeline-daily`, `firebase-pipeline-weekly`

### 3.4 DAG 5: `meta_tiktok_pipeline`

Job (dòng 63-74): meta-campaign-sync, meta-insights-sync, tiktok-structure-sync, tiktok-bc-sync, tiktok-report-sync, tiktok-balance-sync, tiktok-alert-evaluation

### 3.5 Cleanup Hangfire

- Tắt cron cho tất cả job đã migrate: `UPDATE hangfire_job_schedules SET enabled = false WHERE job_id IN (...)`
- Tạo migration seed để đảm bảo trạng thái nhất quán
- Giữ `HangfireJobScheduleService` và `ApplySchedulesAsync` cho ~15 job còn lại

---

## Giai đoạn 4 — Pipeline Builder UI (tuần 7-12, song song GD3)

### 4.1 DAG Factory (YAML -> DAG)

- Tạo `airflow/dags/dag_factory.py` đọc YAML từ `airflow/config/dag_factory/`
- Mỗi YAML file mô tả 1 DAG (theo format trong tài liệu mục 6)
- Hỗ trợ task types: `http_call_dotnet`, `starrocks_sql`, `wait_for_dataset`, `slack_alert`

### 4.2 Nexus Admin Console

- Frontend form tạo/sửa pipeline YAML
- Validate + preview trước khi save
- Lưu vào Git repo hoặc DB

---

## Job giữ lại ở Hangfire (~15 job)

Từ `HangfireJobScheduleService.Defaults` (dòng 26-28, 60-64):
- `token-refresh-job` — heartbeat OAuth
- `structure-sync-job` — sync cấu trúc account
- `adunit-mapping-delta-sync-job` — sync delta
- `applovin-sync-job` — sync đơn nguồn
- `xmp-sync-job-today` / `xmp-sync-job-last7days` — XMP sync
- `meta-campaign-sync-job` — (xem xét, có thể chuyển sang Airflow nếu cần)
- `meta-app-mapping-discovery-job` — discovery độc lập
- `tiktok-token-validation-job` — validate token
- `apple-store-token-refresh-job` (từ migration 20260514)

---

## Thay đổi file chính

- `docker-compose.yml` hoặc `docker-compose.airflow.yml` — thêm Airflow services
- `docker/postgres/init-databases.sql` — thêm database `airflow`
- `docker/airflow/` — Dockerfile, config, entrypoint mới
- `airflow/dags/*.py` — 8 DAG files
- `airflow/plugins/operators/dotnet_http_operator.py` — custom operator
- `backend/MediationPro.Api/Controllers/InternalJobsController.cs` — internal API mới
- `backend/MediationPro.Api/Services/HangfireJobScheduleService.cs` — cập nhật danh sách job
- Migration mới để disable Hangfire jobs đã migrate sang Airflow
- `appsettings.json` / `appsettings.sample.json` — thêm config `InternalApi`

---

## Rủi ro cần lưu ý

- **Dual-run conflict**: Dùng feature flag per-job, chạy Airflow dry-run 2 tuần trước khi tắt Hangfire
- **Network**: Airflow container phải reach được .NET backend trên cùng `mediationpro-network`
- **Resource**: Airflow + Celery worker cần thêm ~4-6GB RAM trên server
- **State cleanup**: Bật `db-cleanup` DAG cho Airflow metadata, retention 90 ngày
