# Cấu hình Logging

## Tổng quan

Hệ thống sử dụng **Serilog** để ghi log với cấu trúc thư mục theo năm/tháng/ngày và các mức độ log theo tiêu chuẩn.

## Cấu trúc thư mục Log

```
logs/
├── 2026/
│   ├── 01/
│   │   ├── 14/
│   │   │   ├── mediationpro-20260114.log
│   │   │   └── mediationpro-20260114_001.log (nếu file quá 10MB)
│   │   └── 15/
│   │       └── mediationpro-20260115.log
│   └── 02/
│       └── ...
```

## Mức độ Log (Log Levels)

Theo tiêu chuẩn .NET, các mức độ log từ thấp đến cao:

1. **Verbose/Trace** - Chi tiết nhất, thường chỉ dùng khi debug
2. **Debug** - Thông tin debug, không cần thiết trong production
3. **Information** - Thông tin chung về hoạt động của ứng dụng
4. **Warning** - Cảnh báo, có thể gây vấn đề nhưng không dừng ứng dụng
5. **Error** - Lỗi nghiêm trọng, cần xử lý
6. **Critical/Fatal** - Lỗi cực kỳ nghiêm trọng, có thể làm ứng dụng dừng

## Cấu hình hiện tại

### Minimum Level

- **Default**: `Information`
- **Microsoft**: `Warning` (giảm noise từ framework)
- **Microsoft.AspNetCore**: `Warning`
- **Microsoft.EntityFrameworkCore**: `Warning`
- **Hangfire**: `Information`
- **System**: `Warning`

### File Logging

- **Path**: `logs/yyyy/MM/dd/mediationpro-.log` (cấu hình trong `Logging:Paths`)
- **Rolling Interval**: `Day` (cấu hình trong `Logging:Rotation:RollingInterval`)
- **Retention**: 90 ngày (cấu hình trong `Logging:Rotation:RetentionDays`)
- **File Size Limit**: 10 MB (cấu hình trong `Logging:Rotation:FileSizeLimitMB`)
- **Roll on Size**: Có (cấu hình trong `Logging:Rotation:RollOnFileSizeLimit`)

### Cấu hình Log Rotation

Các tham số log rotation có thể cấu hình trong `appsettings.json`:

```json
{
  "Logging": {
    "Rotation": {
      "RetentionDays": 90,           // Số ngày giữ lại log (tự động xóa sau x ngày)
      "FileSizeLimitMB": 10,         // Giới hạn kích thước file (MB)
      "RollOnFileSizeLimit": true,    // Tạo file mới khi đạt giới hạn
      "RollingInterval": "Day"       // Tần suất tạo file mới: Day, Hour, Month
    },
    "Paths": {
      "LogDirectory": "logs",        // Thư mục chứa logs
      "LogFileName": "mediationpro"  // Tên file log
    }
  }
}
```

**Các giá trị RollingInterval:**
- `Infinite` - Không tự động roll
- `Year` - Mỗi năm
- `Month` - Mỗi tháng
- `Day` - Mỗi ngày (mặc định)
- `Hour` - Mỗi giờ
- `Minute` - Mỗi phút

### Console Logging

- Output ra console với format đầy đủ
- Hữu ích cho development và debugging

## Sử dụng trong Code

### Dependency Injection

```csharp
public class MyService
{
    private readonly ILogger<MyService> _logger;

    public MyService(ILogger<MyService> logger)
    {
        _logger = logger;
    }

    public void DoSomething()
    {
        _logger.LogInformation("Doing something...");
        
        try
        {
            // Your code
            _logger.LogDebug("Debug information");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while doing something");
            throw;
        }
    }
}
```

### Các mức độ Log phổ biến

```csharp
// Information - Thông tin chung
_logger.LogInformation("User {UserId} logged in", userId);

// Warning - Cảnh báo
_logger.LogWarning("Rate limit approaching for user {UserId}", userId);

// Error - Lỗi
_logger.LogError(ex, "Failed to process payment for order {OrderId}", orderId);

// Critical - Lỗi nghiêm trọng
_logger.LogCritical(ex, "Database connection lost!");

// Debug - Debug (chỉ trong Development)
_logger.LogDebug("Processing item {ItemId} with data: {Data}", itemId, data);
```

## Cấu hình theo Environment

### Development (appsettings.Development.json)

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Debug",
      "Override": {
        "Microsoft": "Information"
      }
    }
  }
}
```

### Production (appsettings.Production.json)

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning"
      }
    },
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "retainedFileCountLimit": 30
        }
      }
    ]
  }
}
```

## Enrichers

Serilog được cấu hình với các enrichers sau:

- **FromLogContext** - Thêm context từ code
- **WithMachineName** - Tên máy chủ
- **WithThreadId** - ID của thread
- **WithEnvironmentName** - Tên environment (Development/Production)

## Log Format

### Console Format

```
[2026-01-14 10:30:45.123 +07:00] [INF] [MediationPro.Jobs.StructureSyncJob] Syncing structure for account: pub-123
```

### File Format

```
[2026-01-14 10:30:45.123 +07:00] [INF] [MediationPro.Jobs.StructureSyncJob] [1] Syncing structure for account: pub-123
```

## Best Practices

### 1. Sử dụng Structured Logging

✅ **Good:**
```csharp
_logger.LogInformation("User {UserId} from {Country} logged in at {LoginTime}", 
    userId, country, DateTime.UtcNow);
```

❌ **Bad:**
```csharp
_logger.LogInformation($"User {userId} from {country} logged in");
```

### 2. Log Level phù hợp

- **Information**: Business events, user actions
- **Warning**: Recoverable errors, deprecated features
- **Error**: Exceptions, failures
- **Critical**: System failures, data loss

### 3. Không log thông tin nhạy cảm

❌ **Never log:**
- Passwords
- Credit card numbers
- API keys
- Personal information (PII)

### 4. Include Exception trong Error logs

✅ **Good:**
```csharp
catch (Exception ex)
{
    _logger.LogError(ex, "Failed to process order {OrderId}", orderId);
}
```

❌ **Bad:**
```csharp
catch (Exception ex)
{
    _logger.LogError("Failed to process order");
}
```

## Monitoring và Analysis

### Xem logs trong Development

```powershell
# Xem log của ngày hôm nay
Get-Content logs/2026/01/14/mediationpro-20260114.log -Tail 50

# Xem log real-time
Get-Content logs/2026/01/14/mediationpro-20260114.log -Wait -Tail 20
```

### Tìm kiếm logs

```powershell
# Tìm tất cả Error logs
Select-String -Path "logs/**/*.log" -Pattern "\[ERR\]"

# Tìm logs của một job cụ thể
Select-String -Path "logs/**/*.log" -Pattern "StructureSyncJob"
```

## Troubleshooting

### Logs không được tạo

1. Kiểm tra quyền ghi vào thư mục `logs/`
2. Kiểm tra cấu hình trong `appsettings.json`
3. Xem console output để kiểm tra lỗi Serilog

### Logs quá nhiều

1. Tăng `MinimumLevel` trong `appsettings.json`
2. Giảm log level cho các namespace cụ thể
3. Sử dụng `appsettings.Production.json` với cấu hình khác

### File logs quá lớn

1. Giảm `fileSizeLimitBytes` (hiện tại 10MB)
2. Giảm `retainedFileCountLimit` (hiện tại 90 ngày)
3. Tăng `rollingInterval` nếu cần

## Tùy chỉnh

Để thay đổi cấu hình logging, chỉnh sửa `appsettings.json`:

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Warning"  // Chỉ log Warning trở lên
    },
    "WriteTo": [
      {
        "Name": "File",
        "Args": {
          "retainedFileCountLimit": 30  // Giữ 30 ngày thay vì 90
        }
      }
    ]
  }
}
```

## Tích hợp với các Projects khác

Các projects khác (Jobs, Infrastructure) sẽ tự động sử dụng cùng cấu hình logging khi được inject `ILogger<T>`.
