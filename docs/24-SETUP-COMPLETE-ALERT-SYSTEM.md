# Alert System Setup Complete ✅

## Đã hoàn thành

### 1. Database Migrations ✅
- ✅ `AddSoWAndAlertSystem` - Tạo bảng `sow_data`, `alert_rules`, `alert_results`
- ✅ `AddNotificationLog` - Tạo bảng `notification_logs`
- ✅ `AddAlertHistory` - Tạo bảng `alert_history` và thêm fields vào `alert_results`

### 2. Alert Rules ✅
- ✅ **24 alert rules** đã được insert vào database
- ✅ Phân bố:
  - REVENUE: 5 rules (3 HIGH, 2 MEDIUM)
  - PERFORMANCE: 5 rules (2 HIGH, 3 MEDIUM)
  - WATERFALL: 5 rules (0 HIGH, 3 MEDIUM, 2 LOW)
  - SYSTEM: 5 rules (3 HIGH, 1 CRITICAL, 1 MEDIUM)
  - RECOMMENDATION: 4 rules (0 HIGH, 1 MEDIUM, 3 LOW)

### 3. Database Tables ✅

**Bảng đã được tạo:**
- ✅ `alert_rules` - 24 rules
- ✅ `alert_results` - Lưu alerts (chưa có data, sẽ được tạo khi job chạy)
- ✅ `alert_history` - Lưu audit trail (chưa có data)
- ✅ `notification_logs` - Lưu notification logs (chưa có data)
- ✅ `sow_data` - Lưu SoW calculations (chưa có data)

## Verify Database

### Check Alert Rules
```sql
-- Tổng số rules
SELECT COUNT(*) FROM alert_rules; -- Should be 24

-- Rules theo category
SELECT rule_type, COUNT(*) FROM alert_rules GROUP BY rule_type;

-- Rules theo severity
SELECT severity, COUNT(*) FROM alert_rules GROUP BY severity;

-- Enabled rules
SELECT COUNT(*) FROM alert_rules WHERE is_enabled = true; -- Should be 24
```

### Check Tables
```sql
-- List all alert-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE 'alert%' 
       OR table_name LIKE 'notification%' 
       OR table_name LIKE 'sow%')
ORDER BY table_name;
```

## Next Steps

### 1. Cấu hình Email và Telegram

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
      "system_alerts": "your-chat-id-3",
      "waterfall_alerts": "your-chat-id-4",
      "recommendation_alerts": "your-chat-id-5"
    }
  }
}
```

### 2. Update Alert Rules (Optional)

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

### 3. Build và Test

```powershell
# Build solution
dotnet build MediationPro.sln

# Run application
dotnet run --project MediationPro.Api
```

### 4. Test Alert System

#### Manual Trigger Alert Calculation Job

Vào Hangfire Dashboard: `http://localhost:5000/hangfire`

1. Vào tab **Recurring Jobs**
2. Tìm job `alert-calculation-job`
3. Click **Trigger now** để chạy thủ công

#### Check Results

```sql
-- Check alerts đã được tạo
SELECT 
    ar.id,
    ar.alert_type,
    ar.severity,
    ar.status,
    ar.message,
    ar.triggered_at
FROM alert_results ar
ORDER BY ar.triggered_at DESC
LIMIT 10;

-- Check alert history
SELECT 
    ah.alert_result_id,
    ah.action,
    ah.previous_status,
    ah.new_status,
    ah.action_at
FROM alert_history ah
ORDER BY ah.action_at DESC
LIMIT 10;

-- Check notification logs
SELECT 
    nl.channel,
    nl.recipient,
    nl.status,
    nl.sent_at
FROM notification_logs nl
ORDER BY nl.sent_at DESC
LIMIT 10;
```

## Expected Behavior

### Alert Calculation Job (mỗi 15 phút)

1. Lấy tất cả enabled rules từ `alert_rules`
2. Evaluate từng rule dựa trên `performance_data`
3. Tạo `alert_results` cho alerts trigger
4. Log `alert_history` (CREATED)
5. Đẩy alerts vào RabbitMQ queue `alert_processing`

### Alert Notification Job (chạy liên tục)

1. Consume alerts từ RabbitMQ
2. Gửi Email (nếu có config)
3. Gửi Telegram (nếu có config)
4. Log vào `notification_logs`
5. Update `alert_results.status` = SENT/FAILED
6. Log `alert_history` (STATUS_CHANGED)

## Troubleshooting

### Alerts không được tạo

1. Check `performance_data` có data không:
   ```sql
   SELECT COUNT(*) FROM performance_data WHERE date >= CURRENT_DATE - 7;
   ```

2. Check rules có enabled không:
   ```sql
   SELECT name, is_enabled FROM alert_rules WHERE is_enabled = false;
   ```

3. Check logs trong `logs/` directory

### Notifications không được gửi

1. Verify Email/Telegram config trong `appsettings.json`
2. Check `notification_logs` để xem error:
   ```sql
   SELECT * FROM notification_logs WHERE status = 'FAILED' ORDER BY sent_at DESC LIMIT 10;
   ```

3. Check RabbitMQ queue:
   - Vào RabbitMQ Management UI: `http://localhost:15672`
   - Check queue `alert_processing` có messages không

### Deduplication quá nhiều

1. Giảm `cooldown_minutes` trong `alert_rules`:
   ```sql
   UPDATE alert_rules SET cooldown_minutes = 60 WHERE name = 'REV-001';
   ```

2. Check deduplication logic trong `AlertCalculationJob.ShouldDeduplicateAsync`

## Summary

✅ **Database**: 4 bảng đã được tạo và migration đã apply
✅ **Alert Rules**: 24 rules đã được insert
✅ **Jobs**: AlertCalculationJob và AlertNotificationJob đã được register
✅ **Services**: EmailService, TelegramService, AlertHistoryService đã được register
✅ **Ready to test**: Build và run application để test

## Documentation

- `docs/22-ALERT-SYSTEM-IMPLEMENTATION.md` - Chi tiết implementation
- `docs/23-ALERT-HISTORY-EXPLAINED.md` - Giải thích alert history
- `scripts/insert-alert-rules.sql` - SQL script insert rules
- `scripts/insert-alert-rules.ps1` - PowerShell script để chạy SQL
