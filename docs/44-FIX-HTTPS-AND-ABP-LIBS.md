# Fix HTTPS và ABP Install-Libs Issues

## Vấn đề 1: ABP Install-Libs

### Lỗi
```
The Libs folder contains mandatory NPM Packages for running the project.
Make sure you run the abp install-libs CLI tool command.
```

### Giải pháp

#### Cách 1: Sử dụng script tự động

```powershell
.\scripts\42-install-abp-libs.ps1
```

Script này sẽ:
- ✅ Kiểm tra và cài đặt ABP CLI nếu chưa có
- ✅ Chạy `abp install-libs` cho Blazor project
- ✅ Chạy `abp install-libs` cho Blazor.WebApp project (nếu có)

#### Cách 2: Chạy thủ công

1. **Cài đặt ABP CLI** (nếu chưa có):
   ```powershell
   dotnet tool install -g Volo.Abp.Cli
   ```

2. **Chạy install-libs** trong thư mục project:
   ```powershell
   cd MediationProPortal\src\MediationProPortalTemplate.Blazor
   abp install-libs
   ```

3. **Kiểm tra kết quả**:
   - Thư mục `wwwroot/libs` sẽ chứa các NPM packages
   - Các packages như jQuery, Bootstrap sẽ được cài đặt

### Lưu ý

- Cần có **Node.js** và **npm** đã cài đặt
- Nếu không có Node.js, có thể bỏ qua warning này (Blazor WebAssembly không cần client-side libraries)
- Libraries được cài vào `wwwroot/libs` và được gitignore

## Vấn đề 2: HTTPS Certificate Issues

### Lỗi
- HTTPS URLs không truy cập được
- Certificate không được trust
- Browser báo lỗi "Your connection is not private"

### Giải pháp

#### Cách 1: Sử dụng script tự động (cần Admin)

```powershell
.\scripts\43-trust-https-certificate.ps1
```

**Lưu ý:** Script này cần chạy với quyền Administrator.

#### Cách 2: Chạy thủ công

1. **Trust development certificate**:
   ```powershell
   dotnet dev-certs https --trust
   ```

2. **Kiểm tra certificate**:
   ```powershell
   dotnet dev-certs https --check --trust
   ```

3. **Nếu vẫn lỗi, clean và regenerate**:
   ```powershell
   dotnet dev-certs https --clean
   dotnet dev-certs https --trust
   ```

#### Cách 3: Sử dụng HTTP thay vì HTTPS (Development only)

Nếu không thể trust certificate, có thể dùng HTTP trong development:

**File:** `MediationProPortal/src/MediationProPortalTemplate.Blazor/Properties/launchSettings.json`

```json
{
  "profiles": {
    "MediationProPortalTemplate.Blazor": {
      "applicationUrl": "http://localhost:44343"
    }
  }
}
```

**File:** `MediationProPortal/src/MediationProPortalTemplate.Blazor/appsettings.json`

```json
{
  "App": {
    "SelfUrl": "http://localhost:44343"
  },
  "AuthServer": {
    "Authority": "http://localhost:44343",
    "RequireHttpsMetadata": false
  }
}
```

### Fix Port Mismatch

Đã sửa port mismatch giữa `launchSettings.json` và `appsettings.json`:

**Trước:**
- `launchSettings.json`: port `44375`
- `appsettings.json`: port `44343`

**Sau:**
- Cả 2 đều dùng port `44343` để đồng nhất

## Troubleshooting

### Nếu `abp install-libs` fail:

1. **Kiểm tra Node.js**:
   ```powershell
   node --version
   npm --version
   ```

2. **Cài đặt Node.js** nếu chưa có:
   - Download từ: https://nodejs.org/
   - Hoặc dùng Chocolatey: `choco install nodejs`

3. **Chạy lại install-libs**:
   ```powershell
   abp install-libs
   ```

### Nếu HTTPS vẫn không hoạt động:

1. **Restart browser** sau khi trust certificate
2. **Clear browser cache**:
   - Chrome/Edge: Ctrl+Shift+Delete
   - Firefox: Ctrl+Shift+Delete
3. **Thử browser khác** để kiểm tra
4. **Kiểm tra firewall** không block port
5. **Thử HTTP** thay vì HTTPS trong development

### Nếu certificate warning vẫn xuất hiện:

1. **Accept certificate trong browser**:
   - Click "Advanced" → "Proceed to localhost (unsafe)"
2. **Hoặc import certificate manually**:
   ```powershell
   # Export certificate
   dotnet dev-certs https --export-path cert.pfx --password ""
   
   # Import vào Windows Certificate Store (cần Admin)
   # Sử dụng Certificate Manager (certmgr.msc)
   ```

## Best Practices

1. **Development**: Có thể dùng HTTP để tránh certificate issues
2. **Production**: Luôn dùng HTTPS với valid certificate
3. **Trust certificate**: Chỉ trust development certificate trên máy local
4. **Install-libs**: Chạy sau khi clone project hoặc khi có thay đổi về client-side libraries

## Quick Fix Commands

```powershell
# Install ABP CLI
dotnet tool install -g Volo.Abp.Cli

# Install libraries
cd MediationProPortal\src\MediationProPortalTemplate.Blazor
abp install-libs

# Trust HTTPS certificate (cần Admin)
dotnet dev-certs https --trust

# Check certificate
dotnet dev-certs https --check --trust
```
