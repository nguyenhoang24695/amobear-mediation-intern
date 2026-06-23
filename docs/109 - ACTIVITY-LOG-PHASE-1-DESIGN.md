# Activity Log Phase 1 Design

## 0. Tinh trang implementation

Da implement backend base cho phase 1:

- Schema `activity_logs` va `activity_log_refs`
- Service `IActivityLogService` / `ActivityLogService`
- API admin-only:
  - `GET /api/v1/activity-logs`
  - `GET /api/v1/activity-logs/{id}`
- Hook da ghi log cho:
  - `waterfall.apply.succeeded|failed`
  - `waterfall.sync.succeeded|failed`
  - `waterfall.cleanup.succeeded|failed`
  - `job.structure_sync.started|completed|failed`
  - `job.token_refresh.started|completed|failed`
  - `job.waterfall_recommendation.started|completed`
  - `organization.created|updated|deleted|activated|deactivated`
  - `user.created|invited|updated|role_changed|deactivated|permissions_updated|team_added|team_removed`
- Frontend UI:
  - Route admin-only: `/activity-logs`
  - Sidebar menu: `Activity Logs`
  - Global Activity Center co filter theo `domain`, `eventType`, `status`, `targetType`, `jobName`, `appId`, `mediationGroupId`, `from`, `to`, `q`
  - Detail dialog de xem `refs` va `metadata`
  - Ho tro deep link vao Activity Center bang query string tu man `waterfall`, `jobs`, `organization`, `user`

Chua implement trong dot nay:

- Hook log cho `job.dashboard_cache.*`
- Log chi tiet theo step hoac request/response lon

## 1. Mục tiêu

Thiết kế một nền tảng `activity log` dùng chung cho Mediation Pro, đủ đơn giản để triển khai nhanh trong phase 1 nhưng vẫn làm nền cho các module khác về sau.

Phase 1 tập trung vào 3 nhóm:

- `waterfall`
- `jobs`
- `organization/user audit`

Mục tiêu của phase 1:

- Ghi lại các hoạt động nghiệp vụ quan trọng dưới dạng timeline chung.
- Hỗ trợ màn hình `Global Activity Center` có filter toàn hệ thống.
- Chỉ `admin` và `super_admin` được xem activity logs.
- Chỉ log tổng quát, không log chi tiết từng bước xử lý hay từng API step.
- Tài liệu hóa rõ schema, event types, filter, permission và demo data.

Ngoài phạm vi phase 1:

- Không làm filter theo `organization` ở UI Global Activity Center.
- Không thay thế `alert_history`, `sync_jobs`, `sync_state` hiện có.
- Không log toàn bộ request/response lớn cho từng API call.
- Không làm payload chi tiết kiểu replay/rollback ngay từ đầu.

## 2. Nguyên tắc thiết kế

### 2.1. Tách current state và activity timeline

Hệ thống hiện tại đã có pattern tốt ở `alert_results` + `alert_history`: bảng current state phục vụ truy vấn nhanh, bảng history phục vụ audit trail và timeline.

Activity log phase 1 sẽ đi theo hướng tương tự:

- Các bảng nghiệp vụ hiện tại vẫn giữ vai trò current state.
- `activity_logs` là timeline dùng chung cho toàn hệ thống.
- Một số bảng history chuyên biệt vẫn có thể tồn tại độc lập nếu domain cần logic riêng.

### 2.2. Tối ưu cho filter, không phụ thuộc hoàn toàn vào JSON

Nếu chỉ lưu một cột JSON lớn thì Global Activity Center sẽ khó filter và khó index. Vì vậy:

- Những field cần filter thường xuyên phải nằm ở cột riêng.
- JSON chỉ dùng cho thông tin phụ, hiển thị chi tiết hoặc mở rộng sau này.

### 2.3. Dùng event tổng quát theo business event

Phase 1 chỉ cần log mức business event:

- `waterfall.apply.succeeded`
- `job.structure_sync.failed`
- `organization.updated`
- `user.role_changed`

Không đi sâu xuống từng step như:

- `patch_mediation_group_sent`
- `batch_create_mapping_finished`
- `cache_invalidation_started`

## 3. Scope phase 1

### 3.1. Waterfall

Log các event sau:

- `waterfall.apply.succeeded`
- `waterfall.apply.failed`
- `waterfall.sync.succeeded`
- `waterfall.sync.failed`
- `waterfall.cleanup.succeeded`
- `waterfall.cleanup.failed`

### 3.2. Jobs

Log summary cho các job quan trọng:

- `job.structure_sync.started`
- `job.structure_sync.completed`
- `job.structure_sync.failed`
- `job.dashboard_cache.completed`
- `job.dashboard_cache.failed`
- `job.waterfall_recommendation.completed`
- `job.waterfall_recommendation.failed`
- `job.token_refresh.completed`
- `job.token_refresh.failed`

Ghi chú:

- `sync_jobs` hiện có vẫn hữu ích cho vận hành pipeline.
- `activity_logs` sẽ là lớp timeline tổng quát cho UI và audit feed.

### 3.3. Organization/User Audit

Log các event sau:

- `organization.created`
- `organization.updated`
- `organization.activated`
- `organization.deactivated`
- `user.created`
- `user.updated`
- `user.deactivated`
- `user.invited`
- `user.role_changed`
- `user.permissions_updated`
- `team.member_added`
- `team.member_removed`

## 4. Schema đề xuất

## 4.1. Bảng chính: `activity_logs`

```sql
CREATE TABLE activity_logs (
    id BIGSERIAL PRIMARY KEY,

    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    actor_user_id UUID NULL,
    actor_name VARCHAR(255) NULL,
    actor_role VARCHAR(50) NULL,
    actor_type VARCHAR(32) NOT NULL,          -- user, system, job

    source VARCHAR(32) NOT NULL,              -- frontend, backend, hangfire
    domain VARCHAR(32) NOT NULL,              -- waterfall, job, organization, user
    event_type VARCHAR(100) NOT NULL,

    status VARCHAR(20) NOT NULL,              -- pending, success, failed
    severity VARCHAR(20) NOT NULL,            -- info, warning, error

    summary VARCHAR(500) NOT NULL,

    organization_id UUID NULL,
    app_id INT NULL,
    mediation_group_id VARCHAR(255) NULL,
    job_name VARCHAR(100) NULL,

    target_type VARCHAR(50) NULL,             -- mediation_group, job_schedule, organization, user
    target_id VARCHAR(255) NULL,
    target_name VARCHAR(255) NULL,

    correlation_id VARCHAR(100) NULL,
    metadata_json JSONB NULL
);
```

### 4.2. Bảng tham chiếu phụ: `activity_log_refs`

```sql
CREATE TABLE activity_log_refs (
    id BIGSERIAL PRIMARY KEY,
    activity_log_id BIGINT NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,

    ref_type VARCHAR(50) NOT NULL,            -- app, mediation_group, user, organization, job_schedule
    ref_id VARCHAR(255) NOT NULL,
    ref_key VARCHAR(255) NULL,
    ref_label VARCHAR(255) NULL
);
```

### 4.3. Indexes khuyến nghị

```sql
CREATE INDEX idx_activity_logs_occurred_at
    ON activity_logs(occurred_at DESC);

CREATE INDEX idx_activity_logs_domain_time
    ON activity_logs(domain, occurred_at DESC);

CREATE INDEX idx_activity_logs_event_type_time
    ON activity_logs(event_type, occurred_at DESC);

CREATE INDEX idx_activity_logs_status_time
    ON activity_logs(status, occurred_at DESC);

CREATE INDEX idx_activity_logs_actor_user_time
    ON activity_logs(actor_user_id, occurred_at DESC);

CREATE INDEX idx_activity_logs_job_name_time
    ON activity_logs(job_name, occurred_at DESC);

CREATE INDEX idx_activity_logs_app_time
    ON activity_logs(app_id, occurred_at DESC);

CREATE INDEX idx_activity_logs_mg_time
    ON activity_logs(mediation_group_id, occurred_at DESC);

CREATE INDEX idx_activity_logs_correlation_id
    ON activity_logs(correlation_id);

CREATE INDEX idx_activity_log_refs_type_id
    ON activity_log_refs(ref_type, ref_id, activity_log_id);
```

## 5. Ý nghĩa các cột chính

### `occurred_at`

Thời điểm business event xảy ra.

Ví dụ:

- lúc user nhấn apply thành công
- lúc job hoàn thành
- lúc admin đổi role user

### `created_at`

Thời điểm bản ghi log được lưu vào DB.

Thông thường gần bằng `occurred_at`, nhưng nên tách riêng để debug.

### `correlation_id`

Dùng để gom nhiều log thuộc cùng một operation/batch.

Ví dụ:

- 1 lần `apply waterfall` có thể sinh:
  - `waterfall.apply.succeeded`
  - `waterfall.sync.succeeded`

Tất cả dùng cùng một `correlation_id`.

### `metadata_json`

Chỉ lưu summary ngắn gọn, không lưu payload quá lớn.

Ví dụ:

- số lượng floors modified
- số lượng source added/removed
- `error_message`
- `duration_ms`
- danh sách field thay đổi

## 6. Event types phase 1

### 6.1. Waterfall

| Event Type | Khi nào ghi log | Metadata gợi ý |
|------------|-----------------|----------------|
| `waterfall.apply.requested` | User nhấn apply từ UI | `floors_modified`, `sources_added`, `sources_removed` |
| `waterfall.apply.succeeded` | Apply lên AdMob thành công | `applied_at`, `floors_modified`, `sources_added`, `sources_removed` |
| `waterfall.apply.failed` | Apply thất bại | `error_message`, `floors_modified`, `sources_added`, `sources_removed` |
| `waterfall.sync.succeeded` | Sync lại MG từ AdMob thành công | `synced_at`, `verified` |
| `waterfall.sync.failed` | Sync lại MG thất bại | `error_message` |
| `waterfall.cleanup.succeeded` | Cleanup waterfall chạy thành công | `publisher_id`, `deleted_mappings`, `deleted_units` |
| `waterfall.cleanup.failed` | Cleanup waterfall lỗi | `publisher_id`, `error_message` |

### 6.2. Jobs

| Event Type | Khi nào ghi log | Metadata gợi ý |
|------------|-----------------|----------------|
| `job.structure_sync.started` | Bắt đầu job | `job_id`, `trigger_type` |
| `job.structure_sync.completed` | Job thành công | `accounts_processed`, `publishers_processed`, `duration_ms` |
| `job.structure_sync.failed` | Job lỗi | `error_message`, `duration_ms` |
| `job.dashboard_cache.completed` | Cache xong | `period`, `duration_ms` |
| `job.dashboard_cache.failed` | Cache lỗi | `period`, `error_message` |
| `job.waterfall_recommendation.completed` | Recommendation job thành công | `mediation_groups_processed`, `duration_ms` |
| `job.waterfall_recommendation.failed` | Recommendation job lỗi | `error_message` |
| `job.token_refresh.completed` | Refresh token xong | `accounts_processed` |
| `job.token_refresh.failed` | Refresh token lỗi | `account_id`, `error_message` |

### 6.3. Organization/User

| Event Type | Khi nào ghi log | Metadata gợi ý |
|------------|-----------------|----------------|
| `organization.created` | Tạo org | `fields` |
| `organization.updated` | Sửa org | `changed_fields` |
| `organization.activated` | Activate org | `reason` |
| `organization.deactivated` | Deactivate org | `reason` |
| `user.created` | Tạo user | `email`, `role` |
| `user.updated` | Sửa user | `changed_fields` |
| `user.deactivated` | Disable user | `status` |
| `user.invited` | Mời user | `email`, `role` |
| `user.role_changed` | Đổi role | `old_role`, `new_role` |
| `user.permissions_updated` | Đổi app permissions | `changed_app_count` |
| `team.member_added` | Add user vào team | `team_id`, `role` |
| `team.member_removed` | Remove user khỏi team | `team_id` |

## 7. Global Activity Center

### 7.1. Mục tiêu UI

Global Activity Center là timeline tổng hợp của toàn hệ thống cho admin trở lên.

Phase 1 không làm filter theo organization.

### 7.2. Filters phase 1

Filter đề xuất:

- `from`
- `to`
- `domain`
- `event_type`
- `status`
- `actor_user_id`
- `actor_name`
- `target_type`
- `app_id`
- `mediation_group_id`
- `job_name`
- `q` (search theo `summary`)

Không làm phase 1:

- filter theo `organization_id`
- filter theo JSON field bất kỳ
- filter nâng cao theo change-level

### 7.3. Sort

Sort mặc định:

- `occurred_at desc`

### 7.4. Pagination

Pagination chuẩn:

- `page`
- `pageSize`

Khuyến nghị:

- mặc định `pageSize = 20`
- tối đa `100`

## 8. Permission model

Chỉ `admin` và `super_admin` được xem activity logs.

Mapping theo role hiện tại của hệ thống:

- `super_admin`: xem toàn bộ
- `admin`: xem Global Activity Center
- `editor`: không được xem
- `viewer`: không được xem

Phase 1 chưa tách:

- admin theo phạm vi organization riêng trong UI filter
- row-level restriction theo organization cho Global Activity Center

Nếu cần hạn chế dữ liệu theo organization ở backend trong tương lai:

- `super_admin` xem toàn bộ
- `admin` chỉ xem các log thuộc organization của mình

Nhưng phase 1 chưa bật filter organization trên UI.

## 9. Demo dữ liệu

## 9.1. Demo `activity_logs`

```json
[
  {
    "id": 1001,
    "occurred_at": "2026-03-02T09:12:44Z",
    "created_at": "2026-03-02T09:12:45Z",
    "actor_user_id": "8d7d4d6a-1b88-4f7d-8a1d-1f91a10b7f01",
    "actor_name": "hoangnv",
    "actor_role": "admin",
    "actor_type": "user",
    "source": "frontend",
    "domain": "waterfall",
    "event_type": "waterfall.apply.succeeded",
    "status": "success",
    "severity": "info",
    "summary": "Applied 5 waterfall changes to mediation group Home Rewarded Android",
    "organization_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "app_id": 145,
    "mediation_group_id": "ca-app-pub-123:mg:987654",
    "job_name": null,
    "target_type": "mediation_group",
    "target_id": "ca-app-pub-123:mg:987654",
    "target_name": "Home Rewarded Android",
    "correlation_id": "wf-apply-20260302-091244-001",
    "metadata_json": {
      "floors_modified": 3,
      "sources_added": 1,
      "sources_removed": 1,
      "applied_at": "2026-03-02T09:12:44Z"
    }
  },
  {
    "id": 1002,
    "occurred_at": "2026-03-02T09:13:08Z",
    "created_at": "2026-03-02T09:13:08Z",
    "actor_user_id": "8d7d4d6a-1b88-4f7d-8a1d-1f91a10b7f01",
    "actor_name": "hoangnv",
    "actor_role": "admin",
    "actor_type": "user",
    "source": "backend",
    "domain": "waterfall",
    "event_type": "waterfall.sync.succeeded",
    "status": "success",
    "severity": "info",
    "summary": "Synced mediation group from AdMob after apply",
    "organization_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "app_id": 145,
    "mediation_group_id": "ca-app-pub-123:mg:987654",
    "job_name": null,
    "target_type": "mediation_group",
    "target_id": "ca-app-pub-123:mg:987654",
    "target_name": "Home Rewarded Android",
    "correlation_id": "wf-apply-20260302-091244-001",
    "metadata_json": {
      "synced_at": "2026-03-02T09:13:08Z",
      "verified": true
    }
  },
  {
    "id": 1003,
    "occurred_at": "2026-03-02T00:00:02Z",
    "created_at": "2026-03-02T00:00:02Z",
    "actor_user_id": null,
    "actor_name": "StructureSyncJob",
    "actor_role": null,
    "actor_type": "job",
    "source": "hangfire",
    "domain": "job",
    "event_type": "job.structure_sync.completed",
    "status": "success",
    "severity": "info",
    "summary": "Structure sync completed for 3 AdMob accounts",
    "organization_id": null,
    "app_id": null,
    "mediation_group_id": null,
    "job_name": "structure-sync-job",
    "target_type": "job_schedule",
    "target_id": "structure-sync-job",
    "target_name": "Structure Sync",
    "correlation_id": "job-structure-sync-20260302-000002",
    "metadata_json": {
      "accounts_processed": 3,
      "publishers_processed": 9,
      "duration_ms": 184523
    }
  },
  {
    "id": 1004,
    "occurred_at": "2026-03-02T00:00:02Z",
    "created_at": "2026-03-02T00:00:03Z",
    "actor_user_id": null,
    "actor_name": "StructureSyncJob",
    "actor_role": null,
    "actor_type": "job",
    "source": "hangfire",
    "domain": "job",
    "event_type": "job.structure_sync.failed",
    "status": "failed",
    "severity": "error",
    "summary": "Structure sync failed for publisher pub-3940256099942544",
    "organization_id": null,
    "app_id": null,
    "mediation_group_id": null,
    "job_name": "structure-sync-job",
    "target_type": "job_schedule",
    "target_id": "structure-sync-job",
    "target_name": "Structure Sync",
    "correlation_id": "job-structure-sync-20260302-000002",
    "metadata_json": {
      "publisher_id": "pub-3940256099942544",
      "error_message": "AdMob API timeout"
    }
  },
  {
    "id": 1005,
    "occurred_at": "2026-03-01T14:20:10Z",
    "created_at": "2026-03-01T14:20:10Z",
    "actor_user_id": "f1d2f2f9-bc13-4788-b4cd-b4f3f63e2a22",
    "actor_name": "systemadmin",
    "actor_role": "super_admin",
    "actor_type": "user",
    "source": "frontend",
    "domain": "organization",
    "event_type": "organization.updated",
    "status": "success",
    "severity": "info",
    "summary": "Updated organization Amo Bear Studio",
    "organization_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "app_id": null,
    "mediation_group_id": null,
    "job_name": null,
    "target_type": "organization",
    "target_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "target_name": "Amo Bear Studio",
    "correlation_id": "org-update-20260301-142010-001",
    "metadata_json": {
      "changed_fields": ["name", "logoUrl"]
    }
  },
  {
    "id": 1006,
    "occurred_at": "2026-03-01T14:25:54Z",
    "created_at": "2026-03-01T14:25:55Z",
    "actor_user_id": "f1d2f2f9-bc13-4788-b4cd-b4f3f63e2a22",
    "actor_name": "systemadmin",
    "actor_role": "super_admin",
    "actor_type": "user",
    "source": "frontend",
    "domain": "user",
    "event_type": "user.role_changed",
    "status": "success",
    "severity": "info",
    "summary": "Changed role for user ngoc.tran@amobear.com from viewer to admin",
    "organization_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "app_id": null,
    "mediation_group_id": null,
    "job_name": null,
    "target_type": "user",
    "target_id": "9b3f645e-4f6f-4adf-a5b8-6f0f40347d0b",
    "target_name": "ngoc.tran@amobear.com",
    "correlation_id": "user-role-20260301-142554-001",
    "metadata_json": {
      "old_role": "viewer",
      "new_role": "admin"
    }
  }
]
```

## 9.2. Demo `activity_log_refs`

```json
[
  {
    "activity_log_id": 1001,
    "ref_type": "app",
    "ref_id": "145",
    "ref_key": "ca-app-pub-123~com.amobear.game",
    "ref_label": "Amo Bear Puzzle"
  },
  {
    "activity_log_id": 1001,
    "ref_type": "mediation_group",
    "ref_id": "ca-app-pub-123:mg:987654",
    "ref_key": "ca-app-pub-123:mg:987654",
    "ref_label": "Home Rewarded Android"
  },
  {
    "activity_log_id": 1006,
    "ref_type": "organization",
    "ref_id": "2f0d2d26-7f50-4a55-82d2-2cf7b3d0d991",
    "ref_key": "amo-bear-studio",
    "ref_label": "Amo Bear Studio"
  }
]
```

## 10. API phase 1 đề xuất

### 10.1. List activity logs

```http
GET /api/v1/activity-logs
```

Query params:

- `page`
- `pageSize`
- `from`
- `to`
- `domain`
- `eventType`
- `status`
- `actorUserId`
- `appId`
- `mediationGroupId`
- `jobName`
- `targetType`
- `q`

### 10.2. Get activity log detail

```http
GET /api/v1/activity-logs/{id}
```

### 10.3. Response shape gợi ý

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1264,
  "totalPages": 64
}
```

## 11. Logging points trong code hiện tại

### 11.1. Waterfall

Các điểm nên phát activity log:

- khi user gọi `Apply Direct`
- sau khi `ApplyWaterfallAsync` thành công/thất bại
- sau khi `SyncMediationGroupFromAdMobAsync` thành công/thất bại
- khi gọi `CleanupWaterfallAsync`

### 11.2. Jobs

Các điểm nên phát activity log:

- đầu job
- cuối job thành công
- cuối job thất bại

Phase 1 chỉ log summary một dòng cho mỗi lần chạy quan trọng, không log toàn bộ từng publisher/account nếu chưa cần.

### 11.3. Organization/User

Các điểm nên phát activity log:

- create/update/deactivate organization
- create/invite/update user
- change user role
- update permissions
- add/remove team member

## 12. Rollout plan đề xuất

### Bước 1

Tạo migration cho:

- `activity_logs`
- `activity_log_refs`

### Bước 2

Tạo service dùng chung:

- `IActivityLogService`
- `ActivityLogService`

Service cần hỗ trợ:

- `LogAsync(...)`
- `LogWaterfallApplyAsync(...)`
- `LogJobAsync(...)`
- `LogUserAuditAsync(...)`

### Bước 3

Tích hợp vào:

- waterfall apply/sync/cleanup
- jobs chính
- organization/user actions

### Bước 4

Tạo API:

- list logs
- detail log

### Bước 5

Tạo Global Activity Center ở frontend:

- table hoặc timeline
- filter cơ bản
- chỉ admin trở lên xem được

## 13. Mở rộng phase sau

Khi phase 1 ổn định, có thể mở rộng:

- thêm domain `alert`
- thêm domain `data account`
- thêm `activity_log_changes` nếu cần old/new value chi tiết hơn
- thêm payload lớn ra MinIO, DB chỉ giữ pointer
- thêm entity timeline riêng cho app, mediation group, organization
- union feed từ `alert_history` và `sync_jobs` nếu muốn có timeline hợp nhất sâu hơn

## 14. Kết luận

Thiết kế phase 1 nên ưu tiên:

- schema đơn giản
- filter mạnh
- event tổng quát
- dễ mở rộng

`activity_logs` + `activity_log_refs` là đủ để tạo nền cho:

- audit log dùng chung
- global activity center
- tracking waterfall apply theo mốc nghiệp vụ
- log jobs và audit organization/user

Mô hình này cũng phù hợp với định hướng đã mô tả trong các docs hiện có:

- `audit_logs`
- `change_history`
- `recommendation_apply_log`
- `sync_jobs`

nhưng gom lại theo một chuẩn event feed thống nhất hơn cho UI và backend.
