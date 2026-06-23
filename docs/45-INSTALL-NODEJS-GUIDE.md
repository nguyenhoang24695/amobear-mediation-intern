# Hướng dẫn cài đặt Node.js và npm

## Tổng quan

Node.js và npm là cần thiết để chạy lệnh `abp install-libs` để cài đặt client-side libraries cho ABP Framework.

## Cách 1: Sử dụng script tự động (Khuyến nghị)

```powershell
.\scripts\44-install-nodejs.ps1
```

Script này sẽ:
- ✅ Kiểm tra xem Node.js đã được cài đặt chưa
- ✅ Cung cấp 3 phương thức cài đặt:
  - Chocolatey (nhanh nhất, cần Admin)
  - winget (Windows Package Manager)
  - Manual download (từ nodejs.org)
- ✅ Hướng dẫn chi tiết từng bước

## Cách 2: Cài đặt bằng Chocolatey (Nhanh nhất)

### Yêu cầu
- Chocolatey đã được cài đặt
- Chạy PowerShell as Administrator

### Các bước

1. **Cài đặt Chocolatey** (nếu chưa có):
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Cài đặt Node.js**:
   ```powershell
   choco install nodejs -y
   ```

3. **Restart PowerShell** và verify:
   ```powershell
   node --version
   npm --version
   ```

## Cách 3: Cài đặt bằng winget

```powershell
winget install OpenJS.NodeJS.LTS
```

Sau đó restart PowerShell và verify:
```powershell
node --version
npm --version
```

## Cách 4: Download và cài đặt thủ công

### Các bước

1. **Mở browser** và truy cập: https://nodejs.org/

2. **Download LTS version** (Long Term Support - khuyến nghị)

3. **Chạy installer** và làm theo hướng dẫn:
   - ✅ Check "Add to PATH" (quan trọng!)
   - ✅ Chọn "Install npm package manager"
   - ✅ Chọn "Automatically install the necessary tools"

4. **Restart PowerShell** sau khi cài đặt

5. **Verify installation**:
   ```powershell
   node --version
   npm --version
   ```

## Verify Installation

Sau khi cài đặt, chạy các lệnh sau để kiểm tra:

```powershell
# Kiểm tra Node.js version
node --version
# Nên hiển thị: v20.x.x hoặc v22.x.x (LTS)

# Kiểm tra npm version
npm --version
# Nên hiển thị: 10.x.x hoặc tương tự

# Kiểm tra cả 2 cùng lúc
node --version && npm --version
```

## Sau khi cài đặt Node.js

1. **Restart PowerShell** để PATH được cập nhật

2. **Chạy ABP install-libs**:
   ```powershell
   .\scripts\42-install-abp-libs.ps1
   ```

3. **Verify libraries đã được cài**:
   ```powershell
   # Kiểm tra thư mục wwwroot/libs
   ls MediationProPortal\src\MediationProPortalTemplate.Blazor\wwwroot\libs
   ```

## Troubleshooting

### Lỗi: "node is not recognized"

**Nguyên nhân:** Node.js chưa được thêm vào PATH hoặc chưa restart PowerShell.

**Giải pháp:**
1. Restart PowerShell
2. Kiểm tra PATH:
   ```powershell
   $env:Path -split ';' | Select-String "node"
   ```
3. Nếu không thấy, thêm thủ công vào PATH hoặc cài lại Node.js với option "Add to PATH"

### Lỗi: "npm is not recognized"

**Nguyên nhân:** npm không được cài đặt cùng Node.js.

**Giải pháp:**
1. Cài lại Node.js và đảm bảo chọn "Install npm package manager"
2. Hoặc cài npm riêng:
   ```powershell
   npm install -g npm@latest
   ```

### Lỗi: "Permission denied" khi chạy npm install

**Nguyên nhân:** Quyền không đủ để cài packages.

**Giải pháp:**
1. Chạy PowerShell as Administrator
2. Hoặc cấu hình npm để không cần quyền admin:
   ```powershell
   npm config set prefix "$env:APPDATA\npm"
   ```

### Node.js version quá cũ

**Giải pháp:**
```powershell
# Update Node.js lên version mới nhất
choco upgrade nodejs -y
# Hoặc
winget upgrade OpenJS.NodeJS.LTS
```

## Version Recommendations

- **Node.js**: LTS version (v20.x.x hoặc v22.x.x)
- **npm**: Đi kèm với Node.js (thường là version mới nhất)

## Quick Commands

```powershell
# Check versions
node --version
npm --version

# Update npm
npm install -g npm@latest

# Install Node.js via Chocolatey (need Admin)
choco install nodejs -y

# Install Node.js via winget
winget install OpenJS.NodeJS.LTS

# After installation, restart PowerShell and verify
node --version && npm --version
```

## Next Steps

Sau khi cài đặt Node.js và npm:

1. ✅ Verify installation
2. ✅ Run ABP install-libs: `.\scripts\42-install-abp-libs.ps1`
3. ✅ Start Frontend Portal: `.\scripts\40-start-frontend.ps1`
