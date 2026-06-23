# Hướng dẫn Apply Migration trong Docker Environment

Vì hệ thống chạy hoàn toàn trên Docker, việc apply migration có thể gặp một số vấn đề. Đây là các cách để apply migration.

## Kiểm tra Migration Status

Trước tiên, kiểm tra xem migration đã được apply chưa:

```sql
-- Kiểm tra tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'users', 'teams', 'refresh_tokens', 'user_invitations', 'app_permissions')
ORDER BY table_name;

-- Kiểm tra migration history
-- Note: Column names are PascalCase: MigrationId, ProductVersion
SELECT "MigrationId", "ProductVersion" 
FROM "__EFMigrationsHistory" 
WHERE "MigrationId" LIKE '%UserAuth%'
ORDER BY "MigrationId" DESC;
```

## Cách 1: Sử dụng SQL Script trực tiếp (Khuyến nghị)

Đây là cách đơn giản và đáng tin cậy nhất khi chạy trên Docker.

### Bước 1: Copy SQL script vào container (nếu cần)

```bash
docker cp scripts/67-apply-migration-sql-direct.sql mediationpro-postgres:/tmp/
```

### Bước 2: Chạy SQL script

**Từ host machine:**
```bash
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/67-apply-migration-sql-direct.sql
```

**Hoặc từ trong container:**
```bash
docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro < scripts/67-apply-migration-sql-direct.sql
```

**Hoặc interactive:**
```bash
docker exec -it mediationpro-postgres psql -U mediationpro -d mediationpro
# Sau đó copy-paste nội dung SQL script
```

### Bước 3: Verify

```sql
SELECT 
    'organizations' as table_name,
    COUNT(*) as row_count
FROM organizations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'teams', COUNT(*) FROM teams;
```

## Cách 2: Sử dụng PowerShell Script

Script sẽ tự động kiểm tra và apply migration:

```powershell
.\scripts\66-apply-migration-direct.ps1
```

## Cách 3: Sử dụng dotnet ef (Khi API không chạy)

Nếu API đang chạy, migration tool có thể gặp lỗi. Hãy dừng API trước:

```bash
# Dừng API (nếu đang chạy)
# Ctrl+C hoặc kill process

# Apply migration
cd backend/MediationPro.Infrastructure
dotnet ef database update --startup-project ../MediationPro.Api --context ApplicationDbContext
```

## Cách 4: Chạy Migration từ trong Docker Container

Nếu bạn có .NET SDK trong container:

```bash
# Build và copy files vào container
docker cp backend/MediationPro.Infrastructure mediationpro-api:/app/
docker cp backend/MediationPro.Api mediationpro-api:/app/

# Chạy migration từ trong container
docker exec -it mediationpro-api bash
cd /app/MediationPro.Infrastructure
dotnet ef database update --startup-project ../MediationPro.Api
```

## Troubleshooting

### Lỗi: "No migrations were found"

**Nguyên nhân:** Migration file chưa được nhận diện hoặc ModelSnapshot chưa được update.

**Giải pháp:**
1. Kiểm tra migration file tồn tại:
   ```bash
   ls backend/MediationPro.Infrastructure/Migrations/*AddUserAuthTables*.cs
   ```

2. Rebuild project:
   ```bash
   cd backend
   dotnet clean
   dotnet build
   ```

3. Sử dụng SQL script trực tiếp (Cách 1) thay vì dotnet ef

### Lỗi: "Connection refused" hoặc "Cannot connect to database"

**Nguyên nhân:** PostgreSQL container chưa chạy hoặc port không đúng.

**Giải pháp:**
1. Kiểm tra container đang chạy:
   ```bash
   docker ps | grep postgres
   ```

2. Start container nếu chưa chạy:
   ```bash
   docker-compose up -d postgres
   ```

3. Kiểm tra port mapping:
   ```bash
   docker port mediationpro-postgres
   ```

### Lỗi: "Tables already exist"

**Nguyên nhân:** Migration đã được apply trước đó.

**Giểm tra:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('organizations', 'users');
```

Nếu tables đã tồn tại, bạn có thể bỏ qua migration và tạo admin user trực tiếp.

### Lỗi: "Extension uuid-ossp does not exist"

**Nguyên nhân:** PostgreSQL extension chưa được enable.

**Giải pháp:**
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

Script SQL đã bao gồm lệnh này.

## Verify Migration

Sau khi apply migration, verify bằng cách:

1. **Kiểm tra tables:**
```sql
\dt organizations
\dt users
\dt teams
\dt refresh_tokens
\dt user_invitations
\dt app_permissions
```

2. **Kiểm tra migration history:**
```sql
-- Note: Column names are PascalCase: MigrationId, ProductVersion
SELECT * FROM "__EFMigrationsHistory" 
WHERE "MigrationId" = '20260118000000_AddUserAuthTables';
```

3. **Kiểm tra indexes:**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND tablename IN ('organizations', 'users', 'teams')
ORDER BY tablename, indexname;
```

## Sau khi Migration thành công

Sau khi migration đã được apply, tạo admin user:

```bash
# Sử dụng SQL script
psql -h localhost -p 5432 -U mediationpro -d mediationpro -f scripts/63-create-admin-user-simple.sql

# Hoặc sử dụng API
POST http://localhost:5000/api/v1/setup/create-admin
```

Xem chi tiết trong: `docs/63-CREATE-ADMIN-USER.md`
