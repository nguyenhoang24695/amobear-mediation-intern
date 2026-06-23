# Hướng dẫn bắt đầu: Màn hình quản lý Waterfall Ad Unit

## 1. Waterfall Ad Unit là gì?

- **Waterfall Ad Unit** (AdMob Network Waterfall Ad Unit) là từng **dòng/placement** trong waterfall của mediation: mỗi dòng gắn với một network, có **floor price** (eCPM), format (banner, interstitial, rewarded…).
- Dữ liệu sync từ AdMob vào bảng `ad_mob_network_waterfall_ad_units`, gắn với **App** (theo `AppId`).
- "Quản lý" thường gồm: **xem danh sách**, **lọc theo app/publisher**, **sửa floor price**, **copy ID**, có thể **bulk actions** (nếu backend hỗ trợ).

---

## 2. Hiện trạng trong codebase

| Thành phần | Mô tả |
|------------|--------|
| **Tab trong App detail** | Trang **Apps → [chọn app] → tab "Waterfall Ad Units"** đã có bảng danh sách waterfall ad units của **một app**: search, sort, pagination, copy ID. File: `frontend/components/apps/app-detail/app-waterfall-ad-units-tab.tsx`. |
| **API theo app** | `GET /api/Structure/apps/{id}/waterfalladunits` — trả về list waterfall ad units của app (id = internal app id). Gọi từ `structureApi.getAppWaterfallAdUnits(appId)`. |
| **Entity / type** | Backend: `AdMobNetworkWaterfallAdUnit` (Id, Name, AdmobNetworkWaterfallAdUnitId, DisplayName, AppId, Format, AdTypesJson, GlobalFloorMicros, PublisherId, …). Frontend: `WaterfallAdUnit` trong `types/api.ts`. |

Tức là **đã có** màn “xem danh sách waterfall ad unit” nhưng **theo từng app** (trong app detail). Chưa có trang **tổng hợp toàn bộ** (hoặc lọc theo nhiều app/publisher) và chưa có thao tác “sửa floor” trực tiếp trên danh sách (nếu sếp cần).

---

## 3. “Màn hình quản lý” có thể là 2 hướng

### Hướng A: Trang độc lập “Quản lý Waterfall Ad Units”

- **Route:** ví dụ `/waterfall-ad-units`.
- **Mục đích:** Xem/quản lý **tất cả** (hoặc lọc theo publisher / app) waterfall ad units, không bắt buộc vào từng app.
- **Cần:**
  - Backend: API list (có filter theo `publisherId`, `appId` hoặc app internal id), có thể phân trang.
  - Frontend: Trang mới (layout giống Apps): filter (app, publisher), bảng danh sách, sort, pagination; có thể link sang app detail hoặc tab waterfall của app.

### Hướng B: Nâng cấp tab hiện có trong App detail

- **Vị trí:** Giữ nguyên trong **Apps → [app] → tab Waterfall Ad Units**.
- **Mục đích:** “Quản lý” rõ ràng hơn: thêm **sửa floor**, **bulk actions**, export, v.v.
- **Cần:**
  - Backend: API update floor (hoặc dùng luồng Apply Waterfall / Update Waterfall hiện có nếu đủ).
  - Frontend: Trong `app-waterfall-ad-units-tab.tsx`: thêm nút Edit, modal/drawer sửa floor; có thể thêm chọn nhiều dòng và bulk action.

Bạn (hoặc sếp) cần **chốt một trong hai** (hoặc cả hai: trang tổng hợp + nâng cấp tab) để triển khai đúng ý.

---

## 4. Gợi ý bắt đầu (nếu chọn Hướng A – Trang độc lập)

### Bước 1: Làm rõ yêu cầu với sếp

- Trang **mới** `/waterfall-ad-units` (xem tất cả / lọc) hay chỉ **nâng cấp tab** trong app?
- Cần **thao tác gì**: chỉ xem + copy ID, hay **sửa floor**, enable/disable, bulk?
- Lọc theo **publisher** và/hoặc **app** có bắt buộc không?

### Bước 2: Backend (nếu làm trang tổng hợp)

- Thêm endpoint, ví dụ:
  - `GET /api/Structure/waterfalladunits?publisherId=xxx&appId=yyy&page=1&pageSize=20`
- Trong `StructureController` (hoặc controller riêng): query `AdMobNetworkWaterfallAdUnits` + join `Apps` nếu cần tên app; filter theo `PublisherId`, `AppId`; trả về list (có thể có tổng số cho pagination).

### Bước 3: Frontend – Trang mới

- **Route:** Tạo `app/waterfall-ad-units/page.tsx` (hoặc `app/(dashboard)/waterfall-ad-units/page.tsx` tùy cấu trúc).
- **Layout:** Dùng `DashboardLayout` giống `apps-page-content.tsx`.
- **Component:** Một page content component (ví dụ `WaterfallAdUnitsPageContent`) gồm:
  - Filter: dropdown/chọn app (và publisher nếu backend có).
  - Bảng: cột App, DisplayName, Format, GlobalFloorMicros, AdmobNetworkWaterfallAdUnitId, LastSyncedAt, Actions (copy ID, link sang app).
- **API:** Gọi API list mới (ví dụ `structureApi.getWaterfallAdUnits({ publisherId, appId, page, pageSize })`).
- **Sidebar:** Thêm mục “Waterfall Ad Units” (hoặc đặt trong nhóm Settings/Admin) trỏ tới `/waterfall-ad-units`.

Có thể **copy cấu trúc** từ `apps-page-content.tsx` + `apps-table.tsx` rồi đổi dữ liệu sang waterfall ad units và bỏ bớt cột không cần.

---

## 5. Tham chiếu nhanh

| Muốn làm | File / API cần xem |
|----------|--------------------|
| Hiểu cấu trúc tab hiện tại | `frontend/components/apps/app-detail/app-waterfall-ad-units-tab.tsx` |
| API list theo app | `structureApi.getAppWaterfallAdUnits(appId)` → `GET /api/Structure/apps/{id}/waterfalladunits` |
| Type frontend | `WaterfallAdUnit` trong `frontend/types/api.ts` |
| Entity backend | `MediationPro.Core.Entities.AdMobNetworkWaterfallAdUnit` |
| Controller backend | `StructureController.GetAppWaterfallAdUnits` |
| Tham khảo layout trang danh sách | `frontend/app/apps/page.tsx`, `frontend/components/apps/apps-page-content.tsx`, `apps-table.tsx` |

---

## 6. Tóm tắt

- **Đã có:** Tab “Waterfall Ad Units” trong chi tiết app + API list theo app.
- **Chưa rõ:** “Màn hình quản lý” là **trang mới** (tổng hợp) hay **nâng cấp tab** (thêm sửa floor, bulk).
- **Bắt đầu:** Chốt với sếp hướng A hay B (hoặc cả hai) và danh sách thao tác cụ thể → sau đó làm backend API (nếu cần) rồi frontend theo bảng tham chiếu trên.

Nếu bạn chọn rõ **một hướng** (ví dụ “trang mới với filter app + publisher”), có thể viết tiếp từng bước chi tiết (tên API, từng component, từng file cần tạo/sửa).
