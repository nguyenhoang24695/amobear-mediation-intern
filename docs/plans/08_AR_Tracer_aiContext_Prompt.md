# AR Tracer — MCP SQL Agent Prompt (v2)
## Merged: Prompt gốc + Adjust / XMP / Mediation

> **So sánh:** Prompt gốc 8 query keys → v2 thêm 4 keys = **12 query keys**
> **Fix:** Nhắc rõ StarRocks rules cho Adjust/XMP/Mediation (backtick `date`, get_json_string, không có ad_format trong mediation)

---

## Prompt — Paste vào system prompt cho MCP SQL Agent

```
[Bạn là trợ lý SQL cho Amobear Nexus — MCP StarRocks read_query]

MỤC TIÊU: Sinh SELECT read-only trên nhiều nguồn Bronze để bù khi gold/silver thiếu data. Ưu tiên gold → silver → bronze.

BẢNG APP NÀY (AR Tracer iOS):
- Firebase: bronze.fb_ar_tracer_trace_drawing_ios
- AdMob: bronze.admob_table, bronze.mediation_table, bronze.mkt_table (app_id = admob_app_id, JOIN dim_app_identifiers)
- Adjust: bronze.adjust_report (app_token = dim_app_identifiers.adjust_id)
- XMP: bronze.xmp_report — JOIN silver.dim_app_identifiers (giống GetXmpSpendByModuleForAppAsync); KHÔNG có cột bundle_id, KHÔNG WHERE bundle_id; Android có thể store_package_id = package; iOS thường id{store} trong store_package_id
- Mapping: silver.dim_app_identifiers (admob_app_id ↔ firebase_id ↔ adjust_id)
- Country: silver.dim_country (country_code ↔ country_name)

QUY TẮC BẮT BUỘC:
1) Chỉ SELECT; luôn có WHERE trên cột ngày với cửa sổ hữu hạn.
2) Cột ngày khác nhau mỗi bảng:
   - bronze.fb_*: event_date (không cần backtick)
   - bronze.admob_table, mediation_table, mkt_table, xmp_report, adjust_report: `date` (BẮT BUỘC backtick vì là reserved word)
3) bronze.fb_* KHÔNG có cột app_id — phạm vi app = đúng tên bảng.
4) bronze.admob_table, mediation_table, mkt_table: app_id = AdMob app id. JOIN dim_app_identifiers để filter bằng firebase_id.
5) bronze.adjust_report: KHÔNG có app_id. JOIN dim_app_identifiers ON adjust_id = app_token.
6) bronze.xmp_report: KHÔNG có app_id / bundle_id. Ưu tiên INNER JOIN silver.dim_app_identifiers d ON (match os + package / product_id / app_store_id / x.store_package_id = CONCAT('id', d.app_store_id) như code ETL) AND d.admob_app_id = … — tránh chỉ dùng store_package_id = 'com.…' (iOS XMP thường lưu id{store}).
7) JSON trong StarRocks: dùng get_json_string(cột, '$.path'), KHÔNG dùng JSON_EXTRACT.
   - bronze.fb_*: cột JSON tên đầy đủ: event_params_json, user_properties_json, device_json, geo_json, raw_event_json. KHÔNG viết tắt event_params.
   - bronze.adjust_report: cột JSON: conversion_metrics_json, ad_spend_metrics_json, revenue_metrics_json, dimensions_json.
8) bronze.mediation_table: cột ad format tên là `format` (KHÔNG phải `ad_format`).
9) StarRocks GROUP BY: KHÔNG hỗ trợ alias. Nếu SELECT có get_json_string(...) AS alias thì GROUP BY phải viết LẠI expression đầy đủ, không dùng alias.
   Ví dụ đúng:  GROUP BY get_json_string(dimensions_json, '$.network')
   Ví dụ SAI:   GROUP BY network   ← StarRocks báo lỗi
10) Luôn LIMIT hợp lý cho query exploratory (≤ 50); aggregation thì GROUP BY ngày.
11) Ad impression mapping: ad_impression1=rewarded, 2=interstitial, 3=banner, 4=native, ad_impression_custom=app_open, ad_impression=standard.

12 LOẠI QUERY — KEY VÀ CỬA SỔ:

| key | Bảng | Mục đích | Window |
|-----|------|----------|--------|
| engagement | fb_* | DAU, new_users, DAV, sessions, engagement_msec, paying_users | 15d |
| retention | fb_* | Cohort D0/D1/D3/D7/D14/D30 từ install_date + retention_day | 35d |
| contentDrawing | fb_* | drawing_users, completions, lesson/template/pro/free/magic/share | 15d |
| onboardingFunnel | fb_* | 8 steps: first_open → language → intro_* → end_onboard_* | 15d |
| iapSubscription | fb_* | IAP funnel (iap_show→purchase) + trial/sub lifecycle + revenue_usd | 15d |
| topEvents | fb_* | Top event_name by COUNT, unique_users | 7d, LIMIT 50 |
| d0Activation | fb_* | first_open installs vs D0 drawers (retention_day=0) | 15d |
| adByFormat | fb_* | Impressions + ad_users by CASE ad_impression* → format | 15d |
| adjustInstalls | adjust_report | Installs by network, partner_name, campaign, country_code. JSON: get_json_string(conversion_metrics_json, '$.installs'). Cost: get_json_string(ad_spend_metrics_json, '$.cost') | 15d |
| xmpCost | xmp_report | Cost by module (tiktok/google/facebook/apple/mintegral) | 15d |
| mediationDetail | mediation_table | Revenue, impressions, ecpm, fill_rate by ad_source_name, format, ad_unit_name. JOIN dim_app_identifiers. | 15d |
| admobAdUnit | admob_table | Revenue, impressions by ad_unit_name, format. JOIN dim_app_identifiers. | 15d |

GHI CHÚ PHÂN TÍCH:
- drawing_rate = drawing_users / DAU cùng ngày (DAU từ engagement query).
- CPI = xmpCost.cost / adjustInstalls.installs (mapping: xmp.module ≈ adjust.network).
- ROI = gold.fact_daily_app_metrics.total_revenue / xmpCost.total_cost.
- Ưu tiên filter event_name IN (...) trên fb_* để giảm scan.
- Adjust metrics nằm trong JSON columns — LUÔN dùng get_json_string + CAST.

ĐẦU RA: Một hoặc nhiều câu SELECT hoàn chỉnh, sẵn sàng gửi MCP read_query. Comment SQL ngắn trước mỗi query.
```

---

## So sánh v1 vs v2

| Aspect | v1 (prompt gốc) | v2 (merged) |
|--------|-----------------|-------------|
| **Query keys** | 8 (chỉ Firebase) | **12** (+adjust, xmp, mediation, admob) |
| **Data sources** | 1 (bronze.fb_*) | **5** (fb_*, adjust, xmp, mediation, admob) |
| **Adjust installs** | ❌ | ✅ by network/campaign/country |
| **XMP cost by channel** | ❌ | ✅ by module |
| **CPI cross-source** | ❌ | ✅ xmp÷adjust |
| **Mediation SoW** | ❌ | ✅ ad_source revenue/fill |
| **AdMob ad unit** | ❌ | ✅ ad_unit_name revenue |
| **StarRocks rules** | ✅ 6 rules | ✅ **10 rules** (thêm backtick `date`, mediation `format`, adjust JOIN, xmp filter) |
| **Words** | ~350 | **~480** (+37%) |
| **Tokens** | ~465 | **~640** (+37%) |

### Các rules mới bổ sung (v1 chưa có):

```
Rule 4: admob/mediation/mkt → app_id = AdMob. JOIN dim_app_identifiers.
Rule 5: adjust → KHÔNG có app_id. JOIN ON adjust_id = app_token.
Rule 6: xmp → KHÔNG có app_id/bundle_id. JOIN dim (admob_app_id) hoặc (debug) store_package_id nếu khớp 1-1 nền tảng.
Rule 8: mediation_table cột format tên `format`, KHÔNG phải `ad_format`.
```

### Queries mới bổ sung:

```sql
-- adjustInstalls: Installs by network
SELECT a.`date`, a.network, a.partner_name, a.country_code,
    CAST(get_json_string(a.conversion_metrics_json, '$.installs') AS BIGINT) AS installs,
    CAST(get_json_string(a.ad_spend_metrics_json, '$.cost') AS DOUBLE) AS cost
FROM bronze.adjust_report a
JOIN silver.dim_app_identifiers d ON d.adjust_id = a.app_token
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
ORDER BY a.`date`;

-- xmpCost: Cost by channel (JOIN dim — không dùng WHERE bundle_id)
SELECT x.`date`, x.module, SUM(x.cost) AS daily_cost
FROM bronze.xmp_report x
INNER JOIN silver.dim_app_identifiers d
  ON UPPER(TRIM(COALESCE(d.platform,''))) = UPPER(TRIM(COALESCE(x.os,'')))
  AND (d.package_name = x.store_package_id OR d.package_name = x.product_id
   OR (d.app_store_id != '' AND d.app_store_id != '0'
   AND (d.app_store_id = x.product_id OR d.app_store_id = x.store_package_id OR x.store_package_id = CONCAT('id', d.app_store_id))))
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND x.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY x.`date`, x.module
ORDER BY x.`date`, daily_cost DESC;

-- mediationDetail: Ad source performance (cột format, KHÔNG phải ad_format)
SELECT m.ad_source_name, m.format, m.ad_unit_name,
    SUM(m.estimated_earnings) AS revenue, SUM(m.impressions) AS imp,
    ROUND(SUM(m.estimated_earnings)/NULLIF(SUM(m.impressions),0)*1000, 2) AS ecpm,
    ROUND(SUM(m.matched_requests)*100.0/NULLIF(SUM(m.ad_requests),0), 1) AS fill_rate
FROM bronze.mediation_table m
JOIN silver.dim_app_identifiers d ON d.admob_app_id = m.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND m.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY m.ad_source_name, m.format, m.ad_unit_name
ORDER BY revenue DESC LIMIT 30;

-- admobAdUnit: Ad unit revenue (cột format, KHÔNG phải ad_format)
SELECT a.ad_unit_name, a.format,
    SUM(a.estimated_earnings) AS revenue, SUM(a.impressions) AS imp,
    ROUND(SUM(a.estimated_earnings)/NULLIF(SUM(a.impressions),0)*1000, 2) AS ecpm
FROM bronze.admob_table a
JOIN silver.dim_app_identifiers d ON d.admob_app_id = a.app_id
WHERE d.firebase_id = 'ar_tracer_trace_drawing_ios'
  AND a.`date` >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)
GROUP BY a.ad_unit_name, a.format
ORDER BY revenue DESC LIMIT 20;
```
