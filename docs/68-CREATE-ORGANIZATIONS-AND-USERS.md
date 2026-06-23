# Hướng dẫn tạo Organizations và Users

Sau khi đã tạo admin user đầu tiên, bạn có thể tạo thêm organizations và users mới.

## Tạo Admin User đầu tiên

### Cách 1: Sử dụng API Endpoint (Khuyến nghị - Tự động hash password)

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

**Ưu điểm:**
- Tự động hash password (BCrypt)
- Validate input
- Error handling tốt
- Không cần generate hash thủ công

### Cách 2: Sử dụng SQL Script

1. **Generate password hash:**
   ```powershell
   .\scripts\64-generate-password-hash.ps1 -Password "Admin@123"
   ```

2. **Copy hash và update vào script:**
   - Mở file: `scripts/63-create-admin-user-simple.sql`
   - Thay thế `v_password_hash` với hash vừa generate
   - Chạy script trong DBeaver/pgAdmin

## Tạo Organization mới và User đầu tiên

### Sử dụng SQL Script

1. **Mở file:** `scripts/71-create-organization-and-user.sql`

2. **Thay đổi các giá trị trong DECLARE section:**
   ```sql
   v_org_name VARCHAR := 'New Organization';
   v_org_slug VARCHAR := 'neworg';
   v_user_email VARCHAR := 'admin@neworg.com';
   v_user_password VARCHAR := 'Admin@123';
   v_user_first_name VARCHAR := 'Admin';
   v_user_last_name VARCHAR := 'Last';
   v_user_role VARCHAR := 'admin';
   ```

3. **Generate password hash:**
   ```powershell
   .\scripts\64-generate-password-hash.ps1 -Password "Admin@123"
   ```

4. **Update password hash trong script:**
   - Thay thế `v_password_hash` với hash vừa generate

5. **Chạy script trong DBeaver/pgAdmin**

### Sử dụng API (Nếu có endpoint)

Nếu bạn đã implement API endpoint để tạo organization và user, sử dụng API sẽ đơn giản hơn.

## Tạo User mới cho Organization đã tồn tại

### Sử dụng SQL Script

1. **Mở file:** `scripts/72-create-user-for-organization.sql`

2. **Thay đổi các giá trị trong DECLARE section:**
   ```sql
   v_org_slug VARCHAR := 'mediationpro';  -- Slug của organization
   v_user_email VARCHAR := 'user@mediationpro.com';
   v_user_password VARCHAR := 'User@123';
   v_user_first_name VARCHAR := 'John';
   v_user_last_name VARCHAR := 'Doe';
   v_user_role VARCHAR := 'viewer';  -- super_admin, admin, editor, viewer
   ```

3. **Generate password hash và update vào script**

4. **Chạy script trong DBeaver/pgAdmin**

## User Roles

- **super_admin**: Quyền cao nhất, có thể quản lý tất cả organizations
- **admin**: Quản lý organization của mình, tạo users, teams
- **editor**: Chỉnh sửa dữ liệu, không quản lý users
- **viewer**: Chỉ xem dữ liệu

## Verify

Sau khi tạo, verify bằng cách:

```sql
-- List all organizations
SELECT id, name, slug, is_active, created_at 
FROM organizations 
ORDER BY created_at DESC;

-- List all users in an organization
SELECT 
    u.email,
    u.role,
    u.status,
    u.email_verified,
    o.name as organization_name,
    o.slug as organization_slug
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE o.slug = 'mediationpro'  -- Change to your organization slug
ORDER BY u.created_at DESC;
```

## Best Practices

1. **Password Security:**
   - Sử dụng password mạnh (ít nhất 8 ký tự, có chữ hoa, chữ thường, số, ký tự đặc biệt)
   - Generate hash bằng BCrypt với work factor 12
   - Không lưu password dạng plain text

2. **Organization Slug:**
   - Phải unique
   - Chỉ chứa chữ thường, số, dấu gạch dưới
   - Không có khoảng trắng
   - Ví dụ: `mediationpro`, `team_a`, `client_123`

3. **Email:**
   - Phải unique trong mỗi organization
   - Cùng email có thể tồn tại ở nhiều organizations khác nhau
   - Tự động convert sang lowercase

4. **First Login:**
   - Khuyến khích user đổi password sau lần đăng nhập đầu tiên
   - Set `must_change_password = true` nếu cần

## Troubleshooting

### Lỗi: "Organization with slug already exists"
- Slug đã được sử dụng
- Chọn slug khác hoặc xóa organization cũ

### Lỗi: "User with email already exists"
- Email đã tồn tại trong organization
- Sử dụng email khác hoặc xóa user cũ

### Lỗi: "Password hash invalid"
- Hash không đúng format BCrypt
- Generate lại hash bằng script `64-generate-password-hash.ps1`

### Lỗi: "Organization not found"
- Organization slug không đúng
- Kiểm tra lại slug trong database
