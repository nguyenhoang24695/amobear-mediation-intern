# Hướng dẫn Setup OAuth Tự Động (Một Lần)

## Vấn đề

Khi sử dụng OAuth 2.0 flow, lần đầu tiên bạn phải mở URL trong browser để authorize và lấy authorization code. Điều này không phù hợp cho automation/server-to-server communication.

## Giải pháp

Hệ thống đã được thiết kế để **chỉ cần setup một lần**, sau đó sẽ **tự động refresh token** mà không cần can thiệp thủ công.

### Cơ chế hoạt động

1. **Lần đầu (Manual - Chỉ một lần):**
   - Mở authorization URL trong browser
   - Đăng nhập Google và authorize
   - Hệ thống lưu `refresh_token` vào database

2. **Sau đó (Tự động):**
   - Background job chạy mỗi 30 phút để refresh token trước khi hết hạn
   - Khi gọi API, hệ thống tự động kiểm tra và refresh token nếu cần
   - **Không cần mở browser nữa!**

## Bước 1: Setup OAuth một lần

### 1.1. Lấy Authorization URL

```bash
GET https://localhost:5001/api/AdMobAuth/authorize?redirectUri=https://localhost:5001/api/AdMobAuth/callback
```

Response:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 1.2. Mở URL trong Browser

Copy `authorizationUrl` và mở trong browser. Đăng nhập Google và authorize ứng dụng.

### 1.3. Nhận Callback

Sau khi authorize, Google sẽ redirect về callback URL với authorization code. Hệ thống sẽ tự động:
- Exchange code để lấy access token và refresh token
- Lưu vào database
- Trả về thông báo thành công

Response:
```json
{
  "message": "Token saved successfully",
  "accountId": "default",
  "expiresAt": "2026-01-15T12:00:00Z"
}
```

## Bước 2: Kiểm tra Token Status

Sau khi setup xong, kiểm tra token status:

```bash
GET https://localhost:5001/api/AdMobAuth/status/default
```

Response:
```json
{
  "accountId": "default",
  "status": "Valid",
  "expiresAt": "2026-01-15T12:00:00Z",
  "expiresInMinutes": 3590.5,
  "hasRefreshToken": true,
  "canAutoRefresh": true,
  "tokenType": "Bearer",
  "createdAt": "2026-01-14T12:00:00Z",
  "updatedAt": "2026-01-14T12:00:00Z"
}
```

## Bước 3: Hệ thống tự động refresh

### Background Job

Hệ thống có background job (`TokenRefreshJob`) chạy **mỗi 30 phút** để:
- Kiểm tra tất cả tokens
- Tự động refresh token trước khi hết hạn (5 phút trước khi expire)
- Đảm bảo token luôn valid

### Xem Background Job

1. Mở Hangfire Dashboard: `https://localhost:5001/hangfire`
2. Vào tab **Recurring Jobs**
3. Tìm job `token-refresh-job`
4. Xem lịch sử chạy và logs

### Manual Refresh (nếu cần)

Nếu muốn refresh token ngay lập tức:

```bash
POST https://localhost:5001/api/AdMobAuth/refresh/default
```

## Bước 4: Sử dụng API

Sau khi setup xong, bạn có thể gọi AdMob API bình thường. Hệ thống sẽ tự động:
- Lấy access token từ database
- Kiểm tra token có sắp hết hạn không
- Tự động refresh nếu cần
- Sử dụng token để gọi AdMob API

**Ví dụ:**

```bash
GET https://localhost:5001/api/AdMobApi/accounts?accountId=default
```

Hệ thống tự động xử lý token, bạn không cần quan tâm!

## Troubleshooting

### Token không được lưu

1. Kiểm tra database connection
2. Xem logs trong console
3. Kiểm tra token status: `GET /api/AdMobAuth/status/default`

### Token hết hạn và không refresh được

1. Kiểm tra refresh token có tồn tại không:
   ```bash
   GET /api/AdMobAuth/status/default
   ```
   
2. Nếu `hasRefreshToken: false`, cần setup lại OAuth:
   - Xóa token cũ trong database
   - Chạy lại bước 1

3. Kiểm tra background job có chạy không:
   - Vào Hangfire Dashboard
   - Xem logs của `token-refresh-job`

### Background job không chạy

1. Kiểm tra Hangfire server có chạy không:
   ```bash
   GET https://localhost:5001/hangfire
   ```

2. Kiểm tra database connection string trong `appsettings.json`

3. Xem logs trong console để tìm lỗi

## Lưu ý quan trọng

1. **Refresh token không bao giờ hết hạn** (trừ khi user revoke access)
2. **Chỉ cần setup một lần** - sau đó hệ thống tự động
3. **Background job đảm bảo token luôn valid** - chạy mỗi 30 phút
4. **API calls tự động refresh token** - không cần can thiệp thủ công

## Kiến trúc

```
┌─────────────────┐
│   User Browser  │ (Chỉ lần đầu)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  OAuth Flow     │
│  (1 lần duy nhất)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Refresh Token  │ ────┐
│  (Lưu vào DB)   │     │
└─────────────────┘     │
                        │
         ┌──────────────┘
         │
         ▼
┌─────────────────┐
│ Background Job  │ ◄─── Tự động refresh mỗi 30 phút
│ (TokenRefresh)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Calls      │ ◄─── Tự động refresh nếu cần
│  (AdMob API)    │
└─────────────────┘
```

## Tóm tắt

✅ **Setup một lần:** Mở browser để authorize (chỉ lần đầu)  
✅ **Tự động refresh:** Background job chạy mỗi 30 phút  
✅ **Tự động trong API:** Mỗi API call tự động refresh token nếu cần  
✅ **Không cần can thiệp:** Sau khi setup, hệ thống hoàn toàn tự động  

Sau khi hoàn thành bước 1, bạn có thể đóng browser và để hệ thống tự động xử lý!
