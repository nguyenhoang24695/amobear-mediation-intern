# Account ID vs Publisher ID - Giải thích và Cách sử dụng

## Vấn đề

Có sự nhầm lẫn giữa:
- **Account ID** (ID hệ thống) - Dùng để lưu và lấy token
- **Publisher ID** (AdMob Publisher ID) - Dùng để gọi AdMob API

## Giải thích

### Account ID (ID Hệ thống)

- **Mục đích**: Dùng để lưu và quản lý OAuth token trong database
- **Ví dụ**: `"default"` (từ config `AdMob:DefaultAccountId`)
- **Lưu trong**: Bảng `ad_mob_tokens` với cột `account_id`
- **Sử dụng**: Khi gọi `GetAccessTokenAsync(accountId)` để lấy token

### Publisher ID (AdMob Publisher ID)

- **Mục đích**: Dùng để gọi AdMob API (identify publisher account)
- **Ví dụ**: `"pub-9820030150756925"`
- **Lưu trong**: Bảng `apps`, `ad_units`, `mediation_groups` với cột `publisher_id`
- **Sử dụng**: Khi gọi AdMob API endpoints (ví dụ: `accounts/pub-xxx/apps`)

## Luồng hoạt động

```
┌─────────────────────────────────────────────────────────┐
│  1. Setup OAuth (một lần)                              │
│     - accountId = "default" (từ config)                │
│     - Lưu token với accountId = "default"              │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  2. Gọi AdMob API                                      │
│     - accountName = "accounts/pub-9820030150756925"   │
│     - publisherId = "pub-9820030150756925"            │
│     - Token lookup: accountId = "default" (luôn dùng) │
│     - API call: accountName (dùng publisherId)        │
└─────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────┐
│  3. Lưu dữ liệu vào Database                            │
│     - publisher_id = "pub-9820030150756925"            │
│     - Không liên quan đến accountId                    │
└─────────────────────────────────────────────────────────┘
```

## Cách sử dụng đúng

### ✅ Đúng

```csharp
// 1. Lấy token - luôn dùng accountId (từ config)
var defaultAccountId = _configuration["AdMob:DefaultAccountId"] ?? "default";
var accessToken = await _authManager.GetAccessTokenAsync(defaultAccountId);

// 2. Gọi AdMob API - dùng accountName (chứa publisherId)
var accountName = "accounts/pub-9820030150756925";
var apps = await _apiClient.ListAppsAsync(accountName);

// 3. Lưu dữ liệu - dùng publisherId
var publisherId = "pub-9820030150756925";
app.PublisherId = publisherId;
```

### ❌ Sai

```csharp
// SAI: Dùng publisherId để lấy token
var publisherId = "pub-9820030150756925";
var accessToken = await _authManager.GetAccessTokenAsync(publisherId); // ❌

// SAI: Dùng accountId để gọi API
var accountId = "default";
var apps = await _apiClient.ListAppsAsync(accountId); // ❌
```

## Code đã được sửa

### Trước (SAI)

```csharp
// Extract publisherId từ accountName
var accountId = ExtractAccountId(accountName); // "pub-xxx"
// Dùng publisherId để lấy token ❌
return await ExecuteRequestAsync<AppsResponseDto>(accountId, request);
```

### Sau (ĐÚNG)

```csharp
// Luôn dùng defaultAccountId để lấy token ✅
var defaultAccountId = _configuration["AdMob:DefaultAccountId"] ?? "default";
return await ExecuteRequestAsync<AppsResponseDto>(defaultAccountId, request);
```

## Tóm tắt

| Khái niệm | Giá trị | Mục đích | Ví dụ |
|-----------|---------|----------|-------|
| **Account ID** | Từ config | Lưu/lấy token | `"default"` |
| **Publisher ID** | Từ AdMob API | Gọi API, lưu data | `"pub-9820030150756925"` |
| **Account Name** | Format AdMob | Gọi API | `"accounts/pub-xxx"` |

**Quy tắc:**
- ✅ **Token lookup**: Luôn dùng `accountId` (từ config)
- ✅ **API calls**: Dùng `accountName` hoặc `publisherId` (từ AdMob)
- ✅ **Database storage**: Dùng `publisherId` (từ AdMob)
