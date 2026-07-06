#!/bin/bash
# 读取飞书多维表格所有记录
python3 -c "
import json, urllib.request

d = json.load(open('/Users/lyq/.openclaw/openclaw.json'))
f = d['channels']['feishu']
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    data=json.dumps({'app_id': f['appId'], 'app_secret': f['appSecret']}).encode(),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(req).read())['tenant_access_token']

req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/bitable/v1/apps/PmJobYMZyaI0eLsNvb7c3t7Snwd/tables/tblIlmTQnJ1i7vvF/records?page_size=100',
    headers={'Authorization': 'Bearer ' + token}
)
resp = json.loads(urllib.request.urlopen(req).read())
for r in resp['data']['items']:
    fields = r.get('fields', {})
    name = fields.get('视频名称', '')
    ptype = fields.get('项目类型', '')
    feedback = fields.get('反馈', '')
    if name:
        print(f'- {name} | {ptype} | 反馈: {feedback}')
"
