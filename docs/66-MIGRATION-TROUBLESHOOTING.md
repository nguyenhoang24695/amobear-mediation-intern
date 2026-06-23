# Migration Troubleshooting Guide

## Vấn đề: Migration không tự động apply khi API start

### Triệu chứng
- API start thành công nhưng tables không được tạo
- Log không hiển thị "Applying database migrations..."
- `dotnet ef migrations list` báo "No migrations were found"

### Nguyên nhân có thể

1. **Migration file không được nhận diện**
   - Migration file có timestamp không đúng format
   - Migration file không được compile vào assembly
   - ModelSnapshot không được update

2. **Database connection issue**
   - Connection string không đúng
   - PostgreSQL không accessible
   - Database chưa được tạo

3. **Exception bị catch và không được log**
   - Migration fail nhưng exception bị catch và không throw
   - Log level không đủ để hiển thị error

### Giải pháp

#### Giải pháp 1: Cải thiện logging trong Program.cs

Đã cập nhật `Program.cs` để:
- Log rõ ràng hơn về migration status
- Hiển thị pending migrations
- Log error chi tiết hơn nếu migration fail

#### Giải pháp 2: Apply migration thủ công bằng SQL

Nếu EF Core migration không hoạt động, sử dụng SQL script trực tiếp:

```bash
# Sử dụng pgAdmin hoặc DBeaver
# Chạy file: scripts/67-apply-migration-sql-direct.sql
```

#### Giải pháp 3: Verify migration file

1. Kiểm tra migration file tồn tại:
   ```bash
   ls backend/MediationPro.Infrastructure/Migrations/*AddUserAuthTables*.cs
   ```

2. Kiểm tra migration được nhận diện:
   ```bash
   cd backend/MediationPro.Infrastructure
   dotnet ef migrations list --startup-project ../MediationPro.Api
   ```

3. Nếu không thấy migration, rebuild project:
   ```bash
   dotnet clean
   dotnet build
   ```

#### Giải pháp 4: Check database connection

1. Verify connection string trong `appsettings.json`:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Host=localhost;Port=5432;Database=mediationpro;Username=mediationpro;Password=mediationpro123;..."
   }
   ```

2. Test connection:
   ```bash
   # Nếu có psql
   psql -h localhost -p 5432 -U mediationpro -d mediationpro -c "SELECT version();"
   ```

#### Giải pháp 5: Apply migration từ command line

```bash
cd backend/MediationPro.Infrastructure
dotnet ef database update --startup-project ../MediationPro.Api --context ApplicationDbContext
```

### Verify Migration đã được apply

#### Cách 1: Check tables trong database

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'users', 'teams', 'refresh_tokens', 'user_invitations', 'app_permissions');
```

#### Cách 2: Check migration history

```sql
-- Note: Column names are PascalCase: MigrationId, ProductVersion
SELECT "MigrationId", "ProductVersion" 
FROM "__EFMigrationsHistory" 
WHERE "MigrationId" LIKE '%UserAuth%'
ORDER BY "MigrationId" DESC;
```

#### Cách 3: Check API logs

Khi API start, bạn sẽ thấy:
```
[INF] Applying database migrations...
[INF] Found X pending migration(s): ...
[INF] ✅ Database migrations applied successfully.
```

Hoặc nếu có lỗi:
```
[ERR] ❌ Failed to apply database migrations. Error: ...
```

### Best Practices

1. **Luôn check logs khi API start** - Migration errors sẽ được log rõ ràng
2. **Verify migration trước khi deploy** - Chạy `dotnet ef migrations list` để verify
3. **Backup database trước khi apply migration** - Đặc biệt trong production
4. **Test migration trên staging trước** - Đảm bảo migration hoạt động đúng

### Nếu vẫn không hoạt động

1. **Sử dụng SQL script trực tiếp** - File `scripts/67-apply-migration-sql-direct.sql`
2. **Check Entity Framework version** - Đảm bảo version tương thích
3. **Check PostgreSQL version** - Đảm bảo PostgreSQL >= 12
4. **Check connection permissions** - User phải có quyền CREATE TABLE, CREATE INDEX, etc.
