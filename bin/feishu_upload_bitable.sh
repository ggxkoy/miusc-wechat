#!/bin/bash
# 用法: feishu_upload_bitable.sh <video_path> <video_name> <project_type> <feedback>
# 上传视频到飞书多维表格并创建记录
VIDEO_PATH="$1"
VIDEO_NAME="${2:-未命名}"
PROJECT_TYPE="${3:-其他}"
FEEDBACK="${4:-}"

if [ -z "$VIDEO_PATH" ]; then
  echo "Usage: $0 <video_path> [video_name] [project_type] [feedback]"
  exit 1
fi

python3 -c "
import json, subprocess, time, os, urllib.request, sys

video_path = sys.argv[1]
video_name = sys.argv[2]
project_type = sys.argv[3]
feedback = sys.argv[4]

# 获取 token
d = json.load(open('/Users/lyq/.openclaw/openclaw.json'))
f = d['channels']['feishu']
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    data=json.dumps({'app_id': f['appId'], 'app_secret': f['appSecret']}).encode(),
    headers={'Content-Type': 'application/json'}
)
token = json.loads(urllib.request.urlopen(req).read())['tenant_access_token']

# 上传文件
file_size = os.path.getsize(video_path)
file_basename = os.path.basename(video_path)
result = subprocess.run([
    'curl', '-s', '-X', 'POST',
    'https://open.feishu.cn/open-apis/drive/v1/files/upload_all',
    '-H', 'Authorization: Bearer ' + token,
    '-F', 'file_name=' + file_basename,
    '-F', 'parent_type=bitable_file',
    '-F', 'parent_node=PmJobYMZyaI0eLsNvb7c3t7Snwd',
    '-F', 'size=' + str(file_size),
    '-F', 'file=@' + video_path
], capture_output=True, text=True)
upload_resp = json.loads(result.stdout)
file_token = upload_resp['data']['file_token']

# 创建记录
now_ms = int(time.time() * 1000)
fields = {
    '视频名称': video_name,
    '项目类型': project_type,
    '制作日期': now_ms,
    '视频文件': [{'file_token': file_token}]
}
if feedback:
    fields['反馈'] = feedback

record_data = {'fields': fields}
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/bitable/v1/apps/PmJobYMZyaI0eLsNvb7c3t7Snwd/tables/tblIlmTQnJ1i7vvF/records',
    data=json.dumps(record_data).encode(),
    headers={
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
    }
)
resp = json.loads(urllib.request.urlopen(req).read())
print('Record created: ' + resp['data']['record']['record_id'])
" "$VIDEO_PATH" "$VIDEO_NAME" "$PROJECT_TYPE" "$FEEDBACK"
