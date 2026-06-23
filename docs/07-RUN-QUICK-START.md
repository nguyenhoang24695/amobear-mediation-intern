# Hướng dẫn chạy quick-start.ps1 trên Windows

## Cách 1: Chạy trực tiếp trong PowerShell (Khuyến nghị)

### Bước 1: Mở PowerShell
- Nhấn `Windows + X` → Chọn "Windows PowerShell" hoặc "Terminal"
- Hoặc tìm "PowerShell" trong Start Menu

### Bước 2: Di chuyển đến thư mục project
```powershell
cd D:\Git\Amobear.Mediation.Tools
```

### Bước 3: Kiểm tra Execution Policy
```powershell
Get-ExecutionPolicy
```

Nếu kết quả là `Restricted`, bạn cần thay đổi:

**Option A: Cho phép script hiện tại (Khuyến nghị)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Option B: Bypass cho session hiện tại (Tạm thời)**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### Bước 4: Chạy script
```powershell
.\quick-start.ps1
```

## Cách 2: Chạy với Bypass (Nhanh nhất)

Mở PowerShell và chạy:
```powershell
cd D:\Git\Amobear.Mediation.Tools
powershell -ExecutionPolicy Bypass -File .\quick-start.ps1
```

## Cách 3: Chạy từ Command Prompt (CMD)

Mở CMD và chạy:
```cmd
cd D:\Git\Amobear.Mediation.Tools
powershell -ExecutionPolicy Bypass -File quick-start.ps1
```

## Cách 4: Chạy từ File Explorer

1. Mở File Explorer
2. Điều hướng đến `D:\Git\Amobear.Mediation.Tools`
3. Click chuột phải vào `quick-start.ps1`
4. Chọn "Run with PowerShell"

**Lưu ý:** Nếu gặp lỗi execution policy, bạn sẽ cần chạy PowerShell với quyền Administrator và thay đổi execution policy.

## Troubleshooting

### Lỗi: "cannot be loaded because running scripts is disabled on this system"

**Giải pháp:**
```powershell
# Chạy PowerShell với quyền Administrator (Run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Sau đó chạy lại script:
```powershell
.\quick-start.ps1
```

### Lỗi: "The term 'docker' is not recognized"

**Giải pháp:**
- Đảm bảo Docker Desktop đã được cài đặt và đang chạy
- Khởi động lại PowerShell sau khi cài Docker

### Lỗi: "dotnet: command not found"

**Giải pháp:**
- Đảm bảo .NET 8 SDK đã được cài đặt
- Kiểm tra: `dotnet --version` (phải hiển thị version 8.x)

## Kiểm tra trước khi chạy

Chạy các lệnh sau để đảm bảo môi trường đã sẵn sàng:

```powershell
# Kiểm tra Docker
docker --version

# Kiểm tra .NET
dotnet --version

# Kiểm tra PowerShell version (nên >= 5.1)
$PSVersionTable.PSVersion
```

## Sau khi chạy script thành công

Script sẽ tự động:
1. ✅ Kiểm tra Docker
2. ✅ Khởi động containers (PostgreSQL, Redis)
3. ✅ Tạo migrations (nếu chưa có)
4. ✅ Apply migrations vào database
5. ✅ Build solution

Sau đó bạn cần:
1. Chạy ứng dụng: `dotnet run --project MediationPro.Api`
2. Mở Swagger UI: `https://localhost:5001/swagger`
