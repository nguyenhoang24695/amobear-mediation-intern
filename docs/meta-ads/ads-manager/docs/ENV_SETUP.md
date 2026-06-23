# Hướng dẫn cấu hình .env cho Facebook Ads Manager

## Giới thiệu

Hệ thống Facebook Ads Manager bây giờ sử dụng file `.env` để quản lý cấu hình thay vì hardcode trong source code. Điều này giúp:

- **Bảo mật**: Thông tin nhạy cảm không bị lưu trong source code
- **Linh hoạt**: Dễ dàng thay đổi cấu hình cho các môi trường khác nhau
- **Dễ deploy**: Không cần sửa code khi triển khai

## Cài đặt

### 1. Tạo file .env

Sao chép file `.env.example` thành `.env`:

```bash
copy .env.example .env
```

### 2. Cấu hình Database

Mở file `.env` và cập nhật thông tin database:

```env
DB_HOST=localhost
DB_NAME=facebook_ads_manager
DB_USER=root
DB_PASS=your_password_here
DB_CHARSET=utf8mb4
```

### 3. Cấu hình Facebook API

**Quan trọng**: Bạn cần có Facebook App ID và Access Token để hệ thống hoạt động.

```env
FB_APP_ID=your_facebook_app_id
FB_ACCESS_TOKEN=your_long_lived_access_token
FB_API_VERSION=v20.0
```

**Lưu ý**: `FB_APP_SECRET` là optional nếu bạn đã có Access Token. Bạn chỉ cần:
- ✅ **FB_APP_ID** (bắt buộc)
- ✅ **FB_ACCESS_TOKEN** (bắt buộc)
- ⚠️ **FB_APP_SECRET** (chỉ cần khi tạo token mới hoặc verify webhooks)

#### Cách lấy Facebook App ID và Secret:

1. Truy cập [Facebook Developers](https://developers.facebook.com/)
2. Tạo App mới hoặc sử dụng App có sẵn
3. Vào **Settings** > **Basic** để lấy App ID và App Secret

#### Cách lấy Access Token:

1. Vào [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Chọn App của bạn
3. Tạo User Access Token với các permissions cần thiết:
   - `ads_management`
   - `ads_read`
   - `business_management`
4. Extend token thành Long-lived token

### 4. Cấu hình Application

```env
APP_NAME="Facebook Ads Manager"
APP_VERSION=1.0.0
APP_ENV=development
APP_DEBUG=true
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_URL=http://localhost
```

**Lưu ý**: Trong production, đặt `APP_ENV=production` và `APP_DEBUG=false`

### 5. Cấu hình Security

```env
ENCRYPTION_KEY=your-32-character-encryption-key-here
CSRF_ENABLED=true
CSRF_TOKEN_NAME=_token
```

**Quan trọng**: Tạo encryption key mạnh:

```php
// Chạy đoạn code này để tạo key
echo bin2hex(random_bytes(16)); // Tạo 32 ký tự hex
```

### 6. Cấu hình Email (Optional)

Nếu cần gửi email thông báo:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@yoursite.com
MAIL_FROM_NAME="Facebook Ads Manager"
```

## File .env hoàn chỉnh

```env
# Database Configuration
DB_HOST=localhost
DB_NAME=facebook_ads_manager
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# Facebook API Configuration (Required)
FB_APP_ID=1234567890123456
FB_APP_SECRET=abcdef0123456789abcdef0123456789
FB_ACCESS_TOKEN=EAABwzLixnjYBO...
FB_API_VERSION=v20.0

# Application Configuration
APP_NAME="Facebook Ads Manager"
APP_VERSION=1.0.0
APP_ENV=development
APP_DEBUG=true
APP_TIMEZONE=Asia/Ho_Chi_Minh
APP_URL=http://localhost

# Session Configuration
SESSION_NAME=fb_ads_session
SESSION_LIFETIME=3600
SESSION_SECURE=false
SESSION_HTTPONLY=true

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=300
CACHE_PATH=storage/cache/

# Logging Configuration
LOG_ENABLED=true
LOG_LEVEL=debug
LOG_PATH=storage/logs/

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,gif,mp4,avi,mov
UPLOAD_PATH=storage/uploads/

# Rate Limiting Configuration
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Email Configuration
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@example.com
MAIL_FROM_NAME="Facebook Ads Manager"

# Security Configuration
CSRF_ENABLED=true
CSRF_TOKEN_NAME=_token
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Facebook Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_webhook_verify_token
WEBHOOK_SECRET=your_webhook_secret
```

## Troubleshooting

### 1. File .env không được load

- Kiểm tra xem file `.env` có tồn tại trong thư mục root không
- Đảm bảo file không có extension `.txt` hoặc extension khác

### 2. Lỗi Facebook API

- Kiểm tra App ID, App Secret và Access Token
- Đảm bảo Access Token chưa hết hạn
- Kiểm tra permissions của Access Token

### 3. Lỗi Database

- Kiểm tra thông tin kết nối database
- Đảm bảo database đã được tạo
- Import schema từ file `database/schema.sql`

### 4. Lỗi Permissions

- Đảm bảo thư mục `storage/` có quyền ghi
- Tạo thư mục `storage/cache/`, `storage/logs/`, `storage/uploads/` nếu chưa có

## Bảo mật

- **KHÔNG** commit file `.env` vào Git
- Đặt file `.env` vào `.gitignore`
- Backup file `.env` một cách an toàn
- Sử dụng environment variables trên server production
- Thường xuyên rotate API keys và tokens

## Môi trường Production

Trong production, nên sử dụng environment variables thực của server thay vì file `.env`:

```bash
# Ví dụ với Apache
export FB_APP_ID="your_app_id"
export FB_APP_SECRET="your_app_secret"
# ...
```

Hoặc cấu hình trong virtual host/nginx config.