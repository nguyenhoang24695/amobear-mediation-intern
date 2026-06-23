# EF Core Migration Guide

## Vấn đề: "No project was found"

Khi chạy `dotnet ef migrations add` hoặc `dotnet ef database update` mà gặp lỗi "No project was found", nguyên nhân là:

1. **DbContext nằm trong project khác**: `ApplicationDbContext` nằm trong `MediationPro.Infrastructure`
2. **Cần chỉ định startup project**: Cần chỉ định project có connection string (`MediationPro.Api`)

## Giải pháp

### Cách 1: Dùng Script PowerShell (Khuyến nghị)

#### Tạo Migration mới:
```powershell
.\scripts\create-migration.ps1 -MigrationName "AddFullDimensionsMetrics"
```

#### Apply Migration:
```powershell
.\scripts\apply-migration.ps1
```

### Cách 2: Chạy thủ công với --project option

#### Tạo Migration:
```powershell
dotnet ef migrations add AddFullDimensionsMetrics `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api
```

#### Apply Migration:
```powershell
dotnet ef database update `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api
```

### Cách 3: Chạy từ thư mục Infrastructure

```powershell
cd MediationPro.Infrastructure
dotnet ef migrations add AddFullDimensionsMetrics --startup-project ..\MediationPro.Api
dotnet ef database update --startup-project ..\MediationPro.Api
```

## Có cần chạy SQL riêng không?

### Thông thường: KHÔNG cần

EF Core migration sẽ tự động:
- Tạo SQL script từ model changes
- Apply vào database khi chạy `dotnet ef database update`
- Quản lý migration history trong bảng `__EFMigrationsHistory`

### Trường hợp cần SQL riêng:

1. **Partitioning**: Nếu bạn đã setup partitioning cho `performance_data`, có thể cần chạy SQL riêng cho từng partition
2. **Custom Indexes**: Nếu có indexes phức tạp không thể tạo bằng EF Core
3. **Data Migration**: Nếu cần migrate data từ cột cũ sang cột mới
4. **Performance Optimization**: Nếu cần tối ưu thủ công

### Script SQL thủ công

Nếu bạn muốn thêm cột thủ công (không dùng migration), chạy:

```sql
-- Xem file: scripts/add-columns-manual.sql
```

**Lưu ý**: Nếu chạy SQL thủ công, bạn vẫn cần tạo migration để EF Core biết về schema mới:

```powershell
# Tạo migration "empty" (không có changes)
dotnet ef migrations add AddFullDimensionsMetrics `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api

# Sau đó edit migration file để mark các cột là đã tồn tại
# Hoặc xóa migration và để EF Core tự tạo lại
```

## Workflow Khuyến nghị

### 1. Tạo Migration
```powershell
.\scripts\create-migration.ps1 -MigrationName "AddFullDimensionsMetrics"
```

### 2. Review Migration File
Kiểm tra file `MediationPro.Infrastructure\Migrations\YYYYMMDDHHMMSS_AddFullDimensionsMetrics.cs` để đảm bảo:
- Các cột mới được thêm đúng
- Indexes được tạo đúng
- Không có breaking changes

### 3. Apply Migration
```powershell
.\scripts\apply-migration.ps1
```

### 4. Verify
```sql
-- Kiểm tra các cột mới
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'performance_data'
    AND column_name IN ('format', 'platform', 'month', 'week', 'impression_ctr');

-- Kiểm tra index mới
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'performance_data'
    AND indexname = 'ix_performance_data_unique';
```

## Troubleshooting

### Lỗi: "Unable to create an object of type 'ApplicationDbContext'"

**Nguyên nhân**: EF Core không tìm thấy DbContext hoặc connection string

**Giải pháp**:
1. Đảm bảo `appsettings.json` có connection string:
```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mediationpro;Username=postgres;Password=postgres"
  }
}
```

2. Đảm bảo đang chạy từ thư mục đúng hoặc dùng `--startup-project`

### Lỗi: "Migration already exists"

**Giải pháp**:
```powershell
# Xóa migration chưa apply
dotnet ef migrations remove --project MediationPro.Infrastructure --startup-project MediationPro.Api

# Tạo lại với tên khác
.\scripts\create-migration.ps1 -MigrationName "AddFullDimensionsMetricsV2"
```

### Lỗi: "Column already exists"

**Nguyên nhân**: Đã chạy SQL thủ công trước đó

**Giải pháp**:
1. Xóa các cột thủ công (nếu cần)
2. Hoặc edit migration file để mark cột là đã tồn tại:
```csharp
// Trong migration file
migrationBuilder.AddColumn<string>(
    name: "format",
    table: "performance_data",
    type: "varchar(50)",
    nullable: true);
// Thêm IF NOT EXISTS logic nếu cần
```

## Best Practices

1. **Luôn review migration file** trước khi apply
2. **Backup database** trước khi apply migration quan trọng
3. **Test migration** trên database dev trước
4. **Commit migration files** vào git để team cùng sử dụng
5. **Không edit migration đã apply** - tạo migration mới thay vì sửa cũ

## Migration Files Location

```
MediationPro.Infrastructure/
  └── Migrations/
      ├── YYYYMMDDHHMMSS_MigrationName.cs
      ├── YYYYMMDDHHMMSS_MigrationName.Designer.cs
      └── ApplicationDbContextModelSnapshot.cs
```

## Connection String

Migration sẽ đọc connection string từ:
- `appsettings.json` trong `MediationPro.Api`
- Environment variables (nếu có)
- User secrets (nếu có)

Đảm bảo connection string đúng trong `MediationPro.Api/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mediationpro;Username=postgres;Password=postgres"
  }
}
```
