# Giải pháp tối ưu hệ thống Job cho Amobear Nexus

> Tài liệu đề xuất kiến trúc hai-tầng (two-tier) cho hệ thống điều phối job: **Hangfire** cho job đơn giản — **Apache Airflow** (đề xuất chính) cho pipeline phức tạp, có liên kết và cho phép admin tự xây dựng DAG động qua UI mà không cần đụng vào code.

---

## 1. Bối cảnh & Vấn đề hiện tại

Hệ thống hiện đang chạy **78 job Hangfire** (theo `hangfire_job_schedules_202605211339.csv`), trong đó có thể phân loại như sau:

| Nhóm | Số lượng | Ví dụ |
|---|---|---|
| Job vận hành đơn giản, không phụ thuộc | ~15 | `token-refresh-job`, `structure-sync-job`, `tiktok-token-validation-job`, `adunit-mapping-delta-sync-job` |
| Job ETL/sync đứng độc lập theo lịch | ~25 | `applovin-sync-job`, `meta-campaign-sync-job`, `xmp-sync-job-today` |
| Pipeline có phụ thuộc (đang chạy "rời" bằng cron) | ~38 | Toàn bộ chuỗi AppsFlyer / AppMetrica / Apple Store / Qonversion / Performance-AdMob / Dashboard Cache / Digest |

### Các vấn đề cốt lõi

1. **Phụ thuộc ngầm bằng cron** — ví dụ `silver-gold-transform-job` (35 * * * *) phải chạy *sau* các job sync bronze, nhưng chỉ "hy vọng đúng giờ". Khi job upstream chậm/fail thì downstream vẫn chạy với dữ liệu cũ.
2. **Không có DAG view** — không biết khi `daily-app-insight-job` lỗi thì những digest nào (`ua-daily-digest-job`, `mediation-daily-digest-job`, `po-daily-digest-job`, `bod-daily-digest-job`…) bị ảnh hưởng.
3. **Backfill thủ công** — `appmetrica-logs-backfill-t1/t2/t3` phải tách thành 3 job riêng vì Hangfire không có khái niệm "chạy lại 1 partition ngày".
4. **Mọi thay đổi đều phải sửa code C#** — admin/DA/PO không thể tự thêm 1 pipeline mới (ví dụ: sync 1 nguồn dữ liệu mới hoặc tinh chỉnh thứ tự bước).
5. **Quan sát hạn chế** — Hangfire dashboard chỉ thấy job-level, không thấy lineage / SLA / data-quality gates.
6. **Retry/recovery thô sơ** — không có exponential backoff per-task, không có catchup, không có data interval semantics.

---

## 2. Nguyên tắc phân loại job

```mermaid
flowchart TD
    A[Job mới / Job hiện tại] --> B{Có phụ thuộc<br/>upstream / downstream?}
    B -- Không --> C{Cần admin<br/>cấu hình động?}
    B -- Có --> D[Airflow DAG]
    C -- Không --> E[Hangfire<br/>Recurring Job]
    C -- Có --> D
    D --> F{Có cần SLA,<br/>backfill, lineage?}
    F -- Có --> D
    F -- Không, chỉ 1 bước --> G{Job ngắn < 5 phút<br/>chạy thường xuyên?}
    G -- Có --> E
    G -- Không --> D
```

### Quy tắc đơn giản

| Tiêu chí | Hangfire | Airflow |
|---|---|---|
| Job độc lập, idempotent, < 5–10 phút | ✅ | |
| Heartbeat / housekeeping (token refresh, cache warm) | ✅ | |
| 1 job kích hoạt nhiều job khác | | ✅ |
| Cần backfill theo khoảng ngày | | ✅ |
| Cần data-quality gate giữa các bước | | ✅ |
| Admin/DA cần tự tạo / sửa pipeline qua UI | | ✅ (qua DAG Factory + UI form) |
| Cần SLA + lineage + alert per-task | | ✅ |

---

## 3. Kiến trúc tổng thể đề xuất

```mermaid
flowchart LR
    subgraph UI["UI quản trị"]
        AdminUI["Nexus Admin Console<br/>(Pipeline Builder)"]
        AirflowUI["Airflow Web UI"]
        HangfireUI["Hangfire Dashboard"]
    end

    subgraph Control["Lớp điều phối"]
        Hangfire["Hangfire Server<br/>(.NET)"]
        Airflow["Apache Airflow<br/>Scheduler + Webserver"]
        DAGFactory["DAG Factory<br/>(YAML → DAG)"]
    end

    subgraph Storage["Metadata"]
        HFDb[("Hangfire DB<br/>SQL Server")]
        AFDb[("Airflow Meta DB<br/>PostgreSQL")]
        PipelineRepo[("Pipeline Configs<br/>(Git + DB)")]
    end

    subgraph Workers["Lớp thực thi"]
        HFWorker["Hangfire Workers<br/>(.NET process)"]
        AFWorker["Airflow Workers<br/>(CeleryExecutor /<br/>KubernetesExecutor)"]
        DotnetAPI["MediationPro.Jobs API<br/>(HTTP/gRPC trigger)"]
    end

    subgraph Data["Hệ thống dữ liệu"]
        StarRocks[("StarRocks")]
        SQLSrv[("SQL Server")]
        GCS[("GCS / BigQuery")]
        ExtAPI["Meta / TikTok / Apple<br/>AppsFlyer / AppMetrica…"]
    end

    AdminUI --> PipelineRepo
    PipelineRepo --> DAGFactory --> Airflow
    AirflowUI --> Airflow
    HangfireUI --> Hangfire

    Hangfire --> HFDb
    Airflow --> AFDb
    Hangfire --> HFWorker
    Airflow --> AFWorker
    AFWorker --> DotnetAPI
    HFWorker --> DotnetAPI
    DotnetAPI --> ExtAPI
    DotnetAPI --> SQLSrv
    DotnetAPI --> StarRocks
    DotnetAPI --> GCS
```

### Ý tưởng then chốt

- **Giữ nguyên codebase `MediationPro.Jobs`** — không viết lại logic nghiệp vụ. Chỉ tách "điểm gọi" thành **HTTP/gRPC endpoint** (vd: `POST /internal/jobs/{jobKey}/run?date=2026-05-20`). Cả Hangfire và Airflow đều gọi cùng API này.
- **DAG Factory** đọc cấu hình YAML/JSON từ Git hoặc DB → sinh DAG động. Admin chỉ cần submit cấu hình qua UI, không cần Python.
- **Tách metadata DB** của Airflow (PostgreSQL) khỏi DB nghiệp vụ.

---

## 4. So sánh & lý do chọn Airflow

| Tiêu chí | **Airflow** | Dagster | Prefect | Temporal |
|---|---|---|---|---|
| Mức trưởng thành | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Cộng đồng VN/khả năng tuyển | Cao | Trung | Trung | Thấp |
| UI DAG / Gantt / SLA | Rất tốt | Rất tốt | Tốt | Yếu (cho data-pipeline) |
| Backfill theo data interval | ✅ Native | ✅ | ✅ | Cần tự xây |
| Tạo DAG động qua YAML/UI | ✅ (gusty / dag-factory) | ⚙️ | ⚙️ | ❌ |
| Tích hợp .NET (HTTP/gRPC) | ✅ | ✅ | ✅ | ✅ SDK .NET |
| Phù hợp data engineering | ✅ | ✅ | ✅ | ❌ (hợp workflow giao dịch) |

➡️ **Chọn Apache Airflow** (đề xuất bản 2.9+ với TaskFlow + Datasets). Lý do: mature, có sẵn DAG Factory pattern, dễ tuyển nhân sự, UI cho admin trực quan.

> Nếu sau này muốn nâng cấp DX cho DA/DE, có thể bổ sung **Dagster** ở giai đoạn 3.

---

## 5. Phân loại 78 job hiện tại

### 5.1 Giữ ở Hangfire (job đơn giản, độc lập)

| Job | Cron | Lý do |
|---|---|---|
| `token-refresh-job` | `*/30 * * * *` | Heartbeat OAuth, không có downstream |
| `structure-sync-job` | `0 0 * * *` | Sync cấu trúc account, độc lập |
| `adunit-mapping-delta-sync-job` | `0 1 * * *` | Sync delta, không có chain |
| `tiktok-token-validation-job` | `0 23 * * *` | Validate token |
| `meta-app-mapping-discovery-job` | `0/45 * * * *` | Discovery độc lập |
| `applovin-sync-job` | `10 * * * *` | Sync 1 nguồn, độc lập |
| `xmp-sync-job-today` / `xmp-sync-job-last7days` | (giữ tạm) | Hiện đứng riêng |
| `dashboard-cache-today/7/14/30` | `*/4 * * *` | (xem xét đưa sang Airflow giai đoạn 2 vì phụ thuộc Silver/Gold) |

### 5.2 Chuyển sang Airflow (pipeline có liên kết)

Nhóm theo 7 DAG chính:

#### DAG 1 — `appmetrica_pipeline`

```mermaid
flowchart LR
    L[appmetrica-logs-today<br/>0 * * * *] --> DS[datastream-events<br/>last3days]
    L --> BF1[logs-backfill-t1<br/>0 0,12 * * *]
    L --> BF2[logs-backfill-t2<br/>0 4,16 * * *]
    L --> BF3[logs-backfill-t3<br/>0 8,20 * * *]
    BF1 --> GSG[game-silver-gold<br/>Transform]
    BF2 --> GSG
    BF3 --> GSG
    DS --> GSG
    L --> DST[daily-stats]
    GSG --> Notify[Trigger: Digest DAG]
```

#### DAG 2 — `appsflyer_pipeline`

```mermaid
flowchart LR
    subgraph Hourly["Intraday (mỗi 2-12h)"]
        IT[installs-today]
        MT[master-today]
        IR[installs-T3..T1]
        MR[master-T3..T1]
    end
    subgraph Weekly["Chủ nhật"]
        IL[installs-weekly-lookback]
        ML[master-weekly-lookback]
        CL[cohort-LTV-weekly]
    end
    IT --> SG[Silver/Gold transform]
    MT --> SG
    IR --> SG
    MR --> SG
    IL --> SG
    ML --> SG
    CL --> SG
    SG --> DC[Dashboard cache refresh]
```

#### DAG 3 — `apple_store_pipeline`

```mermaid
flowchart LR
    M[apple-store-mapping-sync<br/>weekly Mon] --> S[apple-store-sales-sync<br/>daily T-2]
    M --> A[apple-store-analytics-sync<br/>daily T-2]
    M -.->|monthly day 5| F[apple-store-finance-sync]
    S --> R[apple-store-reconciliation<br/>vs Qonversion T-2]
    A --> R
```

#### DAG 4 — `qonversion_pipeline`

```mermaid
flowchart LR
    WC[web-crawler-rolling-T3T1] --> B2S[bronze-to-silver]
    WC4[web-crawler-incremental-4h] --> B2S
    GCS[gcs-qonversion-sync T-1] --> B2S
    B2S --> S2G[silver-to-gold]
    S2G --> REC[reconciliation T-1]
    REC --> AppleRec[Trigger apple_store_pipeline.reconciliation]
```

#### DAG 5 — `meta_tiktok_pipeline`

```mermaid
flowchart TB
    subgraph Meta
        MC[meta-campaign-sync] --> MI1[meta-insights-intraday]
        MC --> MI2[meta-insights-daily T-1]
    end
    subgraph TikTok
        TT[token-validation 23:00] --> TS[structure-sync 17:40]
        TS --> BC[bc-sync 17:50]
        BC --> BAL[balance-sync /4h]
        BC --> AM[app-mapping-discovery /1h]
        AM --> RPT_D[report-sync-daily 19:45]
        AM --> RPT_R[report-sync-recent /2h]
        RPT_R --> ALERT[alert-evaluation /4h]
    end
```

#### DAG 6 — `performance_admob_pipeline` (lõi doanh thu)

```mermaid
flowchart LR
    subgraph Today
        AT[admob-today<br/>5 */2 * * *]
        MT[mediation-today<br/>25 0/4 * * *]
        KT[mkt-today<br/>28 1-23/2 * * *]
        RT[revenue-today<br/>15 * * * *]
    end
    subgraph Recent
        AR[admob-recent]
        MR[mediation-recent]
        KR[mkt-recent]
        RR[revenue-recent]
    end
    AT --> SG[silver-gold-transform<br/>StarRocks]
    MT --> SG
    KT --> SG
    RT --> SG
    AR --> SG
    MR --> SG
    KR --> SG
    RR --> SG
    SG --> CAR[calculate-app-revenue-hourly]
    CAR --> DC0[dashboard-cache-today]
    SG --> DC7[dashboard-cache-7d]
    SG --> DC14[dashboard-cache-14d]
    SG --> DC30[dashboard-cache-30d]
    DC0 --> SOW[sow-calculator]
    SOW --> ALERT[alert-calculation]
    SOW --> WR[waterfall-recommendation]
    SOW --> WP[waterfall-apply-policy]
```

#### DAG 7 — `daily_digest_pipeline` (chạy buổi sáng)

```mermaid
flowchart LR
    Wait[Sensor: chờ AdMob+Mediation+AppsFlyer<br/>của ngày T-1 hoàn tất] --> AI[daily-app-insight 01:30]
    AI --> DAU[dau-dav-calculation]
    DAU --> POs[po-daily-digest 06:45]
    DAU --> DA[da-daily-digest 06:50]
    DAU --> UA[ua-daily-digest 06:00]
    DAU --> DEV[devops-daily-digest 06:55]
    DAU --> MED[mediation-daily-digest 07:00]
    DAU --> QA[qa-daily-digest 07:15]
    DAU --> BOD[bod-daily-digest 07:30]
    BOD -.weekly Mon.-> BODW[bod-weekly-portfolio-aggregate]
```

#### DAG 8 — `firebase_pipeline`

```mermaid
flowchart LR
    FD[firebase-pipeline-daily T-1<br/>04:00] --> FE[firebase-event-flat-daily<br/>07:00]
    FW[firebase-pipeline-weekly<br/>Sun 06:00 smart-recovery] -.fallback.-> FE
```

---

## 6. Mô hình "DAG động" cho Admin (Pipeline Builder)

Đây là yêu cầu cốt lõi — **admin tự xây dựng job mới không cần dev**.

```mermaid
flowchart TB
    A[Admin mở Nexus Admin Console] --> B[Chọn template:<br/>'External API → Bronze → Silver → Gold']
    B --> C[Form điền:<br/>- Tên DAG<br/>- Cron<br/>- Nguồn dữ liệu<br/>- Tham số API<br/>- Bảng đích<br/>- SLA / Alert]
    C --> D[Validate + Preview YAML]
    D --> E{Save}
    E --> F[Lưu YAML vào<br/>Git repo + DB cấu hình]
    F --> G[CI bot push lên<br/>Airflow dags/ folder<br/>(hoặc Airflow đọc trực tiếp từ DB qua DAG Factory)]
    G --> H[Airflow scheduler<br/>re-parse và sinh DAG]
    H --> I[DAG xuất hiện trong<br/>Airflow UI + Nexus UI]
```

### Ví dụ file YAML do admin tạo

```yaml
dag_id: tiktok_creative_sync
description: Sync TikTok creative performance hàng giờ
schedule: "*/30 * * * *"
owner: marketing-ops
sla_minutes: 20
catchup: false
tags: [tiktok, creative, marketing]
default_args:
  retries: 3
  retry_delay_minutes: 5

tasks:
  - id: fetch_creative
    type: http_call_dotnet
    endpoint: /internal/jobs/tiktok-creative-fetch/run
    params: { since: "{{ data_interval_start }}" }
  - id: transform_silver
    type: starrocks_sql
    sql_file: sql/tiktok/creative_silver.sql
    depends_on: [fetch_creative]
  - id: refresh_gold
    type: starrocks_sql
    sql_file: sql/tiktok/creative_gold.sql
    depends_on: [transform_silver]
  - id: notify
    type: slack_alert_on_failure
    channel: "#data-alerts"
    depends_on: [refresh_gold]
```

### Các "task type" cần xây sẵn (operators)

| Operator | Mục đích |
|---|---|
| `http_call_dotnet` | Gọi endpoint trong `MediationPro.Jobs` |
| `starrocks_sql` | Chạy SQL trên StarRocks |
| `sqlserver_sproc` | Gọi stored procedure SQL Server |
| `gcs_to_starrocks` | Bulk load parquet từ GCS |
| `wait_for_dataset` | Sensor chờ Airflow Dataset sẵn sàng |
| `data_quality_check` | Great Expectations / SQL assertion |
| `slack_alert` / `teams_alert` | Notify |

---

## 7. Lộ trình triển khai (4 giai đoạn — ~3 tháng)

```mermaid
gantt
    title Lộ trình triển khai
    dateFormat YYYY-MM-DD
    axisFormat %d/%m

    section GĐ1 - Nền tảng
    Dựng Airflow (Docker/K8s) + Postgres meta     :a1, 2026-05-26, 7d
    Tách MediationPro.Jobs thành HTTP endpoints   :a2, after a1, 10d
    Auth (mTLS / API key) giữa Airflow ↔ .NET     :a3, after a2, 3d
    Custom operator http_call_dotnet              :a4, after a3, 4d

    section GĐ2 - Migrate pipeline lõi
    DAG performance_admob_pipeline + cache        :b1, after a4, 7d
    DAG daily_digest_pipeline                     :b2, after b1, 5d
    DAG appsflyer_pipeline                        :b3, after b2, 5d
    DAG appmetrica_pipeline                       :b4, after b3, 5d

    section GĐ3 - Migrate phần còn lại
    DAG qonversion + apple_store + firebase       :c1, after b4, 7d
    DAG meta_tiktok_pipeline                      :c2, after c1, 5d
    Loại bỏ cron Hangfire trùng lặp               :c3, after c2, 3d

    section GĐ4 - Pipeline Builder UI
    DAG Factory (YAML→DAG)                        :d1, after a4, 14d
    Nexus Admin Console - form builder            :d2, after d1, 14d
    Templates + Operator catalog                  :d3, after d2, 7d
    Đào tạo admin/DA                              :d4, after d3, 5d
```

### Tiêu chí "Done" mỗi giai đoạn

- **GĐ1**: Chạy thử 1 DAG hello-world gọi được .NET endpoint, có log, retry, alert.
- **GĐ2**: 4 pipeline lõi (performance / digest / appsflyer / appmetrica) chạy trên Airflow song song với Hangfire trong **2 tuần**, đối chiếu kết quả → tắt cron Hangfire tương ứng.
- **GĐ3**: 100% job phụ thuộc đã ở Airflow. Hangfire chỉ còn ~15 job đơn lẻ.
- **GĐ4**: Một admin (không phải dev) tạo thành công 1 pipeline mới từ UI và đưa vào production.

---

## 8. Các điểm cần quyết định sớm

| Quyết định | Lựa chọn đề xuất | Lý do |
|---|---|---|
| Executor của Airflow | **KubernetesExecutor** (nếu đã có K8s) hoặc **CeleryExecutor + Redis** | Scale tốt, isolate task |
| Metadata DB | **PostgreSQL 15** (managed) | Airflow chính thức hỗ trợ |
| Nơi lưu DAG | **Git repo** (chính) + DB cho admin-built | Versioning + audit |
| Auth Airflow UI | OIDC qua **Keycloak / Azure AD** | SSO chung với Nexus |
| Thông báo | Slack/Teams webhook + email cho SLA miss | Đa kênh |
| Monitoring | Prometheus exporter + Grafana dashboard | Đã có sẵn stack |
| Lineage | OpenLineage plugin (sẵn có cho Airflow) | Tự động lineage StarRocks/SQL Server |

---

## 9. Rủi ro & cách giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Hai hệ thống chạy song song gây job trùng | Cao | Feature flag per-job; chạy "dry-run" Airflow 2 tuần đối chiếu trước khi tắt Hangfire |
| Admin tạo DAG sai gây nghẽn cluster | Trung | Resource quota per-DAG, code review tự động (linter YAML), môi trường staging |
| Mất context khi tách logic ra HTTP endpoint | Trung | Endpoint chỉ là "thin wrapper", logic vẫn ở class hiện tại; thêm integration test |
| Học cong Airflow của team | Trung | Workshop 2 buổi + tài liệu Pipeline Builder cho non-dev |
| State DB Airflow phình nhanh | Thấp | Bật `db-cleanup` job, retention 90 ngày |

---

## 10. Tóm tắt giá trị mang lại

- ✅ **Giảm 80% job rời rạc trên Hangfire** (từ 78 → ~15) — phần còn lại nhóm thành 8 DAG có ý nghĩa nghiệp vụ.
- ✅ **Quan sát toàn pipeline** — biết ngay khi `meta-insights` lỗi thì digest BOD bị trễ.
- ✅ **Backfill 1-click** — chọn DAG + khoảng ngày trên Airflow UI.
- ✅ **Admin tự phục vụ** — pipeline mới không cần release code .NET.
- ✅ **SLA & cảnh báo theo task** — không còn cảnh báo "job X chạy lâu" mà biết chính xác bước nào.
- ✅ **Codebase .NET không phải viết lại** — chỉ wrap thành HTTP endpoint.

---

*Tài liệu chuẩn bị cho buổi review kiến trúc. Phản hồi/điều chỉnh: cập nhật trực tiếp vào file này hoặc tạo issue trong repo `Amobear.Mediation.Tools`.*
