# Fix Port Conflict Issues

## Vấn đề

Lỗi: `Failed to bind to address http://127.0.0.1:44343: address already in use`

Nguyên nhân: Port đã được sử dụng bởi một process khác (có thể là instance cũ của application chưa được đóng).

## Giải pháp

### Cách 1: Sử dụng script tự động (Khuyến nghị)

```powershell
.\scripts\45-fix-port-conflict.ps1
```

Script này sẽ:
- ✅ Kiểm tra process nào đang dùng port
- ✅ Hiển thị thông tin process (PID, tên, path)
- ✅ Hỏi bạn có muốn kill processes không
- ✅ Kill processes và verify port đã được giải phóng

**Ví dụ:**
```powershell
.\scripts\45-fix-port-conflict.ps1 -Port 44343
```

### Cách 2: Đổi port sang port khác

Nếu không muốn kill process, có thể đổi port:

```powershell
.\scripts\46-change-port.ps1 -NewPort 44344
```

Script này sẽ:
- ✅ Đổi port trong `launchSettings.json`
- ✅ Đổi port trong `appsettings.json`
- ✅ Cập nhật cả HTTPS và HTTP URLs

### Cách 3: Kill process thủ công

1. **Tìm process đang dùng port:**
   ```powershell
   netstat -ano | findstr :44343
   ```

2. **Xem thông tin process:**
   ```powershell
   Get-Process -Id <PID>
   ```

3. **Kill process:**
   ```powershell
   Stop-Process -Id <PID> -Force
   ```

### Cách 4: Sử dụng PowerShell one-liner

```powershell
# Find and kill process using port 44343
$port = 44343
$pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
foreach ($pid in $pids) {
    Stop-Process -Id $pid -Force
    Write-Host "Killed process $pid"
}
```

## Kiểm tra port đang được sử dụng

### Cách 1: Sử dụng netstat

```powershell
netstat -ano | findstr :44343
```

Output sẽ hiển thị:
```
TCP    127.0.0.1:44343    0.0.0.0:0    LISTENING    12345
```

Số cuối cùng (12345) là PID của process.

### Cách 2: Sử dụng Get-NetTCPConnection

```powershell
Get-NetTCPConnection -LocalPort 44343 | Select-Object LocalAddress, LocalPort, State, OwningProcess
```

### Cách 3: Sử dụng script

```powershell
.\scripts\45-fix-port-conflict.ps1 -Port 44343
```

## Thay đổi port

### Sử dụng script tự động

```powershell
.\scripts\46-change-port.ps1 -NewPort 44344
```

### Thay đổi thủ công

**File:** `MediationProPortal/src/MediationProPortalTemplate.Blazor/Properties/launchSettings.json`

```json
{
  "profiles": {
    "MediationProPortalTemplate.Blazor": {
      "applicationUrl": "https://localhost:44344;http://localhost:44344"
    }
  },
  "iisSettings": {
    "iisExpress": {
      "applicationUrl": "https://localhost:44344",
      "sslPort": 44344
    }
  }
}
```

**File:** `MediationProPortal/src/MediationProPortalTemplate.Blazor/appsettings.json`

```json
{
  "App": {
    "SelfUrl": "https://localhost:44344",
    "RedirectAllowedUrls": "https://localhost:44344"
  },
  "AuthServer": {
    "Authority": "https://localhost:44344"
  }
}
```

## Ports được sử dụng trong dự án

| Service | Port | File |
|---------|------|------|
| Backend API | 5001 (HTTPS), 5000 (HTTP) | `MediationPro.Api/Properties/launchSettings.json` |
| Frontend Portal | 44343 (HTTPS/HTTP) | `MediationProPortal/.../Blazor/Properties/launchSettings.json` |
| PostgreSQL | 5432 | `docker-compose.yml` |
| Redis | 6379 | `docker-compose.yml` |
| MongoDB | 27017 | `docker-compose.yml` |
| RabbitMQ | 5672 (AMQP), 15672 (Management) | `docker-compose.yml` |

## Troubleshooting

### Lỗi: "Access is denied" khi kill process

**Nguyên nhân:** Process đang chạy với quyền Administrator.

**Giải pháp:**
1. Chạy PowerShell as Administrator
2. Chạy lại script: `.\scripts\45-fix-port-conflict.ps1`

### Lỗi: Process không thể kill

**Nguyên nhân:** Process đang được bảo vệ hoặc đang trong trạng thái critical.

**Giải pháp:**
1. Thử kill bằng Task Manager
2. Hoặc đổi port sang port khác
3. Hoặc restart máy tính

### Port vẫn bị chiếm sau khi kill

**Nguyên nhân:** Port chưa được giải phóng ngay lập tức (TIME_WAIT state).

**Giải pháp:**
1. Đợi vài giây rồi thử lại
2. Hoặc đổi port sang port khác
3. Hoặc restart application

## Best Practices

1. **Luôn đóng application đúng cách**: Sử dụng Ctrl+C thay vì đóng cửa sổ
2. **Kiểm tra port trước khi start**: Sử dụng script `45-fix-port-conflict.ps1`
3. **Sử dụng port khác nhau**: Mỗi service nên có port riêng
4. **Document ports**: Ghi lại các ports đang sử dụng

## Quick Commands

```powershell
# Check port usage
netstat -ano | findstr :44343

# Kill process using port (one-liner)
$port = 44343; Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Use script to fix
.\scripts\45-fix-port-conflict.ps1 -Port 44343

# Change to different port
.\scripts\46-change-port.ps1 -NewPort 44344
```
