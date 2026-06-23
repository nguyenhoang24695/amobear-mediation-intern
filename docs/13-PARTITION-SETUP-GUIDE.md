# Partition Setup Guide

## Tổng quan

Table `performance_data` cần được convert thành partitioned table trước khi có thể tạo partitions.

## Bước 1: Convert Table thành Partitioned Table

**⚠️ WARNING:** Backup database trước khi thực hiện!

### Option 1: Sử dụng script (Recommended)

```powershell
# Chạy script convert
Get-Content scripts/convert-to-partitioned-table.sql | docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro
```

### Option 2: Manual Steps

```sql
-- 1. Tạo table mới với partition key
CREATE TABLE performance_data_new (
    LIKE performance_data INCLUDING ALL
) PARTITION BY RANGE (date);

-- 2. Copy data
INSERT INTO performance_data_new 
SELECT * FROM performance_data;

-- 3. Rename
ALTER TABLE performance_data RENAME TO performance_data_old;
ALTER TABLE performance_data_new RENAME TO performance_data;

-- 4. Verify và drop old table (SAVE DATA FIRST!)
-- DROP TABLE performance_data_old;
```

## Bước 2: Tạo Partitions

Sau khi table đã được convert, chạy script tạo partitions:

```powershell
Get-Content scripts/create-partition-performance-data.sql | docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro
```

## Bước 3: Verify

```sql
-- Check if table is partitioned
SELECT relkind FROM pg_class WHERE relname = 'performance_data';
-- Should return 'p' (partitioned table)

-- List all partitions
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'performance_data_%' 
ORDER BY tablename;
```

## Troubleshooting

### Error: "performance_data is not partitioned"

**Solution:** Chạy `convert-to-partitioned-table.sql` trước

### Error: "Table already exists"

**Solution:** Table đã được convert, có thể skip bước 1

### Data Loss Concerns

**Solution:** 
- Script giữ lại `performance_data_old` để backup
- Verify data trước khi drop old table
- Backup database trước khi chạy script

## Alternative: Create Partitioned Table từ đầu

Nếu database mới (chưa có data), có thể tạo migration để tạo partitioned table từ đầu:

```csharp
migrationBuilder.CreateTable(
    name: "performance_data",
    columns: table => new { ... },
    constraints: table => { ... })
    .Annotation("Npgsql:PartitionStrategy", "RANGE")
    .Annotation("Npgsql:PartitionKey", "date");
```

Tuy nhiên, EF Core 8.0 chưa hỗ trợ partition syntax trực tiếp, nên cần dùng raw SQL trong migration.
