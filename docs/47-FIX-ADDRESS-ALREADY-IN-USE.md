# Fix "Address Already In Use" Error

## Vấn đề

Lỗi: `Failed to bind to address http://127.0.0.1:44344: address already in use`

Nguyên nhân có thể:
1. **DotNet processes cũ đang chạy** - Các instance cũ của application chưa được đóng đúng cách
2. **Port ở trạng thái TIME_WAIT** - Port chưa được giải phóng ngay sau khi process đóng
3. **Binding address conflict** - Vấn đề với cách bind (127.0.0.1 vs localhost)
4. **HTTPS certificate binding** - Certificate đang được bind bởi process khác

## Giải pháp

### Cách 1: Kill tất cả DotNet processes (Khuyến nghị)

```powershell
.\scripts\47-kill-dotnet-processes.ps1
```

Script này sẽ:
- ✅ Tìm tất cả dotnet processes
- ✅ Hiển thị thông tin chi tiết (PID, StartTime, CommandLine)
- ✅ Hỏi xác nhận trước khi kill
- ✅ Kill tất cả processes và đợi port được giải phóng

**Lưu ý:** Script này sẽ kill TẤT CẢ dotnet processes, có thể ảnh hưởng đến các ứng dụng khác đang chạy.

### Cách 2: Fix port conflict cụ thể

```powershell
.\scripts\45-fix-port-conflict.ps1 -Port 44344
```

Script này sẽ:
- ✅ Chỉ kiểm tra port cụ thể
- ✅ Hiển thị process đang dùng port
- ✅ Hỏi xác nhận trước khi kill
- ✅ Verify port đã được giải phóng

### Cách 3: Đổi binding address

Nếu vấn đề là do conflict giữa `127.0.0.1` và `localhost`:

```powershell
# Đổi sang localhost
.\scripts\48-fix-bind-address.ps1 -UseAddress localhost

# Hoặc đổi sang 127.0.0.1
.\scripts\48-fix-bind-address.ps1 -UseAddress 127.0.0.1
```

### Cách 4: Đổi sang port khác

```powershell
.\scripts\46-change-port.ps1 -NewPort 44345
```

## Kiểm tra DotNet processes

### Xem tất cả DotNet processes

```powershell
Get-Process -Name "dotnet" | Select-Object Id, ProcessName, StartTime, Path | Format-Table -AutoSize
```

### Xem command line của process

```powershell
Get-CimInstance Win32_Process -Filter "ProcessId = <PID>" | Select-Object CommandLine
```

### Kill process cụ thể

```powershell
Stop-Process -Id <PID> -Force
```

## Kiểm tra Port

### Sử dụng Get-NetTCPConnection

```powershell
Get-NetTCPConnection -LocalPort 44344 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, State, OwningProcess
```

### Sử dụng netstat

```powershell
netstat -ano | findstr :44344
```

### Sử dụng script

```powershell
.\scripts\45-fix-port-conflict.ps1 -Port 44344
```

## Troubleshooting

### Lỗi: "Access is denied" khi kill process

**Nguyên nhân:** Process đang chạy với quyền Administrator.

**Giải pháp:**
1. Chạy PowerShell as Administrator
2. Chạy lại script: `.\scripts\47-kill-dotnet-processes.ps1`

### Lỗi: Port vẫn bị chiếm sau khi kill

**Nguyên nhân:** Port đang ở trạng thái TIME_WAIT (thường kéo dài 30-120 giây).

**Giải pháp:**
1. Đợi vài giây rồi thử lại
2. Hoặc đổi sang port khác: `.\scripts\46-change-port.ps1 -NewPort 44345`
3. Hoặc restart máy tính

### Lỗi: "No process found" nhưng vẫn báo port in use

**Nguyên nhân:** 
- Port đang ở trạng thái TIME_WAIT
- Hoặc có vấn đề với binding address (127.0.0.1 vs localhost)

**Giải pháp:**
1. Thử đổi binding address: `.\scripts\48-fix-bind-address.ps1 -UseAddress localhost`
2. Hoặc đổi port: `.\scripts\46-change-port.ps1 -NewPort 44345`
3. Hoặc đợi vài phút rồi thử lại

### Lỗi: "Multiple processes using port"

**Nguyên nhân:** Nhiều instance của application đang chạy.

**Giải pháp:**
1. Kill tất cả dotnet processes: `.\scripts\47-kill-dotnet-processes.ps1`
2. Đợi vài giây
3. Thử start lại

## Best Practices

1. **Luôn đóng application đúng cách**: Sử dụng Ctrl+C thay vì đóng cửa sổ
2. **Kiểm tra processes trước khi start**: Sử dụng `Get-Process -Name "dotnet"`
3. **Sử dụng script tự động**: Sử dụng `47-kill-dotnet-processes.ps1` để cleanup
4. **Đợi port được giải phóng**: Sau khi kill process, đợi 2-3 giây trước khi start lại

## Quick Commands

```powershell
# Kill all dotnet processes
.\scripts\47-kill-dotnet-processes.ps1

# Check specific port
.\scripts\45-fix-port-conflict.ps1 -Port 44344

# Change port
.\scripts\46-change-port.ps1 -NewPort 44345

# Fix binding address
.\scripts\48-fix-bind-address.ps1 -UseAddress localhost

# Check all dotnet processes
Get-Process -Name "dotnet" | Select-Object Id, ProcessName, StartTime

# Kill specific process
Stop-Process -Id <PID> -Force
```

## Workflow Khuyến nghị

Khi gặp lỗi "address already in use":

1. **Kiểm tra processes:**
   ```powershell
   Get-Process -Name "dotnet"
   ```

2. **Kill tất cả dotnet processes:**
   ```powershell
   .\scripts\47-kill-dotnet-processes.ps1
   ```

3. **Đợi 3 giây**

4. **Thử start lại:**
   ```powershell
   .\scripts\40-start-frontend.ps1
   ```

5. **Nếu vẫn lỗi, đổi port:**
   ```powershell
   .\scripts\46-change-port.ps1 -NewPort 44345
   .\scripts\40-start-frontend.ps1
   ```

6. **Nếu vẫn lỗi, fix binding address:**
   ```powershell
   .\scripts\48-fix-bind-address.ps1 -UseAddress localhost
   .\scripts\40-start-frontend.ps1
   ```
