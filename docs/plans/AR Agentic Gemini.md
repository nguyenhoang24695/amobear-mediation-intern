SELECT
    event_date,
    COUNT(DISTINCT user_pseudo_id) as dau,
    COUNT(CASE WHEN event_name = 'session_start' THEN 1 END) as sessions
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-20' AND '2026-04-03'
GROUP BY event_date
ORDER BY event_date DESC
LIMIT 50;
SELECT
    event_name,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_pseudo_id) as unique_users
FROM bronze.fb_ar_tracer_trace_drawing_ios
WHERE event_date BETWEEN '2026-03-20' AND '2026-04-03'
GROUP BY event_name
ORDER BY event_count DESC
LIMIT 50;
SELECT
    `date`,
    ad_source_name,
    `format`,
    SUM(estimated_earnings) as total_revenue,
    SUM(impressions) as total_impressions
FROM bronze.mediation_table
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND `date` BETWEEN '2026-03-20' AND '2026-04-03'
GROUP BY `date`, ad_source_name, `format`
ORDER BY `date` DESC, total_revenue DESC
LIMIT 100;
SELECT
    `date`,
    total_revenue,
    total_impressions,
    dau,
    arpdau
FROM gold.fact_daily_app_metrics
WHERE app_id = 'ca-app-pub-9820030150756925~6704748105'
  AND `date` BETWEEN '2026-03-20' AND '2026-04-03'
ORDER BY `date` DESC
LIMIT 50;