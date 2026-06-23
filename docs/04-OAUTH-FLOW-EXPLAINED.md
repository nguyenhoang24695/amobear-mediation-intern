# Giải thích OAuth Flow - Tại sao không thấy "code" trong response?

## Response bạn nhận được

```json
{
  "message": "Token saved successfully",
  "accountId": "default",
  "expiresAt": "2026-01-14T12:06:34.3150859Z"
}
```

**Đây là response thành công!** Token đã được lưu vào database.

## OAuth Flow hoạt động như thế nào?

### Bước 1: Lấy Authorization URL
```
GET /api/AdMobAuth/authorize?redirectUri=...
→ Trả về: Authorization URL để mở trong trình duyệt
```

### Bước 2: User đăng nhập và cấp quyền
- Google redirect về: `http://localhost:5000/api/AdMobAuth/callback?code=ABC123&state=...`
- **Code chỉ xuất hiện trong URL này** (query parameter)
- Code này chỉ valid trong vài phút

### Bước 3: Exchange Code → Token
```
GET /api/AdMobAuth/callback?code=ABC123
→ Server tự động:
   1. Nhận code từ URL
   2. Exchange code để lấy access token + refresh token
   3. Lưu token vào database
   4. Trả về response JSON (KHÔNG có code)
```

## Tại sao không thấy code trong response?

**Code là thông tin nhạy cảm và chỉ dùng 1 lần:**
- Code được dùng để exchange token
- Sau khi exchange, code không còn giá trị
- Server không trả về code trong response để bảo mật
- Token đã được lưu vào database, bạn không cần code nữa

## Làm sao biết OAuth đã thành công?

### Dấu hiệu thành công:
1. ✅ Response có `"message": "Token saved successfully"`
2. ✅ Có `accountId` và `expiresAt`
3. ✅ Không có error message

### Kiểm tra token đã được lưu:

**Cách 1: Query database**
```powershell
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT account_id, expires_at FROM ad_mob_tokens;"
```

**Cách 2: Test API với token**
```powershell
# List accounts (sẽ tự động dùng token đã lưu)
Invoke-RestMethod -Uri "http://localhost:5000/api/AdMobApi/accounts" -Method Get
```

## Nếu muốn xem code (để debug)

Code chỉ xuất hiện trong URL callback từ Google. Để xem:

1. **Mở Developer Tools** (F12) trong trình duyệt
2. Vào tab **Network**
3. Sau khi Google redirect, tìm request đến `/api/AdMobAuth/callback`
4. Xem **Request URL** - code sẽ ở trong query parameter:
   ```
   http://localhost:5000/api/AdMobAuth/callback?code=4/0AeanS...&scope=...
   ```

Hoặc thêm logging vào controller để xem code (chỉ để debug):

```csharp
[HttpGet("callback")]
public async Task<IActionResult> Callback([FromQuery] string code, ...)
{
    _logger.LogInformation("Received code: {Code}", code); // Log code
    // ... rest of code
}
```

## Tiếp theo: Test API

Bây giờ bạn có thể test các API endpoints:

```powershell
# 1. List Accounts
Invoke-RestMethod -Uri "http://localhost:5000/api/AdMobApi/accounts" -Method Get

# 2. List Apps (thay {accountName} bằng account name từ bước 1)
Invoke-RestMethod -Uri "http://localhost:5000/api/AdMobApi/accounts/{accountName}/apps" -Method Get

# 3. List Mediation Groups
Invoke-RestMethod -Uri "http://localhost:5000/api/AdMobApi/accounts/{accountName}/mediationGroups" -Method Get
```

Hoặc chạy script test tự động:
```powershell
.\test-api.ps1
```

## Troubleshooting

### Nếu response có error:
- Kiểm tra logs trong console khi chạy `dotnet run`
- Kiểm tra code có còn valid không (code chỉ valid vài phút)
- Thử lại OAuth flow từ đầu

### Nếu API calls bị 401 Unauthorized:
- Token có thể đã hết hạn
- Refresh token: `POST /api/AdMobAuth/refresh/{accountId}`
- Hoặc làm lại OAuth flow

## Tóm tắt

✅ **Response bạn nhận được là ĐÚNG và THÀNH CÔNG**
- Token đã được lưu vào database
- Code không cần thiết trong response (đã được dùng để lấy token)
- Bạn có thể tiếp tục test các API endpoints khác
