# Task: Đổi UI assets của Flexible ad sang dạng tile-gallery (giống Single media)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` — Frontend Next.js.
File DUY NHẤT cần sửa: `frontend/components/meta-ads/create-request/section-creative.tsx` (~2947 dòng).

Màn tạo request Meta, tab creative **FLEXIBLE**, phần "Assets" (image/video) hiện render mỗi
asset thành **một card xếp dọc** chứa nguyên `MediaSourceEditor` → khi có nhiều ảnh/video thì
danh sách **rất dài**. Cần đổi sang **dạng tile-gallery** giống phần "Media Variations" bên
tab SINGLE_MEDIA: một **lưới thumbnail vuông** (mỗi tile = 1 asset) + **một ô editor chi tiết**
bên dưới cho tile đang chọn.

## Mẫu tham chiếu đã có sẵn trong cùng file
`VariationGallery` (dòng ~1763-1975) — đây là pattern đích cần bắt chước:
- Lưới tile vuông `grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10`, mỗi tile:
  - thumbnail `ProtectedMediaImage` (fallback icon khi chưa có media),
  - badge `#index` góc trên trái (`absolute left-1 top-1 ... bg-black/55`),
  - chấm trạng thái góc trên phải xanh/vàng (`bg-green-500` nếu có media, `bg-amber-400` nếu chưa),
  - nút xóa (Trash2) hiện khi hover, góc dưới phải,
  - tile active có viền xanh `border-blue-500 ring-2 ring-blue-200`.
- Tile "Add" cuối lưới (`border-dashed`, icon Plus + chữ "Add").
- Bên dưới: "detail pane" `rounded-lg border bg-white p-3` hiển thị editor của tile đang chọn.
→ Tái dùng đúng các class Tailwind này để đồng nhất giao diện.

## Vùng code cần thay
Trong `TabsContent value="FLEXIBLE"` (dòng ~1475-1593), CHỈ thay phần "Assets" — khối
`<div className="space-y-3">` chứa header "Assets (n/maxFlexibleAssets)" + nút bulk/Add +
`form.flexibleAssets.map(...)` (dòng ~1508-1592).
GIỮ NGUYÊN phía trên: banner info, `TextVariationEditor` cho Primary Text/Headline, Call To Action,
Link URL — đó KHÔNG phải phần dài cần đổi.

## State, helper, dữ liệu sẵn có (dùng lại, KHÔNG viết lại logic)
- Danh sách: `form.flexibleAssets` (mỗi asset có `id` ổn định, `assetType: "IMAGE"|"VIDEO"`,
  `image`, `video`, `thumbnail`).
- Hằng: `maxFlexibleAssets = 10` (dòng ~89). Tối thiểu 1 asset (không xóa được cái cuối).
- Thêm/xóa/đổi:
  - Thêm: `onChange({ flexibleAssets: [...form.flexibleAssets, createEmptyFlexibleAsset()] })`.
  - Xóa: `onChange({ flexibleAssets: form.flexibleAssets.filter((_, i) => i !== index) })` (disable khi length<=1).
  - Đổi assetType: `updateFlexibleAsset(index, { assetType })` (dòng ~592).
  - Đổi media: `updateFlexibleAssetMedia(index, "image"|"video"|"thumbnail", patch)` (dòng ~596).
  - Upload: `handleFlexibleUpload(index, kind, file)`; chọn từ Meta lib: `handleFlexibleMetaSelection(index, field, media)`.
  - Bulk upload: `handleFlexibleBulkUpload(files)` + `flexibleBulkInputRef`, `flexibleBulkUploading`,
    `flexibleBulkProgress`, `flexibleBulkCapacity` (dòng ~778).
- Preview & trạng thái:
  - `getSelectionPreviewSource(selection)` → `{ url, requiresAuth }` (đã import).
  - `hasSelectedFlexibleAssetMedia(asset)` (dòng ~101) → boolean "đã có media" (dùng cho chấm xanh/vàng).
  - Thumbnail tile: ưu tiên `getSelectionPreviewSource(asset.thumbnail).url || getSelectionPreviewSource(asset.video).url`
    với VIDEO; `getSelectionPreviewSource(asset.image).url` với IMAGE.
- Editor chi tiết tile đang chọn: tái dùng đúng khối render hiện có (dòng ~1560-1589):
  asset.assetType === "VIDEO" → `MediaSourceEditor kind="video"` (kèm thumbnail props);
  ngược lại → `MediaSourceEditor kind="image"` allowExternalUrl. GIỮ NGUYÊN toàn bộ props đang truyền.

## Yêu cầu implement
1. **Thêm state tile đang chọn** cho flexible: ví dụ `const [activeFlexibleAssetId, setActiveFlexibleAssetId] = useState<string | null>(null)`.
   Resolve asset đang chọn = `form.flexibleAssets.find(a => a.id === activeFlexibleAssetId) ?? form.flexibleAssets[0]`
   (fallback về asset đầu khi id không còn tồn tại sau khi xóa). Khi thêm asset mới → set active sang asset vừa thêm.
2. **Dựng UI mới cho khối Assets** theo pattern `VariationGallery`:
   - Giữ header: "Assets (n/maxFlexibleAssets)" + mô tả + nút "Upload multiple files" (bulk) + "Add Asset"
     (giữ nguyên hành vi/disable hiện có).
   - **Lưới tile**: map `form.flexibleAssets` → mỗi tile là `<button>` vuông:
     thumbnail (theo asset.assetType), badge `#{index+1}`, chấm trạng thái theo `hasSelectedFlexibleAssetMedia(asset)`,
     icon nhỏ phân biệt loại (ImageIcon/Video) nếu muốn, nút xóa Trash2 hover (disable/ẩn khi chỉ còn 1),
     click tile → `setActiveFlexibleAssetId(asset.id)`. Thêm tile "Add" cuối (gọi thêm asset, disable khi đạt max hoặc đang bulk upload).
   - **Detail pane** bên dưới: tiêu đề "Editing Asset #k" + Select đổi `assetType` (IMAGE/VIDEO) + nút Remove,
     rồi render `MediaSourceEditor` tương ứng cho asset đang chọn (đúng khối dòng ~1560-1589).
3. **KHÔNG đổi** data model, mapper, hay logic upload/preview — chỉ tái cấu trúc JSX + thêm 1 state UI.
4. Cân nhắc tách thành component nội bộ `FlexibleAssetGallery` (giống `VariationGallery`) cho gọn,
   HOẶC inline trong TabsContent — tùy, miễn không phá phần khác. KHÔNG sửa `VariationGallery`
   (nó dùng cho SINGLE_MEDIA, cấu trúc cell khác — flexible cần Select assetType, không có khái niệm "Duplicate").

## Lưu ý UX
- Asset VIDEO và IMAGE có thể xen kẽ trong cùng lưới → tile nên có nhãn/icon nhỏ cho biết loại.
- Khi xóa asset đang active → tự chọn asset đầu còn lại.
- Giữ accessibility cơ bản: `type="button"`, `title` cho nút.

## Verify
```bash
cd frontend && pnpm typecheck && pnpm lint
```
Kiểm tra thủ công: mở màn tạo request Meta → Creative type = **Flexible ad** → thêm nhiều
image/video:
- Danh sách hiển thị dạng **lưới thumbnail gọn** + **một editor** cho tile đang chọn (không còn stack dọc dài).
- Add/Remove/đổi IMAGE↔VIDEO, upload, chọn từ Meta library, bulk upload đều hoạt động như cũ.
- Chấm trạng thái xanh khi asset đã có media, vàng khi chưa.

## Phạm vi & ràng buộc
- Chỉ sửa `section-creative.tsx`. KHÔNG đụng backend, mapper, types, hay creative loại khác.
- Convention TS/React: camelCase, PascalCase component; tái dùng class Tailwind của `VariationGallery`.
- KHÔNG commit/push trừ khi user yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
`pnpm typecheck` + `pnpm lint` xanh; UI Assets của Flexible chuyển sang tile-gallery (lưới
thumbnail + 1 editor chi tiết) giống Single media; mọi thao tác add/remove/đổi loại/upload/bulk/
chọn Meta library vẫn hoạt động; không đổi data model hay các tab creative khác.
