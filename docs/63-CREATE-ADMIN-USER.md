# Hướng dẫn tạo Admin User đầu tiên

Sau khi migration đã được apply, bạn cần tạo Organization và Admin User đầu tiên để có thể đăng nhập vào hệ thống.

## Cách 1: Sử dụng API Endpoint (Khuyến nghị)

### Bước 1: Kiểm tra setup status

```bash
GET http://localhost:5000/api/v1/setup/status
```

### Bước 2: Tạo Admin User

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

**Response:**
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "data": {
    "organization": {
      "id": "...",
      "name": "Mediation Pro",
      "slug": "mediationpro"
    },
    "user": {
      "id": "...",
      "email": "admin@mediationpro.com",
      "role": "admin"
    }
  }
}
```

### Bước 3: Đăng nhập

```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@mediationpro.com",
  "password": "Admin@123",
  "organizationSlug": "mediationpro"
}
```

## Cách 2: Sử dụng PowerShell Script

### Bước 1: Chạy script

```powershell
.\scripts\63-create-admin-user.ps1
```

Script sẽ:
- Generate password hash tự động
- Tạo SQL script
- Thực thi SQL script nếu có `psql` trong PATH

### Bước 2: Nếu script không tự động chạy được

Script sẽ tạo file SQL tại `$env:TEMP\create_admin_user.sql`. Bạn có thể:

1. Copy SQL script và chạy trong PostgreSQL client
2. Hoặc chạy thủ công:

```bash
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f $env:TEMP\create_admin_user.sql
```

## Cách 3: Tạo thủ công bằng SQL (Đơn giản nhất)

### Bước 1: Generate Password Hash

**Cách A: Sử dụng PowerShell Script (Khuyến nghị)**

```powershell
.\scripts\64-generate-password-hash.ps1 -Password "Admin@123"
```

Script sẽ:
- Generate password hash tự động
- Copy hash vào clipboard
- Hiển thị hash để bạn copy

**Cách B: Sử dụng .NET Interactive (C# Script)**

Bạn cần generate password hash từ .NET application. Có thể sử dụng một trong các cách sau:

**Cách A: Sử dụng .NET Interactive (C# Script)**

```csharp
#r "nuget: BCrypt.Net-Next, 4.0.3"
using BCrypt.Net;

string password = "Admin@123";
string hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
Console.WriteLine(hash);
```

**Cách B: Tạo console app tạm thời**

```csharp
// Program.cs
using BCrypt.Net;

string password = "Admin@123";
string hash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
Console.WriteLine(hash);
```

**Cách C: Sử dụng online BCrypt generator**

- Truy cập: https://bcrypt-generator.com/
- Nhập password: `Admin@123`
- Rounds: `12`
- Copy hash được generate

### Bước 2: Chạy SQL Script

Sau khi có password hash, chạy SQL script đơn giản:

```bash
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/63-create-admin-user-simple.sql
```

**Hoặc sử dụng SQL script đầy đủ:**

Sau khi có password hash, chạy SQL script:

```sql
-- Tạo Organization
INSERT INTO organizations (id, name, slug, logo_url, settings, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'Mediation Pro',
    'mediationpro',
    NULL,
    '{}'::jsonb,
    true,
    NOW(),
    NOW()
)
ON CONFLICT (slug) DO NOTHING;

-- Lấy Organization ID vừa tạo
DO $$
DECLARE
    v_org_id UUID;
    v_user_id UUID := gen_random_uuid();
    v_password_hash VARCHAR := '$2a$12$YOUR_GENERATED_HASH_HERE'; -- Thay bằng hash thực tế
    v_email VARCHAR := 'admin@mediationpro.com';
    v_now TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
    -- Lấy Organization ID
    SELECT id INTO v_org_id FROM organizations WHERE slug = 'mediationpro';
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- Tạo Admin User
    INSERT INTO users (
        id, 
        organization_id, 
        email, 
        password_hash, 
        first_name, 
        last_name, 
        role, 
        status, 
        email_verified, 
        email_verified_at,
        failed_login_attempts, 
        must_change_password, 
        settings, 
        created_at, 
        updated_at
    )
    VALUES (
        v_user_id,
        v_org_id,
        v_email,
        v_password_hash,
        'Admin',
        'User',
        'admin',
        'active',
        true,
        v_now,
        0,
        false,
        '{}'::jsonb,
        v_now,
        v_now
    )
    ON CONFLICT (email, organization_id) DO NOTHING;
    
    RAISE NOTICE '✅ Admin user created: %', v_email;
END $$;

-- Verify
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

## Cách 4: Sử dụng C# Console App

Tạo một console app tạm thời để generate password hash và tạo user:

```csharp
// Program.cs
using MediationPro.Core.Entities;
using MediationPro.Core.Interfaces;
using MediationPro.Infrastructure.Data;
using MediationPro.Infrastructure.Repositories;
using MediationPro.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

var configuration = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json")
    .Build();

var connectionString = configuration.GetConnectionString("DefaultConnection");
var services = new ServiceCollection();

services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

services.AddScoped<IOrganizationRepository, OrganizationRepository>();
services.AddScoped<IUserRepository, UserRepository>();
services.AddScoped<IPasswordHasher, PasswordHasher>();

var serviceProvider = services.BuildServiceProvider();

var orgRepo = serviceProvider.GetRequiredService<IOrganizationRepository>();
var userRepo = serviceProvider.GetRequiredService<IUserRepository>();
var passwordHasher = serviceProvider.GetRequiredService<IPasswordHasher>();

// Tạo Organization
var org = new Organization
{
    Id = Guid.NewGuid(),
    Name = "Mediation Pro",
    Slug = "mediationpro",
    IsActive = true,
    Settings = new Dictionary<string, object>(),
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};

org = await orgRepo.AddAsync(org);
Console.WriteLine($"✅ Organization created: {org.Name} ({org.Slug})");

// Tạo Admin User
var passwordHash = passwordHasher.Hash("Admin@123");
var user = new User
{
    Id = Guid.NewGuid(),
    OrganizationId = org.Id,
    Email = "admin@mediationpro.com",
    PasswordHash = passwordHash,
    FirstName = "Admin",
    LastName = "User",
    Role = "admin",
    Status = "active",
    EmailVerified = true,
    EmailVerifiedAt = DateTime.UtcNow,
    FailedLoginAttempts = 0,
    MustChangePassword = false,
    Settings = new Dictionary<string, object>(),
    CreatedAt = DateTime.UtcNow,
    UpdatedAt = DateTime.UtcNow
};

user = await userRepo.AddAsync(user);
Console.WriteLine($"✅ Admin user created: {user.Email}");
Console.WriteLine($"   Password: Admin@123");
Console.WriteLine($"   Organization: {org.Slug}");
```

## Verify

Sau khi tạo xong, verify bằng cách:

1. **Kiểm tra trong database:**
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

2. **Test login API:**
```bash
POST http://localhost:5000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@mediationpro.com",
  "password": "Admin@123",
  "organizationSlug": "mediationpro"
}
```

## Lưu ý

- **Security**: Đổi password ngay sau lần đăng nhập đầu tiên
- **Production**: Không sử dụng endpoint `/api/v1/setup/create-admin` trong production. Tắt endpoint này sau khi đã tạo admin.
- **Password**: Đảm bảo password đủ mạnh (ít nhất 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt)

## Troubleshooting

### Lỗi: "Organization already exists"
- Organization đã được tạo trước đó
- Sử dụng endpoint login thay vì setup

### Lỗi: "Password hash invalid"
- Đảm bảo password hash được generate đúng với BCrypt work factor 12
- Kiểm tra lại password hash trong database

### Lỗi: "Email already exists"
- User đã được tạo trước đó
- Sử dụng endpoint login hoặc reset password
