# Prompt — Gộp Single Image + Single Video thành một creative type "Single Image/Video" (auto-detect)

> Prompt cho **agent thực thi độc lập**. Đây là thay đổi **Frontend-only**. KHÔNG sửa backend, DTO, migration, DB.
> Mọi đường dẫn dưới đây là tương đối từ gốc repo. Số dòng là điểm neo gần đúng — hãy tự xác minh lại bằng cách đọc file trước khi sửa (code có thể đã dịch dòng).

---

## 1. Mục tiêu nghiệp vụ

Hiện màn tạo Meta campaign request (`/meta-ads/requests/create`) có 2 creative type tách rời: **Single Image** và **Single Video**. Cần **gộp lại làm một** mục "Single Image/Video". Trong đó:

- Mỗi **ad variation** (mỗi ad trong ad set) có thể là **ảnh HOẶC video** — người dùng up ảnh hoặc video tùy ý cho từng variation.
- Loại của từng variation (`SINGLE_IMAGE` vs `SINGLE_VIDEO`) được **tự suy ra (auto-detect)** từ media người dùng chọn:
  - Upload file: dựa trên MIME — `file.type.startsWith("video")` → video, ngược lại ảnh.
  - Chọn từ thư viện Meta: dựa trên `media.assetType` (`"IMAGE"` | `"VIDEO"`).
  - External URL: chỉ áp dụng cho ảnh.
- Khi là video → hiện khối thumbnail (tự capture frame như hiện tại).
- Text (Primary Text, Headline, Description, CTA, Link URL) **dùng chung** cho mọi variation, đặt phía trên/dưới gallery như hiện tại.

Một ad set có thể **trộn lẫn** ad ảnh và ad video — điều này hợp lệ với Meta và đã được backend hỗ trợ (xem mục 2).

---

## 2. Phát hiện then chốt — VÌ SAO KHÔNG ĐỘNG BACKEND

Payload gửi lên backend đã là **per-variant**. Mỗi phần tử `AdVariants[]` có `Creative.Type` riêng, và backend rẽ nhánh **theo từng variant**:

- DTO: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignRequestDtos.cs`
  - `MetaAdVariantDto` (dòng ~5): có `MetaCreativeDraftDto Creative`.
  - `MetaCreativeDraftDto.Type` (dòng ~177), `SingleImage` (~179), `SingleVideo` (~180).
- Validation: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignValidationService.cs`
  - `ValidateCreativeAsync` switch theo `creative.Type` (dòng ~447): `case "SINGLE_VIDEO"` → `ValidateSingleVideoCreativeAsync`; default → `ValidateSingleImageCreativeAsync`.
- Execution: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
  - `BuildCreativePayloadAsync` switch theo `creative.Type` (dòng ~1124): `"SINGLE_VIDEO"` → video payload; default → image payload.

→ Nếu FE gửi đúng `Creative.Type` cho từng variant (`SINGLE_IMAGE` hoặc `SINGLE_VIDEO`), backend xử lý đúng cả ad set trộn lẫn. **Giữ nguyên 2 giá trị enum `SINGLE_IMAGE`/`SINGLE_VIDEO` trong payload.** Không thêm type mới ở payload/backend.

---

## 3. Mô hình Frontend cần đạt

### 3.1 Khái niệm "creative type gộp" ở tầng UI/form
- Thêm một giá trị **UI-only**: `"SINGLE_MEDIA"` vào union `MetaCreativeType`.
- `form.creativeType === "SINGLE_MEDIA"` là chế độ gộp. Giá trị này **chỉ tồn tại ở FE** — KHÔNG được gửi xuống payload. Tại map time, mỗi variant chuyển thành `SINGLE_IMAGE` hoặc `SINGLE_VIDEO` thật.
- `SINGLE_IMAGE` và `SINGLE_VIDEO` vẫn giữ trong union (để map ngược draft cũ và để build payload per-variant).

### 3.2 State per-variant — tái dùng field sẵn có + thêm `mediaType`
File: `frontend/types/meta-ads.ts`.

Hiện `AdVariantFormState` (dòng ~1113) và `MetaRequestFormState` (dòng ~1150) đã có:
- Text ảnh: `singleImagePrimaryText(s)`, `singleImageHeadline(s)`, `singleImageDescription`, `singleImageCallToAction`, `singleImageLinkUrl`, media `singleImageImage`.
- Text video: `singleVideoPrimaryText(s)`, `singleVideoHeadline(s)`, `singleVideoDescription`, `singleVideoCallToAction`, `singleVideoLinkUrl`, media `singleVideoVideo`, `singleVideoThumbnail`.

**Cách làm (giảm churn tối đa):**
- **Giữ nguyên** toàn bộ field trên (không xoá — để map ngược draft cũ vẫn chạy).
- Thêm vào cả `AdVariantFormState` và `MetaRequestFormState`:
  ```ts
  mediaType?: "IMAGE" | "VIDEO"   // chỉ dùng cho chế độ SINGLE_MEDIA; undefined = chưa chọn media
  ```
- **Text dùng chung** ở chế độ gộp: chọn bộ `singleImage*` (text) làm **canonical**. UI render đúng MỘT bộ text này (phía trên/dưới gallery). KHÔNG render bộ `singleVideo*` text riêng nữa ở chế độ gộp.
- **Media per-variant** lưu theo `mediaType`:
  - `mediaType === "IMAGE"` → media nằm ở `singleImageImage`.
  - `mediaType === "VIDEO"` → media ở `singleVideoVideo` + thumbnail ở `singleVideoThumbnail`.

### 3.3 Helper suy ra loại media
Thêm helper (đặt ở `frontend/lib/meta-ads/mappers.ts` hoặc `section-creative.tsx`, tùy nơi dùng):
```ts
function resolveVariantMediaType(v: { mediaType?: "IMAGE" | "VIDEO"; singleVideoVideo: MetaRequestAssetSelectionState }): "IMAGE" | "VIDEO" {
  if (v.mediaType) return v.mediaType
  // Fallback cho draft cũ / chưa set: có tín hiệu video thì là VIDEO
  const vid = v.singleVideoVideo
  if (vid?.videoId || vid?.metaAssetType === "VIDEO" || (vid?.mode === "uploaded_asset" && vid?.uploadedAssetId)) return "VIDEO"
  return "IMAGE"
}
```

---

## 4. Thay đổi theo file

### 4.1 `frontend/types/meta-ads.ts`
- `MetaCreativeType` (dòng ~10): thêm `"SINGLE_MEDIA"`.
  ```ts
  export type MetaCreativeType = "SINGLE_IMAGE" | "SINGLE_VIDEO" | "SINGLE_MEDIA" | "CAROUSEL_IMAGE" | "EXISTING_POST" | "FLEXIBLE"
  ```
- Thêm `mediaType?: "IMAGE" | "VIDEO"` vào `AdVariantFormState` (~1113) và `MetaRequestFormState` (~1150).

### 4.2 `frontend/lib/meta-ads/mappers.ts`
1. **`createEmptyMediaSelection`** (~27): giữ nguyên.
2. **Empty form / empty variant**: nơi khởi tạo form mặc định và `handleAddVariant` (xem 4.4) đặt `creativeType: "SINGLE_MEDIA"`, `mediaType: undefined`. Tìm hàm tạo form rỗng trong file này (vd `createEmptyMetaRequestForm` hoặc tương tự) — set `creativeType` mặc định `"SINGLE_MEDIA"` thay cho `"SINGLE_IMAGE"`.
3. **`variantFormStateToCreativeDto`** (~301): xử lý nhánh gộp. Logic mới:
   ```ts
   const effectiveType =
     v.creativeType === "SINGLE_MEDIA" ? resolveVariantMediaType(v) === "VIDEO" ? "SINGLE_VIDEO" : "SINGLE_IMAGE"
     : v.creativeType

   const creative: MetaCreativeDraftDto = { type: effectiveType, common: creativeCommon }
   ```
   - Khi `effectiveType === "SINGLE_VIDEO"`: build `creative.singleVideo` như hiện tại NHƯNG **text lấy từ bộ canonical `singleImage*`** (vì text dùng chung), `video = buildMediaSource(v.singleVideoVideo, "video")`, `thumbnail = buildMediaSource(v.singleVideoThumbnail, "image")`.
   - Khi `effectiveType === "SINGLE_IMAGE"`: build `creative.singleImage` từ `singleImage*` + `image = buildMediaSource(v.singleImageImage, "image")` (giữ nguyên như hiện tại).
   - Các nhánh CAROUSEL/EXISTING_POST/FLEXIBLE: **giữ nguyên**.
   - LƯU Ý: phải đảm bảo `creative.type` gửi xuống luôn là `SINGLE_IMAGE`/`SINGLE_VIDEO`, KHÔNG BAO GIỜ là `SINGLE_MEDIA`.
4. **`mapFormToCreativePayload`** (~386) và **`buildAdVariantPayload`** (~440): truyền thêm `mediaType` vào AdVariantFormState khi build variant từ form (primary variant). Đảm bảo primary cũng đi qua `variantFormStateToCreativeDto` để áp logic gộp.
5. **Map ngược (payload → form)** (~558-587): khi đọc `creative.type`:
   - `"SINGLE_VIDEO"` → `creativeType: "SINGLE_MEDIA"`, `mediaType: "VIDEO"`, đổ media vào `singleVideoVideo`/`singleVideoThumbnail`, đổ text vào bộ `singleImage*` (canonical) — vì UI giờ đọc text từ `singleImage*`. (Có thể đổ song song cả `singleVideo*` để an toàn.)
   - `"SINGLE_IMAGE"` → `creativeType: "SINGLE_MEDIA"`, `mediaType: "IMAGE"`, media vào `singleImageImage`, text vào `singleImage*`.
   - Các type khác giữ nguyên.
   - Mục tiêu: **mở lại draft cũ** (đã lưu `SINGLE_IMAGE`/`SINGLE_VIDEO`) phải hiện đúng trong UI gộp.

### 4.3 `frontend/components/meta-ads/create-request/section-creative.tsx`
1. **Creative Type selector** (`<Select>` ~694-703): thay 2 item `SINGLE_IMAGE` + `SINGLE_VIDEO` bằng MỘT item:
   ```tsx
   <SelectItem value="SINGLE_MEDIA">Single Image/Video</SelectItem>
   ```
   Giữ các item CAROUSEL_IMAGE / FLEXIBLE / EXISTING_POST.
2. **Tabs creative type** (`<TabsList>` ~858-865): thay 2 `TabsTrigger` SINGLE_IMAGE + SINGLE_VIDEO bằng MỘT trigger `value="SINGLE_MEDIA"` (icon gợi ý: dùng cả ImageIcon + Video, hoặc một icon trung tính).
3. **TabsContent**: gộp 2 `TabsContent` `SINGLE_IMAGE` và `SINGLE_VIDEO` thành MỘT `TabsContent value="SINGLE_MEDIA"`:
   - Phía trên gallery: TextVariationEditor cho **Primary Text** và **Headline** (đọc/ghi bộ `singleImage*` canonical, qua `updateTextVariations("singleImagePrimaryTexts", "singleImagePrimaryText", ...)` và headline tương tự).
   - **VariationGallery** (component đã có sẵn trong file): mỗi cell dùng **MediaSourceEditor hợp nhất** (xem mục 4.5). `mediaKind` của gallery có thể để generic; preview mỗi ô: nếu variant là video → poster/thumbnail (`getSelectionPreviewSource(singleVideoThumbnail)` fallback `singleVideoVideo`), nếu ảnh → `getSelectionPreviewSource(singleImageImage)`.
   - Phía dưới gallery: Description, Call To Action, Link URL (đọc/ghi bộ `singleImage*` canonical).
   - LƯU Ý: `VariationGallery` đã có `cells` API (mỗi cell `{ key, sequenceNumber, previewUrl, previewRequiresAuth, isComplete, editor }`). Build `cells` cho primary + `additionalVariants`, mỗi cell preview + isComplete tính theo `resolveVariantMediaType`.
4. Xoá 2 `TabsContent` cũ (`SINGLE_IMAGE`, `SINGLE_VIDEO`) sau khi đã gộp.

### 4.4 `frontend/components/meta-ads/create-request/create-request-content.tsx`
- `supportsVariants` (~589): đổi điều kiện sang chế độ gộp:
  ```ts
  const supportsVariants = form.creativeType === "SINGLE_MEDIA"
  ```
  (thay cho `=== "SINGLE_IMAGE" || === "SINGLE_VIDEO"`).
- `canAddVariant` (~590): giữ `supportsVariants && totalVariants < 50` (cap 50 đã có).
- `handleAddVariant` (~602): variant mới đặt `creativeType: "SINGLE_MEDIA"`, `mediaType: undefined`, media slots rỗng (`createEmptyMediaSelection`). Giữ copy `facebookPageId`/`instagramActorId` từ form.
- `handleDuplicatePrimaryVariant` (~645) và `handleDuplicateVariant` (~688): copy thêm field `mediaType`.
- Nếu form khởi tạo mặc định `creativeType: "SINGLE_IMAGE"` ở đâu đó trong file này → đổi mặc định sang `"SINGLE_MEDIA"`.

### 4.5 `MediaSourceEditor` hợp nhất (trong `section-creative.tsx`, ~1506)
Hiện `MediaSourceEditor` nhận `kind: "image" | "video"`. Cần một biến thể **auto** cho chế độ gộp. Hai lựa chọn (chọn cái gọn hơn khi implement):
- (A) Thêm `kind: "auto"` và xử lý nội bộ; hoặc
- (B) Viết wrapper `UnifiedMediaEditor` bọc logic detect rồi render MediaSourceEditor với `kind` đã suy ra.

Yêu cầu hành vi của editor hợp nhất:
- **Mode dropdown**: `From Meta` / `External URL` (chỉ ảnh) / `Upload`.
- **Upload**: input `accept="image/*,video/*"`. Khi chọn file:
  - `file.type.startsWith("video")` → set `mediaType = "VIDEO"`, ghi media vào `singleVideoVideo`, rồi **tự capture thumbnail** (tái dùng `autoCaptureThumbnail`/`handleUpload` luồng video hiện có) ghi vào `singleVideoThumbnail`.
  - ngược lại → `mediaType = "IMAGE"`, ghi vào `singleImageImage`.
- **From Meta**: mở `MetaMediaPickerDialog` cho phép chọn **cả ảnh lẫn video** (xem ràng buộc picker bên dưới). Khi chọn: `media.assetType === "VIDEO"` → `mediaType = "VIDEO"` (ghi `singleVideoVideo`, auto thumbnail), `"IMAGE"` → `mediaType = "IMAGE"` (ghi `singleImageImage`).
- **External URL**: luôn `mediaType = "IMAGE"`, ghi `singleImageImage.imageUrl`.
- Khi `mediaType === "VIDEO"`: hiện khối thumbnail (poster + "Choose thumbnail" + "Create from frame") — tái dùng nguyên `renderThumbnailImage`/`renderThumbnailActions`/`autoCaptureThumbnail` đã có.
- Khi người dùng đổi từ video → ảnh (hoặc ngược lại): clear slot không dùng (đặt lại `createEmptyMediaSelection`) để tránh gửi cả 2.
- Editor phải báo `mediaType` về parent để lưu vào variant (qua callback hoặc qua patch `onUpdateAdditionalVariant`/`handleMediaPatch`). Khi ghi media của primary, route tới đúng field (`singleImageImage` hoặc `singleVideoVideo`+`singleVideoThumbnail`) + set `form.mediaType`. Tương tự cho variant phụ qua `onUpdateAdditionalVariant(seq, { mediaType, singleImageImage | singleVideoVideo | singleVideoThumbnail })`.

> Tái dùng tối đa các handler đã có: `handleUpload`, `handleVariantUpload`, `handleMetaSelection`, `handleVariantMetaSelection`, `autoCaptureThumbnail`. Chỉ thêm bước route theo `mediaType`.

### 4.6 `MetaMediaPickerDialog`
File: `frontend/components/meta-ads/create-request/meta-media-picker-dialog.tsx`.
- Hiện nhận `targetKind` (image|video) và khóa danh sách theo loại đó. Chế độ gộp cần chọn được CẢ HAI loại.
- Cách xử lý (chọn 1):
  - (a) Cho `targetKind` nhận thêm giá trị `"both"` / hoặc cho `null` để hiện cả ảnh & video trong cùng list; khi chọn, trả `media.assetType` để parent route. **Khuyến nghị.**
  - (b) Nếu việc nới picker quá phức tạp, fallback: 2 nút riêng "From Meta — Image" và "From Meta — Video" mở picker với `targetKind` tương ứng. Chấp nhận được nhưng kém gọn.
- Đọc kỹ component trước khi sửa để không phá các nơi khác đang dùng nó (carousel/flexible vẫn truyền `targetKind` cố định — phải giữ tương thích).

### 4.7 `frontend/components/meta-ads/create-request/naming.ts`
- `buildCreativeTypeToken` (~134): xử lý `"SINGLE_MEDIA"`.
  - Khuyến nghị: token theo media của variant — `IMG` nếu ad set toàn ảnh, `VID` nếu toàn video, `MIX` nếu trộn. Hàm này hiện chỉ nhận `form.creativeType`; nếu cần biết toàn ad set, truyền thêm thông tin (mảng variant) hoặc đơn giản trả `MEDIA`/`MIX`. Giữ thay đổi nhỏ gọn, không phá chữ ký dùng ở nơi khác nếu không cần.

### 4.8 Hiển thị: `summary-rail.tsx` & `request-detail-content.tsx`
File:
- `frontend/components/meta-ads/create-request/summary-rail.tsx`
- `frontend/components/meta-ads/requests/request-detail-content.tsx`
- Tìm chỗ hiển thị nhãn/badge theo `creativeType`. Bổ sung nhánh cho `"SINGLE_MEDIA"` (vd "Single Image/Video") và/hoặc hiển thị loại theo từng variant (IMG/VID) dựa trên media. Đảm bảo không vỡ khi gặp giá trị mới.

---

## 5. Ràng buộc (BẮT BUỘC)

- **KHÔNG sửa backend, DTO, DB migration.** Payload vẫn gửi `SINGLE_IMAGE`/`SINGLE_VIDEO` per-variant; tuyệt đối không gửi `SINGLE_MEDIA` xuống.
- **KHÔNG đụng** Carousel / Flexible / Existing Post (cả UI lẫn mapper).
- **Giữ** cap 50 variations và toàn bộ UI gallery hiện có (chỉ đổi nội dung editor mỗi cell).
- **Tương thích ngược**: draft/request đã lưu với `SINGLE_IMAGE` hoặc `SINGLE_VIDEO` phải mở lại được trong UI gộp (mục 4.2.5).
- Giữ logic auto-capture thumbnail cho video, và giữ ràng buộc External URL chỉ cho ảnh.

---

## 6. Verification

1. **Typecheck** (repo có sẵn lỗi tsc ở các file KHÔNG liên quan — chỉ cần đảm bảo các file bạn sửa không phát sinh lỗi mới):
   ```powershell
   cd frontend
   npx tsc --noEmit 2>&1 | Select-String -Pattern "section-creative|create-request-content|mappers|meta-ads.ts|summary-rail|request-detail-content|meta-media-picker-dialog|naming"
   ```
   Kỳ vọng: **không có** dòng nào khớp (không lỗi mới ở các file đã sửa).

2. **Lint** (tùy chọn):
   ```powershell
   cd frontend; pnpm lint
   ```

3. **Kiểm thử thủ công** trên màn `/meta-ads/requests/create`:
   - Chọn creative type "Single Image/Video" (chỉ còn 1 mục, không còn Single Image/Single Video riêng).
   - Variation #1: **upload ảnh** → ô gallery hiện ảnh, chấm xanh. Submit thành công; payload variant #1 có `Creative.Type = "SINGLE_IMAGE"`.
   - Thêm Variation #2: **upload video** → tự sinh thumbnail; editor hiện khối thumbnail. Payload variant #2 có `Creative.Type = "SINGLE_VIDEO"` + video + thumbnail.
   - Thêm Variation #3: **chọn video từ Meta** → assetType VIDEO → SINGLE_VIDEO.
   - Thêm Variation #4: **chọn ảnh từ Meta** → SINGLE_IMAGE.
   - Text (Primary/Headline/Description/CTA/Link) nhập 1 lần, áp cho mọi variation.
   - **Ad set trộn ảnh + video** validate & submit không lỗi.
   - **Mở lại draft cũ** (request đã tạo trước đây kiểu Single Image hoặc Single Video) → hiển thị đúng trong UI gộp, media + text còn nguyên.
   - Đổi một variation từ video sang ảnh → slot video được clear, không gửi thừa.

4. (Nếu có thể) Kiểm tra payload JSON gửi lên (Network tab) xác nhận: KHÔNG có `"type": "SINGLE_MEDIA"`; mỗi variant là `SINGLE_IMAGE` hoặc `SINGLE_VIDEO`.

---

## 7. Ghi chú

- `MetaCreativeType` thêm `SINGLE_MEDIA` chỉ phục vụ FE; nếu TypeScript báo "non-exhaustive switch" ở chỗ nào dùng union này, bổ sung nhánh xử lý (đừng để lọt default sai).
- Trọng tâm khó nhất là `MediaSourceEditor` hợp nhất (4.5) + nới `MetaMediaPickerDialog` (4.6). Hãy đọc kỹ 2 component này trước khi sửa; tái dùng handler sẵn có thay vì viết mới.
- Sau khi xong, có thể cân nhắc (KHÔNG bắt buộc) dọn dần các field `singleVideo*` text trùng lặp ở bước refactor sau — lần này GIỮ để an toàn tương thích ngược.
