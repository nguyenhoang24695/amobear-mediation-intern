# Restructure Project - Tách Backend và Frontend

## Mục tiêu

Tách riêng Backend và Frontend thành 2 folder riêng để:
- ✅ Có thể debug riêng từng project
- ✅ Quản lý dependencies độc lập
- ✅ Tránh conflict giữa các project
- ✅ Dễ dàng maintain và scale

## Cấu trúc mới

```
Amobear.Mediation.Tools/
├── backend/                    # Backend projects (.NET 10.0)
│   ├── MediationPro.Api/
│   ├── MediationPro.Core/
│   ├── MediationPro.Infrastructure/
│   ├── MediationPro.Jobs/
│   ├── MediationPro.Shared/
│   └── MediationPro.sln
│
├── frontend/                   # Frontend ABP Portal (.NET 10.0, ABP 10.0.2)
│   └── MediationProPortal/
│       ├── src/
│       │   ├── MediationProPortal.Blazor/
│       │   ├── MediationProPortal.DbMigrator/
│       │   ├── MediationProPortal.EntityFrameworkCore/
│       │   └── ...
│       └── MediationProPortal.sln
│
├── docs/                       # Documentation
├── scripts/                    # PowerShell scripts
├── docker-compose.yml          # Docker services
└── README.md
```

## Các bước thực hiện

### Bước 1: Đóng tất cả processes và IDE

**QUAN TRỌNG:** Trước khi di chuyển backend projects, bạn cần:

1. **Đóng Visual Studio/VS Code** nếu đang mở
2. **Stop tất cả running applications:**
   ```powershell
   .\scripts\47-kill-dotnet-processes.ps1
   ```
3. **Đóng tất cả terminal windows**

### Bước 2: Di chuyển Backend Projects

Sau khi đóng tất cả, chạy script:

```powershell
.\scripts\50-move-backend-projects.ps1
```

Hoặc thủ công:

```powershell
# Tạo backend folder
New-Item -ItemType Directory -Path "backend" -Force

# Di chuyển projects
Move-Item -Path "MediationPro.Api" -Destination "backend\" -Force
Move-Item -Path "MediationPro.Core" -Destination "backend\" -Force
Move-Item -Path "MediationPro.Infrastructure" -Destination "backend\" -Force
Move-Item -Path "MediationPro.Jobs" -Destination "backend\" -Force
Move-Item -Path "MediationPro.Shared" -Destination "backend\" -Force
Move-Item -Path "MediationPro.sln" -Destination "backend\" -Force
```

### Bước 3: Cập nhật Solution File

Sau khi di chuyển, cần cập nhật paths trong `backend/MediationPro.sln`:

```powershell
cd backend
# Solution file sẽ tự động cập nhật paths
```

### Bước 4: Tạo ABP Frontend Project

ABP project đã được tạo tại `frontend/MediationProPortal/`.

**Restore packages:**
```powershell
cd frontend/MediationProPortal
dotnet restore
```

**Cấu hình database:**
```powershell
# Chỉnh sửa appsettings.json
cd src/MediationProPortal.Blazor
# Cập nhật ConnectionStrings:Default
```

### Bước 5: Cấu hình Database

**File:** `frontend/MediationProPortal/src/MediationProPortal.Blazor/appsettings.json`

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=mediation_portal;Username=mediationpro;Password=mediationpro123"
  }
}
```

**File:** `frontend/MediationProPortal/src/MediationProPortal.DbMigrator/appsettings.json`

```json
{
  "ConnectionStrings": {
    "Default": "Host=localhost;Port=5432;Database=mediation_portal;Username=mediationpro;Password=mediationpro123"
  }
}
```

### Bước 6: Chạy Migrations

```powershell
cd frontend/MediationProPortal/src/MediationProPortal.DbMigrator
dotnet run
```

### Bước 7: Start Applications

**Start Backend:**
```powershell
cd backend/MediationPro.Api
dotnet run
```

**Start Frontend:**
```powershell
cd frontend/MediationProPortal/src/MediationProPortal.Blazor
dotnet run
```

## Scripts mới

### `scripts/50-move-backend-projects.ps1`
Script để di chuyển backend projects vào `backend/` folder.

### `scripts/51-start-backend.ps1`
Script để start backend API từ `backend/` folder.

### `scripts/52-start-frontend.ps1`
Script để start frontend portal từ `frontend/` folder.

### `scripts/53-start-all.ps1`
Script để start cả backend và frontend.

## Debug Configuration

### Backend Debug

**File:** `backend/MediationPro.Api/Properties/launchSettings.json`

```json
{
  "profiles": {
    "MediationPro.Api": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "applicationUrl": "https://localhost:5001;http://localhost:5000",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

### Frontend Debug

**File:** `frontend/MediationProPortal/src/MediationProPortal.Blazor/Properties/launchSettings.json`

```json
{
  "profiles": {
    "MediationProPortal.Blazor": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "applicationUrl": "https://localhost:44300;http://localhost:44300",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

## Troubleshooting

### Lỗi: "Access to the path is denied"

**Nguyên nhân:** Projects đang được sử dụng bởi IDE hoặc processes khác.

**Giải pháp:**
1. Đóng Visual Studio/VS Code
2. Kill tất cả dotnet processes: `.\scripts\47-kill-dotnet-processes.ps1`
3. Thử lại

### Lỗi: "Solution file not found"

**Nguyên nhân:** Solution file chưa được di chuyển hoặc paths chưa được cập nhật.

**Giải pháp:**
1. Kiểm tra `backend/MediationPro.sln` có tồn tại không
2. Mở solution trong Visual Studio để tự động cập nhật paths

### Lỗi: "Project reference not found"

**Nguyên nhân:** Project references trong `.csproj` files vẫn trỏ đến paths cũ.

**Giải pháp:**
1. Mở solution trong Visual Studio
2. Visual Studio sẽ tự động cập nhật references
3. Hoặc manually update paths trong `.csproj` files

## Next Steps

1. ✅ Di chuyển backend projects
2. ✅ Tạo ABP frontend project
3. ✅ Cấu hình database
4. ✅ Chạy migrations
5. ✅ Test debug cả 2 projects
6. ✅ Tạo scripts để start/debug
