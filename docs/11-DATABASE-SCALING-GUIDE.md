# Database Scaling Guide

## Tổng quan về Data Volume

### Tính toán Data Volume

- **Số lượng apps:** 200
- **Dữ liệu mỗi app:** 3,000 rows/ngày với 25 mediation groups
- **Thời gian lưu trữ:** 3 năm (1,095 ngày)
- **Tổng số rows:** 200 × 3,000 × 1,095 = **657,000,000 rows** (657 triệu rows!)

### Kích thước ước tính

- Mỗi row ~ 200 bytes
- Tổng size: 657M × 200 bytes = **~131 GB** (chưa tính indexes)

## Kiến trúc Database

### 1. PostgreSQL với Partitioning

#### Partition Strategy

**Partition theo tháng (Monthly Partitioning):**

```sql
-- Parent table: performance_data
-- Child tables: performance_data_YYYY_MM (e.g., performance_data_2025_01)
```

**Lợi ích:**
- Query performance: Chỉ scan partition cần thiết
- Maintenance: Dễ dàng xóa data cũ (drop partition)
- Index size: Nhỏ hơn trên từng partition
- Parallel queries: Có thể query nhiều partitions song song

#### Indexes Strategy

**Indexes trên mỗi partition:**
1. `(publisher_id, date)` - Cho queries theo publisher và date range
2. `(app_id, date)` WHERE app_id IS NOT NULL - Cho queries theo app
3. `(mediation_group_id, date)` WHERE mediation_group_id IS NOT NULL - Cho queries theo MG
4. `(ad_source_id, date)` WHERE ad_source_id IS NOT NULL - Cho queries theo ad source
5. `(publisher_id, date, mediation_group_id)` - Composite cho SoW calculations

**Partial indexes** (WHERE clause) giúp giảm index size và tăng tốc độ.

### 2. MongoDB cho Raw Data

#### Schema

```json
{
  "_id": "ObjectId",
  "publisher_id": "string",
  "report_date": "ISODate",
  "account_name": "string",
  "raw_json": "string (large)",
  "report_type": "string",
  "start_date": "ISODate",
  "end_date": "ISODate",
  "status": "PENDING|PROCESSED|ERROR",
  "processed_records": "int",
  "created_at": "ISODate",
  "processed_at": "ISODate"
}
```

#### Indexes

- `{ status: 1, created_at: 1 }` - Cho pending reports query
- `{ report_date: 1, publisher_id: 1 }` - Cho date range queries

#### Lợi ích

- Lưu trữ raw JSON không cần parse
- Dễ dàng replay nếu có lỗi
- Audit trail đầy đủ
- Không ảnh hưởng đến PostgreSQL performance

### 3. Redis Caching

#### Cache Strategy

**Cache keys:**
- `sow_calculation_{publisher_id}_{date}` - SoW calculation results (24h TTL)
- `performance_summary_{publisher_id}_{date}` - Daily summaries (1h TTL)
- `app_list_{publisher_id}` - App list (6h TTL)
- `mediation_groups_{publisher_id}` - MG list (6h TTL)

**Memory allocation:** 2GB (có thể tăng nếu cần)

### 4. RabbitMQ Queue

#### Queue Strategy

**Queues:**
1. **report_processing** - Xử lý reports từ AdMob API
   - Durable: Yes
   - Prefetch: 10 messages per worker
   - Multiple workers để xử lý song song

2. **sow_calculation** - Tính toán SoW (future)
3. **alert_processing** - Xử lý alerts (future)

**Benefits:**
- Decouple: API calls không bị block bởi processing
- Resilience: Retry tự động nếu processing fails
- Scalability: Có thể scale workers độc lập

## Job Optimization

### Performance Sync Job

**Batch Strategy:**
- **Batch size:** 50 apps per batch
- **Date range:** 1 ngày per batch
- **Parallel batches:** Có thể chạy song song nhiều batches

**Flow:**
```
1. Lấy danh sách apps (200 apps)
2. Chia thành batches (4 batches × 50 apps)
3. Mỗi batch:
   - Gọi AdMob API với filter apps
   - Lưu raw JSON vào MongoDB
   - Queue vào RabbitMQ
4. Queue processor xử lý async
```

**Estimated time:**
- API calls: ~4 batches × 30s = 2 phút
- Queue processing: ~10 phút (parallel workers)
- Total: ~12 phút cho 200 apps

### SoW Calculator Job

**Optimization:**
- Cache results trong Redis (24h)
- Chỉ tính lại nếu data mới
- Batch processing theo mediation groups

### Alert Checker Job

**Optimization:**
- Cache recent data trong Redis
- Incremental checks (chỉ check data mới)
- Parallel rule evaluation

## Migration và Setup

### Bước 1: Tạo Migration

```bash
dotnet ef migrations add AddPartitionAndIndexes --project MediationPro.Infrastructure --startup-project MediationPro.Api
```

### Bước 2: Apply Migration

```bash
dotnet ef database update --project MediationPro.Infrastructure --startup-project MediationPro.Api
```

### Bước 3: Tạo Partitions

```powershell
.\scripts\setup-database-partitions.ps1
```

Hoặc chạy SQL script trực tiếp:
```bash
docker exec -i mediationpro-postgres psql -U mediationpro -d mediationpro < scripts/create-partition-performance-data.sql
```

### Bước 4: Verify Partitions

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'performance_data_%' 
ORDER BY tablename;
```

## Maintenance Tasks

### 1. Tạo Partition Mới (Monthly)

Chạy function này mỗi tháng (có thể schedule trong cron):

```sql
SELECT create_performance_data_partition(CURRENT_DATE + INTERVAL '1 month');
```

### 2. Xóa Partition Cũ (Sau 3 Năm)

Chạy function này định kỳ:

```sql
SELECT drop_old_performance_partitions();
```

### 3. Vacuum và Analyze

```sql
-- Vacuum partitions thường xuyên
VACUUM ANALYZE performance_data_2025_01;
```

### 4. Monitor Partition Sizes

```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'performance_data_%'
ORDER BY tablename;
```

## Performance Tuning

### PostgreSQL Configuration

**Recommended settings cho 657M rows:**

```ini
# postgresql.conf
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 2GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 50MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
```

### Query Optimization

**Best practices:**
1. Luôn filter theo `date` trước
2. Sử dụng partition pruning
3. Sử dụng indexes phù hợp
4. Limit result sets
5. Sử dụng materialized views cho reports phức tạp

**Example query:**
```sql
-- Good: Uses partition pruning
SELECT * FROM performance_data 
WHERE date >= '2025-01-01' 
AND date < '2025-02-01'
AND publisher_id = 'pub-xxx';

-- Bad: Scans all partitions
SELECT * FROM performance_data 
WHERE publisher_id = 'pub-xxx';
```

## Monitoring

### Key Metrics

1. **Partition sizes** - Đảm bảo không quá lớn
2. **Query performance** - Slow query log
3. **Index usage** - Unused indexes
4. **Cache hit rate** - Redis metrics
5. **Queue depth** - RabbitMQ metrics

### Alerts

- Partition size > 10GB
- Query time > 30s
- Cache hit rate < 80%
- Queue depth > 1000

## Backup Strategy

### PostgreSQL

- Daily full backup
- WAL archiving
- Point-in-time recovery

### MongoDB

- Daily backup raw reports
- Retention: 1 year

### Redis

- RDB snapshots
- AOF persistence

## Scaling Plan

### Phase 1: Current (657M rows)
- Single PostgreSQL instance
- Monthly partitions
- Redis caching
- RabbitMQ queue

### Phase 2: Growth (1B+ rows)
- Read replicas
- Connection pooling
- Query optimization
- Materialized views

### Phase 3: Large Scale (5B+ rows)
- Sharding by publisher_id
- Distributed caching
- Multiple queue workers
- Data archiving strategy

## Troubleshooting

### Partition không được tạo

```sql
-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'create_performance_data_partition';

-- Manually create partition
SELECT create_performance_data_partition('2025-01-01'::DATE);
```

### Query chậm

1. Check partition pruning:
```sql
EXPLAIN ANALYZE SELECT * FROM performance_data WHERE date = '2025-01-15';
```

2. Check index usage:
```sql
SELECT * FROM pg_stat_user_indexes WHERE tablename LIKE 'performance_data_%';
```

3. Update statistics:
```sql
ANALYZE performance_data;
```

### Queue không xử lý

1. Check RabbitMQ connection
2. Check queue depth
3. Check worker logs
4. Restart queue processor

## Tài liệu tham khảo

- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [MongoDB Best Practices](https://docs.mongodb.com/manual/administration/production-notes/)
- [Redis Caching Patterns](https://redis.io/docs/manual/patterns/)
- [RabbitMQ Performance](https://www.rabbitmq.com/performance.html)
