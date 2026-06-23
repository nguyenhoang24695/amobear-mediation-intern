# Alert History - Giải thích và Sử dụng

## Tại sao cần Alert History?

### Vấn đề với chỉ dùng `alert_results`

Nếu chỉ có `alert_results`, bạn sẽ gặp các vấn đề:

1. **Không có audit trail**: Không biết ai đã resolve alert, khi nào, tại sao
2. **Không track được thay đổi**: Nếu alert được reopen, không biết lịch sử
3. **Khó thống kê**: Khó tính thời gian resolve, số lần reopen, etc.
4. **Compliance**: Không đáp ứng yêu cầu audit/logging

### Giải pháp: `alert_history` + `alert_results`

- **`alert_results`**: Lưu **current state** - dùng để query alerts hiện tại
- **`alert_history`**: Lưu **audit trail** - dùng để xem lịch sử và thống kê

## Cấu trúc

### `alert_results` - Current State

```sql
-- Ví dụ: Alert hiện tại
id: 123
status: RESOLVED
triggered_at: 2025-01-15 10:00:00
resolved_at: 2025-01-15 14:30:00
resolved_by: admin@example.com
```

### `alert_history` - Audit Trail

```sql
-- Lịch sử của alert 123
id: 1, action: CREATED, new_status: PENDING, action_at: 2025-01-15 10:00:00
id: 2, action: STATUS_CHANGED, previous_status: PENDING, new_status: SENT, action_at: 2025-01-15 10:05:00
id: 3, action: ACKNOWLEDGED, previous_status: SENT, new_status: ACKNOWLEDGED, action_by: user1, action_at: 2025-01-15 12:00:00
id: 4, action: RESOLVED, previous_status: ACKNOWLEDGED, new_status: RESOLVED, action_by: admin, comment: "Fixed revenue issue", action_at: 2025-01-15 14:30:00
```

## Use Cases

### 1. Audit Trail

```sql
-- Xem ai đã làm gì với alerts
SELECT 
    ah.action,
    ah.action_by,
    ah.action_at,
    ar.alert_type,
    ar.severity
FROM alert_history ah
JOIN alert_results ar ON ah.alert_result_id = ar.id
WHERE ah.action_at >= NOW() - INTERVAL '7 days'
ORDER BY ah.action_at DESC;
```

### 2. Thống kê Thời gian Resolve

```sql
-- Thời gian resolve trung bình theo alert type
SELECT 
    ar.alert_type,
    AVG(EXTRACT(EPOCH FROM (ar.resolved_at - ar.triggered_at))) / 3600 as avg_resolve_hours,
    MIN(EXTRACT(EPOCH FROM (ar.resolved_at - ar.triggered_at))) / 3600 as min_resolve_hours,
    MAX(EXTRACT(EPOCH FROM (ar.resolved_at - ar.triggered_at))) / 3600 as max_resolve_hours,
    COUNT(*) as resolved_count
FROM alert_results ar
WHERE ar.resolved_at IS NOT NULL
    AND ar.triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY ar.alert_type
ORDER BY avg_resolve_hours DESC;
```

### 3. Alert Reopen Rate

```sql
-- Số lần alert được reopen
SELECT 
    ar.id,
    ar.alert_type,
    COUNT(CASE WHEN ah.action = 'REOPENED' THEN 1 END) as reopen_count
FROM alert_results ar
LEFT JOIN alert_history ah ON ar.id = ah.alert_result_id
WHERE ar.triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY ar.id, ar.alert_type
HAVING COUNT(CASE WHEN ah.action = 'REOPENED' THEN 1 END) > 0
ORDER BY reopen_count DESC;
```

### 4. User Activity

```sql
-- User nào resolve nhiều alerts nhất
SELECT 
    ah.action_by,
    COUNT(*) as action_count,
    COUNT(DISTINCT ah.alert_result_id) as unique_alerts
FROM alert_history ah
WHERE ah.action IN ('RESOLVED', 'ACKNOWLEDGED')
    AND ah.action_at >= NOW() - INTERVAL '30 days'
GROUP BY ah.action_by
ORDER BY action_count DESC;
```

## Actions

### CREATED
- Khi alert được tạo bởi `AlertCalculationJob`
- `previous_status`: NULL
- `new_status`: PENDING

### STATUS_CHANGED
- Khi alert status thay đổi (PENDING → SENT, SENT → FAILED, etc.)
- Tự động log khi `AlertNotificationJob` update status

### RESOLVED
- Khi user/admin resolve alert
- Update `alert_results.resolved_at`, `resolved_by`
- Có thể có `comment` về cách resolve

### ACKNOWLEDGED
- Khi user acknowledge alert (đã biết, đang xử lý)
- Update `alert_results.acknowledged_at`, `acknowledged_by`

### IGNORED
- Khi user ignore alert (không cần xử lý)
- Update `alert_results.status` = IGNORED

### REOPENED
- Khi alert được reopen (từ RESOLVED/ACKNOWLEDGED về PENDING)
- Clear `resolved_at`, `acknowledged_at`
- Alert sẽ được gửi lại

## API Endpoints (Mediation Pro hiện tại)

Backend: `AlertsController`, base route `api/Alerts`. Các thao tác workflow và audit:

- `GET /api/Alerts/results/{id}` — Chi tiết alert; phản hồi gồm **timeline** map từ `alert_history` (không có route riêng `/history`).
- `POST /api/Alerts/results/{id}/acknowledge` — Acknowledge
- `POST /api/Alerts/results/{id}/resolve` — Resolve
- `POST /api/Alerts/results/{id}/snooze` — Snooze
- `GET /api/Alerts/center/timeline` — Timeline toàn cục (Alert Center), có query `from`, `to`, `appId`, `alertRuleId`, ...

Các action **IGNORED** / **REOPENED** vẫn được ghi trong `alert_history` khi luồng nghiệp vụ cập nhật trạng thái; xem code `AlertsController` và `IAlertHistoryService` cho endpoint cụ thể nếu mở rộng.

**Frontend:** trang chi tiết `/alert-center/{id}`; redirect vĩnh viễn từ `/alerts/...` — xem `ALERT-CENTER-FRONTEND-ROUTES.md`.

## Best Practices

1. **Luôn log history**: Mọi thay đổi status đều được log
2. **Include comments**: Thêm comment khi resolve/acknowledge để dễ trace
3. **Archive old history**: Có thể archive history > 1 năm để giảm DB size
4. **Index properly**: Indexes đã được tạo để optimize queries
5. **Dashboard integration**: Sử dụng `alert_history` để build dashboard với timeline view
