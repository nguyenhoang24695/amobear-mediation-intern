# PO Dashboard - Qonversion Integration

> Scope: Slice 7.x wires PO Dashboard IAP/SUB revenue to the existing Qonversion pipeline. Adjust remains the source for installs, IAA, ROAS, retention and report breakdowns.
>
> ⚠️ **Hai pipeline Qonversion KHÁC nhau — đừng nhầm:**
> 1. **Event pipeline (doc này)** — raw-data export CSV → `bronze.qonversion_events_raw` → `silver.qonversion_events_clean` → `gold.app_iap_daily`. Dùng cho **IAP/SUB revenue** (Slice 7.x). Chỉ có event tiền tệ, **không có** dân số "new user".
> 2. **Chart API pipeline** — kéo số đã tổng hợp sẵn từ Analytics → Charts của Qonversion → `silver.qonversion_product_metrics_daily`. Dùng cho **Product Reports** (Subscriptions / New-User-to-Trial / Trial-to-Paid / Refunds by product) — **Slice 8.x**, spec ở [`08_Qonversion_Product_Reports.md`](08_Qonversion_Product_Reports.md). New-User-to-Trial **bắt buộc** dùng nguồn này vì event pipeline không tính được.

---

## 1. Pipeline overview

Qonversion data is already ingested outside the dashboard flow:

1. Raw events arrive from webhook, GCS export or dashboard crawler.
2. Raw payloads are stored in `bronze.qonversion_events_raw`.
3. `RunQonversionBronzeToSilverAsync` cleans and deduplicates events into `silver.qonversion_events_clean` (derive `is_revenue_event`, `revenue_sign`).
4. `RunQonversionSilverToGoldAsync` aggregates daily app revenue into `gold.app_iap_daily` (insert raw `app_id`, verify AdMob id qua dim, `verified_admob_app_id`).

The PO Dashboard reads:

| Dashboard block | Table | Notes |
|---|---|---|
| Summary total revenue | `silver.qonversion_events_clean` | Adds IAP + SUB to Adjust IAA. |
| Revenue trend `iap` / `sub` | `silver.qonversion_events_clean` | Daily series by `event_date`. |
| Top Country `iap_sub` | `silver.qonversion_events_clean` | Country is expected to be ISO2. |
| Qon configured warning | `gold.app_iap_daily` | `HasIapAsync` probes by AdMob app id, `verified_admob_app_id = 1`. |

---

## 2. App mapping

Dashboard input is the AdMob app id (`apps.app_id`). Qonversion events can store the app as package name, App Store id, or AdMob app id, so provider queries bridge through `silver.dim_app_identifiers`:

```sql
JOIN silver.dim_app_identifiers d
  ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(@appId))
 AND LOWER(TRIM(s.app_id)) IN (
       LOWER(TRIM(COALESCE(d.package_name, ''))),
       LOWER(TRIM(COALESCE(d.app_store_id, ''))),
       LOWER(TRIM(d.admob_app_id))
     )
```

If IAP/SUB is missing for an app, check this mapping first.

---

## 3. Event classification

Silver derived flags (`RunQonversionBronzeToSilverAsync`):

| Flag | Rule |
|------|------|
| `is_revenue_event = 1` | `event_name` ∈ `subscription_started`, `trial_converted`, `subscription_renewed`, `subscription_upgraded`, `subscription_reactivated`, `non_renewing_purchase`, `subscription_refunded`, `in_app_purchase`, `in_app_refunded` |
| `revenue_sign = -1` | `subscription_refunded`, `in_app_refunded` |
| `revenue_sign = +1` | các event revenue còn lại |

IAP and SUB are separated in service/provider output:

| Revenue bucket | Qonversion event_name | Treatment |
|---|---|---|
| IAP purchase | `non_renewing_purchase`, `in_app_purchase` | Add positive `revenue_usd` when `revenue_sign = 1`. |
| IAP refund | `in_app_refunded` | Subtract absolute `revenue_usd`. |
| SUB | `subscription_started`, `trial_converted`, `subscription_renewed`, `subscription_upgraded`, `subscription_reactivated` | Add positive `revenue_usd`. |
| SUB refund | `subscription_refunded` | Subtract absolute `revenue_usd`. |

Gold `app_iap_daily` gộp mọi revenue event qua `is_revenue_event` / `revenue_sign`; refund SUB trong gold còn filter `transaction_id LIKE '%..%'` (refund IAP one-time dùng `in_app_refunded`).

All queries exclude duplicate rows with `s.is_duplicate = 0`.

---

## 4. Dashboard formulas

Summary and revenue trend now use cross-source revenue:

```text
IAA   = Adjust revenue_metrics_json.ad_revenue
IAP   = Qonversion one-time IAP net (`non_renewing_purchase` + `in_app_purchase` − `in_app_refunded`)
SUB   = Qonversion subscription net revenue minus refunds
Total = IAA + IAP + SUB
ARPU  = Total / Firebase dau by date
```

`phase2_notice` remains in the response for backward compatibility, but should be an empty list for SUB because SUB is now real data.

Top Country `iap_sub` uses Qonversion only. It does not require an Adjust mapping. Country values are normalized with `UPPER(TRIM(country))`; non-ISO2 values are excluded in Phase 1.

---

## 5. Troubleshooting

Check app mapping:

```sql
SELECT admob_app_id, package_name, app_store_id, adjust_id
FROM silver.dim_app_identifiers
WHERE admob_app_id = :app_id;
```

Check clean Qonversion rows for the mapped app:

```sql
SELECT s.event_date, s.app_id, s.event_name, s.country, s.revenue_usd, s.revenue_sign, s.is_duplicate
FROM silver.qonversion_events_clean s
JOIN silver.dim_app_identifiers d
  ON LOWER(TRIM(d.admob_app_id)) = LOWER(TRIM(:app_id))
 AND LOWER(TRIM(s.app_id)) IN (
       LOWER(TRIM(COALESCE(d.package_name, ''))),
       LOWER(TRIM(COALESCE(d.app_store_id, ''))),
       LOWER(TRIM(d.admob_app_id))
     )
WHERE s.event_date BETWEEN :start AND :end
ORDER BY s.event_date DESC
LIMIT 100;
```

Check daily gold availability used by `qonversion_not_configured` warning:

```sql
SELECT report_date, app_id, iap_net_revenue_usd, unique_paying_users, verified_admob_app_id
FROM gold.app_iap_daily
WHERE app_id = :app_id
  AND verified_admob_app_id = 1
ORDER BY report_date DESC
LIMIT 30;
```

If `silver.qonversion_events_clean.country` starts carrying full names instead of ISO2, update `QonversionDashboardProvider.GetCountryRevenueAsync` to bridge through `silver.dim_country.country_name` / `country_name_firebase` before trusting Top Country output.
