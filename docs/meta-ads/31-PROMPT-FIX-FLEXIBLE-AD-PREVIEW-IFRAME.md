# Task: Fix — Preview ad Meta không hiển thị text với ad "flexible" (chuyển sang iframe /previews)

## Ngôn ngữ
Trả lời bằng tiếng Việt (theo CLAUDE.md của repo).

## Bối cảnh
Repo: `D:\Project\Amobear.Mediation.Tools` (.NET 8 backend + Next.js frontend).

Màn chi tiết campaign Meta (`/meta-ads/campaigns/{id}`) có nút **Preview** để xem ad do
Facebook render. Với ad tạo theo định dạng **Advantage+ / flexible** (qua field
`creative_asset_groups_spec`), preview **không hiển thị Primary text / Headline**.

### Đã điều tra xong — nguyên nhân chính xác
Preview hiện tại lấy field `preview_shareable_link` của ad rồi mở ở tab mới. Nhưng
`preview_shareable_link` chỉ render **creative nền** (`object_story_spec`, vốn rỗng text với
ad flexible) — KHÔNG gộp text từ asset groups. Đã verify bằng curl thực tế:

- `GET /v24.0/{ad_id}?fields=preview_shareable_link` → mở tab được nhưng KHÔNG có text.
- `GET /v24.0/{ad_id}/previews?ad_format=MOBILE_FEED_STANDARD` → trả về iframe CÓ text:
  ```json
  { "data": [ { "body": "<iframe src=\"https://business.facebook.com/ads/api/preview_iframe.php?d=...&amp;t=AQL...\" width=\"335\" height=\"450\" scrolling=\"yes\" style=\"border: none;\" allow=\"autoplay\"></iframe>" } ] }
  ```

**Lưu ý sống còn:** URL `preview_iframe.php?d=...&t=...` **chỉ chạy khi được nhúng trong
`<iframe>`** (Facebook kiểm tra context + token `t=` ngắn hạn). Mở trực tiếp trên tab →
**not found / blank**. Vì vậy không thể tiếp tục `window.open` — phải nhúng iframe inline.

| Cơ chế | Mở tab mới trực tiếp | Render text asset-group |
|---|---|---|
| `preview_shareable_link` (hiện tại) | ✅ được | ❌ không |
| `/previews` (iframe) — đích đến | ❌ not found | ✅ có |

## BƯỚC 0 — verify nhanh (nếu cần token)
Token Meta lưu MÃ HÓA trong `meta_integrations.access_token_encrypted` (id=1) — không giải mã
qua SQL; nhờ người chạy task cấp token. Graph version `v24.0`. Ad flexible mẫu:
`120244680792760765`. Chạy lại 2 curl ở trên để tự xác nhận trước khi sửa.

## Yêu cầu implement (đụng CẢ Backend LẪN Frontend)

### A. Backend — đổi cơ chế lấy preview
File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignPreviewService.cs`

1. `FetchPreviewShareableLinkAsync` (dòng ~64-88): thay vì
   `GET /{externalAdId}?fields=id,name,preview_shareable_link`, gọi:
   `GET /{externalAdId}/previews?ad_format={adFormat}` (mặc định `MOBILE_FEED_STANDARD`).
2. Parse response `{ "data": [ { "body": "<iframe src=\"...\" .../>" } ] }`:
   - Lấy `data[0].body`.
   - **Bóc `src`** từ chuỗi iframe (regex `src="([^"]+)"` hoặc parse HTML).
   - **Decode HTML entity**: `&amp;` → `&` (rất quan trọng, nếu không token `t=` sẽ sai).
3. Giữ nguyên xử lý lỗi Graph hiện có (`ParseGraphError`, `NormalizeGraphErrorMessage` —
   code 190/10/200/100). Nếu `data` rỗng → ném `InvalidOperationException` với message rõ ràng.
4. (Tùy chọn) Cho `GetAdPreviewAsync` nhận thêm tham số `string? adFormat = null`, default
   `MOBILE_FEED_STANDARD`. Validate whitelist vài format hợp lệ (MOBILE_FEED_STANDARD,
   DESKTOP_FEED_STANDARD, INSTAGRAM_STORY, FACEBOOK_STORY_MOBILE...).

### B. Backend — DTO
File: `backend/MediationPro.Core/DTOs/MetaAds/MetaCampaignDtos.cs` (class
`MetaCampaignPreviewDto` dòng ~144-152). Thêm field:
```csharp
public string PreviewIframeUrl { get; set; } = string.Empty; // src đã decode, dùng để nhúng iframe
```
Set `PreviewIframeUrl` = src vừa bóc. `PreviewUrl` cũ: để trống hoặc set bằng cùng giá trị —
NHƯNG KHÔNG để FE mở tab bằng nó nữa (xem mục C). Cập nhật `Message` cho phù hợp
(vd "Preview rendered inline via Meta /previews.").

### C. Frontend — nhúng iframe inline thay vì mở tab
File: `frontend/components/meta-ads/campaigns/campaign-detail-content.tsx`
- Có 2 handler đang `window.open(preview.previewUrl, "_blank", ...)`:
  - `handlePreviewAd` (dòng ~430-457).
  - `handlePreview` (dòng ~460, preview theo creative).
- Thay `window.open(...)` bằng việc lưu `previewIframeUrl` vào state và mở **Dialog/Modal**
  chứa `<iframe src={previewIframeUrl} width={335} height={450} style={{ border: "none" }}
  allow="autoplay" />`. Dùng component Dialog sẵn có của shadcn/ui trong repo.
- KHÔNG mở tab mới. Bỏ nhánh "Preview blocked / allow pop-ups".
- **Token ngắn hạn**: mỗi lần bấm Preview phải gọi lại API để lấy iframe url mới —
  KHÔNG cache. Đóng Dialog thì clear state.
- Cập nhật type: `frontend/types/meta-ads.ts` interface `MetaCampaignPreviewDto`
  (dòng ~417-424) thêm `previewIframeUrl: string`.
- API client `frontend/lib/api/meta-ads.ts` `previewAd` (dòng ~188-189): giữ nguyên route
  `GET {CAMPAIGNS_PREFIX}/${campaignId}/ads/${adId}/preview`, chỉ type thay đổi.

## Verify (bắt buộc)
1. Build BE:
   ```powershell
   dotnet build backend/MediationPro.sln
   ```
   Nếu API đang chạy khóa DLL: thêm `-p:BaseOutputPath=obj\check\`.
   (`TreatWarningsAsErrors=false` toàn repo — warning không vỡ build.)
2. Test BE:
   ```powershell
   dotnet test backend/MediationPro.sln -c Release
   ```
   Thêm unit test cho hàm bóc `src` + decode `&amp;` từ một chuỗi iframe mẫu (dùng đúng
   ví dụ body ở trên), assert ra URL có `&` và còn nguyên `t=` token.
3. FE:
   ```bash
   cd frontend && pnpm typecheck && pnpm lint
   ```
4. E2E thủ công: mở `/meta-ads/campaigns/1848`, bấm Preview trên ad flexible
   (`120244680792760765`) → Dialog hiện iframe render đúng, **CÓ Primary text + Headline**,
   không còn not-found.

## Phạm vi & ràng buộc
- Chỉ sửa luồng PREVIEW (BE service/DTO + FE handler/type). KHÔNG đụng luồng sync hay
  tạo ad.
- Endpoint route giữ nguyên (`GET {id}/ads/{adId}/preview`).
- Convention C#: PascalCase public, `_camelCase` private; `JsonPropertyName` khớp Graph API.
- Convention TS/React: camelCase, PascalCase component.
- KHÔNG commit/push trừ khi người dùng yêu cầu. Nếu commit: footer
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

## Định nghĩa hoàn thành
Build + test pass; bấm Preview ad flexible mở Dialog iframe render đúng ad kèm
Primary text/Headline; không còn lỗi not-found; có unit test cho phần bóc src + decode entity.
