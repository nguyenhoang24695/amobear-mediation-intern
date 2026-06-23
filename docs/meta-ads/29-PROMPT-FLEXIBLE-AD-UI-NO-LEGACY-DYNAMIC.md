# Prompt — Meta Creative UI: Flexible Ad mới, bỏ Legacy Dynamic Creative

> Copy toàn bộ file này làm prompt cho agent thực thi độc lập. Mục tiêu là chỉnh **frontend UI** để khớp logic Meta Ads mới: `Flexible ad` là nơi duy nhất cho nhiều media/text/headline trong một ad; `Single image or video` là ad thường. **Không dùng Legacy Dynamic Creative** nữa.

## Bối Cảnh

Meta đã thay thế trải nghiệm **Dynamic Creative** cũ bằng các tùy chọn linh hoạt hơn ở phần thiết lập quảng cáo. Với API hiện tại trong dự án:

- Không bật `is_dynamic_creative` ở Ad Set.
- Không tạo creative `asset_feed_spec` cho Single image/video.
- `Flexible ad` dùng payload `creative_asset_groups_spec` ở cấp Ad.

Backend đã được sửa theo hướng này:

- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaCampaignExecutionService.cs`
  - `BuildAdSetPayloadAsync` không còn set `is_dynamic_creative`.
  - `BuildSingleImageCreativePayloadAsync` / `BuildSingleVideoCreativePayloadAsync` không còn sinh `asset_feed_spec`.
  - `BuildFlexibleAdPayloadAsync` vẫn dùng `creative_asset_groups_spec`.
- `backend/MediationPro.Infrastructure/Services/MetaAds/MetaAdSetDraftValidationService.cs`
  - Validate-only Ad Set cũng không còn set `is_dynamic_creative`.

Lỗi đã gặp trước đó:

1. `Cannot have more than one ad in a given dynamic creative ad set` — do Ad Set bị bật legacy `is_dynamic_creative=true` nhưng hệ thống tạo nhiều Ads `ACTIVE`.
2. `Cannot create dynamic creative ad in non-dynamic creative ad set` — do Single image/video còn sinh `asset_feed_spec` dù Ad Set đã không dynamic.

UI cần được chỉnh để người dùng không còn tạo trạng thái nhập liệu gây hiểu nhầm theo Dynamic Creative cũ.

## File Chính Cần Sửa

- `frontend/components/meta-ads/create-request/section-creative.tsx`

Chỉ sửa frontend trong slice này, trừ khi phát hiện type/test frontend yêu cầu cập nhật file liên quan trực tiếp. Không đổi backend/DTO/migration/API.

## Mục Tiêu UX

Tách rõ 2 mô hình:

| User chọn | UI cho phép | Backend tạo |
|---|---|---|
| Single image or video | 1 media + 1 primary text + 1 headline | Creative thường `object_story_spec` |
| Multiple ad variations | Nhiều variation, mỗi variation là 1 ad thường | Nhiều Ads thường trong Ad Set thường |
| Flexible ad | Nhiều media + nhiều primary texts + nhiều headlines trong 1 group | 1 Ad với `creative_asset_groups_spec` |
| Legacy Dynamic Creative | Không có UI | Không tạo `is_dynamic_creative`, không tạo `asset_feed_spec` |

## Yêu Cầu Chi Tiết

### 1. Đổi nhãn và copy

- Đổi label/tab `Single Media` thành `Single image or video`.
- Đổi label/tab `Flexible` thành `Flexible ad`.
- Không dùng chữ `Dynamic Creative` / `dynamic creative` trong UI copy.
- Helper text cho Flexible nên nói rõ:
  - `Use multiple assets and text variations in one ad.`
  - hoặc tương đương, không nhắc `Dynamic Creative`.

### 2. Single image/video chỉ nhập một text/headline

Trong tab `SINGLE_MEDIA`:

- Không hiển thị editor nhiều dòng cho primary texts/headlines.
- Thay bằng input đơn:
  - `Primary text`
  - `Headline`
- Vẫn giữ các field hiện có:
  - media picker image/video
  - description nếu đang có
  - CTA
  - link URL
  - thumbnail cho video

Lưu ý dữ liệu hiện có có thể vẫn có các field legacy:

- `singleImagePrimaryTexts`
- `singleImageHeadlines`
- `singleVideoPrimaryTexts`
- `singleVideoHeadlines`

Khi render Single, chỉ dùng giá trị đầu tiên hợp lệ để fill input đơn, đồng bộ ngược vào field single hiện có (`singleImagePrimaryText`, `singleImageHeadline`, `singleVideoPrimaryText`, `singleVideoHeadline`) theo pattern form hiện tại.

Nếu code hiện tại vẫn cần giữ array để mapper cũ không gãy, đảm bảo array được normalize còn tối đa 1 item khi người dùng sửa input Single.

### 3. Flexible ad là nơi duy nhất cho nhiều text/headline/media

Trong tab `FLEXIBLE`:

- Giữ editor nhiều dòng:
  - `flexiblePrimaryTexts`
  - `flexibleHeadlines`
- Giữ `flexibleAssets[]` cho nhiều image/video.
- Enforce hoặc hiển thị giới hạn tối đa 10 assets nếu chưa có:
  - không cho add asset thứ 11
  - helper/counter hiển thị `x/10 assets`
- Với video assets, giữ thumbnail picker, create thumbnail from frame, trạng thái asset preparation/upload như hiện tại.
- Không gọi/nhắc Legacy Dynamic Creative.

### 4. Multiple ad variations không được hiểu là Flexible

Nếu UI đang có `VariationGallery` cho `SINGLE_MEDIA`, giữ được nhưng copy phải rõ:

- Đây là **nhiều ads riêng biệt**, không phải một flexible ad.
- Mỗi variation nên đại diện cho một ad thường.

Nếu variation hiện chỉ khác media và dùng chung text/headline, giữ hành vi đó nhưng copy phải rõ. Không cho người dùng nhập nhiều primary/headline variations trong Single với kỳ vọng Meta tự phối hợp.

### 5. Validation / checklist UI

Update checklist trong `section-creative.tsx`:

- Single image/video:
  - cần 1 media
  - cần 1 primary text
  - cần 1 headline
  - không cần nhiều variations text/headline
- Flexible ad:
  - cần ít nhất 1 primary text
  - cần ít nhất 1 headline
  - cần 1..10 assets
  - mọi uploaded asset cần hiển thị preparation status; execute validation backend sẽ chặn nếu chưa ready.

Nếu phát hiện draft cũ Single có nhiều text/headline arrays:

- Không hiển thị nhiều dòng.
- Có thể hiển thị warning nhỏ không-blocking:
  - `Single image or video uses the first primary text and headline only. Use Flexible ad for multiple text variations.`
- Không tự chuyển type sang Flexible nếu không có yêu cầu rõ, để tránh đổi payload ngoài ý người dùng.

### 6. Preview

- Single preview dùng text/headline input đơn.
- Flexible preview có thể tiếp tục dùng biến thể đầu tiên để minh họa, nhưng label nên là preview only.
- Không hiển thị thông tin nào khiến người dùng nghĩ Single sẽ tự combine nhiều text/headline.

## Ngoài Phạm Vi

- Không đổi backend.
- Không đổi DTO/API/migration.
- Không sửa execution status policy.
- Không đưa lại `is_dynamic_creative` hoặc `asset_feed_spec`.
- Không xóa dữ liệu draft cũ trong DB.

## Test Plan

### Manual smoke test

1. Mở màn create/edit Meta campaign request.
2. Chọn `Single image or video`:
   - chỉ thấy 1 `Primary text` input và 1 `Headline` input.
   - không thấy editor nhiều dòng text/headline.
   - chọn image/video vẫn hoạt động.
   - video thumbnail/upload/preparation status vẫn hoạt động.
3. Chọn `Flexible ad`:
   - thấy editor nhiều dòng primary texts/headlines.
   - add được nhiều image/video assets.
   - không add quá 10 assets.
4. Search UI copy: không còn `Dynamic Creative`.
5. Tạo request với Flexible nhiều media/text/headline: payload frontend vẫn map `creativeType = FLEXIBLE`.
6. Tạo request với Single nhiều ad variations: copy thể hiện đây là nhiều ads riêng, không phải flexible/dynamic.

### Static checks

Chạy từ root hoặc `frontend` tùy setup dự án:

```powershell
cd frontend
pnpm typecheck
pnpm test
```

Nếu typecheck/test toàn suite fail do lỗi cũ ngoài module này, chạy test hẹp nếu có và báo rõ caveat.

## Definition Of Done

- UI không còn cho Single image/video nhập nhiều primary texts/headlines.
- Flexible ad là nơi duy nhất cho nhiều media/text/headline trong một ad.
- Không còn copy `Dynamic Creative` trong UI creative request.
- Existing upload/from Meta media picker vẫn hoạt động.
- Không đổi backend/API/DTO.
- Báo cáo file đã sửa, test đã chạy, và mọi caveat.

