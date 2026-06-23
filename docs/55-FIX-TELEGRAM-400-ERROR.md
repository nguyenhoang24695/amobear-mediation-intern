# Fix Telegram 400 Bad Request Error

## Lỗi

```
Response status code does not indicate success: 400 (Bad Request).
   at System.Net.Http.HttpResponseMessage.EnsureSuccessStatusCode()
   at MediationPro.Infrastructure.Notifications.TelegramService.SendMessageAsync
```

## Nguyên nhân có thể

1. **Chat ID không hợp lệ** - Bot không có quyền truy cập group/channel
2. **Message Thread ID không hợp lệ** - Thread không tồn tại trong group
3. **Message quá dài** - Telegram giới hạn 4096 characters
4. **HTML parse mode lỗi** - Special characters chưa được escape
5. **Bot token không hợp lệ** - Token đã hết hạn hoặc bị revoke
6. **Group settings** - Group không cho phép bot gửi message

## Giải pháp đã áp dụng

### 1. Improved Error Handling

**Trước:**
```csharp
response.EnsureSuccessStatusCode(); // Throw exception ngay
```

**Sau:**
```csharp
// Đọc response content trước
var responseContent = await response.Content.ReadAsStringAsync();
var result = JsonSerializer.Deserialize<JsonElement>(responseContent);

if (response.IsSuccessStatusCode) {
    // Handle success
} else {
    // Log chi tiết lỗi từ Telegram API
    var errorDescription = result.TryGetProperty("description", out var desc) 
        ? desc.GetString() 
        : responseContent;
    var errorCode = result.TryGetProperty("error_code", out var code) 
        ? code.GetInt32() 
        : (int?)null;
    
    _logger.LogError("Telegram API error: Status: {StatusCode}, Error Code: {ErrorCode}, Description: {Description}",
        (int)response.StatusCode, errorCode, errorDescription);
}
```

### 2. HTML Escaping

Thêm method `EscapeHtml()` để escape các special characters:
- `&` → `&amp;`
- `<` → `&lt;`
- `>` → `&gt;`
- `"` → `&quot;`
- `'` → `&#39;`

### 3. Message Length Limit

Kiểm tra và truncate message nếu vượt quá 4096 characters (Telegram limit).

### 4. Better Logging

Log chi tiết:
- Chat ID
- Message Thread ID
- Error code từ Telegram API
- Error description từ Telegram API
- Response status code

## Cách debug

### Bước 1: Kiểm tra Bot Token

```powershell
# Test bot token
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

Nếu trả về `ok: true`, bot token hợp lệ.

### Bước 2: Kiểm tra Chat ID

```powershell
# Test chat ID
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getChat?chat_id=<CHAT_ID>"
```

Nếu trả về `ok: true`, chat ID hợp lệ và bot có quyền truy cập.

### Bước 3: Kiểm tra Message Thread ID

Nếu sử dụng topics trong group:
1. Đảm bảo group là **supergroup** (không phải regular group)
2. Đảm bảo topics đã được bật trong group settings
3. Đảm bảo MessageThreadId đúng với topic ID

### Bước 4: Xem logs

Sau khi fix, logs sẽ hiển thị chi tiết lỗi:

```
[ERROR] Telegram API error for topic: revenue_alerts, chat_id: -1003646836917, thread_id: 3. 
Status: 400, Error Code: 400, Description: Bad Request: chat not found
```

## Common Telegram API Errors

### Error 400: Bad Request

**Các nguyên nhân:**
- `chat not found` - Chat ID không tồn tại hoặc bot không có quyền
- `message thread not found` - Thread ID không tồn tại
- `message is too long` - Message > 4096 characters
- `can't parse entities` - HTML parse mode lỗi

### Error 403: Forbidden

- Bot bị ban khỏi group/channel
- Bot không có quyền gửi message

### Error 401: Unauthorized

- Bot token không hợp lệ hoặc đã hết hạn

## Troubleshooting

### Lỗi: "chat not found"

**Giải pháp:**
1. Kiểm tra Chat ID trong `appsettings.json`
2. Đảm bảo bot đã được add vào group/channel
3. Đảm bảo bot có quyền gửi message

### Lỗi: "message thread not found"

**Giải pháp:**
1. Kiểm tra MessageThreadId trong config
2. Đảm bảo group là supergroup
3. Đảm bảo topics đã được bật
4. Nếu không dùng topics, set `MessageThreadId` = `null` hoặc không config

### Lỗi: "can't parse entities"

**Giải pháp:**
- Code đã tự động escape HTML special characters
- Nếu vẫn lỗi, kiểm tra message content có ký tự đặc biệt

### Lỗi: "message is too long"

**Giải pháp:**
- Code đã tự động truncate message > 4096 characters
- Nếu cần gửi message dài, chia thành nhiều messages

## Test Configuration

### Test với curl

```powershell
# Test send message
$botToken = "YOUR_BOT_TOKEN"
$chatId = "YOUR_CHAT_ID"
$message = "Test message"

curl -X POST "https://api.telegram.org/bot$botToken/sendMessage" `
  -H "Content-Type: application/json" `
  -d "{`"chat_id`": `"$chatId`", `"text`": `"$message`", `"parse_mode`": `"HTML`"}"
```

### Test với Postman

1. Method: `POST`
2. URL: `https://api.telegram.org/bot<BOT_TOKEN>/sendMessage`
3. Headers: `Content-Type: application/json`
4. Body:
```json
{
  "chat_id": "-1003646836917",
  "text": "Test message",
  "parse_mode": "HTML",
  "message_thread_id": 3
}
```

## Best Practices

1. **Always log error details** - Không chỉ throw exception
2. **Validate configuration** - Kiểm tra Chat ID, Thread ID trước khi gửi
3. **Handle gracefully** - Không crash app khi Telegram API lỗi
4. **Escape HTML** - Luôn escape HTML special characters
5. **Check message length** - Truncate nếu > 4096 characters
6. **Test configuration** - Test bot token và chat ID trước khi deploy

## Code Changes

### TelegramService.cs

- ✅ Improved error handling với detailed logging
- ✅ HTML escaping cho parse_mode
- ✅ Message length validation và truncation
- ✅ Không throw exception, chỉ log và continue
- ✅ Log chi tiết error code và description từ Telegram API

## Next Steps

1. ✅ Fix error handling
2. ⏭️ Test với các scenarios khác nhau
3. ⏭️ Monitor logs để phát hiện patterns
4. ⏭️ Add retry logic nếu cần
