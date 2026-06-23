# Fix: Login INVALID_CREDENTIALS Error

## Vấn đề

Khi login, nhận được lỗi `INVALID_CREDENTIALS` mặc dù đã tạo user bằng SQL script.

## Nguyên nhân

**JWT Secret KHÔNG liên quan đến login!**

- JWT Secret chỉ dùng để **sign token** SAU KHI login thành công
- Login verify password bằng **BCrypt**, không dùng JWT
- Vấn đề là **password hash không đúng** trong database

### Password Hash trong Script

Script `71-create-organization-and-user.sql` có placeholder hash:
```sql
v_password_hash VARCHAR := '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5Y';
```

Hash này **không hợp lệ** và không match với password thực tế.

## Giải pháp

### Cách 1: Update Password Hash trong Database (Khuyến nghị)

1. **Generate password hash:**
   ```powershell
   .\scripts\74-generate-hash-simple.ps1 -Password "amobear@123"
   ```

2. **Copy hash được generate**

3. **Update hash trong database:**
   - Mở file: `scripts/73-update-user-password-hash.sql`
   - Thay đổi:
     ```sql
     v_org_slug VARCHAR := 'amobear';
     v_user_email VARCHAR := 'admin@amobear.vn';
     v_password_hash VARCHAR := 'PASTE_HASH_HERE';  -- Paste hash từ bước 1
     ```
   - Chạy script trong DBeaver/pgAdmin

4. **Verify:**
   ```sql
   SELECT email, role, password_changed_at 
   FROM users 
   WHERE email = 'admin@amobear.vn';
   ```

5. **Test login:**
   ```bash
   POST http://localhost:5000/api/v1/auth/login
   Content-Type: application/json
   
   {
     "email": "admin@amobear.vn",
     "password": "amobear@123",
     "organizationSlug": "amobear"
   }
   ```

### Cách 2: Sử dụng API Endpoint (Tự động hash)

Nếu user chưa tồn tại, sử dụng API để tạo (tự động hash password):

```bash
POST http://localhost:5000/api/v1/setup/create-admin
Content-Type: application/json

{
  "organizationName": "amobear",
  "organizationSlug": "amobear",
  "email": "admin@amobear.vn",
  "password": "amobear@123",
  "firstName": "admin",
  "lastName": "amobear"
}
```

### Cách 3: Xóa và Tạo lại User

Nếu user đã tồn tại với hash sai:

1. **Xóa user:**
   ```sql
   DELETE FROM users 
   WHERE email = 'admin@amobear.vn' 
     AND organization_id = (SELECT id FROM organizations WHERE slug = 'amobear');
   ```

2. **Tạo lại bằng API** (Cách 2) hoặc **SQL với hash đúng**

## Verify Password Hash Format

Password hash hợp lệ phải:
- Bắt đầu với `$2a$` hoặc `$2b$`
- Có độ dài khoảng 60 ký tự
- Ví dụ: `$2a$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUV`

Hash placeholder trong script:
```
$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5Y
```
Hash này **không hợp lệ** vì phần cuối bị lặp lại và không đúng format.

## Troubleshooting

### Vẫn báo INVALID_CREDENTIALS sau khi update hash

1. **Kiểm tra hash trong database:**
   ```sql
   SELECT email, password_hash, LEFT(password_hash, 10) as hash_prefix
   FROM users 
   WHERE email = 'admin@amobear.vn';
   ```
   - Hash phải bắt đầu với `$2a$` hoặc `$2b$`

2. **Kiểm tra user status:**
   ```sql
   SELECT email, status, locked_until, failed_login_attempts
   FROM users 
   WHERE email = 'admin@amobear.vn';
   ```
   - Status phải là `active`
   - `locked_until` phải là NULL
   - `failed_login_attempts` nên là 0

3. **Kiểm tra organization slug:**
   ```sql
   SELECT o.slug, u.email
   FROM organizations o
   JOIN users u ON u.organization_id = o.id
   WHERE u.email = 'admin@amobear.vn';
   ```
   - Đảm bảo organization slug đúng khi login

4. **Check API logs:**
   - Xem logs của API khi login
   - Sẽ thấy log: "Invalid password for user: ..." nếu hash sai

### Generate Hash Failed

Nếu script generate hash không hoạt động:

1. **Sử dụng API endpoint** để tạo user (tự động hash)
2. **Hoặc tạo user test bằng API, sau đó copy hash từ database:**
   ```sql
   SELECT password_hash 
   FROM users 
   WHERE email = 'test@example.com';
   ```
3. **Sử dụng hash đó cho user khác** (nếu cùng password)

## Best Practice

1. **Luôn sử dụng API endpoint** để tạo users (tự động hash password)
2. **Nếu phải dùng SQL**, generate hash trước và verify format
3. **Không sử dụng placeholder hash** trong production
4. **Test login ngay sau khi tạo user**
