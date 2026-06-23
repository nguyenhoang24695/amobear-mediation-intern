# Hiển thị `error_user_title` / `error_user_msg` của Meta cho người dùng (thay vì "Invalid parameter")

> **Vai trò agent thực hiện:** implement trực tiếp theo tài liệu này (full-stack: DB → backend → frontend).

## 1. Vấn đề

Khi tạo/execute Meta campaign request bị Meta từ chối, UI hiển thị thông báo lỗi chung chung **"Invalid parameter"** ở:
- Banner đỏ đầu trang: *"Request execution failed / Invalid parameter"*.
- Card *"Latest Meta Error"* → field **Summary** = "Invalid parameter".

Meta trả về thông điệp thân thiện hơn nhiều trong cùng response nhưng app **đang vứt đi**:

```json
"error": {
  "message": "Invalid parameter",
  "code": 100,
  "error_subcode": 1870249,
  "error_user_title": "Selected targeting options unavailable for young people",
  "error_user_msg": "Your audience contains targeting options that can no longer be used to target ads to people under 18 globally or 20 in Thailand. Increase the minimum age of your audience or remove all targeting options apart from location and age.",
  "fbtrace_id": "A-tFWz7KrtYXnL4lRUf0RD5"
}
```

**Mục tiêu:** Hiển thị `error_user_title` + `error_user_msg` nổi bật ở đầu request (banner + card "Latest Meta Error").

## 2. Nguyên nhân (đã điều tra, có bằng chứng)

`error_user_title`/`error_user_msg` **đã được parse** nhưng không được lưu/hiển thị:

- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`:
  - `ParseMetaError` (dòng 1197) đọc cả `error_user_title` + `error_user_msg` vào record `MetaApiErrorDetails(Message, Code, Subcode, Type, TraceId, UserTitle, UserMessage)` (định nghĩa ở dòng **2508**; parse ở 1214-1215).
  - **Nhưng** `BuildMetaFailureMessage` (dòng **1238**) chỉ trả `metaError.Message` ("Invalid parameter") — bỏ qua `UserTitle`/`UserMessage` (chỉ dùng chúng cho heuristic value-optimization ở dòng 1278, 1291).
  - `AddOperationLogAsync` (signature ~dòng 815-828) nhận `summaryMessage` + `metaErrorCode/Subcode/Type/TraceId` nhưng **không có** tham số cho user title/msg; ghi log tại 835-851.
  - `request.FailureSummary` (banner) được set từ `ex.Message` (dòng 219), mà message này = output của `BuildMetaFailureMessage`. → cải thiện `BuildMetaFailureMessage` sẽ tự động cải thiện banner.
- DB: bảng `meta_operation_logs` **không có cột** cho user title/msg (xem migration `20260331102000_AddMetaOperationLogDebugFields.cs`: chỉ có `meta_error_code/subcode/type`, `meta_trace_id`, `resource_path`, `summary_message`).
- Entity `backend/MediationPro.Core/Entities/MetaOperationLog.cs` và DTO `MetaOperationLogDto` (`backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs:245`) đều **thiếu** field user title/msg.
- Mapper `MetaAdsMapper.ToDto` (entity→DTO) tại `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs:245-266`.
- FE `frontend/components/meta-ads/requests/request-detail-content.tsx`:
  - Banner: dòng **721-722** dùng `detail.failureSummary`.
  - Card "Latest Meta Error": dòng **728-757**; Summary tại **752** = `latestFailedLog.summaryMessage ?? errorMessage ?? detail.failureSummary`.
  - `buildOperationErrorSummary` (dòng 461) gộp summary cho phần log chi tiết.
- FE type `MetaOperationLogDto`: `frontend/types/meta-ads.ts:896` (lưu ý còn **một** interface tương tự ở ~dòng 519 — kiểm tra interface nào đang dùng cho `latestFailedLog`; chỉ sửa interface đúng, thường là cái ở 896).

## 3. Giải pháp (structured — chốt)

Lưu `error_user_title`/`error_user_msg` thành **2 trường riêng** xuyên suốt DB → DTO → FE, và hiển thị tách bạch (title in đậm, msg mô tả). Đồng thời cải thiện `BuildMetaFailureMessage` để `FailureSummary`/banner cũng có nội dung hữu ích ngay cả khi FE chưa đọc trường mới.

### 3.1. Database (migration mới)

Thêm 2 cột vào `meta_operation_logs`:
- `meta_error_user_title` `character varying(255)` NULL.
- `meta_error_user_msg` `text` NULL.

Tạo migration theo style hiện có (xem `20260331102000_AddMetaOperationLogDebugFields.cs`: `AddColumn` trong `Up`, `DropColumn` trong `Down`). Cập nhật `ApplicationDbContextModelSnapshot` (EF tự sinh khi `dotnet ef migrations add`). **Không** sửa snapshot bằng tay.

### 3.2. Entity + DbContext

- `MetaOperationLog.cs`: thêm `public string? MetaErrorUserTitle { get; set; }` và `public string? MetaErrorUserMsg { get; set; }`.
- `ApplicationDbContext.cs`: trong cấu hình entity `MetaOperationLog` (tìm khối map `summary_message`/`meta_error_code`), thêm map cho 2 cột mới (`HasColumnName("meta_error_user_title")` `HasMaxLength(255)`; `meta_error_user_msg` kiểu text/không giới hạn).

### 3.3. DTO + Mapper

- `MetaCampaignRequestDtos.cs` → `MetaOperationLogDto`: thêm `public string? MetaErrorUserTitle { get; set; }`, `public string? MetaErrorUserMsg { get; set; }`.
- `MetaAdsMapper.ToDto` (245): map 2 trường mới từ entity.

### 3.4. Execution service — thread user title/msg vào log

Trong `MetaCampaignExecutionService.cs`:
- Mở rộng signature `AddOperationLogAsync` thêm 2 tham số optional: `string? metaErrorUserTitle = null, string? metaErrorUserMsg = null` (đặt cạnh `summaryMessage`), gán vào `new MetaOperationLog { ... MetaErrorUserTitle = metaErrorUserTitle, MetaErrorUserMsg = metaErrorUserMsg }`.
- Tại **mọi** call-site `AddOperationLogAsync` đang truyền `metaErrorCode: metaError?.Code` … (các nhánh lỗi tạo/validate — quanh dòng 356-360, 1983, 2087, và các chỗ tương tự), truyền thêm `metaErrorUserTitle: metaError?.UserTitle, metaErrorUserMsg: metaError?.UserMessage`.
- Cải thiện `BuildMetaFailureMessage` (1238): khi có `metaError?.UserMessage`/`UserTitle`, ưu tiên trả chuỗi thân thiện. Đề xuất thứ tự:
  1. Giữ nguyên 2 nhánh value-optimization hiện có (1240-1243).
  2. Nếu có `UserTitle` và/hoặc `UserMessage`: trả `UserTitle` + (": " + `UserMessage` nếu có); nếu chỉ có 1 thì trả cái đó.
  3. Fallback về `metaError.Message` như cũ.
  > Mục đích: `request.FailureSummary` (banner) và `summaryMessage` của log trở nên có nghĩa thay vì "Invalid parameter", kể cả với log cũ.

### 3.5. Frontend — hiển thị

`frontend/types/meta-ads.ts` → `MetaOperationLogDto` (896): thêm
```ts
metaErrorUserTitle?: string | null
metaErrorUserMsg?: string | null
```
(và interface tương tự ở ~519 nếu nó cũng là log dùng cho card này).

`frontend/components/meta-ads/requests/request-detail-content.tsx`:
- **Banner (721-722):** đổi để ưu tiên nội dung user-facing:
  - Tiêu đề đậm: `latestFailedLog?.metaErrorUserTitle ?? "Request execution failed"`.
  - Dòng mô tả: `latestFailedLog?.metaErrorUserMsg ?? detail.failureSummary ?? "Execution failed. Check operation logs for more details."`.
- **Card "Latest Meta Error" (728-757):** thêm phía trên field Summary:
  - Nếu có `metaErrorUserTitle`: render 1 dòng tiêu đề đậm (vd `<p className="text-sm font-semibold text-red-800">{latestFailedLog.metaErrorUserTitle}</p>`).
  - Nếu có `metaErrorUserMsg`: render `<ValueBlock label="What happened" value={latestFailedLog.metaErrorUserMsg} preserveWhitespace />`.
  - Giữ nguyên field Summary (kỹ thuật) bên dưới để debug.
- (Tùy chọn) `buildOperationErrorSummary` (461): chèn thêm `log.metaErrorUserTitle`/`metaErrorUserMsg` vào phần Error Summary chi tiết.

## 4. KHÔNG được làm

- Không đổi luồng gọi Meta / không nuốt `message` kỹ thuật (vẫn giữ trong `summaryMessage` để debug).
- Không hiển thị `request_json`/token; giữ nguyên sanitize hiện có.
- Không sửa `ApplicationDbContextModelSnapshot` thủ công.

## 5. Acceptance criteria

1. Request fail với lỗi có `error_user_title`/`error_user_msg` (vd subcode 1870249): banner hiển thị **title** ("Selected targeting options unavailable for young people") + **msg** đầy đủ; card "Latest Meta Error" hiển thị title đậm + msg, vẫn còn badge `Meta 100/1870249` và Resource Path.
2. Lỗi **không** có user_msg (chỉ `message`): UI fallback về `message`/`failureSummary` như cũ — không vỡ.
3. Log cũ (trước migration, cột mới NULL): không lỗi; FE fallback.
4. `dotnet ef migrations add` chạy được, `Up`/`Down` đối xứng; `dotnet build` toàn solution 0 error; FE `tsc`/build pass.
5. Không có rò rỉ token trong các trường mới.

## 6. Test đề xuất

- Unit test `BuildMetaFailureMessage` (có thể cần đổi thành internal + `InternalsVisibleTo`, hoặc test gián tiếp): input error JSON có `error_user_title`+`error_user_msg` → message trả về chứa cả title lẫn msg; input chỉ có `message` → trả `message`.
- Unit test `ParseMetaError` map đúng `UserTitle`/`UserMessage` (nếu chưa có).
- Mapper test: `MetaOperationLog` → `MetaOperationLogDto` mang theo 2 trường mới.

## 7. File liên quan (tóm tắt)

| File | Hành động |
|---|---|
| Migration mới `..._AddMetaOperationLogUserError.cs` | Thêm 2 cột `meta_error_user_title`, `meta_error_user_msg` |
| `backend/MediationPro.Core/Entities/MetaOperationLog.cs` | + 2 property |
| `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs` | + map 2 cột |
| `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs` (`MetaOperationLogDto`) | + 2 property |
| `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdsMapper.cs` (`ToDto` ~245) | + map 2 trường |
| `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs` | `AddOperationLogAsync` +2 param & ghi log; mọi call-site lỗi truyền `metaError?.UserTitle/UserMessage`; cải thiện `BuildMetaFailureMessage` |
| `frontend/types/meta-ads.ts` (`MetaOperationLogDto` ~896) | + 2 field |
| `frontend/components/meta-ads/requests/request-detail-content.tsx` | Banner (721-722) + card "Latest Meta Error" (728-757) |

## 8. Ghi chú

- Cùng pattern có thể áp cho **TikTok** (`TikTokOperationLog`, `tiktok-request-content.tsx`) nếu sau này muốn — **ngoài phạm vi** lần này, chỉ flag.
- Lỗi mẫu để test (subcode 1870249) liên quan policy độ tuổi: audience có Thái Lan (`TH`) + `age_min < 20` + targeting chi tiết. Đây là input hợp lệ về schema nên chỉ Meta mới báo — đúng case cần hiển thị user_msg.
