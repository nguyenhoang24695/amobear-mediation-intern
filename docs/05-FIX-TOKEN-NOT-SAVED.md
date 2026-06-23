# Sửa lỗi: Token không được lưu vào database

## Vấn đề

Token được tạo nhưng `access_token` và `refresh_token` không được lưu vào database (length = 0).

## Nguyên nhân đã sửa

1. **JSON Deserialization**: Google OAuth trả về JSON với `snake_case` (access_token, refresh_token) nhưng class `TokenResponse` đang dùng `PascalCase` (AccessToken, RefreshToken)
   - **Đã sửa**: Thêm `[JsonPropertyName]` attributes để map đúng

2. **Thiếu logging**: Không có cách nào để debug khi token không được lưu
   - **Đã sửa**: Thêm extensive logging để track toàn bộ flow

## Các thay đổi đã thực hiện

### 1. Sửa TokenResponse class
```csharp
private class TokenResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("refresh_token")]
    public string? RefreshToken { get; set; }
    // ...
}
```

### 2. Thêm logging chi tiết
- Log raw response từ Google
- Log token sau khi parse
- Log trước và sau khi save
- Verify token sau khi save

### 3. Thêm validation
- Kiểm tra access_token không null trước khi save
- Verify token đã được lưu sau khi save

## Cách test lại

### Bước 1: Xóa token cũ trong database

```powershell
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "DELETE FROM ad_mob_tokens;"
```

### Bước 2: Restart ứng dụng

Stop ứng dụng hiện tại (Ctrl+C) và chạy lại:
```powershell
dotnet run --project MediationPro.Api
```

### Bước 3: Làm lại OAuth flow

1. **Lấy Authorization URL:**
   ```powershell
   # Hoặc dùng Swagger UI
   http://localhost:5000/swagger
   # Endpoint: GET /api/AdMobAuth/authorize
   ```

2. **Complete OAuth flow** và lấy code

3. **Exchange code:**
   ```
   GET /api/AdMobAuth/callback?code={CODE}
   ```

### Bước 4: Kiểm tra logs

Trong console khi chạy `dotnet run`, bạn sẽ thấy logs như:
```
[Debug] Token response from Google: {"access_token":"...","refresh_token":"..."}
[Information] Token response parsed. Has AccessToken: True, Has RefreshToken: True
[Debug] Saving token for AccountId: default, AccessToken length: 150, RefreshToken length: 180
[Information] SaveChanges completed. Rows affected: 1
[Debug] Token verified in database. AccessToken length: 150, RefreshToken length: 180
```

### Bước 5: Verify trong database

```powershell
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT id, account_id, LENGTH(access_token) as access_token_len, LENGTH(refresh_token) as refresh_token_len, expires_at FROM ad_mob_tokens;"
```

Bây giờ bạn sẽ thấy:
- `access_token_len` > 0
- `refresh_token_len` > 0

## Nếu vẫn không lưu được

### Kiểm tra logs

Xem logs trong console để tìm:
- "Token response from Google" - Xem raw response
- "Token response parsed" - Xem token có được parse không
- "Saving token" - Xem token có được gọi save không
- "SaveChanges completed" - Xem có lỗi khi save không

### Common issues

#### Issue 1: "Access token is missing in token response"
**Nguyên nhân:** Google không trả về access_token
**Giải pháp:**
- Kiểm tra code có còn valid không (code chỉ valid vài phút)
- Làm lại OAuth flow từ đầu
- Kiểm tra Client ID và Client Secret đúng không

#### Issue 2: "Token was not found in database after save"
**Nguyên nhân:** SaveChanges không thành công
**Giải pháp:**
- Kiểm tra database connection
- Xem có exception trong logs không
- Kiểm tra database schema có đúng không

#### Issue 3: Token length vẫn = 0
**Nguyên nhân:** JSON deserialization vẫn sai
**Giải pháp:**
- Xem log "Token response from Google" để xem format thực tế
- Kiểm tra JsonPropertyName attributes có đúng không

## Test API sau khi token được lưu

```powershell
# List Accounts (sẽ tự động dùng token đã lưu)
Invoke-RestMethod -Uri "http://localhost:5000/api/AdMobApi/accounts" -Method Get
```

Nếu thành công, bạn sẽ thấy danh sách accounts.

## Debug Tips

1. **Enable Debug logging:**
   File `appsettings.Development.json` đã được cấu hình để log Debug level cho AdMob

2. **Xem raw response:**
   Log sẽ hiển thị raw JSON response từ Google

3. **Verify từng bước:**
   - Token có được parse không?
   - Token có được gọi save không?
   - SaveChanges có return > 0 không?
   - Token có được verify sau save không?
