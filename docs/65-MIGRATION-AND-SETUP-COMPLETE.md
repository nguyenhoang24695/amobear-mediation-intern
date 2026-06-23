# Migration và Setup Complete Guide

## Tóm tắt

Sau khi hoàn thành implementation User & Auth module, bạn cần:

1. ✅ **Apply Migration** - Tạo tables trong PostgreSQL
2. ✅ **Create Admin User** - Tạo user đầu tiên để đăng nhập

## Bước 1: Apply Migration

Vì hệ thống chạy trên Docker, sử dụng SQL script trực tiếp là cách đơn giản nhất:

```bash
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/67-apply-migration-sql-direct.sql
```

**Hoặc nếu không có psql, sử dụng Docker:**

```bash
# Copy script vào container
docker cp scripts/67-apply-migration-sql-direct.sql mediationpro-postgres:/tmp/

# Chạy script
docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro -f /tmp/67-apply-migration-sql-direct.sql
```

**Verify migration:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'users', 'teams', 'refresh_tokens', 'user_invitations', 'app_permissions');
```

## Bước 2: Create Admin User

Sau khi migration đã được apply, tạo admin user:

### Cách A: Sử dụng SQL Script (Nhanh nhất)

```bash
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/63-create-admin-user-simple.sql
```

**Hoặc từ Docker:**
```bash
docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro -f /tmp/63-create-admin-user-simple.sql
```

### Cách B: Sử dụng API Endpoint

```bash
POST http://localhost:5000/api/v1/setup/create-admin
Content-Type: application/json

{
  "organizationName": "Mediation Pro",
  "organizationSlug": "mediationpro",
  "email": "admin@mediationpro.com",
  "password": "Admin@123",
  "firstName": "Admin",
  "lastName": "User"
}
```

### Cách C: Generate Password Hash và chạy SQL thủ công

```powershell
# Generate password hash
.\scripts\64-generate-password-hash.ps1 -Password "Admin@123"

# Copy hash và update vào SQL script, sau đó chạy
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/63-create-admin-user-simple.sql
```

## Bước 3: Verify và Test Login

### Verify trong database:

```sql
SELECT 
    o.name as organization_name,
    o.slug as organization_slug,
    u.email,
    u.role,
    u.status,
    u.email_verified
FROM organizations o
JOIN users u ON u.organization_id = o.id
WHERE u.email = 'admin@mediationpro.com';
```

### Test Login API:

```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@mediationpro.com",
  "password": "Admin@123",
  "organizationSlug": "mediationpro"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "tokenType": "Bearer",
    "user": {
      "id": "...",
      "email": "admin@mediationpro.com",
      "role": "admin",
      "organization": {
        "id": "...",
        "name": "Mediation Pro",
        "slug": "mediationpro"
      }
    }
  }
}
```

## Troubleshooting

### Migration không apply được

1. **Kiểm tra PostgreSQL đang chạy:**
   ```bash
   docker ps | grep postgres
   ```

2. **Kiểm tra connection:**
   ```bash
   psql -h localhost -p 5432 -U mediationpro -d mediationpro -c "SELECT version();"
   ```

3. **Sử dụng SQL script trực tiếp** thay vì dotnet ef

### Admin user không tạo được

1. **Kiểm tra Organization đã tồn tại:**
   ```sql
   SELECT * FROM organizations WHERE slug = 'mediationpro';
   ```

2. **Kiểm tra User đã tồn tại:**
   ```sql
   SELECT * FROM users WHERE email = 'admin@mediationpro.com';
   ```

3. **Xóa và tạo lại nếu cần:**
   ```sql
   DELETE FROM users WHERE email = 'admin@mediationpro.com';
   -- Sau đó chạy lại script tạo admin
   ```

### Login không thành công

1. **Kiểm tra password hash:**
   - Password hash phải được generate từ BCrypt với work factor 12
   - Sử dụng script `64-generate-password-hash.ps1` để generate hash mới

2. **Kiểm tra user status:**
   ```sql
   SELECT email, status, locked_until, failed_login_attempts 
   FROM users 
   WHERE email = 'admin@mediationpro.com';
   ```

3. **Reset password nếu cần:**
   ```sql
   -- Generate hash mới và update
   UPDATE users 
   SET password_hash = '$2a$12$NEW_HASH_HERE',
       must_change_password = false
   WHERE email = 'admin@mediationpro.com';
   ```

## Next Steps

Sau khi đã tạo admin user và login thành công:

1. ✅ **Change Password** - Đổi password ngay sau lần đăng nhập đầu tiên
2. ✅ **Create Teams** - Tạo teams nếu cần
3. ✅ **Invite Users** - Mời thêm users vào organization
4. ✅ **Configure Permissions** - Cấu hình app permissions cho users/teams

## Security Notes

- ⚠️ **Production**: Tắt endpoint `/api/v1/setup/create-admin` trong production
- ⚠️ **Password**: Đảm bảo password đủ mạnh (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)
- ⚠️ **JWT Secret**: Thay đổi JWT Secret trong `appsettings.json` cho production
- ⚠️ **HTTPS**: Sử dụng HTTPS trong production

## Documentation References

- Migration Guide: `docs/64-APPLY-MIGRATION-DOCKER.md`
- Create Admin User: `docs/63-CREATE-ADMIN-USER.md`
- Implementation Guide: `docs/62-USER-AUTH-IMPLEMENTATION-GUIDE.md`
