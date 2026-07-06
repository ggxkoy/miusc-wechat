#!/bin/bash
# 获取飞书 tenant_access_token
python3 -c "
import json, urllib.request
d = json.load(open('/Users/lyq/.openclaw/openclaw.json'))
f = d['channels']['feishu']
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    data=json.dumps({'app_id': f['appId'], 'app_secret': f['appSecret']}).encode(),
    headers={'Content-Type': 'application/json'}
)
resp = json.loads(urllib.request.urlopen(req).read())
print(resp.get('tenant_access_token', ''))
"
