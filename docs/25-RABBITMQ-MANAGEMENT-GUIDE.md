# Hướng dẫn kiểm tra RabbitMQ Management UI

## 1. Truy cập RabbitMQ Management UI

### URL và thông tin đăng nhập

- **URL**: http://localhost:15672
- **Username**: `mediationpro`
- **Password**: `mediationpro123`

### Các bước truy cập

1. Mở trình duyệt và truy cập: `http://localhost:15672`
2. Nhập thông tin đăng nhập:
   - Username: `mediationpro`
   - Password: `mediationpro123`
3. Click **Login**

## 2. Kiểm tra Queue `alert_processing`

### Bước 1: Vào tab "Queues"

Sau khi đăng nhập, click vào tab **"Queues"** ở menu trên cùng.

### Bước 2: Tìm queue `alert_processing`

Trong danh sách queues, tìm và click vào queue **`alert_processing`**.

### Bước 3: Xem thông tin queue

Bạn sẽ thấy các thông tin sau:

#### Overview Tab
- **Messages**: Số lượng messages hiện tại trong queue
  - **Ready**: Messages đang chờ được consume
  - **Unacked**: Messages đang được xử lý (chưa ack)
  - **Total**: Tổng số messages (Ready + Unacked)

#### Message Statistics
- **Publish**: Số messages đã được publish vào queue
- **Publish rate**: Tốc độ publish (messages/second)
- **Consumer**: Số consumers đang listen queue này
- **Consumer utilisation**: % thời gian consumer hoạt động

### Bước 4: Xem chi tiết messages

#### Cách 1: Xem messages trong queue (Get messages)

1. Scroll xuống phần **"Get messages"**
2. Đảm bảo:
   - **Ack mode**: Chọn `Nack message requeue true` (để xem xong không mất message)
   - **Messages**: Nhập số lượng messages muốn xem (ví dụ: 10)
3. Click **"Get Message(s)"**
4. Bạn sẽ thấy JSON content của từng alert

#### Cách 2: Xem message payload

Mỗi message sẽ có format JSON như sau:

```json
{
  "id": 1,
  "alertRuleId": 1,
  "alertType": "REVENUE_DROP",
  "severity": "HIGH",
  "message": "Revenue dropped 15.5% compared to yesterday (threshold: 10.0%) for Publisher: pub-xxx",
  "publisherId": "pub-xxx",
  "appId": null,
  "mediationGroupId": null,
  "adSourceId": null,
  "countryCode": null,
  "value": 15.5,
  "threshold": 10.0,
  "additionalData": null,
  "status": "PENDING",
  "triggeredAt": "2026-01-15T10:30:00Z",
  "createdAt": "2026-01-15T10:30:00Z",
  "updatedAt": "2026-01-15T10:30:00Z"
}
```

## 3. Các queues khác trong hệ thống

Ngoài `alert_processing`, hệ thống còn có các queues khác:

### `report_processing`
- **Mục đích**: Queue cho raw report data từ AdMob API
- **Producer**: `PerformanceSyncJob`
- **Consumer**: `ReportQueueProcessorJob`

### `sow_calculation`
- **Mục đích**: Queue cho SoW calculation tasks (nếu cần)
- **Producer**: `SoWCalculatorJob` (nếu có)
- **Consumer**: (có thể chưa implement)

## 4. Kiểm tra Consumer Status

### Xem consumers đang chạy

1. Vào tab **"Queues"**
2. Click vào queue `alert_processing`
3. Scroll xuống phần **"Consumers"**
4. Bạn sẽ thấy:
   - **Consumer tag**: ID của consumer
   - **Channel**: Connection channel
   - **Ack required**: true/false
   - **Prefetch count**: Số messages consumer có thể nhận cùng lúc

### Kiểm tra AlertNotificationJob có đang chạy không

Nếu không thấy consumer nào:
- Job `AlertNotificationJob` có thể chưa được start
- Check logs trong `logs/` directory
- Check Hangfire dashboard để xem job status

## 5. Monitoring và Troubleshooting

### Queue đầy (Messages tích tụ)

**Triệu chứng**: Số messages trong queue tăng liên tục, không giảm

**Nguyên nhân có thể**:
- `AlertNotificationJob` không chạy hoặc bị lỗi
- Consumer xử lý quá chậm
- Email/Telegram service bị lỗi

**Giải pháp**:
1. Check logs: `logs/mediationpro-*.log`
2. Check Hangfire dashboard để xem job status
3. Restart `AlertNotificationJob` nếu cần

### Queue trống (Không có messages)

**Triệu chứng**: Queue luôn trống, không có messages mới

**Nguyên nhân có thể**:
- `AlertCalculationJob` không chạy hoặc không tạo alerts
- Không có rule nào trigger
- Deduplication quá nhiều

**Giải pháp**:
1. Check `alert_rules` có enabled không:
   ```sql
   SELECT name, is_enabled FROM alert_rules WHERE is_enabled = true;
   ```
2. Check `alert_results` có được tạo không:
   ```sql
   SELECT COUNT(*) FROM alert_results WHERE status = 'PENDING';
   ```
3. Check logs của `AlertCalculationJob`

### Messages bị stuck (Unacked)

**Triệu chứng**: Messages ở trạng thái "Unacked" lâu

**Nguyên nhân có thể**:
- Consumer đang xử lý nhưng chưa ack
- Consumer bị crash trước khi ack

**Giải pháp**:
1. Check consumer status
2. Restart consumer nếu cần
3. Messages sẽ tự động requeue sau timeout

## 6. Test thủ công

### Publish test message vào queue

1. Vào tab **"Queues"**
2. Click vào queue `alert_processing`
3. Scroll xuống phần **"Publish message"**
4. Nhập JSON test message:
   ```json
   {
     "alertRuleId": 1,
     "alertType": "TEST",
     "severity": "LOW",
     "message": "Test alert message",
     "publisherId": "test-publisher",
     "value": 0,
     "threshold": 0,
     "status": "PENDING",
     "triggeredAt": "2026-01-15T10:30:00Z",
     "createdAt": "2026-01-15T10:30:00Z",
     "updatedAt": "2026-01-15T10:30:00Z"
   }
   ```
5. Click **"Publish message"**
6. Kiểm tra xem `AlertNotificationJob` có consume message này không

## 7. Các metrics quan trọng

### Queue Metrics

- **Message rate**: Tốc độ messages vào/ra queue
- **Consumer count**: Số consumers đang active
- **Memory usage**: Bộ nhớ queue đang sử dụng

### Performance Metrics

- **Publish rate**: Messages/second được publish
- **Consume rate**: Messages/second được consume
- **Ack rate**: Messages/second được ack

## 8. Best Practices

1. **Monitor queue depth**: Nếu messages tích tụ > 1000, cần kiểm tra
2. **Check consumer health**: Đảm bảo luôn có ít nhất 1 consumer active
3. **Monitor error rate**: Check logs thường xuyên
4. **Set up alerts**: Có thể set up alerts khi queue depth > threshold

## 9. Liên kết nhanh

- **RabbitMQ Management UI**: http://localhost:15672
- **Hangfire Dashboard**: http://localhost:5000/hangfire (nếu đang chạy)
- **Logs Directory**: `logs/` trong project root

## 10. Troubleshooting Commands

### Check RabbitMQ container status
```bash
docker ps | grep rabbitmq
```

### Check RabbitMQ logs
```bash
docker logs mediationpro-rabbitmq
```

### Restart RabbitMQ (nếu cần)
```bash
docker restart mediationpro-rabbitmq
```

### Check queue từ command line
```bash
docker exec -it mediationpro-rabbitmq rabbitmqctl list_queues name messages consumers
```
