# Solution Files Guide

## Tổng quan

Dự án có 2 solution files riêng biệt:
1. **MediationPro.sln** - Backend solution (API, Core, Infrastructure, Jobs, Shared)
2. **MediationProPortal.sln** - Frontend solution (ABP Portal)

## Vấn đề

Khi chạy `dotnet restore` hoặc `dotnet build` ở thư mục gốc mà không chỉ định solution file, sẽ gặp lỗi:
```
MSBUILD : error MSB1011: Specify which project or solution file to use because this folder contains more than one project or solution file.
```

## Giải pháp

### 1. Chỉ định solution file cụ thể

**Backend:**
```powershell
dotnet restore MediationPro.sln
dotnet build MediationPro.sln
```

**Frontend:**
```powershell
dotnet restore MediationProPortal.sln
dotnet build MediationProPortal.sln
```

Hoặc nếu solution file nằm trong thư mục `MediationProPortal`:
```powershell
cd MediationProPortal
dotnet restore MediationProPortal.sln
dotnet build MediationProPortal.sln
```

### 2. Sử dụng scripts tự động

**Restore tất cả solutions:**
```powershell
.\scripts\37-restore-all-solutions.ps1
```

**Build tất cả solutions:**
```powershell
.\scripts\38-build-all-solutions.ps1
```

**Test build backend:**
```powershell
.\scripts\36-test-backend-build.ps1
```

**Setup và chạy Portal:**
```powershell
.\scripts\34-setup-and-run-portal.ps1
```

### 3. Restore/Build từng project riêng

Nếu chỉ cần restore/build một project cụ thể:

**Backend API:**
```powershell
dotnet restore --project MediationPro.Api
dotnet build --project MediationPro.Api
dotnet run --project MediationPro.Api
```

**Frontend Blazor:**
```powershell
cd MediationProPortal\src\MediationProPortalTemplate.Blazor
dotnet restore
dotnet build
dotnet run
```

**Frontend DbMigrator:**
```powershell
cd MediationProPortal\src\MediationProPortalTemplate.DbMigrator
dotnet restore
dotnet build
dotnet run
```

## Best Practices

1. **Luôn chỉ định solution file** khi restore/build ở thư mục gốc
2. **Sử dụng scripts** để tự động hóa các tác vụ thường dùng
3. **Restore trước khi build** để đảm bảo packages được cài đặt đầy đủ
4. **Kiểm tra .NET SDK version** trước khi build:
   ```powershell
   dotnet --version
   ```
   - Backend: Cần .NET 10.0 SDK
   - Frontend: Cần .NET 10.0 SDK

## Scripts Reference

| Script | Mô tả |
|--------|-------|
| `36-test-backend-build.ps1` | Test build backend solution |
| `37-restore-all-solutions.ps1` | Restore tất cả solutions |
| `38-build-all-solutions.ps1` | Build tất cả solutions |
| `34-setup-and-run-portal.ps1` | Setup và chạy ABP Portal |

## Troubleshooting

### Lỗi: "Specify which project or solution file to use"

**Nguyên nhân:** Đang chạy `dotnet restore/build` ở thư mục có nhiều solution files.

**Giải pháp:** Chỉ định solution file cụ thể:
```powershell
dotnet restore MediationPro.sln
```

### Lỗi: "The current .NET SDK does not support targeting .NET 10.0"

**Nguyên nhân:** Chưa cài đặt .NET 10.0 SDK.

**Giải pháp:** Cài đặt .NET 10.0 SDK từ [dotnet.microsoft.com](https://dotnet.microsoft.com/download)

### Lỗi: "Package restore failed"

**Nguyên nhân:** 
- Network issues
- NuGet source không accessible
- Package version không tồn tại

**Giải pháp:**
1. Kiểm tra kết nối mạng
2. Clear NuGet cache: `dotnet nuget locals all --clear`
3. Restore lại: `dotnet restore MediationPro.sln`
