#!/bin/bash
set -x
source config.sh

ADSET_ID=`cat adset-id`
CREATIVE_ID=`cat creative-id`

result=`curl -X POST \
  -F "name='My Ad'" \
  -F "adset_id=${ADSET_ID}" \
  -F "creative={
       creative_id: ${CREATIVE_ID}
     }" \
 -F "status=PAUSED" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/ads`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > ad-id
