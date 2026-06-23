# Hướng dẫn Generate Password Hash

## Vấn đề

Khi tạo user bằng SQL script, cần password hash đúng format BCrypt. Hash placeholder trong script không hợp lệ.

## Các cách Generate Password Hash

### Cách 1: Sử dụng API Endpoint (Khuyến nghị - Tự động hash)

Tạo user qua API, password sẽ tự động được hash:

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

**Ưu điểm:**
- Tự động hash password
- Không cần generate hash thủ công
- Validate input
- Error handling tốt

### Cách 2: Tạo User Test và Copy Hash

1. **Tạo user test bằng API** (với password bạn muốn)
2. **Query hash từ database:**
   ```sql
   SELECT password_hash 
   FROM users 
   WHERE email = 'test@example.com';
   ```
3. **Copy hash và sử dụng cho user khác** (nếu cùng password)
4. **Xóa user test** sau khi đã copy hash

### Cách 3: Sử dụng .NET Code

Tạo một file C# đơn giản:

```csharp
using BCrypt.Net;

string password = "amobear@123";
string hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
Console.WriteLine(hash);
```

Compile và chạy:
```bash
# Nếu có BCrypt.Net-Next package
dotnet run --project backend/MediationPro.Infrastructure
```

### Cách 4: Sử dụng Online BCrypt Generator

⚠️ **Không khuyến nghị cho production** - chỉ dùng cho development/testing

1. Truy cập: https://bcrypt-generator.com/
2. Nhập password: `amobear@123`
3. Rounds: `12`
4. Copy hash

## Update Password Hash trong Database

Sau khi có hash, update vào database:

1. **Mở file:** `scripts/73-update-user-password-hash.sql`

2. **Update các giá trị:**
   ```sql
   v_org_slug VARCHAR := 'amobear';
   v_user_email VARCHAR := 'admin@amobear.vn';
   v_password_hash VARCHAR := 'PASTE_HASH_HERE';  -- Paste hash từ bước trên
   ```

3. **Chạy script trong DBeaver/pgAdmin**

4. **Verify:**
   ```sql
   SELECT email, LEFT(password_hash, 10) as hash_prefix, password_changed_at
   FROM users 
   WHERE email = 'admin@amobear.vn';
   ```

## Password Hash Format

Hash hợp lệ phải:
- Bắt đầu với `$2a$` hoặc `$2b$`
- Có độ dài khoảng 60 ký tự
- Format: `$2a$12$[22 chars salt][31 chars hash]`

Ví dụ hash hợp lệ:
```
$2a$12$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUV
```

Hash placeholder (KHÔNG hợp lệ):
```
$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5Y5Y5Y5Y5Y
```

## Quick Fix cho User hiện tại

Nếu user đã được tạo với hash sai:

1. **Generate hash đúng** (Cách 1 hoặc 2)
2. **Update hash:**
   ```sql
   UPDATE users 
   SET password_hash = 'PASTE_HASH_HERE',
       password_changed_at = NOW(),
       failed_login_attempts = 0,
       locked_until = NULL
   WHERE email = 'admin@amobear.vn'
     AND organization_id = (SELECT id FROM organizations WHERE slug = 'amobear');
   ```
3. **Test login**

## Best Practice

1. **Luôn sử dụng API endpoint** để tạo users (tự động hash)
2. **Nếu phải dùng SQL**, generate hash trước và verify format
3. **Không sử dụng placeholder hash** trong production
4. **Test login ngay sau khi tạo/update user**
