# MinIO: Cách tìm object trong Console (Object Store UI)

## Phiên bản MinIO và Console đầy đủ (Administrator, Access Keys)

Trong `docker-compose.yml`, MinIO được ghim ở **RELEASE.2025-04-22T22-12-26Z** (trước thay đổi breaking của MinIO). Lý do:

- Từ **RELEASE.2025-05-24** trở đi, embedded Console trong MinIO server chỉ còn **"Object Store Community Edition"** (chỉ Object Browser — không có Administrator, Access Keys, Users, Policies).
- Console đầy đủ (Identity, Access Keys, Users, Policies) đã được tách sang dự án [object-browser](https://github.com/minio/object-browser); image `minio/console` không còn publish trên Docker Hub.

Với phiên bản **RELEASE.2025-04-22**, khi mở **http://&lt;host&gt;:9001** và đăng nhập bằng `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`, bạn sẽ thấy đầy đủ: **Dashboard, Object Browser, Identity (Users/Groups), Access Keys, Policies, Configuration**, v.v. Nếu bạn chỉ thấy Object Browser và không có menu Administrator, hãy kiểm tra image MinIO trong docker-compose đang dùng tag **trước** RELEASE.2025-05-24.

## SSL / HTTP

Khi MinIO chạy **không SSL** (HTTP), cấu hình `MinIO:UseSSL: false` trong `appsettings.json`. Nếu vẫn gặp lỗi **"The SSL connection could not be established"**:

- Presigned URL do SDK tạo có thể mặc định là `https://`; API test (`upload-presigned`, `presigned-put-url`) đã ép URL sang `http://` khi `UseSSL` = false.
- Kiểm tra không có override: `appsettings.Development.json`, biến môi trường, hoặc config khác đặt `MinIO:UseSSL` = true.
- Endpoint nên là `host:port` (vd. `172.19.8.100:9000`), không thêm `http://` hay `https://` trong Endpoint.

## Upload: UseSSL = false dùng presigned PUT + HttpClient

Khi **MinIO:UseSSL: false**, `MinioRawReportRepository` **không** dùng `PutObjectAsync` trực tiếp (tránh lỗi "SSL connection could not be established" nếu SDK vẫn dùng https). Thay vào đó: lấy **presigned PUT URL** từ SDK, ép URL sang **http://** nếu là https, rồi gửi body bằng **HttpClient.PutAsync** (REST thuần). Khi **UseSSL: true** thì vẫn dùng **PutObjectAsync** với stream (Position = 0).

## Cấu trúc object name (path)

Ứng dụng lưu raw report với **object name** dạng:

```
raw/admob/performance/YYYY-MM-DD/performance_YYYYMMDD_{guid}.json
```

hoặc (nếu file > 5MB, đã nén GZip):

```
raw/admob/performance/YYYY-MM-DD/performance_YYYYMMDD_{guid}.json.gz
```

Trong MinIO/S3, dấu `/` trong object name được hiển thị như **cấu trúc thư mục**. Object **không** nằm ở root của bucket mà nằm sâu trong “thư mục”.

## Cách tìm file trong MinIO Console

1. **Mở đúng MinIO Console**  
   Ứng dụng kết nối MinIO qua `MinIO:Endpoint` (ví dụ `172.19.8.100:9000`).  
   → Mở Console tại **http://&lt;cùng-host&gt;:9001** (ví dụ `http://172.19.8.100:9001`).  
   Nếu app dùng `localhost:9000` thì mở `http://localhost:9001`. **Phải cùng instance** với nơi app upload.

2. **Vào bucket**  
   Chọn bucket **amobear-datalake**.

3. **Đi theo “thư mục” (prefix)**  
   - Click vào prefix **raw** (hoặc mục tương ứng “raw”).  
   - Tiếp: **admob** → **performance** → **2026-01-30** (đúng ngày report).  
   - Trong đó sẽ thấy file: `performance_20260130_xxxx.json` hoặc `performance_20260130_xxxx.json.gz`.

4. **Hoặc dùng Search (nếu có)**  
   Trong Object Browser của bucket, tìm theo tên file, ví dụ: `performance_20260130` hoặc `004d8170e0744465b720fa7cfaf97bc7`.

## Kiểm tra object name thực tế trong DB

Bảng **raw_report_metadata** có cột **minio_path** = object name thực tế trong MinIO.

```sql
SELECT id, minio_path, report_date, created_at
FROM raw_report_metadata
ORDER BY created_at DESC
LIMIT 10;
```

Dùng `minio_path` để đi đúng “thư mục” và tên file trong Console (kể cả khi có `.json.gz`).

## Tóm tắt

| Việc cần làm | Chi tiết |
|--------------|----------|
| Console đúng instance | Cùng host với `MinIO:Endpoint` (vd. 172.19.8.100:9001) |
| Bucket | **amobear-datalake** |
| Đường dẫn trong bucket | **raw** → **admob** → **performance** → **2026-01-30** |
| Tên file | `performance_20260130_{guid}.json` hoặc `.json.gz` |

Nếu vẫn không thấy: kiểm tra `minio_path` trong DB và so với cấu trúc trên; đảm bảo đang xem đúng bucket và đúng MinIO instance (cùng endpoint với app).

---

## Access PRIVATE vs PUBLIC

- **Bucket Access: PRIVATE** là mặc định và **không phải nguyên nhân** khi file “ghi nhận thành công nhưng không thấy trên MinIO”.
- Ứng dụng dùng **AccessKey/SecretKey** trong `MinIO:AccessKey` / `MinIO:SecretKey` để upload và đọc; quyền PRIVATE chỉ chặn **truy cập ẩn danh (anonymous)** đọc object, **không chặn** app upload/đọc.
- Nếu bạn **đăng nhập MinIO Console** bằng cùng AccessKey/SecretKey với app thì vẫn thấy đủ object trong bucket PRIVATE.
- **PUBLIC** chỉ cần khi bạn muốn cho phép truy cập đọc object qua URL công khai (không cần đăng nhập). Với raw report, thường giữ PRIVATE.

**Nguyên nhân thường gặp khi “client gọi API thành công nhưng không thấy file”:**

1. **Không cùng MinIO instance**  
   App kết nối tới `MinIO:Endpoint` (vd. `172.19.8.100:9000`). Bạn phải mở Console **cùng host đó**, cổng 9001: `http://172.19.8.100:9001`. Nếu mở `http://localhost:9001` trong khi app trỏ tới `172.19.8.100`, bạn đang xem instance khác → không thấy file.

2. **Thư mục trong MinIO là “ảo”**  
   MinIO/S3 không có khái niệm tạo thư mục trước. Object name `raw/admob/performance/2026-01-30/xxx.json` tự tạo ra cấu trúc thư mục trong UI. Nếu upload thực sự thành công thì “thư mục” sẽ xuất hiện khi có ít nhất một object với prefix đó. Không thấy thư mục thường nghĩa là không có object nào được ghi lên **instance MinIO mà bạn đang xem**.

3. **Upload và metadata**  
   Từ bản cập nhật code, sau khi `PutObject` thành công, app ghi metadata vào DB (bước StatObject đã bỏ); (StatObject sau upload đã bỏ để tránh lỗi khi object chưa hiện ngay.) “thành công” vào DB.

**Cách kiểm tra nhanh:** Khi chạy app, log khởi động in dòng dạng:  
`MinIO storage: Endpoint=..., Bucket=amobear-datalake. Console UI tại http://<host>:9001`  
→ Mở đúng URL đó (thay `<host>` bằng host trong Endpoint), đăng nhập bằng AccessKey/SecretKey trong config, vào bucket **amobear-datalake** và đi theo prefix **raw** → **admob** → **performance** → **YYYY-MM-DD**.
