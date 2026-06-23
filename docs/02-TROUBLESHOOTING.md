# Troubleshooting - Không truy cập được ứng dụng

## Vấn đề: PowerShell chặn script `.ps1` (Execution Policy)

**Lỗi mẫu:**
```
.\scripts\52-start-frontend.ps1 cannot be loaded because running scripts is disabled on this system.
```

**Cách nhanh (không đổi policy hệ thống):**
```powershell
.\scripts\52-start-frontend.cmd
```
hoặc:
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\52-start-frontend.ps1
```

**Cho phép script lâu dài (user hiện tại):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Sau đó mở terminal mới.

---

## Vấn đề: Không vào được các URL sau khi start ứng dụng

### Kiểm tra 1: Ứng dụng có đang chạy không?

**Kiểm tra trong console:**
Khi chạy `dotnet run --project MediationPro.Api`, bạn sẽ thấy output như:
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: https://localhost:5001
```

**Kiểm tra port đang được sử dụng:**
```powershell
netstat -ano | findstr :5000
netstat -ano | findstr :5001
```

### Kiểm tra 2: Port có đúng không?

**Port mặc định trong launchSettings.json:**
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`

**Nếu bạn thấy port khác (như 5118, 7034), có thể:**
1. File `launchSettings.json` chưa được cập nhật
2. Bạn đang chạy với profile khác

**Giải pháp:**
- Chạy với profile cụ thể: `dotnet run --project MediationPro.Api --launch-profile https`
- Hoặc cập nhật `launchSettings.json` để match với README

### Kiểm tra 3: HTTPS Certificate

**Nếu truy cập HTTPS bị lỗi certificate:**
1. Trust development certificate:
   ```powershell
   dotnet dev-certs https --trust
   ```

2. Hoặc chỉ dùng HTTP: `http://localhost:5000/swagger`

### Kiểm tra 4: Database Connection

**Nếu ứng dụng crash khi start, kiểm tra:**
1. PostgreSQL container đang chạy:
   ```powershell
   docker ps | findstr postgres
   ```

2. Database đã được tạo:
   ```powershell
   docker exec mediationpro-postgres psql -U mediationpro -d postgres -c "\l"
   ```

3. Connection string trong `appsettings.json` đúng

### Kiểm tra 5: Lỗi trong Logs

**Xem logs chi tiết:**
Khi chạy `dotnet run`, xem có lỗi nào không:
- Database connection errors
- Hangfire initialization errors
- Missing dependencies

### Các URL cần kiểm tra

Sau khi ứng dụng start thành công:

1. **Swagger UI:**
   - HTTP: `http://localhost:5000/swagger`
   - HTTPS: `https://localhost:5001/swagger`

2. **Hangfire Dashboard:**
   - HTTP: `http://localhost:5000/hangfire`
   - HTTPS: `https://localhost:5001/hangfire`

3. **API Health Check:**
   - `http://localhost:5000/api/AdMobApi/accounts`

### Giải pháp nhanh

**Nếu không vào được, thử:**

1. **Stop ứng dụng** (Ctrl+C)

2. **Kiểm tra và fix port:**
   ```powershell
   # Xem port nào đang được dùng
   netstat -ano | findstr :5000
   netstat -ano | findstr :5001
   
   # Nếu port bị chiếm, kill process hoặc đổi port
   ```

3. **Trust HTTPS certificate:**
   ```powershell
   dotnet dev-certs https --trust
   ```

4. **Chạy lại với HTTP only (nếu HTTPS có vấn đề):**
   ```powershell
   dotnet run --project MediationPro.Api --launch-profile http
   ```
   Sau đó truy cập: `http://localhost:5000/swagger`

5. **Kiểm tra logs chi tiết:**
   Thêm vào `appsettings.Development.json`:
   ```json
   {
     "Logging": {
       "LogLevel": {
         "Default": "Debug",
         "Microsoft.AspNetCore": "Information"
       }
     }
   }
   ```

### Common Issues

#### Issue 1: "This site can't be reached"
- Ứng dụng chưa start
- Port bị sai
- Firewall blocking

#### Issue 2: "ERR_SSL_PROTOCOL_ERROR" hoặc "Your connection is not private"
- HTTPS certificate chưa được trust
- Chạy: `dotnet dev-certs https --trust`

#### Issue 3: "500 Internal Server Error"
- Database connection issue
- Check logs trong console

#### Issue 4: Hangfire Dashboard không load
- Database `mediationpro_hangfire` chưa được tạo
- Chạy: `.\setup-hangfire-db.ps1`

### Debug Steps

1. **Kiểm tra ứng dụng có start:**
   ```powershell
   dotnet run --project MediationPro.Api
   ```
   Xem output có "Now listening on" không

2. **Test với curl:**
   ```powershell
   curl http://localhost:5000/swagger
   ```

3. **Kiểm tra browser console:**
   Mở Developer Tools (F12) và xem có lỗi gì không

4. **Kiểm tra Network tab:**
   Xem request có được gửi và response là gì

---

## AdMob mediationReport:generate — Redis gate

**Triệu chứng:** Job performance-sync Hangfire **Succeeded** nhưng bronze không cập nhật; API generate trả **409**; log `Mediation report generate job queued`.

**Nguyên nhân:** **Global Gate** (Doc **136**) — chỉ một session `mediationReport:generate` tại một thời điểm; nếu session active và lần gọi API gần nhất &lt; 15 phút thì job vào hàng đợi Redis, API bị skip.

**Kiểm tra Redis:**

```powershell
docker exec mediationpro-redis redis-cli GET admob:mediation-report:session
docker exec mediationpro-redis redis-cli LLEN admob:mediation-report:queue
docker exec mediationpro-redis redis-cli SMEMBERS admob:mediation-report:queued-keys
```

**Xử lý:**

1. **Restart API** — tự xóa session treo (`MediationReportGenerateSessionStartupCleanup`).
2. **Đợi drain** — session hiện tại kết thúc sẽ chạy job trong queue (FIFO).
3. **Session treo thủ công:** `DEL admob:mediation-report:session` (không xóa queue trừ khi cố reset).
4. **Debug tạm:** `PerformanceSync:MediationGenerateGateEnabled: false` trong `appsettings.json`.

Chi tiết: [`docs/136-ADMOB-MEDIATION-REPORT-GENERATE-GATE.md`](./136-ADMOB-MEDIATION-REPORT-GENERATE-GATE.md).
