# Thêm Ảnh page + Page URL ID vào dropdown chọn Facebook Page (Meta Create Request)

> Prompt triển khai độc lập cho agent implement. Tự chứa đủ bối cảnh — không cần hội thoại gốc.

## Bối cảnh

Ở màn hình tạo Request của Meta Ads, dropdown chọn Facebook Page
(`frontend/components/meta-ads/create-request/section-creative.tsx`) hiện chỉ hiển thị
**Page Name + Page Id**. Cần bổ sung:

1. **Ảnh đại diện của page** (avatar).
2. **"Page URL ID"** — con số trong URL công khai `https://www.facebook.com/profile.php?id=<URL_ID>`.

> ⚠️ **Lưu ý quan trọng:** với *New Pages Experience*, `URL_ID` này **KHÁC** với `page.id` mà Graph
> API trả về ở edge `/me/accounts` và `promote_pages`. Do đó phải lấy thêm field `link` (URL công khai)
> từ Graph rồi parse ra ID — **không được suy ra từ `page.id`**.

### Luồng dữ liệu hiện tại (đã xác minh)

```
section-creative.tsx
  → lib/api/meta-ads.ts:188  getAdAccountFacebookPages
  → MetaReferenceController   (route: ad-accounts/{id}/facebook-pages)
  → MetaFacebookPageReferenceService.GetFacebookPagesAsync / GetAllAccessibleFacebookPagesAsync
  → Facebook Graph API
```

`apiClient.get<T>` là passthrough (không lọc field), nên field mới sẽ tự chảy về frontend sau khi
thêm vào DTO + type.

---

## Bước 0 — Xác minh field Graph trước khi code (BẮT BUỘC)

Môi trường là dev box với dữ liệu clone từ production. Trước khi sửa, gọi thử Graph API (qua token thật
của 1 ad account có page New Pages Experience) để xác nhận:

- `picture{url}` trả về `picture.data.url` (ảnh đại diện).
- `link` trả về URL công khai của page, và URL này chứa `profile.php?id=<số>` hoặc dạng
  `/<vanity>` / `/people/<name>/<số>`.
- Field nào chứa đúng con số trong `profile.php?id=`. Nếu `link` không đủ, thử thêm các field ứng viên
  (`username`). Ghi lại field thực tế hoạt động rồi mới chốt cách parse.

> Nếu Graph **không** trả về một ID khác với `page.id` cho các page này → **dừng lại và báo cáo**
> (giả định ban đầu sai), tránh implement nhầm.

---

## Bước 1 — Backend: lấy thêm `picture` + `link` từ Graph

File: `backend/MediationPro.Infrastructure/Services/MetaAds/MetaFacebookPageReferenceService.cs`

1. Bổ sung field vào **cả 3** query Graph:
   - `FetchAccessiblePagesAsync` (dòng ~155): `id,name,category,tasks,access_token` → thêm `,picture{url},link`.
   - `TryLoadPagesFromAccountFieldAsync` (dòng ~173): `promote_pages{id,name,category,tasks}`
     → `promote_pages{id,name,category,tasks,picture{url},link}`.
   - `TryLoadPagesFromEdgeAsync` (dòng ~191): `id,name,category,tasks` → thêm `,picture{url},link`.
2. Mở rộng class `PageNode` (dòng ~389):
   - `link` → `public string? Link { get; set; }`
   - `picture` (nested) → class con `PictureEnvelope { PictureData? Data }`,
     `PictureData { [JsonPropertyName("url")] string? Url }`. Map `[JsonPropertyName("picture")]`.
3. Trong `ToDto` (dòng ~249): map
   - `PictureUrl = page.Picture?.Data?.Url`
   - `ProfileUrl = page.Link`
   - `ProfileUrlId` = ID parse được từ `page.Link` theo cách đã xác minh ở Bước 0
     (ví dụ: lấy query param `id` của `profile.php`, hoặc nhóm số cuối path).
     Nếu parse thất bại → để `null`. **KHÔNG fallback về `page.id`.**

---

## Bước 2 — DTO

File: `backend/MediationPro.Core/DTOs/MetaAds/MetaReferenceDtos.cs`
Class `MetaFacebookPageReferenceDto` (dòng ~173), thêm:

```csharp
public string? PictureUrl { get; set; }
public string? ProfileUrl { get; set; }
public string? ProfileUrlId { get; set; }
```

---

## Bước 3 — Frontend type

File: `frontend/types/meta-ads.ts`
Interface `MetaFacebookPageReferenceDto` (dòng ~966), thêm:

```ts
pictureUrl?: string | null
profileUrl?: string | null
profileUrlId?: string | null
```

---

## Bước 4 — Render dropdown

File: `frontend/components/meta-ads/create-request/section-creative.tsx`
Trong `CommandItem` của picker (dòng ~503–518):

- Thêm **avatar ảnh page** bên trái mỗi item (dùng `page.pictureUrl`; fallback placeholder/initials khi null).
  Dùng component `Avatar` sẵn có hoặc `<img className="h-6 w-6 rounded-full object-cover">`.
- Dòng phụ (đang hiện `{page.id}{category}`) bổ sung **Page URL ID**: hiển thị `page.profileUrlId`
  (nếu có) kèm nhãn để phân biệt với Page Id, ví dụ: `ID {page.id} · URL ID {page.profileUrlId}`.
  Nếu `profileUrl` có, cân nhắc render link nhỏ (mở tab mới) — nhưng **không** đặt `<a>` lồng trong nút bấm
  chọn (tránh nested interactive); dùng icon/onClick `stopPropagation` nếu cần.
- Cập nhật `value` của `CommandItem` (dòng 506) để search được theo URL ID: thêm `${page.profileUrlId ?? ""}`.
- Đồng bộ phần trigger hiển thị page đã chọn (dòng ~488–492) nếu muốn show avatar nhỏ ở nút.

---

## Bước 5 — Kiểm thử

- Mở Create Request → chọn ad account có page → mở dropdown: thấy ảnh + Page URL ID đúng với số trong
  `profile.php?id=` khi mở page thật.
- Page không có ảnh / không parse được URL ID: hiển thị placeholder / ẩn dòng URL ID, không vỡ layout,
  không lỗi console.
- Test cả 2 nguồn `promote_pages` và `access_token_all` (nút "Load All Token Pages").
- Page entry mode "manual" giữ nguyên (không bị ảnh hưởng).

---

## Ràng buộc

- Không đổi contract route / ý nghĩa `facebookPageId` đang submit (vẫn là `page.id`, **KHÔNG** đổi sang URL ID).
- Field mới đều nullable; UI phải chịu được null.
- Không tăng số lần gọi Graph; chỉ thêm field vào request sẵn có.

---

## Tệp bị ảnh hưởng (tóm tắt)

| Tầng | File | Thay đổi |
|---|---|---|
| BE service | `MetaFacebookPageReferenceService.cs` | Thêm `picture{url},link` vào 3 query; mở rộng `PageNode`; map trong `ToDto` |
| BE DTO | `MetaReferenceDtos.cs` | `MetaFacebookPageReferenceDto` thêm `PictureUrl`, `ProfileUrl`, `ProfileUrlId` |
| FE type | `frontend/types/meta-ads.ts` | Interface thêm `pictureUrl`, `profileUrl`, `profileUrlId` |
| FE UI | `frontend/components/meta-ads/create-request/section-creative.tsx` | Render avatar + Page URL ID trong picker |

---

# ADDENDUM — Bug "URL ID trùng Page ID" & Prompt điều tra Graph fields

## Triệu chứng (sau lần implement đầu)

- Ảnh page: OK.
- **URL ID lại bằng đúng Page ID.** Ví dụ dropdown hiện `989077160948958` cho cả Page ID lẫn URL ID,
  nhưng mở `https://www.facebook.com/989077160948958` thì Facebook redirect sang
  `https://www.facebook.com/profile.php?id=61586992441299` — một ID khác.

## Nguyên nhân gốc (đã xác minh)

1. Field Graph `link` trả về URL **dựng từ `page.id`** (`https://www.facebook.com/989077160948958`),
   KHÔNG chứa số `profile.php?id=61586992441299`.
2. `ParseProfileUrlId` (`MetaFacebookPageReferenceService.cs` dòng ~250–289) không tìm thấy `?id=` hay
   `/people/` nên rơi vào nhánh fallback "lấy đoạn số ≥9 ký tự" → trả lại chính `page.id`. ⇒ `ProfileUrlId == page.id`.
3. Số `61…` là **page-backed profile ID** của *New Pages Experience*. Test resolve redirect ở phía server
   (`GET https://www.facebook.com/{page_id}`, không cookie) ban đầu trả về **HTTP 400**.

> ⚠️ **ĐÃ CẬP NHẬT — kết luận "bị chặn 400" là SAI.** 400 chỉ vì request thiếu các header điều hướng của
> trình duyệt (`Sec-Fetch-*`, `Upgrade-Insecure-Requests`, `Accept`). Khi thêm đủ header, FB trả **HTTP 301**
> với `Location: https://www.facebook.com/61586992441299/` — **không cần cookie, không cần token**.
> ⇒ Đây là GIẢI PHÁP CHỐT, xem mục cuối tài liệu. Hướng "điều tra Graph fields" và "bỏ URL ID" không còn cần thiết.

## Prompt điều tra (giao cho agent có token thật)

> Mục tiêu: xác định **chắc chắn** có hay không một field/edge Graph trả về page-backed profile ID
> (số dạng `61…` trong `profile.php?id=`). Có → wire vào `ProfileUrlId`. Không → báo cáo để fallback bỏ URL ID.
> **Không đoán mò**: dùng introspection `metadata=1` để liệt kê toàn bộ field node hỗ trợ rồi dò.

### Chuẩn bị
- Lấy 1 page New Pages Experience đã biết cặp `(page_id=989077160948958, profile_id=61586992441299)` để làm mốc đối chiếu.
- Lấy **user access token** (token integration hiện có) và **page access token** (service đã có
  `ResolvePageAccessTokenAsync` qua `me/accounts.access_token`). Field availability khác nhau giữa 2 token → phải thử cả hai.
- Dùng `MetaAds:GraphApiBaseUrl` + `MetaAds:ApiVersion` (mặc định `v24.0`).

### Bước A — Introspection field list của PAGE node
```
GET {graph}/{ver}/{PAGE_ID}?metadata=1&access_token={TOKEN}
```
- Đọc `.metadata.fields[]` (mỗi phần tử `{name, description}`) và `.metadata.connections{}`.
- Lập danh sách tất cả field scalar.

### Bước B — Dump giá trị tất cả field, dò số mốc
- Gọi `GET {graph}/{ver}/{PAGE_ID}?fields=<ghép tất cả field từ Bước A>&access_token={TOKEN}`
  (chia nhỏ nếu Graph báo lỗi field không hợp lệ — loại field lỗi ra rồi gọi lại).
- Quét toàn bộ JSON response: **field nào có giá trị == `61586992441299`?** Ghi lại tên field.
- Lặp lại Bước A+B với **page access token** (một số field như liên kết profile chỉ trả khi dùng page token).

### Bước C — Thử các edge/field ứng viên cụ thể
Nếu Bước B chưa ra, thử trực tiếp (cả 2 token):
- `?fields=link,username,name,id,global_brand_root_id,page_token,emails`
- `GET {graph}/{ver}/{PROFILE_ID}?metadata=1&access_token={TOKEN}` (node `61586992441299`): xem nó có tồn tại,
  field gì, có `connections` trỏ ngược về page không.
- `GET {graph}/{ver}/me?fields=id,link` với **page token** (xem `me` của page token trả id nào).

### Bước D — Kết luận (BẮT BUỘC chọn 1)
- **Tìm thấy field X** trả đúng `61…`:
  - Thêm field X vào 3 query Graph trong `MetaFacebookPageReferenceService.cs` (dòng ~156, 174, 192).
  - Thêm property tương ứng vào `PageNode`.
  - Trong `ToDto`: `ProfileUrlId = <field X>`; `ProfileUrl = "https://www.facebook.com/profile.php?id=" + ProfileUrlId` (khi có).
  - **XÓA / thay** nhánh fallback "đoạn số ≥9 ký tự" trong `ParseProfileUrlId` để không bao giờ trả về `page.id` nữa
    (URL ID null còn hơn URL ID sai). Test lại với page mốc: URL ID phải = `61586992441299`, KHÁC `page.id`.
- **Không field nào trả `61…`** sau khi vét hết metadata (cả 2 token, cả node page lẫn node profile):
  - DỪNG, báo cáo "Graph không expose page-backed profile ID".
  - Fallback: bỏ hẳn `ProfileUrlId`/`ProfileUrl` khỏi DTO + type + UI (giữ avatar + Page ID), và gỡ
    `ParseProfileUrlId` để tránh hiển thị số gây hiểu nhầm.

### Ràng buộc điều tra
- Ghi lại (vào PR/issue) đúng request đã gọi + field phát hiện, để có bằng chứng tái lập.
- Không thêm vòng lặp gọi Graph theo từng page ở luồng list nếu giải pháp cuối là follow-redirect/scrape
  (đã loại vì FB chặn 400 + chi phí N request). Chỉ chấp nhận giải pháp dựa trên field Graph trả sẵn trong
  request danh sách hiện có.

> 🟢 **Mục điều tra Graph ở trên KHÔNG còn cần thực hiện** — đã tìm ra giải pháp chốt bên dưới
> (resolve qua HTTP 301). Giữ lại chỉ để tham khảo lịch sử.

---

# GIẢI PHÁP CHỐT — Resolve `profile_id` qua HTTP 301 (lazy + cache)

## Phát hiện (đã verify bằng curl thật)

`GET https://www.facebook.com/{page_id}` **kèm header điều hướng của trình duyệt** (KHÔNG cần cookie,
KHÔNG cần token) trả về:

```
HTTP/1.1 301 Moved Permanently
Location: https://www.facebook.com/61586992441299/
```

`61586992441299` chính là page-backed profile ID (số trong `profile.php?id=`). Chỉ cần đọc `Location`
của **hop 301 đầu tiên** rồi bóc dãy số — không cần đi hết chuỗi redirect.

Header bắt buộc (thiếu là FB trả 400):
`User-Agent` (browser), `Accept: text/html,...`, `Accept-Language`, `Upgrade-Insecure-Requests: 1`,
`Sec-Fetch-Site: none`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-User: ?1`, `Sec-Fetch-Dest: document`.

> Lưu ý độ bền: đây là web public của FB (không phải Graph API). Cơ chế anti-bot có thể đổi. ⇒ resolve
> **lazy + cache**, không gọi cho cả danh sách khi mở dropdown.

## Quyết định thiết kế đã chốt
- **Lazy + cache**: chỉ gọi FB khi cần (page được chọn / item hiển thị), cache `page_id → profile_id` qua
  `ICacheService` (Redis). Không resolve toàn bộ list.
- **Sửa bug cũ trước**: gỡ `ProfileUrlId` lấy từ `link` (đang trả về chính `page.id`).

---

## Bước 1 — Backend: service resolve (không token, không cookie)

Tạo resolver, ví dụ `IMetaFacebookPageProfileResolver` + impl trong
`backend/MediationPro.Infrastructure/Services/MetaAds/`:

- Đăng ký bằng `AddHttpClient<...>` (pattern sẵn có ở `Program.cs` ~dòng 611–686), với
  `HttpClientHandler { AllowAutoRedirect = false }` (RestSharp cũng được, nhưng `HttpClient` gọn hơn cho việc đọc `Location`).
- Method `Task<string?> ResolveProfileIdAsync(string pageId, CancellationToken ct)`:
  1. Cache-first: `ICacheService.GetAsync<...>($"meta:fb:page-profile-id:{pageId}")`. (T phải là class →
     bọc trong record nhỏ, vd `record PageProfileIdCacheEntry(string? ProfileId)`.)
  2. Miss → `GET https://www.facebook.com/{pageId}` với đủ header ở trên, timeout ~5s.
  3. Nếu status 301/302 và có `Location`: bóc số bằng regex `(\d{6,})` (ưu tiên `[?&]id=(\d+)` nếu Location
     đã là `profile.php?id=`); ra `profileId`.
  4. Không redirect / không match → `profileId = null`.
  5. Cache: hit TTL dài (vd 30 ngày, ID ổn định); negative (null) TTL ngắn (vd 1 giờ) để tránh gọi dồn.
  6. Bọc try/catch toàn bộ → lỗi mạng trả `null`, không ném ra ngoài.
- Base URL nên đưa vào config (`MetaAds:PublicWebBaseUrl` mặc định `https://www.facebook.com`) để test/override.

## Bước 2 — Endpoint resolve theo page

Trong `MetaReferenceController` (cùng cụm `ad-accounts/{adAccountId}/facebook-pages`):
```
GET {REFERENCE_PREFIX}/ad-accounts/{adAccountId}/facebook-pages/{pageId}/profile-id
→ 200 { "pageId": "...", "profileId": "61586992441299" | null,
        "profileUrl": "https://www.facebook.com/profile.php?id=61586992441299" | null }
```
- Giữ authz/resolve org context như các endpoint reference khác (dù resolver không cần token, vẫn để qua
  controller để đồng nhất xác thực + tránh lộ làm proxy mở).
- `profileUrl` chỉ set khi `profileId != null`.

## Bước 3 — Gỡ field URL ID sai ở luồng list

File `MetaFacebookPageReferenceService.cs`:
- Trong `ToDto` (dòng ~307–309): **bỏ** `ProfileUrlId = ParseProfileUrlId(page.Link)` (và `ProfileUrl = page.Link`).
- Xóa hàm `ParseProfileUrlId` (dòng ~250–289) — không dùng nữa.
- `link` trong query Graph có thể giữ hoặc bỏ (không còn dùng để suy ID). `picture{url}` GIỮ.
- DTO list `MetaFacebookPageReferenceDto`: bỏ `ProfileUrl`/`ProfileUrlId` khỏi response list (giữ
  `PictureUrl`). ID giờ chỉ đến từ endpoint Bước 2.

## Bước 4 — Frontend (lazy)

- `frontend/types/meta-ads.ts`: bỏ `profileUrl`/`profileUrlId` khỏi `MetaFacebookPageReferenceDto` (giữ
  `pictureUrl`); thêm type cho response resolve `{ pageId, profileId, profileUrl }`.
- `frontend/lib/api/meta-ads.ts`: thêm `getFacebookPageProfileId(adAccountId, pageId)` gọi endpoint Bước 2.
- `section-creative.tsx`:
  - State map `Record<pageId, profileId | null>` + set đang-load để tránh gọi trùng.
  - Khi **chọn 1 page** (hoặc khi item hiển thị trong popover, debounce) → gọi resolve nếu chưa có trong map,
    lưu kết quả. Hiển thị `URL ID {profileId}` (link tới `profileUrl`, mở tab mới, `stopPropagation`).
  - Avatar (`pictureUrl`) giữ nguyên như đã làm.
  - `null` (chưa/không resolve được) → ẩn dòng URL ID hoặc hiện "—", không vỡ layout.

## Bước 5 — Test
- Unit resolver: Location `/61586992441299/` → `61586992441299`; Location `profile.php?id=123` → `123`;
  status 200 / không Location → `null`; mock `HttpClient` qua handler giả.
- Cache: gọi 2 lần cùng pageId → lần 2 không phát HTTP request (verify qua mock).
- Manual: chọn page NPE → URL ID = `61586992441299` (KHÁC Page ID `989077160948958`); page cổ điển →
  có thể trùng Page ID (đúng bản chất). Cả 2 nguồn `promote_pages` & `access_token_all`.

## Ràng buộc
- KHÔNG resolve toàn bộ list khi mở dropdown (chỉ lazy theo page chọn/hiển thị + cache).
- KHÔNG cookie/token tới web FB; chỉ bộ header điều hướng. Đặt timeout + try/catch → `null` khi lỗi.
- Mọi field/UI mới đều chịu được `null`.
- `facebookPageId` submit vẫn là `page.id` (KHÔNG đổi sang profile_id).

## Tệp bị ảnh hưởng (giải pháp chốt)

| Tầng | File | Thay đổi |
|---|---|---|
| BE resolver | `Services/MetaAds/MetaFacebookPageProfileResolver.cs` (mới) + `Program.cs` | `AddHttpClient` no-redirect; resolve 301 → bóc ID; cache `ICacheService` |
| BE controller | `MetaReferenceController.cs` | Endpoint `.../facebook-pages/{pageId}/profile-id` |
| BE cleanup | `MetaFacebookPageReferenceService.cs` + `MetaReferenceDtos.cs` | Gỡ `ParseProfileUrlId`/`ProfileUrlId` sai khỏi list |
| FE | `types/meta-ads.ts`, `lib/api/meta-ads.ts`, `section-creative.tsx` | Type+API resolve; lazy fetch + hiển thị URL ID; giữ avatar |
