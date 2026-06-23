# Migration Summary - Add Full Dimensions and Metrics

## Migration đã được tạo

Migration file: `20260115100811_AddFullDimensionsMetrics.cs`

## Các thay đổi

### 1. Thêm cột mới cho Dimensions

- `format` VARCHAR(50) - Ad Format (BANNER, INTERSTITIAL, REWARDED, etc.)
- `platform` VARCHAR(20) - Platform (ANDROID, IOS)
- `month` VARCHAR(10) - Month (YYYY-MM format, derived from DATE)
- `week` VARCHAR(10) - Week (YYYY-WW format, derived from DATE)

### 2. Thêm cột mới cho Metrics

- `impression_ctr` DOUBLE PRECISION - Impression CTR metric from AdMob API

### 3. Cập nhật Unique Index

Unique index `ix_performance_data_unique` được cập nhật để bao gồm tất cả dimensions:
- date
- publisher_id
- app_id
- ad_unit_id
- mediation_group_id
- ad_source_id
- ad_source_instance_id
- country_code
- format (mới)
- platform (mới)

## Cách Apply Migration

### Option 1: Dùng Script (Khuyến nghị)

```powershell
.\scripts\apply-migration.ps1
```

### Option 2: Chạy thủ công

```powershell
dotnet ef database update `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api
```

## Lưu ý

⚠️ **Warning**: Migration có thể cảnh báo "may result in the loss of data" - đây là warning thông thường khi:
- Thêm cột nullable (không ảnh hưởng dữ liệu hiện có)
- Thay đổi index (có thể rebuild index)

**Không có mất dữ liệu** vì:
- Tất cả cột mới đều là nullable
- Chỉ thêm cột, không xóa hoặc modify cột cũ

## Verify sau khi apply

```sql
-- Kiểm tra các cột mới đã được tạo
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'performance_data'
    AND column_name IN ('format', 'platform', 'month', 'week', 'impression_ctr')
ORDER BY column_name;

-- Kiểm tra unique index đã được cập nhật
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'performance_data'
    AND indexname = 'ix_performance_data_unique';
```

## Rollback (nếu cần)

Nếu cần rollback migration:

```powershell
dotnet ef database update <PreviousMigrationName> `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api
```

Hoặc xóa migration:

```powershell
dotnet ef migrations remove `
    --project MediationPro.Infrastructure `
    --startup-project MediationPro.Api
```

## Next Steps

Sau khi apply migration thành công:

1. ✅ Verify các cột đã được tạo
2. ✅ Chạy lại jobs để sync dữ liệu đầy đủ
3. ✅ Kiểm tra dữ liệu trong database có đầy đủ dimensions/metrics
