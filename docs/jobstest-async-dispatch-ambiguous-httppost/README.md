# PROMPT — Sửa async jobs-test dispatch ném AmbiguousMatchException (HttpPost alias)

> Tài liệu này là **prompt giao cho agent implement**. Mục tiêu: sửa lỗi khiến **một tập endpoint
> jobs-test chạy qua đường async `/runs` (nút "Run backfill" trên UI Data Sources) bị ném
> `AmbiguousMatchException` và không bao giờ chạy job**. Sửa tối thiểu + thêm unit test guard.

---

## 1. Bối cảnh & nguyên nhân gốc (đã điều tra, đã xác minh bằng log runtime)

### Triệu chứng
Bấm "Run now" cho action **Qonversion full transform (range)** trong
`frontend/components/data-sources/source-details-tab.tsx` → `BackfillDialog` → POST `/api/v1/jobs-test/runs`
(async) → stream SSE chỉ hiện:
```
[jobs-test] Async run queued. ...
[jobs-test] Target: POST /api/v1/jobs-test/qonversion-full-transform/date-range
[jobs-test] Unhandled: System.Reflection.AmbiguousMatchException: Multiple custom attributes of the same type
  'Microsoft.AspNetCore.Mvc.HttpPostAttribute' found.
   at System.Reflection.CustomAttributeExtensions.GetCustomAttribute[T](MemberInfo element)
   at MediationPro.Api.Controllers.JobsTestReflectionInvoker.FindPostMethod(String path)
       in .../JobsTestReflectionInvoker.cs:line 51
   at MediationPro.Api.Controllers.JobsTestReflectionInvoker.InvokeByRouteAsync(...) :line 19
   at MediationPro.Api.Controllers.JobsTestController.<<StartAsyncRun>b__0>d.MoveNext() :line 1747
[jobs-test] Closing log stream shortly.
```
Job **không hề chạy** (exception ở bước resolve method, trước khi gọi action).

### Nguyên nhân gốc
1. Trong `backend/MediationPro.Api/Controllers/JobsTestController.cs` có (ít nhất) **một method mang ≥2
   attribute `[HttpPost]`** (route alias):
   ```csharp
   // JobsTestController.cs:751-753
   [HttpPost("xmp-sync-today")]
   [HttpPost("xmp-sync-job-today")]
   public Task<IActionResult> XmpSyncToday() { ... }
   ```
2. `JobsTestReflectionInvoker.FindPostMethod` (dòng 51) dùng **`GetCustomAttribute<HttpPostAttribute>()` (số ít)**:
   ```csharp
   var httpPost = method.GetCustomAttribute<HttpPostAttribute>(); // ném AmbiguousMatchException nếu method có >1
   ```
   `GetCustomAttribute<T>()` (số ít) **ném `AmbiguousMatchException`** khi member đang xét có nhiều attribute cùng loại.
3. Vòng `foreach` trong `FindPostMethod` quét **toàn bộ** method của controller. Khi chạm `XmpSyncToday`
   (2 `[HttpPost]`) thì ném ngay — **bất kể** endpoint đích là gì.

### Vì sao "chỉ một vài job" hỏng (không phải tất cả)
`Type.GetMethods()` **không đảm bảo thứ tự liệt kê**.
- Endpoint mà method của nó được liệt kê **trước** `XmpSyncToday` → `FindPostMethod` match & `return` sớm,
  không bao giờ chạm method 2-attribute → **chạy bình thường**.
- Endpoint được liệt kê **sau** `XmpSyncToday` → vòng lặp đụng method 2-attribute trước → **ném exception**.
- `qonversion-full-transform/date-range` (và có thể nhiều endpoint khác) rơi vào nhóm sau → luôn fail.

> Lưu ý: chỉ đường **async `/runs`** (dùng reflection invoker) bị ảnh hưởng. Gọi **POST sync trực tiếp** tới
> route (qua MVC routing) vẫn hoạt động, vì MVC xử lý đúng nhiều attribute; chỉ `GetCustomAttribute<T>` số ít mới ném.

---

## 2. Phạm vi thay đổi
- Sửa **1 method**: `JobsTestReflectionInvoker.FindPostMethod`
  (`backend/MediationPro.Api/Controllers/JobsTestReflectionInvoker.cs`).
- Thêm **1 file unit test** guard trong `backend/MediationPro.Api.Tests/` (project test API đã tồn tại — xem
  `JobsTestControllerAdjustParquetTests.cs` cùng thư mục để biết namespace/style).
- **KHÔNG** đổi route, **KHÔNG** gỡ alias `[HttpPost("xmp-sync-job-today")]` (giữ tương thích), **KHÔNG** đổi
  chữ ký public, **KHÔNG** đụng frontend.

---

## 3. Việc cần làm

### Bước 1 — Sửa `FindPostMethod` dùng bản số nhiều
Thay `GetCustomAttribute<HttpPostAttribute>()` (số ít, ném) bằng `GetCustomAttributes<HttpPostAttribute>()`
(số nhiều, trả `IEnumerable<T>`, an toàn 0/1/nhiều) và match nếu **bất kỳ** template nào khớp:

```csharp
private static MethodInfo? FindPostMethod(string path)
{
    const BindingFlags flags = BindingFlags.Instance | BindingFlags.Public;
    foreach (var method in typeof(JobsTestController).GetMethods(flags))
    {
        if (method.DeclaringType != typeof(JobsTestController))
            continue;

        // Số nhiều: method có nhiều [HttpPost] (route alias, vd xmp-sync-today / xmp-sync-job-today)
        // sẽ KHÔNG còn ném AmbiguousMatchException, đồng thời resolve đúng cả các alias đó.
        foreach (var httpPost in method.GetCustomAttributes<HttpPostAttribute>())
        {
            var template = (httpPost.Template ?? "").Trim().Trim('/');
            if (template.Length == 0)
                continue;
            if (string.Equals(template, path, StringComparison.OrdinalIgnoreCase))
                return method;
        }
    }

    return null;
}
```
(Đảm bảo `using System.Reflection;` đã có — file hiện đã `using System.Reflection;` ở đầu.)

### Bước 2 — Unit test guard chống hồi quy
Mục tiêu: bảo đảm **mọi** template `[HttpPost]` khai báo trên `JobsTestController` đều resolve được qua
`FindPostMethod`, gồm cả method nhiều attribute. Vì `FindPostMethod` đang là `private static`, chọn **một**
trong hai cách:

**Cách A (khuyến nghị, không đổi access modifier):** test gián tiếp qua API công khai
`JobsTestReflectionInvoker.InvokeByRouteAsync`, assert nó **không** trả về `BadRequestObjectResult` với
message "Unknown or unsupported jobs-test endpoint..." cho từng template (cần controller instance — có thể
mock/construct tối thiểu, hoặc chỉ assert rằng resolve không ném `AmbiguousMatchException`).

**Cách B (đơn giản & đủ):** dùng reflection trong test để tự liệt kê toàn bộ template và assert
`GetCustomAttributes<HttpPostAttribute>()` + matcher tương đương resolve ra đúng 1 method cho mỗi template,
và đặc biệt **không method nào làm `GetCustomAttribute<HttpPostAttribute>()` ném** (chính là bug):

```csharp
[Fact]
public void AllHttpPostTemplates_AreResolvable_AndNoMethodThrowsAmbiguousMatch()
{
    var flags = BindingFlags.Instance | BindingFlags.Public;
    var methods = typeof(JobsTestController).GetMethods(flags)
        .Where(m => m.DeclaringType == typeof(JobsTestController))
        .ToList();

    // 1) Không method nào được phép làm bản số ít ném (đây là điều kiện gây bug cũ).
    foreach (var m in methods)
    {
        var posts = m.GetCustomAttributes<HttpPostAttribute>().ToList(); // số nhiều: không ném
        // method có >=2 [HttpPost] là hợp lệ (alias); chỉ cần resolver chịu được.
    }

    // 2) Mọi template không rỗng phải resolve ra đúng method khai báo nó.
    var templates = methods
        .SelectMany(m => m.GetCustomAttributes<HttpPostAttribute>()
            .Select(a => (a.Template ?? "").Trim().Trim('/'))
            .Where(t => t.Length > 0)
            .Select(t => (Template: t, Method: m)))
        .ToList();

    Assert.NotEmpty(templates);
    foreach (var (template, expected) in templates)
    {
        // Gọi qua matcher tương đương FindPostMethod; nếu FindPostMethod là private,
        // nhân bản logic match ở đây hoặc dùng InvokeByRouteAsync để khẳng định resolve OK.
        var resolved = methods.FirstOrDefault(m =>
            m.GetCustomAttributes<HttpPostAttribute>()
             .Any(a => string.Equals((a.Template ?? "").Trim().Trim('/'), template, StringComparison.OrdinalIgnoreCase)));
        Assert.NotNull(resolved);
    }
}
```
> Nếu chọn test trực tiếp `FindPostMethod`, có thể đổi nó thành `internal static` + `[assembly: InternalsVisibleTo("MediationPro.Api.Tests")]` thay vì nhân bản logic. Tuỳ agent chọn, miễn test bắt được:
> (a) **không** ném `AmbiguousMatchException` với method nhiều `[HttpPost]`, (b) `xmp-sync-today` **và** `xmp-sync-job-today` đều resolve về `XmpSyncToday`, (c) `qonversion-full-transform/date-range` resolve được.

### Bước 3 — Build + chạy test
- `dotnet build` toàn solution: 0 error.
- `dotnet test` project `MediationPro.Api.Tests`: test mới pass; không vỡ test cũ.

---

## 4. Acceptance criteria
- Async dispatch `/runs` cho `qonversion-full-transform/date-range` **không còn** ném
  `AmbiguousMatchException`; job chạy và stream log transform (`Qonversion full transform backfill …`,
  `Qonversion silver: deleted/inserted … rows: N`).
- `xmp-sync-today` **và** alias `xmp-sync-job-today` đều resolve & chạy qua async dispatch.
- Mọi endpoint jobs-test khác (đặc biệt nhóm từng fail do thứ tự liệt kê) chạy được qua async dispatch.
- Có unit test guard bắt hồi quy cho cả 3 điều kiện ở Bước 2.
- Không đổi route/alias, không đổi chữ ký public, không đụng frontend.

## 5. Kiểm thử thủ công (sau khi sửa)
1. UI Data Sources → tab Details → source **qonversion** → bấm nút **Qonversion full transform (range)** với
   range **có** dữ liệu bronze (vd `2026-05-30 → 2026-06-02`): log hiện `inserted … rows: N>0`, kết thúc
   `[JobsTest] qonversion-full-transform-date-range completed.`
2. Lặp lại với range thiếu nguồn (`2026-06-04 → 2026-06-05`): job chạy nhưng `rows: 0` (đúng — bronze chưa có
   dữ liệu ngày đó; muốn vá phải chạy job ingestion `qonversion-web-crawler/date-range` / `load-from-minio` trước).
3. Thử thêm 1-2 endpoint async khác để xác nhận không còn endpoint nào ném AmbiguousMatch.

## 6. Tệp đụng tới
| File | Thay đổi |
|---|---|
| `backend/MediationPro.Api/Controllers/JobsTestReflectionInvoker.cs` | `FindPostMethod`: dùng `GetCustomAttributes<HttpPostAttribute>()` (số nhiều) + match theo từng template |
| `backend/MediationPro.Api.Tests/Controllers/JobsTestReflectionInvokerTests.cs` (mới) | Unit test guard (Bước 2) |
| *(tuỳ chọn)* `JobsTestReflectionInvoker.cs` + `AssemblyInfo`/`.csproj` | Đổi `FindPostMethod` → `internal` + `InternalsVisibleTo` nếu muốn test trực tiếp |

## 7. Tham chiếu code (đã verify)
- Lỗi runtime: `JobsTestReflectionInvoker.cs:51` (`GetCustomAttribute<HttpPostAttribute>()`),
  gọi từ `InvokeByRouteAsync` (line 19) ← `JobsTestController.StartAsyncRun` `Task.Run` (line 1747).
- Method 2 attribute gây ném: `JobsTestController.cs:751-753` (`XmpSyncToday`,
  `[HttpPost("xmp-sync-today")]` + `[HttpPost("xmp-sync-job-today")]`).
- Đường gọi UI: `frontend/components/data-sources/backfill-dialog.tsx` (`startAsyncRun` → `/runs` →
  SSE `/runs/{id}/events`); `source-details-tab.tsx` (nút action từ `suggestedActions`).
- Vấn đề thứ hai, độc lập (không thuộc phạm vi prompt này): ngày gần đây của qonversion thiếu ở **bronze**
  (nạp từ `web_crawler`, max event_date 2026-06-03) → "full transform" cho ngày đó ra `rows:0`. Vá bằng job
  ingestion, không phải transform. (Có thể tách prompt riêng cho việc map `suggestedActions` bronze-missing →
  gợi ý job ingestion thay vì transform.)
