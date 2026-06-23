# Alert System Implementation Guide

## Tổng quan

Hệ thống Alert đã được triển khai với đầy đủ các tính năng:
- **24 Alert Rules** theo tài liệu ALERT_SYSTEM_SPECIFICATION.pdf
- **Database-driven configuration** - không cần build lại code
- **Deduplication** - tránh gửi alert trùng lặp
- **Notification logging** - lưu lại tất cả notifications để thống kê
- **Multi-channel support** - Email và Telegram

## Cấu trúc Database

### Tổng quan

Hệ thống sử dụng **3 bảng chính** để quản lý alerts:

1. **`alert_rules`** - Cấu hình rules (static, ít thay đổi)
2. **`alert_results`** - Current state của alerts (query chính)
3. **`alert_history`** - Lịch sử thay đổi (audit trail)
4. **`notification_logs`** - Chi tiết notifications đã gửi

**Tại sao cần cả `alert_results` và `alert_history`?**

- **`alert_results`**: Lưu **current state** - dùng để query alerts hiện tại, filter, dashboard
- **`alert_history`**: Lưu **audit trail** - dùng để xem lịch sử, thống kê, compliance

**Ví dụ:**
- Alert được tạo → `alert_results` có 1 record, `alert_history` có 1 record (CREATED)
- Alert được gửi → `alert_results.status` = SENT, `alert_history` có thêm 1 record (STATUS_CHANGED)
- Alert được resolved → `alert_results.status` = RESOLVED, `alert_history` có thêm 1 record (RESOLVED)

### 1. `alert_rules` - Cấu hình Alert Rules

Lưu trữ tất cả alert rules, có thể enable/disable, chỉnh sửa mà không cần build lại code.

**Các trường quan trọng:**
- `name`: Code của rule (REV-001, PER-001, etc.)
- `rule_type`: Loại rule (REVENUE_DROP, LOW_FILL_RATE, etc.)
- `severity`: Mức độ nghiêm trọng (LOW, MEDIUM, HIGH, CRITICAL)
- `threshold_value`: Giá trị ngưỡng để trigger alert
- `cooldown_minutes`: Thời gian chờ trước khi gửi lại alert cùng loại
- `notification_channels`: JSON array các kênh gửi (["TELEGRAM", "EMAIL"])
- `telegram_topics`: JSON array các Telegram topics
- `email_recipients`: JSON array các email recipients

### 2. `alert_results` - Kết quả Alert Evaluation

Lưu trữ tất cả alerts đã được tính toán và gửi. Đây là bảng chính để query và hiển thị alerts.

**Các trường quan trọng:**
- `alert_rule_id`: Foreign key đến alert_rules
- `status`: PENDING, SENT, FAILED, IGNORED, RESOLVED, ACKNOWLEDGED
- `triggered_at`: Thời điểm alert được trigger
- `sent_at`: Thời điểm alert được gửi thành công
- `resolved_at`: Thời điểm alert được resolved (nếu có)
- `resolved_by`: User/System đã resolve alert
- `acknowledged_at`: Thời điểm alert được acknowledged (nếu có)
- `acknowledged_by`: User/System đã acknowledge alert
- `resolution_comment`: Comment về resolution
- `notification_channels_attempted`: Các kênh đã thử gửi
- `notification_channels_succeeded`: Các kênh gửi thành công

**Indexes:**
- `ix_alert_results_dedup`: Index cho deduplication check (rule_id, publisher_id, app_id, mg_id, triggered_at)
- `ix_alert_results_status_triggered`: Index cho queries theo status và triggered_at
- `ix_alert_results_resolved`: Index cho resolved alerts

**Lưu ý:** Bảng này lưu **current state** của mỗi alert. Để xem lịch sử thay đổi, dùng bảng `alert_history`.

### 3. `alert_history` - Lịch sử Alert (Audit Trail)

Lưu trữ lịch sử tất cả các thay đổi và actions trên alerts. Mỗi khi alert thay đổi status hoặc có action (resolve, acknowledge, etc.), một record mới được tạo.

**Các trường quan trọng:**
- `alert_result_id`: Foreign key đến alert_results
- `action`: Loại action (CREATED, STATUS_CHANGED, RESOLVED, ACKNOWLEDGED, IGNORED, REOPENED)
- `previous_status`: Status trước khi thay đổi
- `new_status`: Status sau khi thay đổi
- `action_by`: User/System thực hiện action
- `comment`: Comment/Note về action
- `action_at`: Thời điểm action được thực hiện

**Use Cases:**
- Audit trail: Xem ai đã làm gì với alert nào, khi nào
- Thống kê: Phân tích thời gian resolve, số lần reopen, etc.
- Debugging: Xem lịch sử thay đổi status để debug issues
- Compliance: Đáp ứng yêu cầu audit/logging

**Ví dụ query:**
```sql
-- Xem lịch sử của một alert
SELECT * FROM alert_history 
WHERE alert_result_id = 123 
ORDER BY action_at;

-- Thống kê thời gian resolve trung bình
SELECT 
    ar.alert_type,
    AVG(EXTRACT(EPOCH FROM (ah_resolved.action_at - ar.triggered_at))) / 3600 as avg_resolve_hours
FROM alert_results ar
JOIN alert_history ah_resolved ON ar.id = ah_resolved.alert_result_id 
    AND ah_resolved.action = 'RESOLVED'
WHERE ar.resolved_at IS NOT NULL
GROUP BY ar.alert_type;
```

### 4. `notification_logs` - Log Notifications

Lưu trữ chi tiết từng notification đã gửi để thống kê và audit trail.

**Các trường quan trọng:**
- `alert_result_id`: Foreign key đến alert_results
- `channel`: Kênh gửi (EMAIL, TELEGRAM, etc.)
- `recipient`: Người nhận (email address, Telegram chat ID, etc.)
- `status`: SUCCESS, FAILED, PENDING
- `sent_at`: Thời điểm gửi

## Alert Rules Catalog

### REVENUE Alerts (5 rules)

| Code | Name | Severity | Cooldown | Channels |
|------|------|----------|----------|----------|
| REV-001 | Daily Revenue Drop | HIGH | 4h | Telegram, Email |
| REV-002 | Weekly Revenue Drop | HIGH | 8h | Telegram, Email |
| REV-003 | Revenue Spike | MEDIUM | 8h | Telegram |
| REV-004 | Zero Revenue | HIGH | 4h | Telegram, Email |
| REV-005 | Below Daily Target | MEDIUM | 24h | Telegram |

### PERFORMANCE Alerts (5 rules)

| Code | Name | Severity | Cooldown | Channels |
|------|------|----------|----------|----------|
| PER-001 | eCPM Drop | HIGH | 4h | Telegram, Email |
| PER-002 | Fill Rate Below Threshold | HIGH | 4h | Telegram, Email |
| PER-003 | Match Rate Below Threshold | MEDIUM | 8h | Telegram |
| PER-004 | Impressions Drop | MEDIUM | 8h | Telegram |
| PER-005 | No Impressions for Active Apps | MEDIUM | 8h | Telegram |

### WATERFALL Alerts (5 rules)

| Code | Name | Severity | Cooldown | Channels |
|------|------|----------|----------|----------|
| WAT-001 | SoW Concentration Risk | MEDIUM | 8h | Telegram |
| WAT-002 | Dead Waterfall Line | LOW | 24h | Telegram |
| WAT-003 | Low SoW but High eCPM | MEDIUM | 24h | Telegram |
| WAT-004 | High SoW but Low eCPM | MEDIUM | 24h | Telegram |
| WAT-005 | Waterfall Imbalance | LOW | 24h | Telegram |

### SYSTEM Alerts (5 rules)

| Code | Name | Severity | Cooldown | Channels |
|------|------|----------|----------|----------|
| SYS-001 | Sync Job Failed | HIGH | 1h | Telegram, Email |
| SYS-002 | API Rate Limit Exceeded | HIGH | 1h | Telegram, Email |
| SYS-003 | Token Expired | CRITICAL | 30m | Telegram, Email |
| SYS-004 | Data Staleness | MEDIUM | 24h | Telegram |
| SYS-005 | Queue Depth High | MEDIUM | 4h | Telegram |

### RECOMMENDATION Alerts (4 rules)

| Code | Name | Severity | Cooldown | Channels |
|------|------|----------|----------|----------|
| REC-001 | Pending Recommendations | LOW | 24h | Telegram |
| REC-002 | High Impact Recommendations | MEDIUM | 24h | Telegram |
| REC-003 | Recommendation Expired | LOW | 24h | Telegram |
| REC-004 | Auto-Apply Ready | LOW | 24h | Telegram |

## Deduplication Logic

Hệ thống sử dụng **smart deduplication** để tránh gửi alert trùng lặp:

1. **Check cooldown per alert**: Mỗi alert được check riêng dựa trên:
   - `alert_rule_id`
   - `publisher_id`
   - `app_id` (nếu có)
   - `mediation_group_id` (nếu có)
   - `triggered_at` trong cooldown period

2. **Chỉ check alerts đã gửi thành công**: Chỉ check alerts có `status = 'SENT'`

3. **Cooldown period**: Dựa trên `cooldown_minutes` của rule

**Ví dụ:**
- Rule REV-001 có cooldown 4 giờ
- Alert cho Publisher A, App B đã được gửi lúc 10:00
- Nếu rule trigger lại alert cho Publisher A, App B lúc 11:00 → sẽ bị deduplicate
- Nếu rule trigger alert cho Publisher A, App C lúc 11:00 → sẽ được gửi (khác AppId)

## Notification Logging

Mỗi notification được gửi đều được log vào `notification_logs`:

- **Email**: Mỗi recipient được log riêng
- **Telegram**: Mỗi topic được log riêng
- **Status**: SUCCESS hoặc FAILED
- **Response data**: Lưu response từ notification service (nếu có)

## Setup Instructions

### 1. Apply Migrations

```powershell
.\scripts\apply-migration.ps1
```

### 2. Insert Alert Rules

```powershell
.\scripts\insert-alert-rules.ps1
```

Hoặc chạy SQL trực tiếp:
```sql
\i scripts/insert-alert-rules.sql
```

### 3. Configure Email và Telegram

Cập nhật `appsettings.json`:

```json
{
  "Email": {
    "Smtp": {
      "Host": "smtp.gmail.com",
      "Port": 587,
      "Username": "your-email@gmail.com",
      "Password": "your-app-password",
      "EnableSsl": true
    },
    "From": {
      "Address": "alerts@mediationpro.com",
      "Name": "Mediation Pro Alert System"
    }
  },
  "Telegram": {
    "BotToken": "your-telegram-bot-token",
    "BaseUrl": "https://api.telegram.org",
    "DefaultTopics": {
      "revenue_alerts": "your-chat-id-1",
      "performance_alerts": "your-chat-id-2",
      "system_alerts": "your-chat-id-3"
    }
  }
}
```

### 4. Update Alert Rules (Optional)

Có thể update email recipients hoặc Telegram topics trực tiếp trong database:

```sql
-- Update email recipients cho rule REV-001
UPDATE alert_rules 
SET email_recipients = '["admin@example.com", "team@example.com"]'
WHERE name = 'REV-001';

-- Update Telegram topics cho rule PER-001
UPDATE alert_rules 
SET telegram_topics = '["performance_alerts", "critical_alerts"]'
WHERE name = 'PER-001';
```

## Query Examples

### Thống kê Alerts theo Severity

```sql
SELECT 
    severity,
    COUNT(*) as total_alerts,
    COUNT(CASE WHEN status = 'SENT' THEN 1 END) as sent_count,
    COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count,
    COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_count
FROM alert_results
WHERE triggered_at >= NOW() - INTERVAL '7 days'
GROUP BY severity
ORDER BY severity;
```

### Thống kê Alert History

```sql
-- Số lượng actions theo loại
SELECT 
    action,
    COUNT(*) as count
FROM alert_history
WHERE action_at >= NOW() - INTERVAL '7 days'
GROUP BY action
ORDER BY count DESC;

-- Thời gian resolve trung bình (từ triggered đến resolved)
SELECT 
    ar.alert_type,
    ar.severity,
    AVG(EXTRACT(EPOCH FROM (ar.resolved_at - ar.triggered_at))) / 3600 as avg_resolve_hours,
    COUNT(*) as resolved_count
FROM alert_results ar
WHERE ar.resolved_at IS NOT NULL
    AND ar.triggered_at >= NOW() - INTERVAL '30 days'
GROUP BY ar.alert_type, ar.severity
ORDER BY avg_resolve_hours DESC;
```

### Lịch sử của một Alert

```sql
-- Xem toàn bộ lịch sử của alert
SELECT 
    ah.action,
    ah.previous_status,
    ah.new_status,
    ah.action_by,
    ah.comment,
    ah.action_at
FROM alert_history ah
WHERE ah.alert_result_id = 123
ORDER BY ah.action_at;
```

### Thống kê Notifications theo Channel

```sql
SELECT 
    channel,
    status,
    COUNT(*) as count
FROM notification_logs
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY channel, status
ORDER BY channel, status;
```

### Top Publishers có nhiều Alerts nhất

```sql
SELECT 
    publisher_id,
    COUNT(*) as alert_count,
    COUNT(DISTINCT alert_rule_id) as unique_rules
FROM alert_results
WHERE triggered_at >= NOW() - INTERVAL '7 days'
GROUP BY publisher_id
ORDER BY alert_count DESC
LIMIT 10;
```

### Alerts chưa được gửi

```sql
SELECT 
    ar.id,
    ar.alert_type,
    ar.severity,
    ar.message,
    ar.triggered_at,
    ar.error_message
FROM alert_results ar
WHERE ar.status = 'FAILED'
    AND ar.triggered_at >= NOW() - INTERVAL '24 hours'
ORDER BY ar.triggered_at DESC;
```

## Best Practices

1. **Review Alert Rules định kỳ**: Kiểm tra và điều chỉnh thresholds dựa trên thực tế
2. **Monitor Notification Logs**: Đảm bảo notifications được gửi thành công
3. **Tune Cooldown Periods**: Điều chỉnh cooldown để balance giữa responsiveness và spam
4. **Group Similar Alerts**: Có thể implement alert grouping để gửi summary thay vì từng alert riêng lẻ
5. **Dashboard Integration**: Sử dụng `alert_results` và `notification_logs` để build dashboard

## Troubleshooting

### Alerts không được gửi

1. Check `alert_results.status` - nếu FAILED, xem `error_message`
2. Check `notification_logs` - xem channel nào failed
3. Verify Email/Telegram configuration trong `appsettings.json`
4. Check RabbitMQ queue - đảm bảo `alert_processing` queue đang hoạt động

### Alerts bị deduplicate quá nhiều

1. Giảm `cooldown_minutes` trong `alert_rules`
2. Kiểm tra logic deduplication - có thể cần điều chỉnh matching criteria

### Performance Issues

1. Index `ix_alert_results_dedup` đã được tạo để optimize deduplication check
2. Có thể partition `alert_results` theo `triggered_at` nếu data lớn
3. Archive old alerts định kỳ (giữ lại 90 ngày)
