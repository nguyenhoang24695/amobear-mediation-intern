# Task (sub-prompt): Hiển thị Target Language ở Campaign Detail (Ad set) **và** Request Detail

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend + Next.js frontend).
Tiếp nối feature "Target Language" (đã thêm `targeting.locales` khi tạo request — xem
`docs/meta-ads/39-PROMPT-ADD-TARGET-LANGUAGE-LOCALES.md`). Hiện đã lưu **`localeKeys: number[]`**
ở form và **`adSet.locales: number[]`** (mảng locale key số) ở request payload, đẩy vào
`targeting.locales` khi execute. Nhưng **hai màn hiển thị chưa show** target language:

1. **Campaign Detail** (`/meta-ads/campaigns/{id}`) — bảng Ad set, cột targeting.
2. **Request Detail** (`/meta-ads/requests/{id}`) — card "Request Payload Summary".

## Ghi chú chung về dữ liệu (đọc trước)
- `targeting.locales` (Meta) và `adSet.locales` (payload) chỉ là **mảng số nguyên** (locale key),
  vd `[6, 24]` — **KHÔNG kèm tên ngôn ngữ**.
- Vì vậy cả 2 màn hiển thị theo dạng **đếm số lượng** ("N languages"), nhất quán với style summary
  hiện có ("N countries", "Men"…). Map key→tên ("English (US)") nằm **NGOÀI phạm vi** (cần từ điển
  locale của Meta / cache resolve qua `type=adlocale`) → KHÔNG làm ở đây.

---

## Phần A — BE: Campaign Detail (Ad set targeting summary)

### Nguyên nhân (đã xác định)
- Sync **đã** lấy full targeting (gồm `locales`): `AdSetFields` trong
  `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignSyncService.cs` (dòng ~21) có
  `...,targeting,...`; targeting lưu raw vào config_json (`AdSetConfig.Targeting` là `JsonElement?`).
- Method dựng summary **bỏ qua `locales`**:
  `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs` → `SummarizeTargeting(JsonElement? targeting)`
  (dòng ~1319-1382) chỉ đọc `geo_locations`, `excluded_geo_locations`, `age_min/max`, `genders`,
  `publisher_platforms`. `TargetingSummary = SummarizeTargeting(adSetConfig?.Targeting)` (dòng ~960).
- FE chỉ render chuỗi: `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx` dòng ~360
  (`{item.targetingSummary ?? "-"}`) → chỉ cần BE thêm phần locales vào chuỗi, FE tự nhận.

### Implement (CHỈ sửa `MetaCampaignsController.cs`, trong `SummarizeTargeting`)
Thêm nhánh đọc `locales`, append vào `parts` (đặt sau nhánh `genders`):
```csharp
if (targetingValue.TryGetProperty("locales", out var locales) && locales.ValueKind == JsonValueKind.Array)
{
    var localeCount = locales
        .EnumerateArray()
        .Count(item => item.ValueKind == JsonValueKind.Number || item.ValueKind == JsonValueKind.String);
    if (localeCount > 0)
        parts.Add($"{localeCount} language{(localeCount == 1 ? "" : "s")}");
}
```
→ Chuỗi summary có thêm "2 languages" (nối " | "), hiển thị ngay ở cột targeting — KHÔNG đổi FE/DTO.

---

## Phần B — FE: Request Detail (Request Payload Summary)

### Nguyên nhân (đã xác định)
- `frontend/components/meta-ads/requests/request-detail-content.tsx`, card "Request Payload Summary"
  (dòng ~1068-1093) render các `DetailRow` từ `detail.payload.adSet.*` (Countries, Excluded Countries,
  Age Range, Gender, Placement…). **Không có** dòng cho `adSet.locales`.
- Payload đã có `detail.payload.adSet.locales: number[]` (mapper `frontend/lib/meta-ads/mappers.ts`
  dòng ~775 `localeKeys: payload.adSet.locales ?? []`, và dòng ~598 ghi `locales` khi build payload).

### Implement (CHỈ sửa `request-detail-content.tsx`)
Thêm 1 `DetailRow` "Languages" ngay **sau** dòng "Excluded Countries" (dòng ~1075), trước "Age Range":
```tsx
{detail.payload.adSet.locales && detail.payload.adSet.locales.length > 0 && (
  <DetailRow
    label="Languages"
    value={`${detail.payload.adSet.locales.length} language${detail.payload.adSet.locales.length === 1 ? "" : "s"}`}
  />
)}
```
- Nếu `adSet.locales` **chưa** có trong type payload (gây lỗi typecheck) → thêm `locales?: number[]`
  vào type ad set payload tương ứng (cùng chỗ khai báo `countries`, `genders` của payload detail).
  (Mapper đã dùng `payload.adSet.locales` nên nhiều khả năng type đã có; chỉ thêm nếu thiếu.)
- KHÔNG render khi rỗng (giữ card gọn, giống "Excluded Countries").

---

## KHÔNG làm
- KHÔNG map key→tên ngôn ngữ (out of scope, cần từ điển locale).
- KHÔNG đổi sync, DTO BE campaign (ngoài method `SummarizeTargeting`), hay các nhánh targeting khác.
- KHÔNG đụng màn tạo/sửa request (đã xong ở prompt 39).

## Verify
1. BE build:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   (API đang chạy khóa DLL → `-p:BaseOutputPath=obj\check\`. `TreatWarningsAsErrors=false`.)
2. BE test (giữ xanh; nên thêm 1 unit test cho `SummarizeTargeting`: targeting `{ "locales": [6, 24] }`
   → summary chứa "2 languages"):
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
3. FE:
   ```bash
   cd frontend && pnpm typecheck && pnpm lint
   ```
4. E2E:
   - Tạo/sync 1 campaign có chọn ≥1 target language → `/meta-ads/campaigns/{id}` → bảng Ad set, cột
     targeting hiển thị "… | N languages"; campaign không set language → không có phần đó.
   - Mở request tương ứng `/meta-ads/requests/{id}` → card "Request Payload Summary" có dòng
     "Languages: N languages"; request không set language → không hiện dòng đó.

## Phạm vi & ràng buộc
- BE: `backend/MediationPro.Api/Controllers/MetaCampaignsController.cs` (method `SummarizeTargeting`).
- FE: `frontend/components/meta-ads/requests/request-detail-content.tsx` (+ type payload nếu thiếu `locales`).
- Convention: C# PascalCase public/`_camelCase` private, JSON key snake_case (`locales`); TS/React camelCase.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test BE xanh; `pnpm typecheck`+`pnpm lint` xanh; **Campaign Detail** (Ad set, cột targeting)
và **Request Detail** (card payload summary) đều hiển thị số ngôn ngữ đã nhắm ("N languages") khi
có `locales`; không set thì không hiện.
