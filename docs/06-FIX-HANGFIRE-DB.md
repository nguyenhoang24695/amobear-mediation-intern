# Sửa lỗi: database "mediationpro_hangfire" does not exist

## Vấn đề
Khi chạy ứng dụng, bạn gặp lỗi:
```
database "mediationpro_hangfire" does not exist
```

## Nguyên nhân
Database Hangfire chưa được tạo trong PostgreSQL container.

## Giải pháp

### Cách 1: Chạy script tự động (Khuyến nghị)

```powershell
.\setup-hangfire-db.ps1
```

Script này sẽ tự động tạo database Hangfire.

### Cách 2: Tạo database thủ công

Mở PowerShell và chạy:

```powershell
docker exec -it mediationpro-postgres psql -U mediationpro -d postgres -c "CREATE DATABASE mediationpro_hangfire WITH OWNER = mediationpro ENCODING = 'UTF8';"
```

### Cách 3: Sử dụng SQL script

1. Copy nội dung file `create-hangfire-db.sql`
2. Chạy trong PostgreSQL:

```powershell
docker exec -i mediationpro-postgres psql -U mediationpro -d postgres < create-hangfire-db.sql
```

### Cách 4: Tạo database qua pgAdmin hoặc DBeaver

1. Kết nối đến PostgreSQL:
   - Host: `localhost`
   - Port: `5432`
   - Database: `postgres`
   - Username: `mediationpro`
   - Password: `mediationpro123`

2. Tạo database mới:
   - Name: `mediationpro_hangfire`
   - Owner: `mediationpro`
   - Encoding: `UTF8`

## Kiểm tra database đã tạo

```powershell
docker exec -it mediationpro-postgres psql -U mediationpro -d postgres -c "\l"
```

Bạn sẽ thấy `mediationpro_hangfire` trong danh sách databases.

## Sau khi tạo database

Chạy lại ứng dụng:

```powershell
dotnet run --project MediationPro.Api
```

Hangfire sẽ tự động tạo các bảng cần thiết trong database khi ứng dụng khởi động.

## Lưu ý

- Database `mediationpro` (main database) được tạo tự động bởi docker-compose
- Database `mediationpro_hangfire` cần được tạo thủ công hoặc qua script
- Script `quick-start.ps1` đã được cập nhật để tự động tạo Hangfire database
