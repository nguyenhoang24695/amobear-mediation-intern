# Bảng firebase_admob_mapping — Nguồn dữ liệu từng cột

Bảng dùng cho: (1) **Silver/Gold StarRocks** — map package/app_store_id → admob_app_id; (2) **Firebase ingestion** — map event Firebase → app khi có BigQuery/Firebase Analytics.

---

## Cột bắt buộc / tự điền

| Cột | Nguồn | Ghi chú |
|-----|--------|--------|
| **app_id** | AdMob (bảng `apps.app_id`) | Key nội bộ; thường = admob_app_id. |
| **admob_app_id** | AdMob (bảng `apps.app_id`) | Format `ca-app-pub-xxx~yyy`. |
| **platform** | AdMob (bảng `apps.platform`) | `ANDROID` hoặc `IOS`. |
| **package_name** | Xem bên dưới | Android: từ app_store_id. iOS: từ iTunes Lookup API (bundleId) khi chạy Structure Sync. |

---

## package_name

- **Android:** AdMob trả **App Store ID** = package name (ví dụ `com.example.app`) trong `apps.app_store_id`. Seed / Structure Sync tự điền từ `apps.app_store_id` khi `platform = ANDROID`.
- **iOS:** AdMob chỉ trả **App Store ID dạng số** (ví dụ `6475710058`) trong `apps.app_store_id`.  
  **Bundle ID (package_name) cho iOS** được lấy tự động qua **Apple iTunes Lookup API** khi chạy **Structure Sync**:
  - Service `IItunesLookupService` gọi `GET https://itunes.apple.com/lookup?id={appStoreId}` (public, không cần auth).
  - Response có trường `bundleId` (ví dụ `com.example.app`) → ghi vào `package_name` cho dòng mapping tương ứng.
  - Nếu API lỗi hoặc không trả bundleId, `package_name` iOS giữ NULL; Silver/Gold vẫn dùng `app_store_id` từ bảng App cho iOS.

---

## firebase_project_id và firebase_app_id (tùy chọn)

Chỉ cần khi dùng **Firebase** (Analytics, BigQuery export, ingestion event).

| Cột | Lấy ở đâu |
|-----|-----------|
| **firebase_project_id** | **Firebase Console** → ⚙️ Project settings → **Project ID** (ví dụ `my-game-prod`). |
| **firebase_app_id** | **Firebase Console** → ⚙️ Project settings → **Your apps** → chọn app → **App ID** (dạng `1:123456789012:android:abcdef` hoặc `1:123456789012:ios:abcdef`). |

Cách xem nhanh:

1. Vào [Firebase Console](https://console.firebase.google.com/).
2. Chọn project.
3. **Project settings** (icon bánh răng) → tab **General** → phần **Your apps** → mỗi app có **App ID** và project có **Project ID**.

Dòng mapping “mặc định” dùng cho Silver/Gold (sync từ Structure / seed) có **firebase_project_id** và **firebase_app_id** = **NULL**. Các dòng có điền Firebase dùng cho join event Firebase → app (ví dụ FirebaseIngestionService).

---

## Tóm tắt

- **firebase_project_id, firebase_app_id:** Để trống (NULL) nếu không dùng Firebase; khi dùng Firebase thì lấy từ Firebase Console như trên.
- **package_name với iOS:** Để NULL là đúng (AdMob không cung cấp bundle ID). Nếu có bundle ID từ nguồn khác thì có thể điền tay.
- **package_name với Android:** Tự điền từ `apps.app_store_id` khi sync/seed; không cần thao tác thủ công nếu đã chạy Structure Sync hoặc migration seed.
