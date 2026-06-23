# Meta Ads Campaign Request & Approval Flow

## 1. Mục tiêu vận hành
- UI không gọi Meta API trực tiếp khi user bấm create.
- Backend luôn tạo `request nội bộ` trước.
- Chỉ user có quyền `approve` mới chuyển request sang trạng thái sẵn sàng execute.
- Chỉ khi `execute` mới gọi Meta API theo thứ tự `campaign -> adset -> creative -> ad`.
- Mọi object được tạo ở trạng thái `PAUSED`.

## 2. Phạm vi
### In scope
- Draft, validation, submit, approve, reject, execute, retry.
- Audit và operation log cho từng step.
- Mirror local object đã tạo.

### Out of scope
- Tự động optimize sau khi campaign chạy.
- Đồng bộ insights/revenue/install định kỳ.
- Auto-approval theo rule.

## 3. Trạng thái request
- `draft`: request vừa tạo hoặc còn đang chỉnh.
- `pending_approval`: request đã submit, chờ user có quyền approve.
- `approved`: đã được duyệt, chưa gọi Meta.
- `rejected`: bị từ chối, không execute được nếu chưa chỉnh và submit lại.
- `executing`: backend đang gọi Meta API.
- `completed`: tạo xong đủ campaign/adset/creative/ad.
- `failed`: lỗi validation hoặc lỗi ở một bước create.

## 4. Permission matrix
- `s-meta-requests:view`: xem danh sách/detail request.
- `s-meta-requests:create`: tạo draft, validate, submit.
- `s-meta-requests:approve`: approve hoặc reject request.
- `s-meta-requests:execute`: gọi Meta API cho request approved/failed.
- `s-meta-requests:retry`: retry request failed.
- Ngoài RBAC, mọi thao tác liên quan app còn phải qua `app_permissions` với `PermissionLevel.View/Edit`.

## 5. Luồng chính
### Bước 1. Create draft
Input:
- `meta_ad_account_id`
- `app_row_id`
- `campaign`, `adset`, `creative`, `ad`
- `idempotency_key`

Xử lý:
- Kiểm tra user có `s-meta-requests:create`.
- Kiểm tra user có `Edit` trên app.
- Ghi `meta_campaign_requests.status = draft`.
- Gắn `payload_json` đúng business payload từ UI.

### Bước 2. Validate
Validation service kiểm tra:
- Meta ad account tồn tại và đang active.
- Meta integration tồn tại, enabled, có access token.
- App tồn tại và user có permission edit.
- Meta app mapping tồn tại, active, có `meta_application_id` và fallback URL.
- Objective thuộc tập hỗ trợ V1:
  - `OUTCOME_AWARENESS`
  - `OUTCOME_TRAFFIC`
  - `OUTCOME_ENGAGEMENT`
  - `OUTCOME_LEADS`
  - `OUTCOME_APP_PROMOTION`
  - `OUTCOME_SALES`
- Phải có ít nhất một budget ở campaign hoặc ad set.
- `countries` không rỗng.
- `age_min <= age_max`.
- Creative có `page_id`, có `image_hash` hoặc `image_url`, có `link_url` hoặc fallback URL từ mapping.
- `ad.name`, `creative.name`, `adset.name`, `campaign.name` không được rỗng.

Output:
- `is_valid`
- danh sách `errors`

### Bước 3. Submit for approval
Điều kiện:
- request đang ở `draft`.

Xử lý:
- Đổi `status = pending_approval`.
- Ghi `submitted_at`.
- Không gọi Meta API.

### Bước 4. Approve / Reject
Approve:
- yêu cầu quyền `approve`.
- đổi `status = approved`.
- ghi `approved_by`, `approved_at`.

Reject:
- yêu cầu quyền `approve`.
- đổi `status = rejected`.
- ghi `rejected_by`, `rejected_at`, `failure_summary` nếu có lý do.

### Bước 5. Execute
Điều kiện:
- request phải ở `approved` hoặc `failed`.
- execute lại request `failed` là retry logic của V1.

Xử lý tổng quát:
1. Validate draft lại trước khi gọi Meta.
2. Nếu validation fail:
   - `status = failed`
   - cập nhật `validation_errors_json`, `failure_summary`, `failed_at`
   - ghi `meta_operation_logs(step=validation,status=failed)`
3. Nếu validation pass:
   - ghi `meta_operation_logs(step=validation,status=succeeded)`
   - đổi `status = executing`
4. Tạo `campaign` ở Meta, lưu mirror local.
5. Tạo `adset` ở Meta, lưu mirror local.
6. Tạo `creative` ở Meta, lưu mirror local.
7. Tạo `ad` ở Meta, lưu mirror local.
8. Nếu thành công hết:
   - `status = completed`
   - `executed_at` được set

## 6. Idempotency và retry
- Mức request: unique `(organization_id, idempotency_key)` chặn submit trùng cùng một request business.
- Mức execute: trước khi gọi API, service đọc mirror local theo `created_from_request_id`.
- Nếu object đã có:
  - step tương ứng ghi log `skipped`
  - reuse external/local id hiện tại
- Nhờ vậy retry không tạo duplicate nếu Meta đã tạo một phần trước khi request fail.

## 7. Operation logs
Mỗi step ghi một record ở `meta_operation_logs` với:
- `step`: `validation|campaign|adset|creative|ad`
- `status`: `succeeded|failed|skipped`
- `attempt_number`
- `request_json`
- `response_json`
- `error_message`
- `correlation_id`
- `started_at`, `finished_at`

## 8. Payload create thực tế
### Campaign
- `name`
- `objective`
- `status = PAUSED`
- `special_ad_categories`
- optional: `daily_budget`, `lifetime_budget`, `buying_type`, `bid_strategy`

### Ad set
- `name`
- `campaign_id`
- `status = PAUSED`
- `billing_event`
- `optimization_goal`
- `targeting`
- `promoted_object.application_id`
- `promoted_object.object_store_url`
- optional: `daily_budget`, `lifetime_budget`, `bid_amount`, `start_time`, `end_time`

### Creative
- `name`
- `object_story_spec.page_id`
- `object_story_spec.instagram_actor_id` nếu có
- `object_story_spec.link_data`
  - `link`
  - `message`
  - `name`
  - `description`
  - `image_hash` hoặc `picture`
  - `call_to_action`

### Ad
- `name`
- `adset_id`
- `status = PAUSED`
- `creative.creative_id`
- optional `tracking_specs`

## 9. Failure handling
- Lỗi ở step nào thì request dừng ở step đó.
- `failure_summary` giữ lỗi cuối cùng ở request-level.
- `meta_operation_logs` giữ chi tiết sâu hơn cho debug.
- Retry dùng lại object đã tạo thành công trước đó.

## 10. Audit logging
Controller ghi `activity_logs` cho các hành động:
- tạo integration
- cập nhật integration
- sync ad accounts
- tạo/cập nhật app mapping
- tạo request
- approve request
- reject request
- execute request
- execute failed

## 11. Kết luận nghiệp vụ
V1 cố ý chọn luồng `internal request first, Meta API later`. Điều này giúp:
- tránh spend ngoài kiểm soát
- dễ audit ai tạo/duyệt/chạy
- hỗ trợ retry an toàn
- chuẩn bị nền cho phase reporting/automation sau này