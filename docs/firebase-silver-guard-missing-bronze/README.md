# PROMPT — Guard Silver aggregation khi thiếu Bronze table (Firebase)

> Tài liệu này là **prompt giao cho agent implement**. Mục tiêu: thêm guard ở tầng Silver để **bỏ qua (skip) một
> cách êm** khi bronze table của app chưa tồn tại, thay vì để job ném exception `Unknown table`.
> **KHÔNG** tạo bronze table rỗng — đó là chủ đích đã chốt (app không có dữ liệu thì không cần bảng).

---

## 1. Bối cảnh & nguyên nhân gốc (đã điều tra, đã verify)

### Lỗi đang gặp
Job transform Silver ném lỗi và spam log:
```
MySqlConnector.MySqlException: Getting analyzing error. Detail message: Unknown table 'bronze.fb_amb_genera_ai_video_gen'.
  at FirebaseSilverGoldAggregator.ExecuteDeleteThenInsertAsync(...)
  at FirebaseSilverGoldAggregator.InsertSilverEngagementAsync(...)
  at FirebaseSilverGoldAggregator.AggregateSilverAsync(...)
  at FirebaseSilverGoldBackfillJob.BackfillAppDateAsync(...)
```

### Nguyên nhân gốc (đã xác minh trong code + StarRocks)
1. **Bronze table được tạo "lazy", chỉ khi có dữ liệu.** Khi Firebase/BigQuery trả về 0 event, hai chỗ return sớm
   **trước** lệnh `CREATE TABLE`:
   - `FirebaseIngestionService.IngestDayAsync` (`backend/MediationPro.Infrastructure/Services/FirebaseIngestionService.cs:43-46`):
     `if (events.Count == 0) { LogWarning("No Firebase events..."); return Array.Empty<...>(); }`
   - `StarRocksFirebaseWriter.WriteEventsAsync` (`backend/MediationPro.Infrastructure/StarRocks/StarRocksFirebaseWriter.cs:439`):
     `if (rows == null || rows.Count == 0) return 0;` — **return TRƯỚC** `await EnsureTableForAppAsync(...)` ở dòng 451.
   - `EnsureTableForAppAsync` (`StarRocksFirebaseWriter.cs:201-262`, chứa `CREATE TABLE IF NOT EXISTS bronze.fb_...`)
     chỉ được gọi từ trong `WriteEventsAsync` (451) / `EnsurePartitionExistsAsync` (305) / stream-load path (693) —
     tất cả đều nằm **sau khi đã có dữ liệu**.
   → App không có dữ liệu ⇒ bronze table **không bao giờ được tạo**.

2. **Silver aggregation lại chạy vô điều kiện**, chỉ gate theo "app enabled trong `apps.firebase_params`"
   (`FirebaseAppConfigProvider.GetEnabledFirebaseConfigsAsync`), **không kiểm tra bronze table tồn tại**.
   `AggregateSilverAsync` suy tên bảng thuần từ key (`FirebaseSilverGoldTableManager.GetBronzeTableName`,
   `FirebaseSilverGoldTableManager.cs:527-531`) rồi chạy `INSERT ... SELECT ... FROM bronze.fb_<key>` →
   StarRocks ném `Unknown table`.

> Đã verify trên StarRocks: schema `bronze` chỉ có 2 bảng `fb_*` (`fb_ar_tracer_trace_drawing_ios`,
> `fb_avnglobal_piano_keyboard_learn`); `fb_amb_genera_ai_video_gen` **không tồn tại**.

### Quyết định (đã chốt với product)
**Guard ở tầng Silver.** Trước khi chạy các câu `INSERT ... SELECT FROM bronze.*`, kiểm tra bronze table có tồn tại
không. Nếu **không** → log warning + **skip** (return sớm, coi như no-op thành công), **không** ném exception,
**không** tạo bảng rỗng.

---

## 2. Phạm vi thay đổi

Chỉ sửa **1 file**: `backend/MediationPro.Infrastructure/StarRocks/FirebaseSilverGoldAggregator.cs`.

KHÔNG đụng: ingestion, writer, table manager (ngoài việc gọi `GetBronzeTableName` đã có), backfill job, Gold.
> Gold (`AggregateGoldAsync`, `InsertGold*`) đọc từ `silver.*` (luôn tồn tại), **không** đọc bronze ⇒ không cần guard.
> Nếu Silver bị skip thì Gold chạy ra 0 dòng — không lỗi, chấp nhận được.

---

## 3. Việc cần làm

### Bước 1 — Thêm helper kiểm tra bronze table tồn tại
Trong `FirebaseSilverGoldAggregator.cs`, thêm method private (đặt cạnh `ExecuteDeleteThenInsertAsync`, ~dòng 584).
Tái dùng đúng pattern `TableExistsAsync` đã có ở `StarRocksFirebaseWriter.cs:265-273` (query `information_schema.tables`).

```csharp
/// <summary>
/// Kiểm tra bronze table (vd "bronze.fb_xxx") đã tồn tại trên StarRocks chưa.
/// Bronze được tạo lazy (chỉ khi có dữ liệu ingest); app không có data sẽ không có bảng.
/// </summary>
private async Task<bool> BronzeTableExistsAsync(string fullBronzeTable, CancellationToken ct)
{
    var connStr = GetConnectionString();
    if (string.IsNullOrWhiteSpace(connStr))
        return false;

    // fullBronzeTable dạng "bronze.fb_xxx" → tách schema + table
    var dotIdx = fullBronzeTable.IndexOf('.');
    var schema = dotIdx >= 0 ? fullBronzeTable[..dotIdx] : "bronze";
    var table  = dotIdx >= 0 ? fullBronzeTable[(dotIdx + 1)..] : fullBronzeTable;

    await using var conn = new MySqlConnection(connStr);
    await conn.OpenAsync(ct);
    const string sql = "SELECT 1 FROM information_schema.tables WHERE table_schema = @schema AND table_name = @table LIMIT 1";
    await using var cmd = new MySqlCommand(sql, conn);
    cmd.Parameters.AddWithValue("@schema", schema);
    cmd.Parameters.AddWithValue("@table", table);
    var o = await cmd.ExecuteScalarAsync(ct);
    return o != null && o != DBNull.Value;
}
```

> (Tuỳ chọn, khuyến nghị) Cache kết quả "table tồn tại" trong 1 `static HashSet<string>` + lock để backfill nhiều
> ngày cùng app không query lặp `information_schema` mỗi ngày — tương tự `_ensuredPartitions` trong
> `FirebaseSilverGoldTableManager.cs:533`. **Chỉ cache trường hợp tồn tại (true)**; trường hợp chưa tồn tại
> KHÔNG cache (để app vừa có data lần đầu được nhận ra ngay ở lần chạy kế tiếp).

### Bước 2 — Guard trong `AggregateSilverAsync` (~dòng 42-61)
Sau khi tính `bronzeTable` (dòng 44) và `dateStr`, kiểm tra tồn tại trước khi gọi 7 hàm `InsertSilver*`:

```csharp
var bronzeTable = FirebaseSilverGoldTableManager.GetBronzeTableName(firebaseAppKey);
var dateStr = targetDate.Date.ToString("yyyy-MM-dd");

if (!await BronzeTableExistsAsync(bronzeTable, ct))
{
    _logger.LogWarning(
        "Silver aggregation SKIPPED: bronze table {Bronze} không tồn tại (app chưa có dữ liệu Firebase). firebaseKey={Key}, admobAppId={AdmobId}, date={Date}",
        bronzeTable, firebaseAppKey, admobAppId, dateStr);
    return;
}

if (ensurePartition)
    await _tableManager.EnsurePartitionForDateAsync(targetDate, ct);
// ... giữ nguyên 7 lời gọi InsertSilver* ...
```

### Bước 3 — Guard trong `AggregateSilverTableAsync` (~dòng 104+)
Hàm này cũng `SELECT FROM bronze` (chạy từ backfill 1 table). Thêm cùng guard sau khi tính `bronzeTable`/`dateStr`,
trước `switch (tableName...)`:

```csharp
if (!await BronzeTableExistsAsync(bronzeTable, ct))
{
    _logger.LogWarning(
        "Silver table '{Table}' SKIPPED: bronze {Bronze} không tồn tại. firebaseKey={Key}, admobAppId={AdmobId}, date={Date}",
        tableName, bronzeTable, firebaseAppKey, admobAppId, dateStr);
    return;
}
```

### Bước 4 — `AggregateAllAsync` (~dòng 86) & `AggregateGoldAsync`
- `AggregateAllAsync` gọi `AggregateSilverAsync` rồi `AggregateGoldAsync`. Sau khi Bước 2 áp guard,
  Silver tự skip; **không cần** sửa thêm. Gold vẫn chạy (đọc silver, an toàn).
- **KHÔNG** thêm guard vào `AggregateGoldAsync`/`InsertGold*` — chúng không đọc bronze.

---

## 4. Ràng buộc / Acceptance criteria
- App có bronze table → hành vi **không đổi** (vẫn aggregate đầy đủ).
- App **không** có bronze table → job **không ném exception**, log đúng 1 warning rõ ràng (kèm tên bronze + key +
  date), và tiếp tục các app khác bình thường (backfill loop ở `FirebaseSilverGoldBackfillJob.cs:212-234, 242-265`
  vẫn chạy hết).
- **KHÔNG** tạo bronze table rỗng trong mọi trường hợp.
- Không thay đổi chữ ký public của `AggregateSilverAsync` / `AggregateSilverTableAsync` / `AggregateAllAsync`.
- Guard chỉ là 1 query `information_schema.tables` nhẹ; nếu làm cache thì chỉ cache positive (xem Bước 1).

## 5. Kiểm thử
- **Unit/integration** (mock hoặc StarRocks test): bronze không tồn tại → `AggregateSilverAsync` trả về,
  **không** phát câu `DELETE/INSERT` nào; bronze tồn tại → chạy đủ 7 `InsertSilver*` như cũ.
- **Manual**: chạy lại job transform cho app `amb-genera-ai-video-gen` (hiện chưa có bronze) → log
  `Silver aggregation SKIPPED: bronze table bronze.fb_amb_genera_ai_video_gen không tồn tại...`, **không** còn
  exception `Unknown table`. Các app có data vẫn aggregate bình thường.

## 6. Tệp đụng tới
| File | Thay đổi |
|---|---|
| `backend/MediationPro.Infrastructure/StarRocks/FirebaseSilverGoldAggregator.cs` | Thêm `BronzeTableExistsAsync`; guard đầu `AggregateSilverAsync` (~42) và `AggregateSilverTableAsync` (~104) |

## 7. Tham chiếu code (đã verify)
- `FirebaseSilverGoldAggregator.cs`: `GetConnectionString()` (34), `AggregateSilverAsync` (42-61),
  `AggregateGoldAsync` (66), `AggregateAllAsync` (86), `AggregateSilverTableAsync` (104+),
  `ExecuteDeleteThenInsertAsync` (584-626). Đã `using MySqlConnector;` (dòng 6).
- `FirebaseSilverGoldTableManager.GetBronzeTableName` (527-531) — `bronze.fb_<sanitized key>`.
- Pattern tham chiếu `TableExistsAsync` (`StarRocksFirebaseWriter.cs:265-273`); cache partition mẫu
  `_ensuredPartitions` (`FirebaseSilverGoldTableManager.cs:533`).
- Nguồn lỗi gốc (return sớm): `FirebaseIngestionService.cs:43-46`, `StarRocksFirebaseWriter.cs:439 vs 451`.
