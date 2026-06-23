SELECT
  dpp_campaign AS dpp_campaign,
  SUM(user_cnt) AS `SUM(user_cnt)`,
  SUM(user_charactor) AS `SUM(user_charactor)`,
  SUM(pct_charactor) AS `SUM(pct_charactor)`,
  SUM(user_character) AS `SUM(user_character)`,
  SUM(pct_character) AS `SUM(pct_character)`
FROM (
  WITH base AS (
    SELECT
      user_pseudo_id,
      event_timestamp,
      install_date,
      GET_JSON_STRING(raw_event_json, '$.event_name') AS event_name,
      TRIM(GET_JSON_STRING(event_params_json, '$.aj_campaign')) AS aj_campaign
    FROM bronze.fb_ailab_lumia_ai_girl_rp_chat
    WHERE
      install_date BETWEEN STR_TO_DATE('20260401', '%Y%m%d') AND STR_TO_DATE('20260419', '%Y%m%d')
  ), first_open_users AS (
    /* 1. Cohort first_open */
    SELECT DISTINCT
      user_pseudo_id
    FROM base
    WHERE
      event_name = 'first_open'
  ), aj_raw AS (
    /* 2. Toàn bộ aj_campaign của user trong cohort */
    SELECT
      b.user_pseudo_id,
      b.aj_campaign,
      b.event_timestamp
    FROM base AS b
    INNER JOIN first_open_users AS f
      ON b.user_pseudo_id = f.user_pseudo_id
    WHERE
      b.event_name = 'user_aj_segment'
      AND NOT b.aj_campaign IS NULL
      AND b.aj_campaign <> ''
  ), dpp_campaign_user AS (
    /* 3. Gắn user vào từng campaign chứa DPP */
    SELECT DISTINCT
      user_pseudo_id,
      aj_campaign AS dpp_campaign
    FROM aj_raw
    WHERE
      UPPER(aj_campaign) LIKE '%DPP%'
  ), user_char_flag AS (
    /* 4. Với mỗi user, check có từng bị gán charactor / character không */
    SELECT
      user_pseudo_id,
      MAX(CASE WHEN LOWER(aj_campaign) = 'charactor' THEN 1 ELSE 0 END) AS flag_charactor,
      MAX(CASE WHEN LOWER(aj_campaign) = 'character' THEN 1 ELSE 0 END) AS flag_character
    FROM aj_raw
    GROUP BY
      user_pseudo_id
  )
  /* 5. Final: breakdown theo từng tên camp DPP */
  SELECT
    d.dpp_campaign,
    COUNT(DISTINCT d.user_pseudo_id) AS user_cnt,
    COUNT(DISTINCT CASE WHEN c.flag_charactor = 1 THEN d.user_pseudo_id END) AS user_charactor,
    ROUND(
      COUNT(DISTINCT CASE WHEN c.flag_charactor = 1 THEN d.user_pseudo_id END) / NULLIF(COUNT(DISTINCT d.user_pseudo_id), 0) * 100,
      2
    ) AS pct_charactor,
    COUNT(DISTINCT CASE WHEN c.flag_character = 1 THEN d.user_pseudo_id END) AS user_character,
    ROUND(
      COUNT(DISTINCT CASE WHEN c.flag_character = 1 THEN d.user_pseudo_id END) / NULLIF(COUNT(DISTINCT d.user_pseudo_id), 0) * 100,
      2
    ) AS pct_character
  FROM dpp_campaign_user AS d
  LEFT JOIN user_char_flag AS c
    ON d.user_pseudo_id = c.user_pseudo_id
  GROUP BY
    d.dpp_campaign
  ORDER BY
    user_cnt DESC,
    d.dpp_campaign
) AS virtual_table
GROUP BY
  dpp_campaign
ORDER BY
  `SUM(user_cnt)` DESC
LIMIT 10000

--------------------------------------------------------------
WITH base AS (
  SELECT
    user_pseudo_id,
    event_timestamp,
    install_date,
    event_name,
    TRIM(GET_JSON_STRING(event_params_json, '$.aj_campaign')) AS aj_campaign
  FROM bronze.fb_ailab_lumia_ai_girl_rp_chat
  WHERE install_date BETWEEN STR_TO_DATE('20260401', '%Y%m%d') AND STR_TO_DATE('20260419', '%Y%m%d')
    AND event_name IN ('first_open', 'user_aj_segment')
    /* Nếu nghiệp vụ cho phép, thêm event_date để partition pruning, ví dụ cohort + cửa sổ theo dõi:
    AND event_date >= STR_TO_DATE('20260401', '%Y%m%d')
    AND event_date <= DATE_ADD(STR_TO_DATE('20260419', '%Y%m%d'), INTERVAL 60 DAY)
    */
),
first_open_users AS (
  SELECT DISTINCT user_pseudo_id
  FROM base
  WHERE event_name = 'first_open'
),
aj_raw AS (
  SELECT
    b.user_pseudo_id,
    b.aj_campaign,
    b.event_timestamp
  FROM base AS b
  INNER JOIN first_open_users AS f ON b.user_pseudo_id = f.user_pseudo_id
  WHERE b.event_name = 'user_aj_segment'
    AND b.aj_campaign IS NOT NULL
    AND b.aj_campaign <> ''
),
dpp_campaign_user AS (
  SELECT DISTINCT user_pseudo_id, aj_campaign AS dpp_campaign
  FROM aj_raw
  WHERE UPPER(aj_campaign) LIKE '%DPP%'
),
user_char_flag AS (
  SELECT
    user_pseudo_id,
    MAX(CASE WHEN LOWER(aj_campaign) = 'charactor' THEN 1 ELSE 0 END) AS flag_charactor,
    MAX(CASE WHEN LOWER(aj_campaign) = 'character' THEN 1 ELSE 0 END) AS flag_character
  FROM aj_raw
  GROUP BY user_pseudo_id
)
SELECT
  d.dpp_campaign,
  COUNT(DISTINCT d.user_pseudo_id) AS user_cnt,
  COUNT(DISTINCT CASE WHEN c.flag_charactor = 1 THEN d.user_pseudo_id END) AS user_charactor,
  ROUND(
    COUNT(DISTINCT CASE WHEN c.flag_charactor = 1 THEN d.user_pseudo_id END)
      / NULLIF(COUNT(DISTINCT d.user_pseudo_id), 0) * 100,
    2
  ) AS pct_charactor,
  COUNT(DISTINCT CASE WHEN c.flag_character = 1 THEN d.user_pseudo_id END) AS user_character,
  ROUND(
    COUNT(DISTINCT CASE WHEN c.flag_character = 1 THEN d.user_pseudo_id END)
      / NULLIF(COUNT(DISTINCT d.user_pseudo_id), 0) * 100,
    2
  ) AS pct_character
FROM dpp_campaign_user AS d
LEFT JOIN user_char_flag AS c ON d.user_pseudo_id = c.user_pseudo_id
GROUP BY d.dpp_campaign
ORDER BY user_cnt DESC, d.dpp_campaign
LIMIT 10000;