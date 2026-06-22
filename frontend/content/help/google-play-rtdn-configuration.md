# Google Play RTDN — Cấu hình tích hợp

Tài liệu này hướng dẫn cấu hình Google Play Real-time Developer Notifications (RTDN) để Google gửi sự kiện purchase/subscription vào endpoint:

`POST /api/webhooks/google-play/rtdn`

Luồng tổng quát:

1. Google Play Console phát RTDN vào Google Cloud Pub/Sub topic.
2. Pub/Sub push subscription gọi webhook Nexus.
3. Backend validate Pub/Sub push JWT, lưu raw vào `bronze.google_play_events_raw`, backup MinIO, rồi enqueue job xử lý giao dịch.

## Điều kiện trước khi cấu hình

- Có quyền Admin trên Google Play Console của app cần tích hợp.
- Có Google Cloud project dùng cùng Google Play Developer API.
- Backend Nexus public URL phải truy cập được từ Google Pub/Sub bằng HTTPS.
- StarRocks và MinIO đã cấu hình nếu muốn lưu raw/pipeline đầy đủ.
- Service account backend có quyền gọi Google Play Android Publisher API cho package cần xử lý.

## 1. Tạo Pub/Sub topic

Trong Google Cloud Console:

1. Vào **Pub/Sub** → **Topics**.
2. Tạo topic, ví dụ:

   `google-play-rtdn`

3. Copy full topic name:

   `projects/{project-id}/topics/google-play-rtdn`

Topic này sẽ được khai báo trong Google Play Console.

## 2. Tạo push subscription

Trong Pub/Sub topic vừa tạo:

1. Chọn **Create subscription**.
2. Delivery type: **Push**.
3. Endpoint URL:

   `https://{api-domain}/api/webhooks/google-play/rtdn`

4. Bật authentication cho push endpoint bằng OIDC token.
5. Chọn service account dùng để ký token Pub/Sub push.
6. Audience nên đặt bằng đúng webhook URL:

   `https://{api-domain}/api/webhooks/google-play/rtdn`

7. Ack deadline có thể giữ mặc định.

Backend sẽ đọc header:

`Authorization: Bearer {google_pubsub_oidc_jwt}`

và validate bằng `GooglePlayPubSubJwtValidator`.

## 3. Cấp quyền cho Pub/Sub service account

Service account dùng để push cần quyền gọi endpoint theo chính sách hệ thống đang dùng. Với Nexus, webhook này không dùng access token nội bộ, nhưng JWT Pub/Sub phải validate được.

Kiểm tra cấu hình backend `GooglePlay` trong `appsettings`/environment:

- `GooglePlay:PubSubAudience`: audience kỳ vọng, thường là webhook URL đầy đủ.
- `GooglePlay:PubSubAllowedIssuer`: issuer OIDC của Google, nếu hệ thống đang cấu hình chặt.
- `GooglePlay:PubSubAllowedEmail`: service account email được phép push, nếu có bật allowlist.

Tên key chính xác có thể xem trong `GooglePlayPubSubJwtValidator` và file `appsettings.sample.json`.

## 4. Bật RTDN trong Google Play Console

Trong Google Play Console:

1. Chọn app.
2. Vào **Monetize** hoặc **Setup** → **Real-time developer notifications**.
3. Nhập Pub/Sub topic:

   `projects/{project-id}/topics/google-play-rtdn`

4. Gửi test notification nếu Console hỗ trợ.
5. Lưu cấu hình.

Sau khi lưu, Google Play sẽ publish developer notification vào topic khi có subscription/purchase event.

## 5. Cấu hình package mapping trong Nexus

Để job xử lý RTDN biết package thuộc app nào, cần có mapping Google Play package trong hệ thống:

- Package name: ví dụ `com.company.app`.
- Nexus app / AdMob app id tương ứng.
- Google Play account/service account dùng để query purchase token.

Nếu mapping thiếu, raw RTDN vẫn có thể được lưu, nhưng job xử lý chi tiết purchase/subscription có thể không resolve được app hoặc không gọi được Android Publisher API.

## 6. Test bằng Postman

Collection Postman có request:

`21. Webhooks & MinIO test` → `POST Google Play RTDN webhook`

Request mẫu dùng body Pub/Sub push:

```json
{
  "message": {
    "messageId": "google-play-rtdn-test-00000000-0000-0000-0000-000000000001",
    "publishTime": "2026-06-22T06:18:49Z",
    "data": "base64-developer-notification-json"
  },
  "subscription": "projects/example-project/subscriptions/google-play-rtdn"
}
```

Lưu ý: request thật cần Bearer JWT từ Google Pub/Sub push. Biến Postman `googlePlayPubSubJwt` chỉ dùng khi bạn có token test hợp lệ. Nếu để trống hoặc dùng app `accessToken`, endpoint sẽ trả `401`.

## 7. Kiểm tra sau khi nhận webhook

Khi webhook thành công, kỳ vọng:

- HTTP response `200 OK`.
- Có raw row trong `bronze.google_play_events_raw`.
- Có object backup trong MinIO:

  `raw/google-play/rtdn/dt=yyyy-MM-dd/{messageId}.json`

- Có Hangfire job `GooglePlayRtdnProcessJob` được enqueue.
- Sau xử lý, dữ liệu IAP/transaction được đẩy qua pipeline Google Play tương ứng.

## 8. Lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách kiểm tra |
|---|---|---|
| `401 Unauthorized` | Pub/Sub JWT sai audience, issuer, service account, hoặc thiếu header Authorization | Kiểm tra push subscription OIDC audience và cấu hình `GooglePlay:*` |
| `400 Invalid Pub/Sub message` | Body không đúng envelope Pub/Sub hoặc thiếu `messageId`/`data` | So lại JSON request mẫu |
| `400 Invalid RTDN payload` | `message.data` không phải base64 JSON DeveloperNotification | Decode base64 và kiểm tra `packageName`, `eventTimeMillis`, notification object |
| Raw có nhưng job xử lý lỗi | Thiếu package mapping hoặc service account Google Play API chưa có quyền | Kiểm tra logs `GooglePlayRtdnProcessJob` và mapping package |

## Checklist production

- Webhook URL dùng HTTPS public.
- Pub/Sub push subscription bật OIDC authentication.
- Audience trong Pub/Sub khớp backend validator.
- Service account push nằm trong allowlist nếu có cấu hình.
- Google Play Console đã trỏ đúng topic.
- Package mapping và Google Play account đã được tạo trong Nexus.
- Đã test một RTDN thật hoặc test notification từ Play Console.
