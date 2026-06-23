# Fix PostgreSQL "Too Many Clients" Error

## Vấn đề

Lỗi: `Npgsql.PostgresException: 53300: sorry, too many clients already`

Nguyên nhân:
- PostgreSQL mặc định chỉ cho phép 100 connections
- Connection pooling không được cấu hình đúng
- Hangfire workers tạo quá nhiều connections
- Connections không được đóng đúng cách

## Giải pháp đã áp dụng

### 1. Tăng max_connections trong PostgreSQL

**File:** `docker-compose.yml`

```yaml
postgres:
  command: postgres -c max_connections=200 -c shared_buffers=256MB
```

Tăng từ 100 (mặc định) lên 200 connections.

### 2. Cấu hình Connection Pooling

**File:** `MediationPro.Api/appsettings.json`

Thêm connection pooling parameters vào connection strings:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=mediationpro;Username=mediationpro;Password=mediationpro123;Pooling=true;MinPoolSize=5;MaxPoolSize=20;Connection Lifetime=0;Timeout=30;Command Timeout=30",
    "HangfireConnection": "Host=localhost;Port=5432;Database=mediationpro_hangfire;Username=mediationpro;Password=mediationpro123;Pooling=true;MinPoolSize=2;MaxPoolSize=10;Connection Lifetime=0;Timeout=30;Command Timeout=30"
  }
}
```

**Parameters:**
- `Pooling=true`: Bật connection pooling
- `MinPoolSize=5`: Số connections tối thiểu trong pool
- `MaxPoolSize=20`: Số connections tối đa trong pool (DefaultConnection)
- `MaxPoolSize=10`: Số connections tối đa trong pool (HangfireConnection)
- `Connection Lifetime=0`: Không giới hạn thời gian sống của connection
- `Timeout=30`: Connection timeout 30 giây
- `Command Timeout=30`: Command timeout 30 giây

### 3. Thêm Retry Logic cho DbContext

**File:** `MediationPro.Api/Program.cs`

```csharp
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 3,
            maxRetryDelay: TimeSpan.FromSeconds(5),
            errorCodesToAdd: null);
    }));
```

### 4. Giảm Hangfire Worker Count

**File:** `MediationPro.Api/Program.cs`

```csharp
builder.Services.AddHangfireServer(options =>
{
    options.WorkerCount = 3; // Giảm từ 5 xuống 3
    options.Queues = new[] { "default" };
    options.ServerTimeout = TimeSpan.FromMinutes(4);
    options.SchedulePollingInterval = TimeSpan.FromSeconds(15);
});
```

## Kiểm tra

### 1. Kiểm tra số connections hiện tại

```sql
SELECT count(*) FROM pg_stat_activity;
```

### 2. Kiểm tra max_connections

```sql
SHOW max_connections;
```

### 3. Xem các connections đang active

```sql
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query_start,
    state_change
FROM pg_stat_activity
WHERE datname = 'mediationpro'
ORDER BY state_change DESC;
```

### 4. Kill idle connections (nếu cần)

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'mediationpro'
  AND state = 'idle'
  AND state_change < now() - interval '5 minutes';
```

## Best Practices

1. **Luôn sử dụng connection pooling**: Giảm overhead của việc tạo/đóng connections
2. **Dispose DbContext đúng cách**: Sử dụng `using` statement hoặc dependency injection
3. **Giới hạn số workers**: Hangfire workers nên được giới hạn dựa trên số CPU cores
4. **Monitor connections**: Theo dõi số connections để phát hiện connection leaks
5. **Tăng max_connections khi cần**: Nhưng không quá cao để tránh resource exhaustion

## Troubleshooting

### Nếu vẫn gặp lỗi sau khi fix:

1. **Kiểm tra connection leaks**:
   ```sql
   SELECT count(*), state 
   FROM pg_stat_activity 
   WHERE datname = 'mediationpro' 
   GROUP BY state;
   ```

2. **Kiểm tra idle connections**:
   ```sql
   SELECT count(*) 
   FROM pg_stat_activity 
   WHERE datname = 'mediationpro' 
     AND state = 'idle' 
     AND state_change < now() - interval '1 minute';
   ```

3. **Restart PostgreSQL container**:
   ```powershell
   docker restart mediationpro-postgres
   ```

4. **Kiểm tra logs**:
   ```powershell
   docker logs mediationpro-postgres
   ```

## Lưu ý

- Connection pooling giúp tái sử dụng connections, giảm overhead
- MaxPoolSize nên được set dựa trên số lượng concurrent requests
- Hangfire workers cần connections riêng, nên giới hạn số workers
- Trong production, nên monitor và alert khi số connections gần max_connections
