#!/bin/bash
set -x
source config.sh

result=`curl -X POST \
 -F "name='My Campaign'" \
 -F "objective=OUTCOME_APP_PROMOTION" \
 -F "daily_budget=100000" \
 -F "bid_strategy=LOWEST_COST_WITHOUT_CAP" \
 -F "status=PAUSED" \
 -F "special_ad_categories=[]" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/campaigns`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > campaign-id
