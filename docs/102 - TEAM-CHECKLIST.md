# Checklist công việc — Mediation Pro & Superset

**Tài liệu:** Danh sách đầu việc để giao team hoàn thiện sản phẩm Mediation Pro và Superset.  
**Tham chiếu:** [99 - MEDIATION PRO PLATFORM.md](99%20-%20MEDIATION%20PRO%20PLATFORM.md), [99b - Ad Revenue Analytics.md](99b%20-%20Ad%20Revenue%20Analytics.md), [101 - ADMOB-ACCOUNT-SETUP.md](101%20-%20ADMOB-ACCOUNT-SETUP.md)  
**Phiên bản:** 1.0  
**Cập nhật:** 2025

---

## Quy ước Priority

| Priority | Ý nghĩa | Mục tiêu |
|----------|---------|----------|
| **P0** | Critical | Blocker; cần làm trước để vận hành an toàn / đúng yêu cầu |
| **P1** | High | Cốt lõi sản phẩm; hoàn thành trong phase hiện tại |
| **P2** | Medium | Quan trọng; có thể lên kế hoạch phase tiếp theo |
| **P3** | Low | Nice-to-have; khi có bandwidth |

---

# 1. Mediation Pro Tools

## 1.1 User, Organization & Phân quyền

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 1.1.1 | Quản lý Organization | CRUD organization (tên, slug, logo, settings); multi-tenant rõ ràng | P1 | Hiện mới có setup create-admin; cần màn hình quản lý org |
| 1.1.2 | Quản lý User trong Org | Danh sách user, tạo/sửa/deactivate, gán role (viewer/editor/admin/super_admin) | P1 | API đã có (Auth/organization/users); cần UI + test E2E |
| 1.1.3 | Quản lý phân quyền theo App | Gán/revoke quyền (view/edit/manage/owner) theo app cho user hoặc team; UI quản lý permission | P1 | Backend PermissionService có sẵn; cần UI và tích hợp với Structure filter |
| 1.1.4 | Team & Team membership | CRUD team trong org, gán user vào team; phân quyền theo team (nếu dùng) | P2 | Entity Team/TeamMember có; cần luồng đầy đủ |
| 1.1.5 | Invite user (email link) | Gửi email mời user vào org với link set password; token hết hạn; bảng user_invitations | P2 | Có entity UserInvitation; cần flow invite + accept |
| 1.1.6 | Audit log | Ghi log mọi thay đổi (ai, lúc nào, entity nào, giá trị cũ/mới); API + UI xem log | P2 | Doc 99 mục 10.3 có audit_logs |
| 1.1.7 | SSO / LDAP (tùy chọn) | Đăng nhập qua Google/Microsoft hoặc LDAP cho nội bộ | P3 | Sau khi 1.1.1–1.1.3 ổn định |

---

## 1.2 Alert

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 1.2.1 | Hoàn thiện Alert rules CRUD | Tạo/sửa/xóa rule từ UI; metric, operator, threshold, severity, channel (Telegram/Email) | P1 | API Alerts có; cần UI và validation đầy đủ |
| 1.2.2 | Alert Center (Mediation Pro) | Màn hình danh sách alert đang active; Acknowledge, Assign, Resolve; filter theo app/severity/date | P1 | Doc 99 §15: Alert Center + nút action |
| 1.2.3 | Notification channels | Telegram bot ổn định; Email template; (tùy chọn) Slack/webhook | P1 | Đảm bảo không spam, có rate limit |
| 1.2.4 | Alert categories đủ theo doc | Revenue (eCPM drop, revenue drop), Performance (fill rate, match rate), Engagement (DAU, DAV), System (sync fail, data delay) | P1 | Doc 99 §16 Alert Categories |
| 1.2.5 | Alert history & báo cáo | Lịch sử alert đã trigger; báo cáo tuần/tháng (số alert, % đã xử lý, MTTR) | P2 | Phục vụ review và tối ưu rule |
| 1.2.6 | Alert accuracy & tuning | Giảm false positive (tune threshold, time window); có thể thêm simple ML anomaly sau | P3 | Doc 99: Alert accuracy > 90% true positive |

---

## 1.3 Report (báo cáo đa chiều)

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 1.3.1 | Báo cáo Revenue đa chiều | Revenue/eCPM theo app, country, format, network, ngày; export CSV/Excel; filter theo org/user permission | P1 | Những gì Superset làm phức tạp hoặc cần embed trong MP |
| 1.3.2 | Báo cáo SoW & Recommendation | Báo cáo SoW theo MG/instance; danh sách recommendation đã apply vs pending; impact trước/sau | P1 | Gắn với workflow Mediation team |
| 1.3.3 | Scheduled reports (email) | Đăng ký report định kỳ (daily/weekly) gửi email; template PDF/HTML | P2 | Có thể dùng Superset scheduled report + link, hoặc MP gửi riêng |
| 1.3.4 | Report builder đơn giản (tùy chọn) | User chọn dimensions/metrics, date range → tạo bảng/chart + export | P3 | Tránh trùng Superset; chỉ làm nếu cần quick report trong MP |

---

## 1.4 Tích hợp nguồn dữ liệu (theo doc 99)

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 1.4.1 | Firebase / BigQuery | Sync events (DAU, DAV, session); mapping app (package_name ↔ admob_app_id); ETL vào StarRocks silver/gold | P1 | Doc 99 §6.3; 99b, 99c; job Firebase đã có phần nào |
| 1.4.2 | Meta Ads | Sync campaign/insights (spend, impressions, conversions); mapping campaign → app; cost attribution | P2 | Doc 99 §7; Phase 2 |
| 1.4.3 | AppMetrica | Sync stats (users, sessions, crashes); thay/bổ sung Firebase cho app không dùng Firebase | P2 | Doc 99 §7 |
| 1.4.4 | XMP (Mobivista) | Đã có; kiểm tra đầy đủ cost theo module/store_package_id; join với app/revenue trong gold | P1 | Đảm bảo pipeline E2E và dashboard dùng đúng |
| 1.4.5 | AppLovin | Đã có revenue/cohort; đảm bảo ghép với AdMob trong silver/gold; báo cáo unified revenue | P1 | 99b đã mô tả |
| 1.4.6 | Unified metrics engine | DAU/DAV từ Firebase hoặc AppMetrica; UA cost = XMP + Meta; P&L, ARPDAU, ROI theo app/ngày | P2 | Doc 99 §7.2 |

---

## 1.5 Tính năng khác (Mediation Pro)

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 1.5.1 | Waterfall Editor | Xem/chỉnh waterfall (floor, thứ tự); Save to AdMob (Write API); safety check trước khi apply | P1 | Doc 99 §6.2.4; Dolphin thay thế |
| 1.5.2 | SoW Analysis UI | Hiển thị SoW từng instance trong MG; link recommendation; drill-down | P1 | Backend/cache có; cần UI rõ ràng |
| 1.5.3 | Recommendation approve & apply | Danh sách recommendation; approve/reject; apply qua API; log apply (recommendation_apply_log) | P1 | Doc 99 §6.2.4 |
| 1.5.4 | Change history & audit | Lịch sử thay đổi floor/waterfall; ai, khi nào, giá trị cũ/mới; filter theo app/MG/user | P2 | Doc 99 change_history, audit |
| 1.5.5 | Cross-link Mediation Pro ↔ Superset | Nút "Deep dive" → mở Superset với filter (app_id, date); từ Superset "Manage" → mở MP App/Alert | P2 | Doc 99 §15.5, 15.6 |
| 1.5.6 | Dashboard cache & performance | Đảm bảo dashboard load nhanh; cache StarRocks query; refresh schedule rõ ràng | P1 | Đã có DashboardCacheJob; tune theo usage |
| 1.5.7 | Lịch vận hành (Hangfire) | Job schedule đúng theo doc 99 §17 (sync, transform, alert, report); retry, alert khi job fail | P1 | Đã có job-schedules API; cần doc và monitoring |

---

## 1.6 Kiểm soát dữ liệu và cache

| # | Đầu việc | Logic / Mô tả cụ thể | Priority | Ghi chú |
|---|----------|----------------------|----------|--------|
| 1.6.1 | Đồng bộ AdMob Structure – đồng nhất với PostgreSQL | **StructureSyncJob** chạy **0h hàng ngày**. Logic đồng nhất: (1) Lấy toàn bộ danh sách từ AdMob API. (2) So sánh với Postgres: có trên AdMob → upsert; có trong Postgres nhưng không còn trong API → đánh dấu xóa hoặc xóa. (3) Ghi log created/updated/deleted. **Sau sync:** app **mới APPROVED** hoặc app **vừa chuyển sang APPROVED** → `BackgroundJob.Enqueue` → **`DashboardCacheJob.RefreshDashboardCacheForAppAsync`** (merge vào `dashboard:apps:all:today|7days`, không rebuild full). Chi tiết: doc 99 mục 14.3 (Incremental cache). | P1 | Doc 99 §17, §14.3 |
| 1.6.2 | API đồng bộ structure theo 1 app (manual từ frontend) | API nhận app_id; gọi AdMob API lấy một app; cập nhật Postgres chỉ bảng liên quan app đó; áp dụng cùng quy tắc đồng nhất. Frontend: nút "Sync structure" tại App detail. | P1 | Dùng khi cần refresh nhanh 1 app |
| 1.6.3 | Performance sync – tách 2 job (AdMob) | **Daily:** 1 lần/ngày, 5 ngày gần nhất (T-1 đến T-5). **Recent:** mỗi 2 giờ, 2 ngày gần nhất (T-1, T-2). Cron trong hangfire_job_schedules. | P1 | Doc 99 §17 |
| 1.6.4 | Kiểm tra tính toàn vẹn dữ liệu (data integrity) | Định kỳ so sánh số lượng apps/ad_units/mediation_groups Postgres vs AdMob; orphan check; log hoặc báo cáo cho admin. | P2 | |
| 1.6.5 | Cache dashboard – chính sách và refresh | TTL và scope từng loại cache; refresh schedule (sau Performance Sync / transform); invalidation thủ công; doc key pattern, TTL, job trigger. **Bổ sung:** refresh **theo từng app** sau Structure Sync (merge Redis all-apps) — xem 99 §14.3. | P1 | Đã có DashboardCacheJob; `RefreshDashboardCacheForAppAsync` |
| 1.6.6 | Kiểm tra và dọn cache lỗi / stale | Monitoring hit/miss, latency; stale detection (built_at); dọn key không dùng. | P2 | |
| 1.6.7 | AppLovin sync – tách 2 job | Daily: 2h đầu ngày, 5 ngày gần nhất. Recent: mỗi 30 phút, 24h gần nhất. | P1 | Doc 99 §17 |
| 1.6.8 | XMP (chi phí UA) sync – tách 2 job | Daily: 2h đầu ngày, 5 ngày gần nhất. Recent: mỗi 30 phút, 24h gần nhất. | P1 | Doc 99 §17 |

---

## 1.7 Checklist kiểm tra cache (dashboard + waterfall recommendation)

**Yêu cầu:** (1) Cache đủ today, 7days, 14days, 30days cho từng scope. (2) Mỗi chu kỳ có T-1 để so sánh thay đổi. (3) Cache đi theo phân quyền user (chỉ app user được phép).

**Ma trận scope × period (hiện trạng):** 1 app (metrics/chart/topapps/network: đủ 4 period; mediationgroups/adunits: chỉ today+7d). 1 MG detail: chỉ today. All apps: today+7d (thiếu 14d/30d). All mediationgroups: chỉ today. Waterfall recommendation: 1 key/MG. Chi tiết: 102 và code DashboardCacheJob.

**Tasks:**

| # | Đầu việc | Logic / Kiểm tra | Priority | Ghi chú |
|---|----------|------------------|----------|--------|
| 1.7.1 | Verify cache 1 app (today→30d) và T-1 | DashboardCacheJob đủ 4 job; Redis có key metrics/chart/topapps/network theo period. | P1 | |
| 1.7.2 | Verify T-1 tại DashboardService | Đọc current + previous cache key; tính RevenueChangePct, EcpmChangePct. | P1 | |
| 1.7.3 | Bổ sung 1 app: mediationgroups, adunits cho 14d/30d | Gọi CacheAdUnitsByAppAsync, CacheMediationGroupsByAppAsync trong job 14d/30d. | P1 | |
| 1.7.4 | Bổ sung 1 MG detail cho 7d/14d/30d | Key :detail:7days, :14days, :30days. | P1 | |
| 1.7.5 | Bổ sung all mediationgroups cho 7d/14d/30d | Gọi CacheAllMediationGroupsAsync trong job 7d/14d/30d với key :7days, :14days, :30days. | P1 | |
| 1.7.6 | Bổ sung all apps cho 14d/30d | Gọi CacheAllAppsFromStarRocksAsync trong Cache14DaysDataAsync và Cache30DaysDataAsync. | P1 | |
| 1.7.7 | Verify waterfall recommendation cache | Đủ key cho mọi MG; T-1 nếu UI cần. | P2 | |
| 1.7.8 | **Cache theo phân quyền user (theo App)** | User chỉ được xem app mình có quyền. **Chiến lược:** (1) Giữ cache all-apps (và all-mediationgroups). (2) API danh sách/tổng hợp: **tính lại (recalculate)** metrics từ cache all-apps theo app user được phép — không filter đơn thuần. (3) Chi tiết app: đọc từ cache theo app (dashboard:app:{appId}:...); API kiểm tra permission. (4) Không cache theo từng user. Tóm lại: all-apps làm nguồn → recalc theo permission; chi tiết → cache theo app. Mô tả: 99 §14.3. | P1 | Recalc từ all; detail từ per-app cache |

---

# 2. Superset (StarRocks)

## 2.1 Groups, Roles, Users

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 2.1.1 | Danh sách Roles chuẩn | Định nghĩa role: Admin, Analyst (Mediation/UA/Product), Viewer (read-only); gắn với dataset/dashboard permission | P1 | Tài liệu mô tả từng role, quyền được phép |
| 2.1.2 | Danh sách Groups | Group theo team: Mediation, UA, Product, Marketing, Leadership; map group → role và dataset | P1 | Tài liệu + cấu hình Superset |
| 2.1.3 | User provisioning | Cách tạo user Superset; gán vào group/role; sync với Mediation Pro (SSO) hoặc manual | P1 | Doc hướng dẫn từng bước |
| 2.1.4 | Row-level security (RLS) | Nếu cần: filter data theo org/app theo user (ví dụ qua query hoặc RLS policy) | P2 | Phụ thuộc multi-tenant Superset |
| 2.1.5 | Tài liệu mô tả RBAC | File markdown: bảng Groups, Roles, quyền từng dataset/dashboard, cách thêm/sửa user | P1 | Để onboard và audit |

---

## 2.2 Dashboards & Báo cáo

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 2.2.1 | Dashboard inventory theo doc | Liệt kê đủ dashboard theo 99b và 99 §15: Revenue Overview, App Performance, Executive, UA ROI, Cohort, v.v. | P1 | Bảng: tên, audience, refresh, charts chính |
| 2.2.2 | Dataset chuẩn (Silver/Gold) | Dataset dùng silver/gold StarRocks; chuẩn hóa tên, metric, dimension; doc cho từng dataset | P1 | 99b đã có ds_unified_revenue, ds_app_pnl, v.v. |
| 2.2.3 | Hướng dẫn từng dashboard | Với mỗi dashboard: mục đích, cách đọc chart, filter quan trọng, cách duplicate/tùy chỉnh | P1 | Markdown + (tùy chọn) video ngắn |
| 2.2.4 | Dashboard theo team | Mediation, UA, Product, Marketing, Leadership — mỗi team có 1+ dashboard với tài liệu riêng | P1 | Doc 99 §15.7, 7.3 |
| 2.2.5 | Scheduled reports & alert Superset | Cấu hình gửi email report định kỳ; alert khi metric vượt ngưỡng (nếu dùng Superset alert) | P2 | Có thể kết hợp với MP Alert |
| 2.2.6 | Export & embedding | Hướng dẫn export CSV/PDF; embed dashboard vào trang nội bộ (iframe/SSO) | P2 | Doc 99 §15 |

---

## 2.3 Tích hợp AI (Superset)

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 2.3.1 | Đánh giá option AI trong Superset | Superset có hỗ trợ AI/LLM (natural language to SQL, suggest chart); đánh giá version hiện tại + plugin | P2 | Tránh phụ thuộc tính năng chưa stable |
| 2.3.2 | Natural language → SQL hoặc chart | User gõ câu hỏi tiếng Việt/English → gợi ý query hoặc chart; dùng LLM + context (schema, dataset) | P2 | Cần guardrail (chỉ read, không drop table) |
| 2.3.3 | Gợi ý dataset / chart | Gợi ý "dataset nào để trả lời câu hỏi X"; gợi ý loại chart phù hợp | P3 | Giảm thời gian tạo dataset cho admin |
| 2.3.4 | Tài liệu & training | Hướng dẫn user dùng AI (câu hỏi mẫu, best practice); training nội bộ | P3 | Sau khi 2.3.1–2.3.2 triển khai |

---

## 2.4 Khác (Superset)

| # | Đầu việc | Mô tả ngắn | Priority | Ghi chú |
|---|----------|------------|----------|--------|
| 2.4.1 | Kết nối StarRocks ổn định | Connection string, timeout, connection pool; test với workload thực tế | P1 | 99b, 99 §15.8 |
| 2.4.2 | Backup & restore dashboards | Export metadata (dashboards/datasets); quy trình backup định kỳ và restore | P2 | Tránh mất cấu hình khi upgrade |
| 2.4.3 | Performance & caching | Tuning query; cache layer nếu cần; tránh query quá nặng làm chậm FE | P2 | |
| 2.4.4 | SSO với Mediation Pro | OAuth2/OIDC: login một lần, dùng chung identity với Mediation Pro | P2 | Doc 99 §15.6 |

---

# 3. Thứ tự ưu tiên gợi ý (sprint-level)

- **Sprint 1 (P0/P1 – nền tảng):** 1.1.2, 1.1.3, 1.2.1–1.2.4, 1.5.6, 1.5.7, 2.1.1–2.1.3, 2.1.5, 2.2.1–2.2.4, 2.4.1.
- **Sprint 2 (P1 – workflow):** 1.5.1–1.5.3, 1.3.1–1.3.2, 1.4.1, 1.4.4, 1.4.5, 2.2.5.
- **Sprint 3 (P2):** 1.1.1, 1.1.4–1.1.6, 1.2.5, 1.3.3, 1.4.2–1.4.6, 1.5.4–1.5.5, 2.1.4, 2.2.6, 2.3.1–2.3.2, 2.4.2–2.4.4.
- **Backlog (P3):** 1.1.7, 1.2.6, 1.3.4, 2.3.3–2.3.4.

---

*Cập nhật lần cuối theo checklist trên; khi hoàn thành từng mục nên cập nhật status (Todo / In Progress / Done) trực tiếp trong file hoặc trong tool quản lý task.*
