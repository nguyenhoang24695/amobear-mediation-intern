SELECT
  `date`,
  ad_source_id,
  ad_source_name,
  `format`,
  SUM(COALESCE(estimated_earnings, 0)) AS revenue,
  SUM(COALESCE(impressions, 0)) AS impressions
FROM bronze.mediation_table
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND `date` BETWEEN '2026-03-19' AND '2026-04-02'
GROUP BY `date`, ad_source_id, ad_source_name, `format`
ORDER BY `date` DESC, revenue DESC
LIMIT 100
SELECT
  event_date,
  CASE
    WHEN event_name = 'ad_impression1' THEN 'rewarded'
    WHEN event_name = 'ad_impression2' THEN 'interstitial'
    WHEN event_name = 'ad_impression3' THEN 'banner'
    WHEN event_name = 'ad_impression4' THEN 'native'
    WHEN event_name = 'ad_impression_custom' THEN 'app_open'
    WHEN event_name = 'ad_impression' THEN 'standard'
    ELSE 'other'
  END AS ad_format,
  COUNT(*) AS impressions,
  COUNT(DISTINCT user_pseudo_id) AS ad_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-19' AND '2026-04-02'
  AND event_name IN ('ad_impression1','ad_impression2','ad_impression3','ad_impression4','ad_impression_custom','ad_impression')
GROUP BY
  event_date,
  CASE
    WHEN event_name = 'ad_impression1' THEN 'rewarded'
    WHEN event_name = 'ad_impression2' THEN 'interstitial'
    WHEN event_name = 'ad_impression3' THEN 'banner'
    WHEN event_name = 'ad_impression4' THEN 'native'
    WHEN event_name = 'ad_impression_custom' THEN 'app_open'
    WHEN event_name = 'ad_impression' THEN 'standard'
    ELSE 'other'
  END
ORDER BY event_date DESC, impressions DESC
LIMIT 100
SELECT
  event_date,
  COUNT(DISTINCT CASE WHEN event_name = 'iap_show' THEN user_pseudo_id END) AS iap_show_users,
  COUNT(DISTINCT CASE WHEN event_name IN ('in_app_purchase','purchase','ecommerce_purchase') THEN user_pseudo_id END) AS purchasers,
  COUNT(CASE WHEN event_name IN ('in_app_purchase','purchase','ecommerce_purchase') THEN 1 END) AS purchase_events
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-19' AND '2026-04-02'
  AND event_name IN ('iap_show','in_app_purchase','purchase','ecommerce_purchase')
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30
SELECT
  event_name,
  COUNT(*) AS event_count,
  COUNT(DISTINCT user_pseudo_id) AS users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-27' AND '2026-04-02'
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 50
SELECT
  event_date,
  COUNT(DISTINCT user_pseudo_id) AS dau,
  SUM(CASE WHEN event_name = 'first_open' THEN 1 ELSE 0 END) AS first_open_events,
  COUNT(DISTINCT CASE WHEN event_name = 'first_open' THEN user_pseudo_id END) AS new_users,
  SUM(CASE WHEN event_name = 'user_engagement' THEN 1 ELSE 0 END) AS engagement_events,
  SUM(CASE WHEN event_name IN ('in_app_purchase','purchase','ecommerce_purchase') THEN 1 ELSE 0 END) AS iap_events
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-19' AND '2026-04-02'
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 30
SELECT
  event_date,
  app_id,
  dau,
  new_users,
  dav,
  sessions,
  iap_rev,
  iaa_rev,
  total_rev,
  arpdau,
  ad_penetration
FROM gold.daily_overview
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND event_date BETWEEN '2026-03-19' AND '2026-04-02'
ORDER BY event_date DESC
LIMIT 30