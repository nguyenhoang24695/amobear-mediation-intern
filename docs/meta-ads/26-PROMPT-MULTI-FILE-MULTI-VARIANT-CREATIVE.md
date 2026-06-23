# 26 — PROMPT: Multi-file upload → multi-variant trong Creative (Create Request)

> Trạng thái: PROMPT (chưa triển khai). Giao nguyên văn cho agent triển khai.

## Bối cảnh / Hiện trạng (đã khảo sát)

**Màn:** `/meta-ads/create-request` → section **Creative** → creative type **Single Image/Video** (`SINGLE_MEDIA`) là chỗ duy nhất hỗ trợ "variations".

**Mô hình variant hiện tại:**
- Variation #1 = **primary** (lưu trong các field phẳng của `RequestFormState`).
- Variation #2,3… = `form.additionalVariants: AdVariantFormState[]`.
- Mỗi variation = **1 ad**, dùng chung text (phía trên gallery) + settings (phía dưới), nhưng có **media riêng** (1 image *hoặc* 1 video).

**Luồng upload hiện tại (1 file/lần):**
- `frontend/components/meta-ads/create-request/section-creative.tsx:1842` — `<Input type="file">` **không** có `multiple`, chỉ lấy `event.target.files?.[0]`.
- → `handleUpload` (375) / `handleVariantUpload` (419) → `metaRequestsApi.uploadAsset(file, kind)` → trả `{ id, fileName }` → patch selection sang `mode: "uploaded_asset"`.
- Nếu là **video**: tự capture thumbnail tại 00:05 qua `autoCaptureThumbnail` (195).
- Auto-detect image/video theo MIME: `UnifiedMediaEditor.handleImageUpload` (1554-1568).

**Tạo variant:**
- `frontend/components/meta-ads/create-request/create-request-content.tsx:601 handleAddVariant` tạo 1 `AdVariantFormState` rỗng (`mediaType: undefined`, kế thừa `facebookPageId`/`instagramActorId`, CTA mặc định).
- `supportsVariants = creativeType === "SINGLE_MEDIA"` (588); cap `MAX_AD_VARIANTS = 50` (`section-creative.tsx:1310`, `canAddVariant` 589).
- Gallery + nút "Add Variation": `VariationGallery` (1326), nút (1371), ô "Add" (1440).

**Nút thắt:** thêm mỗi file phải bấm "Add Variation" → chọn tile → upload 1 file. Không có đường multi-select.

---

## Mục tiêu
Tại `/meta-ads/create-request` → section **Creative** (creative type `SINGLE_MEDIA`), cho phép **chọn nhiều file image/video cùng lúc** → **mỗi file tạo 1 variation (1 ad)** tự động, thay vì phải "Add Variation" rồi upload từng file. Text (Primary Text/Headline phía trên) và settings (Description/CTA/Link phía dưới) vẫn dùng chung cho mọi variation — đúng mô hình hiện tại.

## Phạm vi
- Chỉ áp dụng cho creative type `SINGLE_MEDIA` (`supportsVariants === true`). Carousel/Flexible/Existing Post **không** đổi.
- Files chính: `frontend/components/meta-ads/create-request/section-creative.tsx` và `frontend/components/meta-ads/create-request/create-request-content.tsx`. Không đổi backend, không đổi DTO, không đổi `metaRequestsApi.uploadAsset`.

## Thiết kế bắt buộc (orchestrate ở component cha)
Đặt toàn bộ logic bulk trong **`create-request-content.tsx`** (nơi sở hữu `form.additionalVariants` + `updateForm`), để build danh sách variant **rồi set state 1 lần** — tránh lỗi stale-ref khi vừa tạo variant vừa patch upload trong cùng 1 handler đồng bộ.

1. **Tách factory variant rỗng**: rút phần khởi tạo trong `handleAddVariant` (`create-request-content.tsx:604-639`) ra hàm `createEmptyAdVariant(seq: number): AdVariantFormState` để tái dùng. `handleAddVariant` gọi lại factory này.

2. **Thêm handler `handleBulkMediaUpload(files: File[])`** trong `create-request-content.tsx`:
   - Import sẵn dùng: `metaRequestsApi.uploadAsset`, `captureVideoFrameToFile` (từ `./video-frame-capture`), `createEmptyMediaSelection`.
   - **Clamp capacity**: `remaining = MAX_AD_VARIANTS(50) − (1 + form.additionalVariants.length)`. Số slot khả dụng còn tính cả **primary nếu đang rỗng** (chưa có media). Nếu `files.length` vượt khả dụng → chỉ nhận phần đầu, `toast` cảnh báo `"Chỉ thêm K/N file — tối đa 50 variations"`.
   - **Phân loại từng file**: `kind = file.type.startsWith("video/") ? "video" : "image"`; `mediaType = kind === "video" ? "VIDEO" : "IMAGE"`.
   - **Upload tuần tự** (`for…of` + `await`) để toast/lỗi rõ ràng; mỗi file:
     a. `const asset = await metaRequestsApi.uploadAsset(file, kind)`.
     b. Build selection: spread `createEmptyMediaSelection()` + `{ mode: "uploaded_asset", uploadedAssetId: asset.id, uploadedAssetName: asset.fileName, uploadedAssetPreviewUrl: kind === "image" ? URL.createObjectURL(file) : "" }`.
     c. Nếu **video** → capture thumbnail: `const thumbFile = await captureVideoFrameToFile({ videoFile: file, timestampSeconds: 5 })` → `const thumbAsset = await metaRequestsApi.uploadAsset(thumbFile, "image")` → set `singleVideoThumbnail` = uploaded_asset tương ứng (preview = `URL.createObjectURL(thumbFile)`). Bọc try/catch riêng — thumbnail fail **không** chặn việc tạo variant (giữ behavior hiện tại).
   - **Gán vào slot**:
     - File đầu tiên: nếu **primary đang rỗng** → ghi vào field phẳng primary (`singleImageImage` cho IMAGE; `singleVideoVideo` + `singleVideoThumbnail` cho VIDEO; set `form.mediaType`). Nếu primary đã có media → coi như file thường, tạo variant mới.
     - Các file còn lại: `createEmptyAdVariant(seq)` với `seq = maxSeqNumber + i`, gán `mediaType` + slot media tương ứng (`singleImageImage` / `singleVideoVideo` + `singleVideoThumbnail`).
   - **Set state 1 lần**: gom patch primary (nếu có) + mảng variant mới rồi gọi `updateForm({ ...primaryPatch, additionalVariants: [...form.additionalVariants, ...newVariants] })`.
   - **Active tab**: set về variation mới đầu tiên (hoặc giữ `variant-1` nếu chỉ fill primary).
   - **Lỗi từng file**: catch theo file, đẩy file lỗi qua, cuối cùng `toast` tổng kết (`"Đã thêm X variation, Y file lỗi"`).
   - **Progress UI**: thêm state `bulkUploading: boolean` (+ optional `bulkProgress {done,total}`), bật trong lúc chạy, truyền xuống `CreativeSection` để disable control và hiện spinner.

3. **Prop mới cho `CreativeSection`** (`section-creative.tsx` Props ~101-129): `onBulkMediaUpload?: (files: File[]) => void` và `bulkUploading?: boolean`. Truyền tiếp xuống `VariationGallery`.

4. **UI trong `VariationGallery`** (`section-creative.tsx:1326`):
   - Cạnh nút "Add Variation" (1371): thêm nút **"Upload nhiều file"** mở một `<input type="file" multiple accept="image/*,video/*" hidden>` (dùng `useRef` + `.click()`); `onChange` → gọi `onBulkMediaUpload(Array.from(e.target.files ?? []))` rồi reset `e.currentTarget.value = ""`.
   - Ô "Add" dạng dashed (1440): giữ nguyên hành vi "Add Variation" rỗng; **không** ép nó thành bulk (để người dùng vẫn tạo variant thủ công).
   - Khi `bulkUploading` → disable cả 2 nút + hiện `Loader2` + text `"Uploading X/Y…"`.
   - Chỉ hiển thị khi `supportsVariants` (đã có sẵn early-return ở 1352).

## Edge cases phải xử lý
- Mixed image+video trong 1 lần chọn: mỗi variant set `mediaType` riêng (UnifiedMediaEditor đã hỗ trợ per-variant).
- Vượt cap 50: nhận phần đầu, cảnh báo.
- File 0 byte / sai MIME: để `uploadAsset` báo lỗi như hiện tại, skip file đó, tiếp tục.
- Không có ad account / chưa có Facebook Page: vẫn cho upload (giống `handleUpload` hiện tại không chặn) — không thêm guard mới.
- `URL.createObjectURL` không revoke: **giữ đúng behavior hiện có** (handleUpload/handleVariantUpload cũng không revoke); không thêm cleanup để khỏi lệch scope.
- Reset `input.value` sau mỗi lần để chọn lại đúng file vừa chọn.

## Không làm (out of scope)
- Không đổi `<Input type="file">` trong editor từng variant (1842) sang multiple — chỉ thêm đường bulk ở cấp gallery.
- Không đụng Carousel/Flexible/Existing Post, không đụng backend/execute.
- Không thêm drag-and-drop (có thể đề xuất follow-up, không bắt buộc).

## Verify
1. `cd frontend && pnpm typecheck` — 0 error.
2. (nếu có) `pnpm test` cho create-request.
3. E2E thủ công tại `/meta-ads/create-request`, creative = Single Image/Video:
   - Chọn 3 ảnh cùng lúc → tạo đúng 3 variation, mỗi cái 1 ảnh, text/CTA/Link dùng chung; badge gallery `(3/50)`.
   - Chọn 2 video → mỗi variant có video + thumbnail auto tại 00:05.
   - Chọn mix 1 ảnh + 1 video → 2 variant đúng type.
   - Primary đang rỗng → file đầu fill vào primary; primary đã có media → tất cả thành variant mới.
   - Chọn vượt 50 → cảnh báo, chỉ thêm tới cap.
   - Submit request → payload mỗi variant ánh xạ đúng 1 ad (kiểm tra mapper `create-request-content.tsx:178`).

## Anchor tham chiếu nhanh
- `section-creative.tsx`: Props (101-129), `handleUpload` (375), `handleVariantUpload` (419), `autoCaptureThumbnail` (195), `VariationGallery` (1326), nút Add Variation (1371), ô Add (1440), `<Input type="file">` editor (1842), `UnifiedMediaEditor` (1500), auto-detect MIME (1554-1568), `MAX_AD_VARIANTS=50` (1310).
- `create-request-content.tsx`: `additionalVariants` mapper (178), `supportsVariants`/`canAddVariant`/`maxSeqNumber` (588-590), `handleAddVariant` (601-642), `handleUpdateAdditionalVariant` (713).
- API: `metaRequestsApi.uploadAsset(file, kind)` → `MetaRequestAssetDto { id, fileName }` (`frontend/lib/api/meta-ads.ts:111`).
- Helpers: `createEmptyMediaSelection` / `createEmptyCarouselCard` / `createEmptyFlexibleAsset` (`frontend/lib/meta-ads/mappers.ts:27-65`).
