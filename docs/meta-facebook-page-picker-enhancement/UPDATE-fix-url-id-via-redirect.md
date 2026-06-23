# UPDATE — Sửa "Page URL ID" (cho agent đã implement theo README cũ)

> File này là **bản vá tiếp nối**, dành cho agent đã implement xong phần "Ảnh page + Page URL ID" theo
> `README.md` (bản đầu). KHÔNG làm lại từ đầu — chỉ sửa đúng phần URL ID bị sai và bổ sung cơ chế resolve mới.
> Phần **ảnh page (avatar)** đã đúng → GIỮ NGUYÊN.

---

## 1. Bug đang gặp

Trên dropdown chọn Facebook Page (Meta Create Request), **URL ID đang hiển thị bằng đúng Page ID**.
Ví dụ: Page ID = `989077160948958` thì URL ID cũng ra `989077160948958`, nhưng mở
`https://www.facebook.com/989077160948958` thì FB redirect sang
`https://www.facebook.com/profile.php?id=61586992441299` — một ID khác (page-backed profile ID của
*New Pages Experience*).

### Nguyên nhân (đã xác minh)
Implement cũ lấy URL ID bằng cách parse field Graph `link`. Nhưng `link` được FB dựng **từ chính `page.id`**
(`https://www.facebook.com/989077160948958`), không chứa số `61…`. Hàm `ParseProfileUrlId`
(`MetaFacebookPageReferenceService.cs` ~dòng 250–289) không thấy `?id=` nên rơi vào nhánh fallback
"lấy đoạn số ≥9 ký tự" → trả lại chính `page.id`. ⇒ URL ID == Page ID.

### Cách lấy đúng (đã verify bằng curl thật)
`GET https://www.facebook.com/{page_id}` **kèm header điều hướng trình duyệt** (KHÔNG cookie, KHÔNG token):

```
HTTP/1.1 301 Moved Permanently
Location: https://www.facebook.com/61586992441299/
```

`61586992441299` nằm ngay trong `Location` của hop 301 đầu tiên. Header bắt buộc (thiếu là FB trả 400):
`User-Agent` (browser), `Accept: text/html,...`, `Accept-Language`, `Upgrade-Insecure-Requests: 1`,
`Sec-Fetch-Site: none`, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-User: ?1`, `Sec-Fetch-Dest: document`.

> Đây là web public của FB (không phải Graph API) → anti-bot có thể đổi. ⇒ resolve **lazy + cache**,
> KHÔNG gọi cho cả danh sách khi mở dropdown.

---

## 2. Việc cần làm

### Bước A — Gỡ phần URL ID sai (cleanup implement cũ)
File `backend/MediationPro.Infrastructure/Services/MetaAds/MetaFacebookPageReferenceService.cs`:
- Trong `ToDto` (~dòng 307–309): **bỏ** `ProfileUrl = page.Link` và `ProfileUrlId = ParseProfileUrlId(page.Link)`.
- **Xóa** hàm `ParseProfileUrlId` (~dòng 250–289).
- `picture{url}` trong 3 query Graph (dòng ~156, 174, 192): **GIỮ**. `link` có thể bỏ khỏi query (không còn dùng).

File `backend/MediationPro.Core/DTOs/MetaAds/MetaReferenceDtos.cs`:
- Class `MetaFacebookPageReferenceDto`: **bỏ** `ProfileUrl`, `ProfileUrlId`. **GIỮ** `PictureUrl`.
  (ID giờ đến từ endpoint resolve riêng ở Bước C, không trả kèm trong list nữa.)

File `frontend/types/meta-ads.ts`:
- Interface `MetaFacebookPageReferenceDto` (~dòng 966): **bỏ** `profileUrl`, `profileUrlId`. **GIỮ** `pictureUrl`.

### Bước B — Service resolver mới (HTTP 301, không token/cookie)
Tạo `backend/MediationPro.Infrastructure/Services/MetaAds/MetaFacebookPageProfileResolver.cs`
(+ interface trong `MediationPro.Core/Interfaces/`), đăng ký ở `MediationPro.Api/Program.cs` theo pattern
`AddHttpClient<...>` sẵn có (xem ~dòng 611–686):
- `HttpClient` với `HttpClientHandler { AllowAutoRedirect = false }` để đọc được header `Location`.
- `Task<string?> ResolveProfileIdAsync(string pageId, CancellationToken ct)`:
  1. Cache-first qua `ICacheService` (`backend/.../Cache/RedisCacheService.cs`), key
     `meta:fb:page-profile-id:{pageId}`. `GetAsync<T>` yêu cầu `T : class` → bọc trong
     `record PageProfileIdCacheEntry(string? ProfileId)`.
  2. Miss → `GET {PublicWebBaseUrl}/{pageId}` với đủ header điều hướng ở mục 1, timeout ~5s.
  3. Status 301/302 + có `Location`: bóc ID bằng regex — ưu tiên `[?&]id=(\d+)`, sau đó `(\d{6,})`.
  4. Không redirect / không match → `null`.
  5. `SetAsync`: hit TTL ~30 ngày; negative (null) TTL ~1 giờ.
  6. Try/catch toàn bộ → lỗi mạng trả `null`, không ném.
- Thêm config `MetaAds:PublicWebBaseUrl` (mặc định `https://www.facebook.com`) để override/test.

### Bước C — Endpoint resolve
Trong `backend/MediationPro.Api/Controllers/MetaReferenceController.cs` (cùng cụm
`ad-accounts/{adAccountId}/facebook-pages`), thêm:
```
GET {REFERENCE_PREFIX}/ad-accounts/{adAccountId}/facebook-pages/{pageId}/profile-id
→ 200 {
    "pageId":     "989077160948958",
    "profileId":  "61586992441299" | null,
    "profileUrl": "https://www.facebook.com/profile.php?id=61586992441299" | null
  }
```
- Giữ xác thực / resolve org context như các endpoint reference khác (dù resolver không cần token, vẫn đi
  qua controller để đồng nhất authz, tránh thành proxy mở).
- `profileUrl` chỉ set khi `profileId != null`.

### Bước D — Frontend chuyển sang lazy fetch
File `frontend/lib/api/meta-ads.ts`: thêm `getFacebookPageProfileId(adAccountId, pageId)` gọi endpoint Bước C
(+ type response `{ pageId, profileId, profileUrl }`).

File `frontend/components/meta-ads/create-request/section-creative.tsx`:
- Bỏ chỗ đang đọc `page.profileUrlId` từ list (field đã bị gỡ).
- Thêm state map `Record<pageId, profileId | null>` + set "đang load" để chống gọi trùng.
- Khi **chọn 1 page** (hoặc khi item hiển thị trong popover — debounce) → nếu chưa có trong map thì gọi
  `getFacebookPageProfileId`, lưu kết quả.
- Hiển thị `URL ID {profileId}` (link tới `profileUrl`, mở tab mới; nếu đặt trong `CommandItem` thì
  `stopPropagation` để không kích hoạt chọn). `null` → ẩn dòng URL ID hoặc hiện "—".
- **Avatar (`pictureUrl`) giữ nguyên** như đã làm.

---

## 3. Kiểm thử
- Unit resolver: Location `/61586992441299/` → `61586992441299`; `profile.php?id=123` → `123`;
  status 200 / không Location → `null` (mock `HttpClient` qua handler giả).
- Cache: gọi 2 lần cùng pageId → lần 2 không phát HTTP request.
- Manual: chọn page New Pages Experience → URL ID = `61586992441299` (KHÁC Page ID `989077160948958`);
  page cổ điển → có thể trùng Page ID (đúng bản chất). Test cả 2 nguồn `promote_pages` & `access_token_all`.

## 4. Ràng buộc
- KHÔNG resolve toàn bộ list khi mở dropdown (chỉ lazy theo page chọn/hiển thị + cache).
- KHÔNG cookie/token tới web FB; chỉ bộ header điều hướng. Timeout + try/catch → `null` khi lỗi.
- Mọi field/UI mới đều chịu được `null`.
- `facebookPageId` submit vẫn là `page.id` (KHÔNG đổi sang profile_id).

## 5. Tệp đụng tới
| Tầng | File | Thay đổi |
|---|---|---|
| BE cleanup | `MetaFacebookPageReferenceService.cs`, `MetaReferenceDtos.cs` | Gỡ `ParseProfileUrlId` + `ProfileUrl/ProfileUrlId` khỏi list (giữ `PictureUrl`) |
| BE resolver | `Services/MetaAds/MetaFacebookPageProfileResolver.cs` (mới), `Core/Interfaces/...` (mới), `Program.cs` | `AddHttpClient` no-redirect; resolve 301 → bóc ID; cache `ICacheService` |
| BE endpoint | `MetaReferenceController.cs` | `GET .../facebook-pages/{pageId}/profile-id` |
| FE | `types/meta-ads.ts`, `lib/api/meta-ads.ts`, `section-creative.tsx` | Gỡ field cũ; thêm API + lazy fetch + hiển thị URL ID; giữ avatar |
