# AppMetrica Reporting API — lỗi thường gặp

| Lỗi | Nguyên nhân | Gợi ý |
|-----|-------------|--------|
| **4002** `Incorrectly specified metric` (vd. `ym:ge:newUsers`, `ym:ge:avgSessionDuration`) | Metric không thuộc nhóm prefix đó — xem [generic_events](https://appmetrica.yandex.com/docs/en/mobile-api/stat/metrics/generic_events/generic_events) cho `ym:ge:`. | Dùng đúng tên metric theo doc; new users → `ym:u:newUsers` (request riêng). |
| **4011** `incompatible` — `ym:ge:date` với `ym:s:*` hoặc `ym:u:*` metrics | Metrics và dimensions phải **cùng prefix** (trừ khi dùng `filters`). | **Sessions:** `AppMetrica:DailyStatsSessionDurationDimensions` — chỉ `ym:s:*`. **New users:** `AppMetrica:DailyStatsNewUsersDimensions` — chỉ `ym:u:*`. Copy từ **Export → Copy table API**. Để trống = không gọi request đó (avg / new_users = 0). App **bỏ qua** cấu hình nếu có dimension sai prefix → không spam 4011. |

Chi tiết luồng daily stats: **117_-_APPMETRICA_INTEGRATION_GUIDE.md** § 3.3.
