#!/bin/bash
set -x
source config.sh

VIDEO_ID=`cat video-id`
IMAGE_URL='https://cablevey.com/wp-content/uploads/2020/10/How-Do-You-Process-Coffee-Beans-for-Distribution-980x559.jpg'

result=`curl -X POST \
 -F "name=My Creative for Messenger" \
 -F "object_story_spec={
      'video_data': {
        'call_to_action': {'type':'LEARN_MORE','value':{'app_destination':'MESSENGER'}},
        'video_id': '${VIDEO_ID}',
        'message': 'Welcome message',
        'image_url': '${IMAGE_URL}',
      },
     'page_id': '${PAGE_ID}',
    }" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/adcreatives`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > creative-id
