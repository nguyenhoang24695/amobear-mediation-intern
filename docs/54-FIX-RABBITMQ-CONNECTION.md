# Fix RabbitMQ Connection Error

## Lỗi

```
RabbitMQ.Client.Exceptions.BrokerUnreachableException: None of the specified endpoints were reachable
 ---> System.IO.IOException: connection.start was never received, likely due to a network timeout
 ---> System.IO.EndOfStreamException: Reached the end of the stream. Possible authentication failure.
```

## Nguyên nhân

1. **RabbitMQ container chưa chạy** - Docker service chưa được start
2. **RabbitMQ chưa sẵn sàng** - Container đang khởi động nhưng chưa ready
3. **Connection timeout** - App cố kết nối ngay khi start, không có retry logic
4. **Network issue** - Port bị block hoặc firewall

## Giải pháp

### Bước 1: Kiểm tra Docker Services

Chạy script để check RabbitMQ status:

```powershell
.\scripts\57-check-rabbitmq.ps1
```

Script này sẽ:
- ✅ Kiểm tra Docker đang chạy
- ✅ Kiểm tra RabbitMQ container
- ✅ Kiểm tra health status
- ✅ Kiểm tra port accessibility
- ✅ Kiểm tra Management UI

### Bước 2: Start Docker Services

Nếu RabbitMQ chưa chạy, start tất cả services:

```powershell
.\scripts\58-start-docker-services.ps1
```

Hoặc start thủ công:

```powershell
docker-compose up -d
```

### Bước 3: Đợi RabbitMQ Ready

RabbitMQ cần vài giây để khởi động hoàn toàn. Đợi 10-15 giây sau khi start container.

Kiểm tra lại:

```powershell
.\scripts\57-check-rabbitmq.ps1
```

### Bước 4: Retry Logic đã được thêm

`RabbitMQService` đã được cập nhật với:
- ✅ **Retry logic**: 5 lần thử với exponential backoff
- ✅ **Connection timeout**: 30 giây
- ✅ **Automatic recovery**: Tự động reconnect khi mất kết nối
- ✅ **Heartbeat**: 60 giây để detect connection issues

Nếu vẫn lỗi, app sẽ retry tự động.

## Cấu hình

### Connection String

File: `backend/MediationPro.Api/appsettings.json`

```json
{
  "ConnectionStrings": {
    "RabbitMQ": "amqp://mediationpro:mediationpro123@localhost:5672/"
  }
}
```

### Docker Compose

File: `docker-compose.yml`

```yaml
rabbitmq:
  image: rabbitmq:3-management-alpine
  container_name: mediationpro-rabbitmq
  environment:
    RABBITMQ_DEFAULT_USER: mediationpro
    RABBITMQ_DEFAULT_PASS: mediationpro123
  ports:
    - "5672:5672"   # AMQP port
    - "15672:15672" # Management UI
```

## Troubleshooting

### Lỗi: "RabbitMQ container is not running"

**Giải pháp:**
```powershell
docker-compose up -d rabbitmq
```

### Lỗi: "Port 5672 is not accessible"

**Nguyên nhân:**
- Port bị block bởi firewall
- Port đã được sử dụng bởi process khác

**Giải pháp:**
```powershell
# Check port usage
netstat -ano | findstr :5672

# Kill process nếu cần
# (Replace PID với process ID từ netstat)
taskkill /PID <PID> /F
```

### Lỗi: "Authentication failure"

**Nguyên nhân:**
- Username/password không đúng
- Connection string không đúng format

**Giải pháp:**
1. Kiểm tra `appsettings.json`:
   ```json
   "RabbitMQ": "amqp://mediationpro:mediationpro123@localhost:5672/"
   ```

2. Kiểm tra Docker environment:
   ```yaml
   RABBITMQ_DEFAULT_USER: mediationpro
   RABBITMQ_DEFAULT_PASS: mediationpro123
   ```

3. Reset RabbitMQ container:
   ```powershell
   docker-compose stop rabbitmq
   docker-compose rm -f rabbitmq
   docker-compose up -d rabbitmq
   ```

### Lỗi: "Connection timeout"

**Nguyên nhân:**
- RabbitMQ chưa sẵn sàng
- Network latency cao

**Giải pháp:**
1. Đợi thêm vài giây
2. Kiểm tra logs:
   ```powershell
   docker-compose logs rabbitmq
   ```
3. Retry logic sẽ tự động thử lại

### RabbitMQ Management UI

Truy cập Management UI để monitor:
- URL: http://localhost:15672
- Username: `mediationpro`
- Password: `mediationpro123`

Tại đây bạn có thể:
- Xem queues và messages
- Monitor connections
- Check health status

## Best Practices

### 1. Start Services Trước App

Luôn start Docker services trước khi start backend:

```powershell
# 1. Start Docker services
.\scripts\58-start-docker-services.ps1

# 2. Wait a few seconds
Start-Sleep -Seconds 10

# 3. Start backend
.\scripts\51-start-backend.ps1
```

### 2. Health Check

Sử dụng health check script trước khi start app:

```powershell
.\scripts\57-check-rabbitmq.ps1
```

### 3. Monitor Logs

Theo dõi RabbitMQ logs trong development:

```powershell
docker-compose logs -f rabbitmq
```

### 4. Connection Pooling

RabbitMQ connection đã được configure với:
- Automatic recovery
- Heartbeat monitoring
- Connection timeout
- Retry logic

## Code Changes

### RabbitMQService.cs

Đã thêm:
- **Retry logic** với exponential backoff
- **Connection timeout** configuration
- **Automatic recovery** với event handlers
- **Automatic queue declaration** - queues được tạo tự động nếu chưa tồn tại
- **Thread-safe queue tracking** - tránh declare nhiều lần không cần thiết
- **Better error logging** và validation

#### Connection Factory Configuration

```csharp
var factory = new ConnectionFactory
{
    Uri = new Uri(connectionString),
    AutomaticRecoveryEnabled = true,
    NetworkRecoveryInterval = TimeSpan.FromSeconds(10),
    RequestedConnectionTimeout = TimeSpan.FromSeconds(30),
    RequestedHeartbeat = TimeSpan.FromSeconds(60)
};
```

#### Automatic Queue Declaration

**Method `EnsureQueueExists()`:**
- Kiểm tra queue đã được declare chưa (thread-safe)
- Nếu chưa, tự động tạo queue với cấu hình:
  - `durable: true` - Queue tồn tại sau khi RabbitMQ restart
  - `exclusive: false` - Queue có thể dùng bởi nhiều connections
  - `autoDelete: false` - Queue không tự động xóa
- Idempotent - có thể gọi nhiều lần an toàn

**Được gọi tự động:**
- Trước khi `PublishAsync()` - đảm bảo queue tồn tại trước khi publish
- Trước khi `ConsumeAsync()` - đảm bảo queue tồn tại trước khi consume
- Trong constructor - declare các queues mặc định

#### Connection Recovery

**Event Handlers:**
- `OnConnectionShutdown` - Clear declared queues khi connection shutdown
- `OnConnectionRecoveryError` - Log recovery errors
- `OnModelShutdown` - Clear declared queues khi channel shutdown

Khi connection recover, queues sẽ được declare lại tự động khi có operation tiếp theo.

## Verification

Sau khi fix, verify:

1. ✅ RabbitMQ container running
2. ✅ Port 5672 accessible
3. ✅ Management UI accessible
4. ✅ Backend start without errors
5. ✅ Queues created successfully

## Next Steps

1. ✅ Fix RabbitMQ connection
2. ⏭️ Test queue operations
3. ⏭️ Monitor message processing
4. ⏭️ Setup production configuration
