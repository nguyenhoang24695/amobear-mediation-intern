# 128b — AppsFlyer Master API Field Reference (Verified)

> **Addendum cho Doc 128 — AppsFlyer Integration**  
> **Mục đích:** Danh sách chính xác groupings & KPIs đã verified chạy thực tế  
> **Version:** 1.0 — 2026-04-11

---

## 1. Lỗi đã phát hiện và sửa từ docs gốc

AppsFlyer docs không public đầy đủ exact field names. Dưới đây là bảng lỗi đã phát hiện khi test thực tế:

| Field sai | Lỗi API trả | Field đúng / Giải pháp |
|-----------|-------------|----------------------|
| `date` (grouping) | "Wrong groupings used: date" | `install_time` |
| `total_cost` (kpi) | "Wrong API Fields" | `cost` |
| `total_revenue` (kpi) | "Wrong API Fields" | `revenue` |
| `activity_arpu` | "Wrong API Fields" | Không tồn tại — tính manual: `revenue / installs` |
| `activity_uninstalls` | "Wrong API Fields" | `uninstalls` (không có prefix `activity_`) |
| `activity_average_dau` | "Wrong API Fields" | Không có trong Master API — dùng Activity dashboard hoặc Pull API |
| `activity_average_mau` | "Wrong API Fields" | Không có trong Master API |
| `activity_sessions` | "Wrong API Fields" | `sessions` (không có prefix `activity_`) |
| `activity_revenue` | "Wrong API Fields" | `revenue` (không có prefix `activity_`) |
| `cohort_day_7_roas` | "Wrong API Fields" | Không tồn tại — dùng `calculated_kpi` formula |
| `cohort_day_7_sessions` | "Wrong API Fields" | Không tồn tại |
| `cohort_day_30_roas` | "Wrong API Fields" | Không tồn tại |
| `cohort_day_30_sessions` | "Wrong API Fields" | Không tồn tại |
| `detection_installs` | "Wrong API Fields" | Protect360 premium — không available |
| `detection_installs_rate` | "Wrong API Fields" | Protect360 premium — không available |
| `blocked_installs` | "Protect360 is premium" | Cần Protect360 subscription |
| `af_purchase_unique_users` | "Wrong API Fields" | Event KPIs format khác — xem Section 4 |
| `af_purchase_event_counter` | "Wrong API Fields" | Event KPIs format khác |
| `af_purchase_sales_in_usd` | "Wrong API Fields" | Event KPIs format khác |

---

## 2. Groupings — Danh sách chính xác (verified)

| Grouping | Mô tả | Confirmed working |
|----------|--------|--------------------|
| `app_id` | App identifier (dùng với `app_id=all`) | ✅ |
| `install_time` | Install date — **KHÔNG PHẢI `date`** | ✅ |
| `pid` | Media source (Facebook Ads, googleadwords_int, etc.) | ✅ |
| `c` | Campaign name | ✅ |
| `af_c_id` | Campaign ID | ✅ |
| `af_adset` | Ad set name | ✅ |
| `af_adset_id` | Ad set ID | ✅ |
| `af_ad` | Ad name | ✅ |
| `af_ad_id` | Ad ID | ✅ |
| `geo` | Country code (US, VN, JP...) | ✅ |
| `af_channel` | Channel | ✅ |
| `af_siteid` | Site ID / Sub-publisher | ✅ |
| `af_keywords` | Keywords | ✅ |
| `af_prt` | Agency / Partner | ✅ |
| `af_ad_type` | Ad type (LTV KPIs only) | ✅ |
| `is_primary` | Primary attribution flag | ✅ |

### Groupings KHÔNG tồn tại

| Sai | Ghi chú |
|-----|---------|
| ❌ `date` | Dùng `install_time` |
| ❌ `media_source` | Dùng `pid` |
| ❌ `campaign` | Dùng `c` |
| ❌ `country` | Dùng `geo` |
| ❌ `campaign_id` | Dùng `af_c_id` |

---

## 3. KPIs — Danh sách chính xác (verified)

### 3.1 LTV KPIs (install-day based)

Đây là nhóm KPIs chính, dùng cho majority Nexus pipeline calls.

| KPI | Mô tả | Confirmed |
|-----|--------|-----------|
| `installs` | Total installs | ✅ |
| `cost` | UA spend from partners | ✅ |
| `revenue` | LTV revenue | ✅ |
| `roi` | Return on investment | ✅ |
| `arpu_ltv` | Average revenue per user (lifetime) | ✅ |
| `average_ecpi` | Effective cost per install | ✅ |
| `clicks` | Ad clicks | ✅ |
| `impressions` | Ad impressions | ✅ |
| `ctr` | Click-through rate | ✅ |
| `conversion_rate` | Click-to-install conversion rate | ✅ |
| `sessions` | App sessions | ✅ |
| `loyal_users` | Users meeting loyal criteria | ✅ |
| `loyal_users_rate` | % loyal users | ✅ |
| `uninstalls` | App uninstalls | ✅ |

### 3.2 Retention KPIs

| KPI | Mô tả | Confirmed |
|-----|--------|-----------|
| `retention_day_1` đến `retention_day_30` | Absolute retention count | ✅ |
| `retention_rate_day_1` đến `retention_rate_day_30` | Retention rate (%) | ✅ |

⚠️ Max D30. Data cho `retention_day_N` chỉ available N+1 ngày sau install date.

### 3.3 Cohort KPIs

| KPI | Mô tả | Confirmed |
|-----|--------|-----------|
| `cohort_day_X_total_revenue_per_user` | Cumulative revenue per user at day X | ✅ |

⚠️ X = 1 đến 90. Chỉ field `total_revenue_per_user` được confirm. Các fields khác (`_roas`, `_sessions`, `_revenue`) **không tồn tại** trong Master API.

⚠️ **416 Error**: Nếu `from=to` (single day) và request cohort D7+, sẽ fail vì data chưa tồn tại. Set `from` ít nhất 30 ngày trước.

### 3.4 Protect360 KPIs (Premium — cần subscription riêng)

| KPI | Mô tả | Status |
|-----|--------|--------|
| `blocked_installs` | Real-time blocked installs | ⚠️ Premium only |
| `blocked_installs_rate` | Blocked install rate | ⚠️ Premium only |

❌ `detection_installs`, `detection_installs_rate` — **không tồn tại** trong Master API.

### 3.5 Event KPIs — Format đặc biệt

In-app event KPIs trong Master API **KHÔNG** dùng format `{event_name}_unique_users`. Event-level data chỉ available qua:

1. **Pull API Raw Data** — `in_app_events_report/v5` (per-event rows)
2. **Cohort API** — filter by specific event
3. **Master API revenue** — đã bao gồm tổng revenue từ tất cả events

→ **Nexus pipeline:** Dùng Pull API raw data cho event-level breakdown, không dùng Master API.

### 3.6 KPIs KHÔNG tồn tại (common mistakes)

| Sai | Ghi chú |
|-----|---------|
| ❌ `total_cost` | Dùng `cost` |
| ❌ `total_revenue` | Dùng `revenue` |
| ❌ `activity_*` (all prefixed) | Không có prefix — dùng `sessions`, `revenue`, `uninstalls` |
| ❌ `average_dau`, `average_mau` | Không có trong Master API |
| ❌ `cohort_day_X_roas` | Không có — tính bằng `calculated_kpi` |
| ❌ `cohort_day_X_sessions` | Không có trong Master API |
| ❌ `{event}_unique_users` | Không có — dùng Pull API raw data |
| ❌ `{event}_event_counter` | Không có — dùng Pull API raw data |
| ❌ `{event}_sales_in_usd` | Không có — dùng Pull API raw data |

---

## 4. Recommended Nexus Pipeline Calls (verified working)

### 4.1 Daily Sync — 3 calls đủ

**Call 1: Core LTV (primary)**
```
GET /api/master-agg-data/v4/app/all
  ?from=2026-03-01&to=2026-04-04
  &groupings=app_id,install_time,pid,geo
  &kpis=installs,cost,revenue,roi,average_ecpi,sessions,loyal_users_rate
  &format=csv
```

**Call 2: Retention**
```
GET /api/master-agg-data/v4/app/all
  ?from=2026-03-01&to=2026-03-28  ← ít nhất 7 ngày trước today
  &groupings=app_id,install_time,pid,geo
  &kpis=installs,retention_day_1,retention_day_3,retention_day_7,retention_day_14,retention_day_30
  &format=csv
```

**Call 3: Conversion Funnel**
```
GET /api/master-agg-data/v4/app/all
  ?from=2026-03-01&to=2026-04-04
  &groupings=app_id,install_time,pid
  &kpis=installs,clicks,impressions,ctr,conversion_rate
  &format=csv
```

### 4.2 Weekly Sync — Cohort LTV

```
GET /api/master-agg-data/v4/app/all
  ?from=2026-02-01&to=2026-03-15  ← 30+ days trước today cho D30 data
  &groupings=app_id,install_time,pid,geo
  &kpis=installs,cost,cohort_day_7_total_revenue_per_user,cohort_day_14_total_revenue_per_user,cohort_day_30_total_revenue_per_user
  &format=csv
```

### 4.3 Ad-hoc — ROAS calculation via calculated_kpi

```
GET /api/master-agg-data/v4/app/all
  ?from=2026-02-01&to=2026-03-15
  &groupings=app_id,install_time,pid
  &kpis=installs,cost,revenue,average_ecpi,cohort_day_7_total_revenue_per_user
  &calculated_kpi_roas_d7=(cohort_day_7_total_revenue_per_user-average_ecpi)/average_ecpi
  &format=csv
```

---

## 5. Updated Nexus Sync Schedule

| Job | Schedule | API Call | Date Range |
|-----|----------|---------|-----------|
| `AppsFlyerMasterLtvSync` | Daily 06:30 UTC | Call 1 (Core LTV) | T-30 to T-1 |
| `AppsFlyerMasterRetentionSync` | Daily 06:35 UTC | Call 2 (Retention) | T-37 to T-8 |
| `AppsFlyerMasterFunnelSync` | Daily 06:40 UTC | Call 3 (Funnel) | T-30 to T-1 |
| `AppsFlyerMasterCohortSync` | Weekly Mon 07:00 | Call 4 (Cohort LTV) | T-90 to T-30 |

### Date range strategy

- **LTV/Funnel:** T-30 to T-1 — covers recent installs + LTV accumulation
- **Retention:** T-37 to T-8 — needs 7+ days after install for D7 data
- **Cohort:** T-90 to T-30 — needs 30+ days for D30 cohort data

⚠️ **KHÔNG** dùng `from=to` (single day) cho Retention/Cohort — sẽ trả 416 error.

---

## 6. Pull API vs Master API — Khi nào dùng gì

| Need | Master API | Pull API |
|------|-----------|----------|
| All apps 1 call | ✅ `app_id=all` | ❌ Per-app only |
| Aggregate KPIs | ✅ Best choice | ⚠️ Less flexible |
| Cost data | ✅ Included | ✅ In aggregate reports |
| Event-level breakdown | ❌ Không support | ✅ `in_app_events_report` |
| Raw install records | ❌ Aggregate only | ✅ `installs_report` |
| DAU/MAU | ❌ Không có | ✅ Activity in Aggregate Pull |
| Protect360 fraud | ⚠️ Premium only | ✅ `blocked_installs_report` |
| Ad Revenue attribution | ❌ Không có | ✅ `ad_revenue_raw` |

**Nexus strategy:**
- **Master API** = primary cho aggregate KPIs (installs, cost, revenue, retention, cohort)
- **Pull API** = supplement cho raw data, event-level, ad revenue, fraud reports

---

*Document maintained by: Amobear Nexus Team*  
*Last updated: 2026-04-11*
