# Hướng dẫn Test và Debug AdMob API Integration

## Bước 1: Kiểm tra và Khởi động Docker Containers

### 1.1. Kiểm tra Docker đang chạy
```bash
docker ps
```

### 1.2. Khởi động PostgreSQL và Redis
```bash
docker-compose up -d
```

### 1.3. Kiểm tra containers đã chạy
```bash
docker ps
```

Bạn sẽ thấy:
- `mediationpro-postgres` trên port 5432
- `mediationpro-redis` trên port 6379

### 1.4. Kiểm tra logs nếu cần
```bash
docker-compose logs postgres
docker-compose logs redis
```

## Bước 2: Chạy Database Migrations

### 2.1. Kiểm tra migrations đã có
```bash
dotnet ef migrations list --project MediationPro.Infrastructure --startup-project MediationPro.Api
```

### 2.2. Apply migrations vào database
```bash
dotnet ef database update --project MediationPro.Infrastructure --startup-project MediationPro.Api
```

### 2.3. Kiểm tra database đã được tạo
```bash
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "\dt"
```

Bạn sẽ thấy bảng `ad_mob_tokens` đã được tạo.

## Bước 3: Build Solution

### 3.1. Restore packages
```bash
dotnet restore
```

### 3.2. Build solution
```bash
dotnet build
```

### 3.3. Kiểm tra không có lỗi
Nếu build thành công, bạn sẽ thấy:
```
Build succeeded.
    0 Error(s)
```

## Bước 4: Chạy Ứng dụng

### 4.1. Chạy API
```bash
dotnet run --project MediationPro.Api
```

Ứng dụng sẽ chạy trên:
- HTTP: `http://localhost:5000`
- HTTPS: `https://localhost:5001`
- Swagger UI: `https://localhost:5001/swagger`
- Hangfire Dashboard: `https://localhost:5001/hangfire`

### 4.2. Mở Swagger UI
Mở trình duyệt và truy cập: `https://localhost:5001/swagger`

## Bước 5: Test OAuth Flow (Lấy Access Token)

### 5.1. Lấy Authorization URL

**Trong Swagger UI:**
1. Tìm endpoint `GET /api/AdMobAuth/authorize`
2. Click "Try it out"
3. Nhập `redirectUri` (ví dụ: `http://localhost:5000/api/AdMobAuth/callback`)
4. Click "Execute"

**Hoặc dùng curl:**
```bash
curl -X GET "http://localhost:5000/api/AdMobAuth/authorize?redirectUri=http://localhost:5000/api/AdMobAuth/callback" -H "accept: application/json"
```

**Response sẽ có:**
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

### 5.2. Copy Authorization URL và mở trong trình duyệt

1. Copy `authorizationUrl` từ response
2. Mở trong trình duyệt
3. Đăng nhập với Google account có quyền truy cập AdMob
4. Cấp quyền cho ứng dụng
5. Google sẽ redirect về callback URL với `code` parameter

### 5.3. Lấy Authorization Code từ URL

Sau khi redirect, URL sẽ có dạng:
```
http://localhost:5000/api/AdMobAuth/callback?code=4/0AeanS...&scope=...
```

Copy giá trị của parameter `code`.

### 5.4. Exchange Code để lấy Token

**Cách 1: Dùng Swagger UI**
1. Tìm endpoint `GET /api/AdMobAuth/callback`
2. Click "Try it out"
3. Nhập `code` từ bước 5.3
4. Click "Execute"

**Cách 2: Dùng curl (thay {CODE} bằng code thực tế)**
```bash
curl -X GET "http://localhost:5000/api/AdMobAuth/callback?code={CODE}" -H "accept: application/json"
```

**Response thành công:**
```json
{
  "message": "Token saved successfully",
  "accountId": "default",
  "expiresAt": "2025-01-15T10:30:00Z"
}
```

### 5.5. Verify Token đã được lưu

**Kiểm tra trong database:**
```bash
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT account_id, expires_at FROM ad_mob_tokens;"
```

## Bước 6: Test AdMob API Endpoints

### 6.1. List Accounts

**Swagger UI:**
1. Tìm endpoint `GET /api/AdMobApi/accounts`
2. Click "Try it out"
3. Click "Execute"

**curl:**
```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts" -H "accept: application/json"
```

**Response:**
```json
{
  "accounts": [
    {
      "name": "accounts/pub-1234567890123456",
      "publisherId": "pub-1234567890123456",
      "reportingTimeZone": "Asia/Ho_Chi_Minh",
      "currencyCode": "USD"
    }
  ]
}
```

**Lưu ý:** Copy `name` (account name) để dùng cho các API khác.

### 6.2. List Apps

**Thay `{ACCOUNT_NAME}` bằng account name từ bước 6.1:**
```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts/{ACCOUNT_NAME}/apps?pageSize=100" -H "accept: application/json"
```

**Ví dụ:**
```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts/accounts%2Fpub-1234567890123456/apps?pageSize=100" -H "accept: application/json"
```

### 6.3. List Ad Units

```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts/{ACCOUNT_NAME}/adUnits?pageSize=1000" -H "accept: application/json"
```

### 6.4. List Mediation Groups

```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts/{ACCOUNT_NAME}/mediationGroups?pageSize=100" -H "accept: application/json"
```

### 6.5. List Ad Sources

```bash
curl -X GET "http://localhost:5000/api/AdMobApi/accounts/{ACCOUNT_NAME}/adSources" -H "accept: application/json"
```

### 6.6. Generate Mediation Report

**Tạo file request body `report-request.json`:**
```json
{
  "reportSpec": {
    "dateRange": {
      "startDate": {
        "year": 2024,
        "month": 12,
        "day": 1
      },
      "endDate": {
        "year": 2024,
        "month": 12,
        "day": 28
      }
    },
    "dimensions": [
      "DATE",
      "APP",
      "AD_UNIT"
    ],
    "metrics": [
      "ESTIMATED_EARNINGS",
      "IMPRESSIONS",
      "MATCHED_REQUESTS",
      "MATCH_RATE",
      "OBSERVED_ECPM"
    ],
    "localizationSettings": {
      "currencyCode": "USD",
      "languageCode": "en-US"
    }
  }
}
```

**Gửi request:**
```bash
curl -X POST "http://localhost:5000/api/AdMobApi/accounts/{ACCOUNT_NAME}/mediationReport/generate" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -d @report-request.json
```

## Bước 7: Debug và Troubleshooting

### 7.1. Kiểm tra Logs

**Xem logs của ứng dụng:**
Logs sẽ hiển thị trong console khi chạy `dotnet run`.

**Các thông tin cần chú ý:**
- Token refresh logs
- API request/response logs
- Error messages

### 7.2. Common Issues

#### Issue 1: "No token found for account"
**Nguyên nhân:** Chưa hoàn thành OAuth flow
**Giải pháp:** Làm lại từ Bước 5

#### Issue 2: "Failed to exchange authorization code"
**Nguyên nhân:** 
- Code đã hết hạn (code chỉ valid trong vài phút)
- Redirect URI không khớp
**Giải pháp:** 
- Làm lại OAuth flow
- Đảm bảo redirectUri giống nhau ở cả 2 bước

#### Issue 3: "AdMob API request failed: 401"
**Nguyên nhân:** Token hết hạn hoặc không hợp lệ
**Giải pháp:**
- Refresh token manually: `POST /api/AdMobAuth/refresh/{accountId}`
- Hoặc làm lại OAuth flow

#### Issue 4: "Rate limit exceeded"
**Nguyên nhân:** Gọi API quá nhanh (>10 req/s)
**Giải pháp:** Đợi một chút rồi thử lại (rate limiter sẽ tự động delay)

### 7.3. Debug trong Visual Studio / Rider

1. **Set breakpoints** trong:
   - `AdMobApiClient.cs` - line 60-80 (ExecuteRequestAsync)
   - `AdMobAuthManager.cs` - line 50-70 (ExchangeCodeForTokenAsync)

2. **Attach debugger** và chạy ứng dụng

3. **Inspect variables:**
   - `accessToken`
   - `response.Content`
   - `request.Resource`

### 7.4. Test với Postman

1. Import file `Mediation_Pro_AdMob_API.postman_collection.json`
2. Set variables:
   - `client_id`: Từ appsettings.json
   - `client_secret`: Từ appsettings.json
3. Get access token qua OAuth 2.0 tab
4. Test các endpoints

## Bước 8: Verify Database

### 8.1. Kiểm tra token đã lưu
```bash
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT account_id, expires_at, created_at FROM ad_mob_tokens;"
```

### 8.2. Kiểm tra token còn valid
```bash
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro -c "SELECT account_id, expires_at > NOW() as is_valid FROM ad_mob_tokens;"
```

## Checklist Test

- [ ] Docker containers đang chạy
- [ ] Database migrations đã apply
- [ ] Solution build thành công
- [ ] Ứng dụng chạy không lỗi
- [ ] OAuth flow hoàn thành
- [ ] Token đã lưu vào database
- [ ] List Accounts API hoạt động
- [ ] List Apps API hoạt động
- [ ] List Ad Units API hoạt động
- [ ] List Mediation Groups API hoạt động
- [ ] Generate Report API hoạt động

## Next Steps

Sau khi test thành công, bạn có thể:
1. Tạo Hangfire jobs để sync data tự động
2. Tạo entities để lưu Apps, Ad Units, Mediation Groups
3. Implement SoW Calculator
4. Implement Rule Engine
