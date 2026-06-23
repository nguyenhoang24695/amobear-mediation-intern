# Task: Lưu & áp dụng "Settings Template" cho Meta Campaign Request

## Ngôn ngữ
Trả lời bằng **tiếng Việt** (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — .NET 8 backend (Clean Architecture) + Next.js 16 frontend.
Màn tạo/sửa request Meta:
- Page: `frontend/app/meta-ads/requests/create/page.tsx` và `.../requests/[id]/edit/page.tsx`
- Component chính: `frontend/components/meta-ads/create-request/create-request-content.tsx`
- State form phẳng: `MetaRequestFormState` trong `frontend/types/meta-ads.ts:1334`

Toàn bộ cấu hình của 1 request được giữ trong **một object phẳng** `MetaRequestFormState`. Có sẵn cặp mapper
`formStateToCreateDto` / `detailDtoToFormState` trong `frontend/lib/meta-ads/mappers.ts`, và hàm
`sanitizeRequestFormState` + `createDefaultFormState` trong `create-request-content.tsx` (dòng ~88 và ~214).

### Mong muốn (nghiệp vụ user yêu cầu)
1. Có option **chọn template ở ngay đầu trang** tạo request (phía trên section Account/App).
2. **Tất cả thông tin thiết đặt (ngoại trừ media asset)** đều có thể lưu trong template.
3. Một request đã **validate thành công** sẽ hiện nút **"Save as Template"** → nhập tên → lưu.
4. Bấm chọn template chỉ hiển thị **template do chính người dùng đó tạo** (phân quyền danh sách theo người tạo).
5. Mỗi template trong danh sách phải **hiển thị được tóm tắt cấu hình đã lưu**.

---

## Quyết định phạm vi đã CHỐT với user (không tự đổi)

### Field LƯU vào template
- **Campaign Settings:** `objective`, `budgetStrategy`, `buyingType`, `campaignObjective`, `specialAdCategories`,
  `bidStrategy`, `isAdSetBudgetSharingEnabled`, `isSkadnetworkAttribution`, `campaignDailyBudget`, `campaignLifetimeBudget`
- **AdSet Audience:** `geoMode`, `countries`, `excludedCountries`, `regionKeys`, `countryGroupIds`, `cityTargets`,
  `localeKeys`, `ageMin`, `ageMax`, `gender`, `userOs`, `placementMode`, `publisherPlatforms`, `facebookPositions`,
  `instagramPositions`, `advantageAudience`
- **AdSet Budget/Optimization:** `adSetDailyBudget`, `adSetLifetimeBudget`, `billingEvent`, `optimizationGoal`,
  `performanceGoalType`, `performanceGoalEventName`, `performanceGoalValueType`, `bidAmount`, `roasAverageFloor`
- **Creative (copy + cấu trúc, KHÔNG gồm asset):** `creativeType`; toàn bộ ad copy phẳng của SINGLE_MEDIA
  (`singleImagePrimaryText`/`singleImagePrimaryTexts`/`singleImageHeadline`/`singleImageHeadlines`/
  `singleImageDescription`/`singleImageCallToAction`/`singleImageLinkUrl` và bộ `singleVideo*` tương ứng — **trừ**
  `singleImageImage`/`singleVideoVideo`/`singleVideoThumbnail`); copy chung của carousel/flexible/playable
  (`carouselPrimaryText`, `carouselCallToAction`, `flexiblePrimaryTexts`, `flexibleHeadlines`, `flexibleCallToAction`,
  `flexibleLinkUrl`, `playablePrimaryText`, `playablePrimaryTexts`, `playableHeadline`, `playableHeadlines`,
  `playableCallToAction`, `playableLinkUrl`); 7 cờ `advantageCreative*`; `trackingSpecs`.

### Field KHÔNG lưu (và cách xử lý khi apply)
- **Media asset selections:** `singleImageImage`, `singleVideoVideo`, `singleVideoThumbnail`,
  `carouselCards[].image`, `flexibleAssets[].(image|video|thumbnail)`, `playableSource`, `playableLeadInVideo`,
  `playableThumbnail`, `existingPostId`, `mediaType` (suy ra từ asset). → Khi apply: **giữ nguyên** asset đang có
  trên form, không đụng tới.
- **`carouselCards` / `flexibleAssets` (array):** vì asset và copy theo từng card/asset đan xen → **chỉ lưu copy chung
  + `creativeType`**, KHÔNG lưu nội dung từng phần tử mảng. Khi apply: reset mảng về default rỗng
  (`createEmptyCarouselCard` x2 / `createEmptyFlexibleAsset` x1). Copy phẳng đầy đủ chỉ áp cho SINGLE_MEDIA.
- **`additionalVariants`:** KHÔNG lưu ở phase này. Template chỉ áp cho variant chính (#1).
- **Account binding** (`executionIntegrationId`, `adAccountId`, `appRowId`, `paidMediaAppBindingId`):
  → **best-effort**: khi apply, nếu các binding này còn hợp lệ trong reference data hiện tại (account active +
  user có quyền) thì set; nếu không thì **bỏ qua binding**, chỉ áp các field cấu hình. KHÔNG để apply làm hỏng form.
- **`startTime`:** không dùng giá trị lưu — khi apply reset về `formatDateTimeLocal(new Date())` (now).
- **`endTime`:** không lưu.
- **`facebookPageId` / `instagramActorId`:** KHÔNG lưu ở phase này.
- **Field tên định danh:** `campaignName`, `adSetName`, `creativeName`, `adName` → KHÔNG lưu (mỗi campaign có tên
  riêng; lưu sẽ khiến mọi campaign từ template trùng tên).

> **Lưu ý quan trọng:** sau khi merge template vào form **phải** đi qua `sanitizeRequestFormState` (giống `updateForm`
> đang làm) để các giá trị không hợp lệ với account/app hiện tại được tự sửa. Khuyến nghị hiện toast nhắc user
> **validate lại** sau khi apply (ràng buộc account-level như SKAN, performance goal theo app có thể khác).

---

## Hiện trạng đã xác minh (đọc trước khi code)

### Backend
- **Entity mẫu để mirror:** `backend/MediationPro.Core/Entities/MetaCampaignRequest.cs`
  (có `OrganizationId`, `RequestedBy` (Guid), `PayloadJson` (string), `CreatedAt/UpdatedAt`).
- **DbContext** `backend/MediationPro.Infrastructure/Data/ApplicationDbContext.cs`:
  - `DbSet<MetaCampaignRequest>` tại dòng ~111.
  - Block `modelBuilder.Entity<MetaCampaignRequest>(...)` config bảng `meta_campaign_requests` tại dòng ~2150
    (mẫu: `PayloadJson` → `HasColumnType("jsonb")`, `OrganizationId`/`RequestedBy` → `uuid`).
- **Controller mẫu** `backend/MediationPro.Api/Controllers/MetaCampaignRequestsController.cs`:
  - `[Route("api/v1/meta-campaign-requests")]`, `[Authorize]`. Screen const `s-meta-requests`,
    functions `view`/`create` (dòng ~23-28).
  - Pattern lấy context: `TryGetContext(out var userId, out var organizationId)` + check
    `_permissionService.HasScreenFunctionAsync(userId, ScreenMetaRequests, Fn...)`.
  - Pattern serialize: `JsonSerializer.Serialize(payload, MetaValueNormalizer.JsonOptions)`.
  - Activity log: `ActivityLogEventTypes` (`backend/MediationPro.Core/Constants/ActivityLogEventTypes.cs`).
- **Service duplicate (tham khảo, KHÔNG tái dùng trực tiếp):**
  `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignDuplicateRequestService.cs`.
  Đây là **clone server-side toàn bộ request** (gồm cả creative) → KHÁC bản chất với template (merge một phần vào
  form đang mở). Chỉ tham khảo pattern serialize/scope, không gọi lại.
- **DI registration:** `backend/MediationPro.Api/Program.cs` (mẫu duplicate ở dòng ~554:
  `AddScoped<IMetaCampaignDuplicateRequestService, ...>()`).
- **EF migration:** theo CLAUDE.md — `dotnet ef migrations add <Name> --project ..\MediationPro.Infrastructure
  --startup-project .` (chạy trong `backend/MediationPro.Api`). **Commit cả `*.cs` lẫn `*.Designer.cs`.**

### Frontend
- **Types:** `frontend/types/meta-ads.ts` — `MetaRequestFormState` (dòng 1334). Thêm type mới
  `MetaRequestTemplateDto { id, name, settingsJson | settings, createdAt }` (mirror DTO BE).
- **API client:** `frontend/lib/api/meta-ads.ts` — object `metaRequestsApi` dùng `apiClient` + `REQUESTS_PREFIX`.
  Thêm nhóm endpoint template (list/create/delete). Tham khảo `metaRequestsApi.duplicate` (dòng ~93).
- **Mappers:** `frontend/lib/meta-ads/mappers.ts` — đặt **một nguồn whitelist duy nhất** ở đây:
  - `pickTemplateableFields(form: MetaRequestFormState): Partial<MetaRequestFormState>` — strip lấy đúng các field
    LƯU ở trên (đây là nguồn chân lý, đừng rải rác whitelist nhiều nơi).
  - `applyTemplateToForm(form, templateSettings, opts: { adAccountStillValid: boolean }): MetaRequestFormState` —
    merge template vào form: bỏ qua binding nếu `!adAccountStillValid`, reset `startTime` về now, reset
    `carouselCards`/`flexibleAssets` về default, **không đụng** field asset. Caller bọc kết quả qua
    `sanitizeRequestFormState`.
- **UI host:** `frontend/components/meta-ads/create-request/create-request-content.tsx`:
  - State validate có sẵn: `validating`, `validationErrors`, `handleValidate` (dòng ~1191). Thêm state
    `lastValidationPassed`: set `true` khi `result.isValid` trong `handleValidate`, set `false` trong `updateForm`
    (dòng ~801) mỗi lần form đổi.
  - Header có cụm nút (Discard/Save Draft/Validate/Submit) tại dòng ~1283. Thêm nút **"Save as Template"** ở đây,
    `disabled={!lastValidationPassed}`.
  - Section đầu là Account/App (dòng ~1323). Đặt **selector "Apply template"** ngay phía trên section này.
- **Tóm tắt cấu hình template:** tái dùng `RequestSummaryRail`
  (`frontend/components/meta-ads/create-request/summary-rail.tsx`) ở chế độ read-only để render preview cấu hình
  của template trong dropdown/popover (khỏi viết lại logic tóm tắt). Nếu cần, dựng form-state đầy đủ từ template
  bằng `{ ...createDefaultFormState(), ...templateSettings }` rồi truyền vào.

---

## Các bước implement đề xuất

### Backend
1. **Entity** `MetaCampaignRequestTemplate` (Core/Entities): `Id (long)`, `OrganizationId (Guid)`,
   `OwnerUserId (Guid)`, `Name (string)`, `SettingsJson (string, jsonb)`, `CreatedAt`, `UpdatedAt`.
2. **DbContext:** thêm `DbSet`, config bảng `meta_campaign_request_templates` (mirror block dòng ~2150),
   **unique index** `(OrganizationId, OwnerUserId, Name)` để chống trùng tên của cùng một người.
3. **Migration** EF Core + commit `.Designer.cs`.
4. **DTO** (Core/DTOs/MetaAds): `MetaCampaignRequestTemplateDto` (Id, Name, SettingsJson, CreatedAt) +
   `CreateMetaCampaignRequestTemplateDto` (Name, SettingsJson).
5. **Repository/Service** (mirror cấu trúc hiện có): list theo `OwnerUserId == userId && OrganizationId == orgId`;
   create (validate tên không rỗng, chống trùng → trả 409 nếu trùng); delete chỉ owner.
6. **Controller** (route mới, vd `api/v1/meta-campaign-request-templates`, `[Authorize]`, screen `s-meta-requests`):
   - `GET` → list template của chính user (filter `OwnerUserId`).
   - `POST` → tạo (OwnerUserId = userId hiện tại). `SettingsJson` lưu **nguyên khối** (backend không cần biết field).
   - `DELETE {id}` → chỉ owner mới xoá được (404/403 nếu không phải owner).
   - Activity log create/delete (thêm event type mới nếu cần).
7. **DI** trong `Program.cs`.

### Frontend
8. `pickTemplateableFields` + `applyTemplateToForm` trong `mappers.ts` (nguồn whitelist duy nhất).
9. Types + endpoints template trong `meta-ads.ts`.
10. UI: selector "Apply template" đầu trang; nút "Save as Template" (enable sau validate) + dialog nhập tên;
    preview cấu hình mỗi template bằng `RequestSummaryRail` read-only.
11. Sau khi apply: `setForm(sanitizeRequestFormState(applied))`, `setIsDirty(true)`, toast nhắc validate lại.

---

## Acceptance criteria
- [ ] Tạo request, validate pass → nút "Save as Template" enable; validate fail hoặc chưa validate → disable.
- [ ] Lưu template với tên; tên trùng (cùng user) bị từ chối có thông báo.
- [ ] Selector đầu trang chỉ liệt kê template **của chính user đang đăng nhập** (user khác không thấy).
- [ ] Mỗi item template hiển thị tóm tắt cấu hình (objective, bid strategy, budget, geo, optimization goal…).
- [ ] Apply template: các field cấu hình + ad copy + creativeType + advantage flags được set; **asset giữ nguyên**;
      `startTime` = now; `endTime` rỗng; `facebookPageId`/`instagramActorId` không đổi; `additionalVariants` không đổi.
- [ ] Account binding của template chỉ áp khi còn hợp lệ; không hợp lệ thì bỏ qua, form vẫn dùng được.
- [ ] Sau apply, form qua `sanitizeRequestFormState` (không có giá trị enum/optimization không hợp lệ).
- [ ] Xoá template: chỉ owner; danh sách cập nhật.
- [ ] Backend build (`dotnet build backend/MediationPro.sln`) + migration chạy được; frontend `pnpm lint` pass.

## Out of scope (phase sau)
- Lưu `additionalVariants`, `facebookPageId`/`instagramActorId`, media asset.
- Share template theo organization/team (hiện chỉ per-owner).
- Rename/overwrite template (chỉ cần create/list/delete ở phase này).
