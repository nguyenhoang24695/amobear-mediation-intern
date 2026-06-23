# Implementation Prompt — Song song hoá tạo Ad/Creative trong Meta Campaign Execution

> **Mục tiêu**: Tăng tốc bước tạo campaign Meta Ads bằng mô hình **"API song song, DB tuần tự"** cho vòng lặp variant (creative + ad), giữ nguyên tính đúng đắn (idempotent, log đầy đủ, an toàn EF Core, kiểm soát rate limit).
>
> Tài liệu này là prompt **độc lập, đủ ngữ cảnh** để một agent khác thực thi mà không cần lịch sử hội thoại trước. Đọc kỹ phần "Ràng buộc bắt buộc" trước khi code.

---

## 0. TL;DR cho người triển khai

- File chính sửa đổi: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`.
- Hiện tại `ExecuteAsync` chạy **hoàn toàn tuần tự**: tạo campaign → ad set → rồi `foreach variant` tạo creative + ad nối tiếp nhau. Mỗi variant = 2 round-trip Meta API nối tiếp.
- Việc cần làm: giữ campaign + ad set tuần tự (bắt buộc do phụ thuộc dữ liệu), **song song hoá phần gọi Meta API của các variant** với độ song song giới hạn, rồi **ghi DB (entity + operation log) tuần tự** trên DbContext chính theo đúng thứ tự `SequenceNumber`.
- KHÔNG `Task.WhenAll` thẳng vào loop hiện tại — sẽ vỡ vì `DbContext` không thread-safe và race rate-limit/attempt-number.

---

## 1. Bối cảnh code hiện tại (đã xác minh)

### 1.1. Entry point
`MetaCampaignExecutionService.ExecuteAsync(Guid organizationId, Guid userId, long requestId, string? correlationId, CancellationToken ct)` — dòng ~86.

Luồng cốt lõi (dòng ~180-213):
```csharp
var campaign = await EnsureCampaignAsync(...);   // 1 API call tạo campaign
var adSet    = await EnsureAdSetAsync(...);       // validate + create adset (2 API call)

var variants = payload.AdVariants ?? new List<MetaAdVariantDto>();
foreach (var variant in variants)                 // <-- TUẦN TỰ, cần song song hoá
{
    var existingCreative = existingCreativesBySeq.GetValueOrDefault(variant.SequenceNumber);
    var existingAd       = existingAdsBySeq.GetValueOrDefault(variant.SequenceNumber);

    var isFlexibleCreative = IsFlexibleCreative(variant.Creative);
    MetaCreative? creative = null;
    if (isFlexibleCreative)
    {
        await AddOperationLogAsync(... Skipped ...);   // log skip, không gọi API
    }
    else
    {
        creative = await EnsureCreativeAsync(...);      // 1 API call tạo creative
    }
    _ = await EnsureAdAsync(..., creative, ...);        // 1 API call tạo ad
}
```

### 1.2. Các method liên quan
- `EnsureCampaignAsync` (~248): tạo campaign, upsert + `SaveChangesAsync`. **Phải chạy trước, tuần tự.**
- `EnsureAdSetAsync` (~291): validate + tạo ad set, upsert + `SaveChangesAsync`. **Phải chạy sau campaign, trước mọi ad** (ad cần `adSet.ExternalAdSetId`).
- `EnsureCreativeAsync` (~407): nếu `existing != null` → chỉ log reuse, return existing (KHÔNG gọi API). Ngược lại: `BuildCreativePayloadAsync` → `ExecuteCreateAsync(.../adcreatives)` → tạo `MetaCreative` → `UpsertCreativeAsync` + `SaveChangesAsync`.
- `EnsureAdAsync` (~452): nếu `existing != null` → chỉ log reuse. Ngược lại build payload (flexible hoặc thường, flexible cần `BuildFlexibleAdPayloadAsync` có upload asset) → `ExecuteCreateAsync(.../ads)` → tạo `MetaAd` → `UpsertAdAsync` + `SaveChangesAsync`.
- `ExecuteCreateAsync` (~568): gọi Meta qua `_restClient.ExecuteAsync` + ghi operation log (success/fail). Đây là nơi phát sinh API call + log.
- `AddOperationLogAsync` (~502): **đọc** `_dbContext.MetaOperationLogs.CountAsync(...)` để tính `AttemptNumber = count + 1`, rồi `AddAsync` + `SaveChangesAsync`. **Đây là điểm race khi song song** (count theo step).

### 1.3. Dependency của service (constructor ~54)
Service nhận `ApplicationDbContext _dbContext` (scoped, **một instance dùng chung**), các repository (`IMetaCampaignRepository`,...) cũng bám vào cùng DbContext, `RestClient _restClient` (tự new, thread-safe cho gọi song song), `IMetaRequestAssetService` (upload asset cho flexible creative/ad).

> **Lưu ý quan trọng về vòng đời**: tất cả repository + `_dbContext` chia sẻ **một** `DbContext`. Đây là lý do không được ghi DB song song.

---

## 2. Ràng buộc BẮT BUỘC (đọc trước khi code)

1. **`DbContext` / EF Core KHÔNG thread-safe.** Hai thao tác chạy đồng thời trên cùng `ApplicationDbContext` sẽ ném `InvalidOperationException: A second operation was started on this context instance...`. ⇒ Mọi lệnh DB (`UpsertCreativeAsync`, `UpsertAdAsync`, `AddOperationLogAsync`, `SaveChangesAsync`, và cả `CountAsync` trong log) **phải chạy tuần tự** trên DbContext chính. Chỉ phần **gọi Meta API** (`_restClient.ExecuteAsync` + build payload + upload asset) được phép chạy song song.

2. **Thứ tự phụ thuộc dữ liệu**: campaign → ad set → (creative → ad). Ad cần `adSet.ExternalAdSetId` và `creative.ExternalCreativeId` (với ad không flexible). ⇒ Trong một variant, creative phải xong trước ad. Giữ nguyên ràng buộc này; chỉ song song hoá **giữa các variant**, không song song creative↔ad trong cùng variant.

3. **Meta API rate limit**: gọi tạo ad/creative song song cùng 1 ad account/token dễ dính throttle (error `code 17`, hoặc `code 80004` / subcode). ⇒ BẮT BUỘC giới hạn độ song song bằng `SemaphoreSlim` (mặc định **4**, cấu hình được) và thêm **retry + exponential backoff** cho lỗi rate-limit.

4. **`AttemptNumber` trong operation log**: hiện tính bằng `CountAsync` theo step. Khi ghi log tuần tự (sau khi API xong) thì vẫn an toàn — **miễn là không gọi `AddOperationLogAsync` đồng thời**. Vì ta ghi DB tuần tự nên giữ nguyên logic này được; KHÔNG di chuyển `AddOperationLogAsync` vào nhánh song song.

5. **Idempotency phải giữ nguyên**: nhánh `existing != null` (reuse creative/ad) hiện chỉ ghi log, không gọi API. Phải bảo toàn hành vi này — variant nào đã có entity thì không tạo lại.

6. **Thứ tự log & entity ổn định**: kết quả ghi DB và operation log nên theo đúng thứ tự `SequenceNumber` tăng dần để log đọc dễ và test ổn định (tránh non-determinism).

7. **Hành vi lỗi (fail-fast hiện tại)**: hiện một variant lỗi sẽ ném exception, thoát loop, request chuyển `Failed` (catch ở `ExecuteAsync`). Giữ **đúng ngữ nghĩa kết quả cuối**: nếu bất kỳ variant nào lỗi → request `Failed`, và log lỗi của variant đó phải được ghi. Xem mục 4.4 về cách xử lý lỗi khi chạy song song (không được nuốt lỗi).

8. **Không đổi public contract**: chữ ký `IMetaCampaignExecutionService.ExecuteAsync` giữ nguyên. `MetaExecutionResult` trả về giữ nguyên cấu trúc.

---

## 3. Thiết kế mục tiêu — "API song song, DB tuần tự"

### 3.1. Tách mỗi bước tạo (creative/ad) thành 2 pha
- **Pha API (song song hoá được)**: build payload (+ upload asset nếu flexible) + `_restClient.ExecuteAsync` → trả về `ExternalId` (+ raw response/error). KHÔNG đụng DbContext.
- **Pha DB (tuần tự)**: tạo entity từ ExternalId, `Upsert...` + `SaveChanges`, và `AddOperationLogAsync`. Chạy trên DbContext chính, lần lượt.

### 3.2. Luồng mới
```
EnsureCampaignAsync   (tuần tự, như cũ)
EnsureAdSetAsync      (tuần tự, như cũ)

// Pha 1 — song song có giới hạn: chỉ gọi Meta API
var gate = new SemaphoreSlim(maxDegreeOfParallelism); // default 4
var apiTasks = variants.Select(v => RunVariantApiAsync(v, gate, ...)).ToList();
var apiResults = await Task.WhenAll(apiTasks);  // mỗi phần tử: VariantApiOutcome

// Pha 2 — tuần tự theo SequenceNumber: ghi entity + operation log
foreach (var outcome in apiResults.OrderBy(o => o.SequenceNumber))
{
    // persist creative entity (nếu có), persist ad entity, ghi operation log success/fail
    // nếu outcome lỗi → ghi log fail rồi ném để ExecuteAsync set Failed
}
```

`RunVariantApiAsync` bên trong:
```
await gate.WaitAsync(ct);
try {
    if (existingAd != null) return outcome(reuse-ad);          // không gọi API, để pha 2 ghi log reuse
    creativeExternal = existingCreative != null
        ? reuse
        : (isFlexible ? null : await CallCreateCreativeApiWithRetry(...));
    adExternal = await CallCreateAdApiWithRetry(...);           // cần creativeExternal (nếu không flexible)
    return outcome(success, creativeExternal, adExternal, rawResponses);
} catch (ex) {
    return outcome(failed, ex, partialRawResponses);            // KHÔNG nuốt — pha 2 sẽ ghi log + rethrow
} finally { gate.Release(); }
```

> **Quan trọng**: `existing*` (creative/ad đã tồn tại) đọc từ `existingCreativesBySeq` / `existingAdsBySeq` đã được load **trước** loop (dòng ~175-177). Đây là dictionary read-only trong loop → an toàn để đọc song song. KHÔNG query DB mới trong pha API.

### 3.3. Vì sao tách được an toàn
- `BuildCreativePayloadAsync` / `BuildAdPayload` / `BuildFlexibleAdPayloadAsync` + upload asset (`IMetaRequestAssetService`) — kiểm tra xem chúng có chạm `_dbContext` không. **Nếu có chạm DB** (vd đọc asset từ DB), phải đưa phần đọc DB đó ra **trước** vòng song song (preload), hoặc giữ nguyên trong pha tuần tự. Xem mục 5 "Việc cần kiểm chứng".

---

## 4. Yêu cầu chi tiết triển khai

### 4.1. Tham số cấu hình
- Thêm config `MetaAds:AdCreationMaxParallelism` (int, default **4**). Đọc trong constructor như `_apiVersion`. Clamp về `[1, 8]`. Nếu `<= 1` ⇒ giữ hành vi tuần tự (fallback an toàn).
- Thêm config `MetaAds:AdCreationRateLimitMaxRetries` (default **3**) và `MetaAds:AdCreationRateLimitBaseDelayMs` (default **2000**) cho backoff.

### 4.2. Helper retry rate-limit
Viết helper `Task<CreateResult> ExecuteCreateWithRetryAsync(...)` bọc quanh `ExecuteCreateAsync`:
- Bắt lỗi rate-limit của Meta: HTTP 429, hoặc Meta error `code == 17`, `code == 32`, `code == 4`, hoặc `code == 80004` (ad-account level). (Xác minh danh sách code thực tế đang được parse ở `ExecuteCreateAsync` / chỗ parse Meta error — bám theo cấu trúc lỗi sẵn có, đừng tự bịa.)
- Backoff: delay = `baseDelay * 2^(attempt-1)` + jitter ngẫu nhiên nhỏ. Tôn trọng `CancellationToken`.
- Sau khi hết số lần retry → ném lỗi như cũ.
- **Lưu ý**: `ExecuteCreateAsync` hiện cũng ghi operation log. Khi đưa nó vào pha song song sẽ chạm DbContext (log) đồng thời → vi phạm ràng buộc. ⇒ **Phải refactor**: tách `ExecuteCreateAsync` thành 2 phần: (a) `CallMetaApiAsync` chỉ gọi `_restClient` trả về kết quả thô (song song được, KHÔNG ghi log), (b) phần ghi operation log để gọi ở **pha tuần tự**. Retry rate-limit áp dụng cho (a).

### 4.3. Giữ nguyên ghi log đầy đủ
Mọi log mà bản tuần tự hiện tạo ra (validate, create_creative, create_ad, skip flexible, reuse) **phải vẫn được tạo**, cùng `VariantSequenceNumber`, cùng `Action`, cùng status, cùng request/response JSON. Chỉ khác: thời điểm ghi log dời sang **pha tuần tự** (sau khi API trả về). `AttemptNumber` vẫn tính qua `CountAsync` ở pha tuần tự (an toàn vì tuần tự).

### 4.4. Xử lý lỗi
- Pha API dùng `Task.WhenAll`. Nếu một task ném, các task khác **vẫn đang chạy** — cần để chúng hoàn tất/huỷ gọn gàng. Dùng pattern: mỗi `RunVariantApiAsync` **không** ném ra ngoài mà **trả về** `VariantApiOutcome` chứa `Exception?` (capture lỗi). `Task.WhenAll` không vỡ giữa chừng.
- Sang pha tuần tự, duyệt theo `SequenceNumber`: với outcome thành công → ghi entity + log success; gặp outcome **đầu tiên** bị lỗi → ghi log fail cho variant đó rồi **ném lại** exception (giữ nguyên ngữ nghĩa fail-fast → `ExecuteAsync` catch → request `Failed`). Các variant đã tạo thành công ở Meta trước đó vẫn đã được persist (idempotent cho lần chạy lại — giống hành vi hiện tại khi loop tuần tự fail giữa chừng).
- KHÔNG được để lỗi của một variant làm mất log của các variant đã thành công trước nó (theo thứ tự sequence).

### 4.5. Fallback tuần tự
Nếu `maxParallelism <= 1` hoặc `variants.Count <= 1` ⇒ đi đúng nhánh code cũ (hoặc nhánh song song với gate=1 cho ra kết quả tương đương). Đảm bảo không hồi quy hành vi khi chỉ có 1 variant.

---

## 5. Việc cần KIỂM CHỨNG trước/khi code (đừng giả định)

1. **`BuildCreativePayloadAsync`, `BuildFlexibleAdPayloadAsync`, `BuildAdSetPayloadAsync` có chạm `_dbContext` hay không?**
   - Mở các method này trong cùng file. Nếu có đọc DB (asset, geo, country group qua `_geoReferenceService`/`_geoCountryGroupService`/`_requestAssetService`), xác định chúng có thread-safe không. Geo/adset payload nằm **ngoài** loop variant (chỉ build 1 lần cho ad set) nên không ảnh hưởng. Với creative/ad trong loop: nếu build payload đọc DB → **preload** dữ liệu cần thiết ra ngoài loop (vào dictionary theo sequence) rồi truyền vào pha API; hoặc nếu nhẹp, build payload ở pha tuần tự trước, chỉ song song hoá đúng lời gọi `_restClient`.
   - **Asset upload** (`IMetaRequestAssetService` cho flexible creative/ad): kiểm tra có chạm DbContext/`SaveChanges` không. Nếu có ⇒ hoặc preload, hoặc giữ upload ở pha tuần tự. Ưu tiên giải pháp đơn giản, đúng trước, nhanh sau.

2. **Cấu trúc parse Meta error** ở `ExecuteCreateAsync` (code/subcode/type) — để viết điều kiện retry đúng field, không bịa tên.

3. **`RestClient` dùng chung có an toàn cho gọi song song không?** RestSharp `RestClient` thread-safe cho các request độc lập — xác nhận version đang dùng. Nếu nghi ngờ, tạo client cục bộ hoặc dùng `HttpClient` chia sẻ.

4. **Test hiện có** cho execution service: tìm trong `backend/MediationPro.Infrastructure.UnitTests/MetaAds/` (vd có `MetaCampaignExecutionServiceTests` không). Phải giữ pass và bổ sung test mới (mục 7).

---

## 6. Phạm vi thay đổi

**Trong phạm vi:**
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`: refactor vòng variant theo mô hình trên; tách `ExecuteCreateAsync` thành call-API + ghi-log; thêm helper retry; thêm `SemaphoreSlim`; đọc config mới.
- Cấu hình mặc định (appsettings) cho 3 key mới nếu cần (để optional, có default trong code).
- Test unit cho hành vi mới.

**Ngoài phạm vi (KHÔNG đụng):**
- `EnsureCampaignAsync`, `EnsureAdSetAsync` (giữ tuần tự, không sửa logic ngoài việc có thể tái dùng helper API/log).
- Public interface `IMetaCampaignExecutionService`, DTO, controller, FE.
- Luồng sync (`MetaCampaignSyncService`) — không liên quan.
- Schema DB / migration — không cần.

---

## 7. Tiêu chí hoàn thành & kiểm thử

1. **Build**: `dotnet build` cho `MediationPro.Core`, `MediationPro.Infrastructure`, `MediationPro.Api` pass (nếu API đang chạy khoá DLL → build ra `-p:BaseOutputPath=obj\check\`).
2. **Unit test mới** (đề xuất, dùng mock `_restClient`/Meta API):
   - 2+ variant tạo mới → tất cả creative + ad được tạo, đúng số API call, đúng số operation log, log đúng `VariantSequenceNumber`, entity persist theo thứ tự sequence.
   - Variant có `existingCreative`/`existingAd` → không gọi API tạo, ghi log reuse như cũ.
   - Variant flexible → skip creative, tạo ad inline; log skip vẫn có.
   - Một variant lỗi → request `Failed`, log fail có cho variant đó, các variant thành công trước (theo sequence) vẫn được persist + log.
   - `maxParallelism = 1` → kết quả tương đương nhánh tuần tự cũ (regression guard).
   - Rate-limit: mock trả lỗi code 17 lần 1, thành công lần 2 → helper retry hoạt động, cuối cùng tạo thành công.
3. **Không hồi quy** test execution hiện có.
4. **Kiểm tra thủ công (nếu môi trường cho phép)**: tạo 1 request có nhiều variant → đo thời gian so với trước; xác nhận không có lỗi `A second operation was started on this context...` trong log; số creative/ad/log trên DB đúng.
5. **An toàn EF**: rà soát đảm bảo KHÔNG có lời gọi DbContext nào nằm trong nhánh `Task.WhenAll`/`SemaphoreSlim`.

---

## 8. Gợi ý cấu trúc code (định hướng, không bắt buộc nguyên văn)

```csharp
private sealed record VariantApiOutcome(
    int SequenceNumber,
    bool IsFlexible,
    bool ReuseCreative,
    bool ReuseAd,
    string? CreativeExternalId,
    string? AdExternalId,
    /* raw response/json để ghi log ở pha tuần tự */ string? CreativeResponseJson,
    string? AdResponseJson,
    Exception? Error);

// Pha 1
var gate = new SemaphoreSlim(maxParallelism);
var tasks = variants.Select(v => RunVariantApiAsync(v, gate, campaign, adSet, ..., ct));
var outcomes = await Task.WhenAll(tasks);

// Pha 2 (tuần tự, DbContext chính)
foreach (var o in outcomes.OrderBy(o => o.SequenceNumber))
{
    if (o.Error != null) { await PersistVariantFailureLogAsync(o, ...); throw o.Error; }
    await PersistVariantSuccessAsync(o, ...); // upsert creative/ad entity + AddOperationLogAsync(success/skip/reuse)
}
```

`RunVariantApiAsync` chỉ gọi Meta API (qua helper retry) + capture kết quả/lỗi, **tuyệt đối không** chạm `_dbContext`/repository.

---

## 9. Rủi ro & lưu ý cuối

- Lợi ích tốc độ lớn nhất khi **tạo mới nhiều creative**. Nếu phần lớn variant là reuse (`existing != null`) thì gần như không gọi API → song song hoá ít tác dụng (chấp nhận được).
- Đặt `maxParallelism` mặc định 4; có thể giảm về 2-3 nếu môi trường production hay bị Meta throttle. Đừng đặt cao (>8) vì rủi ro rate-limit và áp lực lên Meta.
- Giữ log `CorrelationId` xuyên suốt để trace.
- Nếu phát hiện build-payload/asset-upload bắt buộc chạm DB và khó preload an toàn → fallback hợp lệ: chỉ song song hoá đúng lời gọi HTTP `_restClient.ExecuteAsync` (giữ build payload + ghi log ở pha tuần tự). Vẫn đạt phần lớn lợi ích vì độ trễ chủ yếu nằm ở round-trip mạng tới Meta.
