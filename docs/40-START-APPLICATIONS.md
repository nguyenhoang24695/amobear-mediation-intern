# Hướng dẫn Start Backend và Frontend

## Tổng quan

Dự án có 2 phần chính:
- **Backend API**: MediationPro.Api (https://localhost:5001)
- **Frontend Portal**: ABP Portal (https://localhost:44343)

## Yêu cầu

1. **Docker Desktop** đang chạy
2. **.NET 10.0 SDK** đã cài đặt
3. **Database đã được migrate** (cho Frontend Portal)

## Cách 1: Start riêng từng phần

### Start Backend API

```powershell
.\scripts\39-start-backend.ps1
```

Script này sẽ:
- ✅ Kiểm tra Docker
- ✅ Start Docker containers (PostgreSQL, Redis, MongoDB, RabbitMQ)
- ✅ Start Backend API

**URLs:**
- API: https://localhost:5001
- Swagger: https://localhost:5001/swagger
- Hangfire: https://localhost:5001/hangfire

### Start Frontend Portal

```powershell
.\scripts\40-start-frontend.ps1
```

Script này sẽ:
- ✅ Kiểm tra Docker và PostgreSQL
- ✅ Kiểm tra database `mediation_portal` (tạo nếu chưa có)
- ✅ Start Frontend Portal

**URLs:**
- Portal: https://localhost:44343

**Default credentials:**
- Username: `admin`
- Password: `1q2w3E*`

## Cách 2: Start cả 2 cùng lúc

```powershell
.\scripts\41-start-all.ps1
```

Script này sẽ:
- ✅ Hỏi bạn có muốn start Backend không
- ✅ Hỏi bạn có muốn start Frontend không
- ✅ Start mỗi phần trong một PowerShell window riêng

## Cách 3: Start thủ công

### Start Backend

```powershell
# 1. Start Docker containers
docker-compose up -d

# 2. Start Backend API
cd MediationPro.Api
dotnet run
```

### Start Frontend

```powershell
# 1. Đảm bảo database đã được migrate
cd MediationProPortal\src\MediationProPortalTemplate.DbMigrator
dotnet run

# 2. Start Frontend Portal
cd ..\MediationProPortalTemplate.Blazor
dotnet run
```

## Kiểm tra

### Backend API

1. Mở browser: https://localhost:5001/swagger
2. Kiểm tra Hangfire Dashboard: https://localhost:5001/hangfire
3. Test API endpoints

### Frontend Portal

1. Mở browser: https://localhost:44343
2. Đăng nhập với credentials mặc định
3. Kiểm tra các modules có sẵn

## Troubleshooting

### Lỗi: Docker không chạy

**Giải pháp:**
1. Mở Docker Desktop
2. Đợi Docker khởi động hoàn toàn
3. Chạy lại script

### Lỗi: Database không tồn tại (Frontend)

**Giải pháp:**
```powershell
.\scripts\28-create-portal-database.ps1
.\scripts\34-setup-and-run-portal.ps1
```

### Lỗi: Port đã được sử dụng

**Giải pháp:**
1. Kiểm tra process đang dùng port:
   ```powershell
   netstat -ano | findstr :5001
   netstat -ano | findstr :44343
   ```
2. Dừng process hoặc thay đổi port trong `launchSettings.json`

### Lỗi: Migrations chưa chạy (Frontend)

**Giải pháp:**
```powershell
cd MediationProPortal\src\MediationProPortalTemplate.DbMigrator
dotnet run
```

## Next Steps

Sau khi start thành công:
1. ✅ Backend API đang chạy
2. ✅ Frontend Portal đang chạy
3. ➡️ Bắt đầu tạo Module đầu tiên

Xem hướng dẫn tạo Module tại: `docs/41-CREATE-FIRST-MODULE.md`
