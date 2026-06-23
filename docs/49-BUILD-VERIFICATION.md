# Build Verification - Kiểm tra Build Hệ thống

## Kết quả Build

### ✅ Backend Solution
**Location:** `backend/MediationPro.sln`

**Status:** ✅ Build Succeeded

**Projects:**
- ✅ MediationPro.Shared
- ✅ MediationPro.Core
- ✅ MediationPro.Infrastructure
- ✅ MediationPro.Jobs
- ✅ MediationPro.Api

**Warnings:**
- 2 warnings về null reference trong `SoWCalculatorJob.cs` (không ảnh hưởng build)

**Target Framework:** .NET 10.0

### ✅ Frontend Solution
**Location:** `frontend/src/`

**Status:** ✅ Build Succeeded

**Projects:**
- ✅ MediationProPortal.Domain.Shared
- ✅ MediationProPortal.Domain
- ✅ MediationProPortal.Application.Contracts
- ✅ MediationProPortal.Application
- ✅ MediationProPortal.EntityFrameworkCore
- ✅ MediationProPortal.HttpApi
- ✅ MediationProPortal.HttpApi.Client
- ✅ MediationProPortal.Blazor
- ✅ MediationProPortal.DbMigrator

**Target Framework:** .NET 10.0
**ABP Version:** 10.0.2

## Cấu trúc Project

```
Amobear.Mediation.Tools/
├── backend/                    # Backend projects
│   ├── MediationPro.Api/
│   ├── MediationPro.Core/
│   ├── MediationPro.Infrastructure/
│   ├── MediationPro.Jobs/
│   ├── MediationPro.Shared/
│   └── MediationPro.sln
│
├── frontend/                   # Frontend ABP Portal
│   ├── src/
│   │   ├── MediationProPortal.Blazor/
│   │   ├── MediationProPortal.DbMigrator/
│   │   ├── MediationProPortal.EntityFrameworkCore/
│   │   └── ...
│   └── (no .sln file - build individual projects)
│
├── docs/                       # Documentation
├── scripts/                    # PowerShell scripts
└── docker-compose.yml          # Docker services
```

## Database Configuration

### Backend Database
- **Database:** `mediationpro`
- **Connection String:** Configured in `backend/MediationPro.Api/appsettings.json`

### Frontend Database
- **Database:** `mediation_portal`
- **Connection String:** 
  ```
  Host=localhost;Port=5432;Database=mediation_portal;Username=mediationpro;Password=mediationpro123
  ```
- **Configured in:**
  - `frontend/src/MediationProPortal.Blazor/appsettings.json`
  - `frontend/src/MediationProPortal.DbMigrator/appsettings.json`

## Scripts mới

### Build Scripts
- `scripts/54-build-all.ps1` - Build cả backend và frontend

### Start Scripts
- `scripts/51-start-backend.ps1` - Start Backend API
- `scripts/52-start-frontend.ps1` - Start Frontend Portal
- `scripts/53-start-all.ps1` - Start cả 2 trong separate windows

## Cách sử dụng

### Build tất cả
```powershell
.\scripts\54-build-all.ps1
```

### Start Backend
```powershell
.\scripts\51-start-backend.ps1
```

**URLs:**
- HTTPS: https://localhost:5001
- HTTP: http://localhost:5000
- Swagger: https://localhost:5001/swagger
- Hangfire: https://localhost:5001/hangfire

### Start Frontend
```powershell
.\scripts\52-start-frontend.ps1
```

**URLs:**
- HTTPS: https://localhost:44351
- HTTP: http://localhost:44351

**Default Credentials:**
- Username: `admin`
- Password: `1q2w3E*`

### Start cả 2
```powershell
.\scripts\53-start-all.ps1
```

## Debug Configuration

### Backend Debug
1. Mở `backend/MediationPro.sln` trong Visual Studio
2. Set `MediationPro.Api` làm startup project
3. Press F5 để debug

### Frontend Debug
1. Mở `frontend/src/MediationProPortal.Blazor/MediationProPortal.Blazor.csproj` trong Visual Studio
2. Press F5 để debug

**Lưu ý:** Frontend không có `.sln` file, bạn có thể:
- Mở individual project files
- Hoặc tạo solution file mới nếu cần

## Next Steps

1. ✅ Build verification - Hoàn thành
2. ⏭️ Run migrations cho frontend:
   ```powershell
   cd frontend\src\MediationProPortal.DbMigrator
   dotnet run
   ```
3. ⏭️ Start và test cả 2 applications
4. ⏭️ Tạo custom modules trong frontend

## Troubleshooting

### Lỗi: "Solution file not found"
- Backend: Sử dụng `backend/MediationPro.sln`
- Frontend: Build individual projects hoặc tạo `.sln` file mới

### Lỗi: "Database connection failed"
- Kiểm tra Docker containers đang chạy: `docker-compose ps`
- Kiểm tra database đã được tạo: `.\scripts\28-create-portal-database.ps1`

### Lỗi: "Port already in use"
- Sử dụng `.\scripts\45-fix-port-conflict.ps1` hoặc `.\scripts\47-kill-dotnet-processes.ps1`
