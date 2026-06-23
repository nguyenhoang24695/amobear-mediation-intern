#!/bin/bash
set -x
source config.sh

FILE_PATH='/Users/nthieu/Downloads'

result=`curl \
 -F "filename=@${FILE_PATH}/test-coffee.MOV" \
 -F "access_token=${SYSTEM_USER_ACCESS_TOKEN}" \
$GRAPH_API/$AD_ACCOUNT_ID/advideos`

IFS='"' read -a strarr <<< "$result"

echo "${strarr[3]}" > video-id
