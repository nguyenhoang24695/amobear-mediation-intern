# Fix: Migration Not Applied But Shows "No Pending Migrations"

## Vấn đề

API báo "Database is up to date. No pending migrations" nhưng tables không tồn tại trong database.

## Nguyên nhân

Có thể do:
1. Migration đã được ghi vào `__EFMigrationsHistory` nhưng SQL chưa được execute
2. Migration file không được nhận diện đúng cách
3. Database connection issue khi apply migration
4. Migration bị rollback hoặc fail nhưng history vẫn được ghi

## Giải pháp

### Giải pháp 1: Apply Migration bằng SQL Script (Khuyến nghị)

Sử dụng SQL script trực tiếp để apply migration:

```bash
# Sử dụng pgAdmin hoặc DBeaver
# Chạy file: scripts/67-apply-migration-sql-direct.sql
```

Script này sẽ:
- Kiểm tra xem tables đã tồn tại chưa
- Tạo tables nếu chưa có
- Ghi lại migration vào history

### Giải pháp 2: Remove và Re-apply Migration

1. **Remove migration từ history (nếu đã được ghi sai):**
   ```sql
   DELETE FROM "__EFMigrationsHistory" 
   WHERE "MigrationId" = '20260118000000_AddUserAuthTables';
   ```

2. **Apply migration lại:**
   ```bash
   cd backend/MediationPro.Infrastructure
   dotnet ef database update --startup-project ../MediationPro.Api --context ApplicationDbContext
   ```

### Giải pháp 3: Force Apply Migration

Nếu migration đã được ghi vào history nhưng tables chưa được tạo:

1. **Check migration history:**
   ```sql
   SELECT "MigrationId", "ProductVersion" 
   FROM "__EFMigrationsHistory" 
   WHERE "MigrationId" LIKE '%UserAuth%';
   ```

2. **Nếu có trong history nhưng tables không tồn tại:**
   - Xóa record khỏi history
   - Apply lại migration

3. **Hoặc chạy SQL script trực tiếp** (Giải pháp 1)

## Verify Migration Status

### Check trong Database

Chạy script: `scripts/69-check-migration-status.sql`

Hoặc chạy query:
```sql
-- Check migration history
-- Note: Column names are PascalCase: MigrationId, ProductVersion
SELECT "MigrationId", "ProductVersion" 
FROM "__EFMigrationsHistory" 
ORDER BY "MigrationId" DESC;

-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('organizations', 'users', 'teams', 'refresh_tokens', 'user_invitations', 'app_permissions');
```

### Check trong API Logs

API đã được cập nhật để:
- Log tất cả migrations (total, applied, pending)
- Verify tables tồn tại sau khi check migrations
- Warning nếu migration history không khớp với tables thực tế

Khi start API, bạn sẽ thấy:
```
[INF] Total migrations: X, Applied: Y, Pending: Z
[INF] All migrations: ...
[INF] Applied migrations: ...
[WRN] ⚠️ WARNING: Migration says 'up to date' but these tables are missing: organizations, users, ...
```

## Best Practice

1. **Luôn verify tables sau khi apply migration**
2. **Sử dụng SQL script trực tiếp nếu EF Core migration có vấn đề**
3. **Check migration history và tables cùng lúc**
4. **Backup database trước khi apply migration**

## Next Steps

Sau khi apply migration thành công:

1. Verify tables tồn tại
2. Tạo admin user: `scripts/63-create-admin-user-simple.sql`
3. Test login API
