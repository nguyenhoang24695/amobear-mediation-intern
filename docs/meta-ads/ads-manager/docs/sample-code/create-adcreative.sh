#!/bin/bash
set -x
source config.sh

IMAGE_HASH=`cat image-hash`

result=`curl -X POST \
 -F "name=My Creative" \
 -F "object_story_spec={
      'link_data': {
        'call_to_action': {'type':'INSTALL_MOBILE_APP','value':{'link':'${APP_STORE_URL}'}},
        'image_hash': '${IMAGE_HASH}',
        'message': 'Test App Install',
	'link': '${APP_STORE_URL}',
      },
     'page_id': '${PAGE_ID}',
    }" \
 -F "degrees_of_freedom_spec={
      'creative_features_spec': {
        'standard_enhancements': {
          'enroll_status': 'OPT_IN'
        }
      }
    }" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/adcreatives`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > creative-id
