#!/bin/bash
set -x
source config.sh

CAMPAIGN_ID=`cat campaign-id`

START_TIME=1726107639
END_TIME=1726712439

result=`curl -X POST \
 -F "name=My AdSet" \
 -F "campaign_id=${CAMPAIGN_ID}" \
 -F "optimization_goal=APP_INSTALLS" \
 -F "billing_event=IMPRESSIONS" \
 -F "start_time=${START_TIME}" \
 -F "end_time=${END_TIME}" \
 -F "promoted_object={
	'application_id':${APP_ID},
	'object_store_url':'${APP_STORE_URL}'
    }" \
 -F "targeting={
      'age_max': 65,
      'age_min': 18,
      'device_platforms': ['mobile'], 
      'user_os': ['IOS'], 
      'geo_locations': {
        'countries': [
          'US','VN'
        ],
      }
    }" \
 -F "status=PAUSED" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/adsets`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > adset-id
