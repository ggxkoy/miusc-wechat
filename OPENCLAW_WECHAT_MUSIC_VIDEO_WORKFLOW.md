# OpenClaw 微信聊天音乐短视频工作流

## 1. 工作流目标

将用户提供的文字对话制作成微信聊天形式的竖屏音乐短视频：

1. 整理原始对话和人物关系。
2. 保持原台词不变，将其排版为 Suno 可使用的歌词。
3. 使用英文提示词生成黑人福音 R&B 转音风格音乐。
4. 根据最终音乐建立逐句时间轴。
5. 生成逐条展开的微信聊天画面。
6. 按音乐节奏完成聊天画面、表情包、字幕和音效剪辑。
7. 输出并验证 1080×1920 的 MP4 成片。

整个流程必须逐节点验收。未经用户批准，不得跳转到下一节点，不得上传或发布内容。

---

## 2. 总体原则

### 2.1 强制规则

1. 每次只执行一个节点。
2. 每个节点完成后进入 `REVIEW` 状态并停止。
3. 只有收到 `通过节点N` 才能继续。
4. 收到 `驳回节点N：修改要求` 后，只修改被驳回的节点。
5. 已通过的产物必须复制为 `*_APPROVED` 文件，后续不得覆盖。
6. 后续节点只能读取上游的 `*_APPROVED` 文件。
7. 如果用户要求修改已通过的上游节点，必须先列出所有受影响的下游节点。
8. Suno 登录、验证码、音乐选曲、15 秒样片、最终成片和发布必须人工确认。
9. 遇到网页结构变化时重新检查页面，不得连续点击旧坐标。
10. 未经用户明确授权，禁止上传、公开或发布成片。

### 2.2 状态机

```text
PENDING → RUNNING → REVIEW → APPROVED
                         ↘ REJECTED → RUNNING
```

### 2.3 用户口令

```text
通过节点0
通过节点1
驳回节点3：不要重复最后一句
重新打开节点4：把节奏调整得更舒缓
查看当前状态
暂停工作流
继续工作流
```

---

## 3. 环境要求

OpenClaw 所在电脑需要安装：

- OpenClaw，并启用文件、Shell 和浏览器操作能力。
- Chrome、Edge 或 Chromium。
- FFmpeg 和 FFprobe。
- Node.js 20 或更高版本。
- Git。
- 可正常使用的 Suno 账号。

检查命令：

```powershell
ffmpeg -version
ffprobe -version
node --version
git --version
openclaw browser status --json
```

浏览器操作应优先使用 OpenClaw 管理的独立浏览器。需要登录、验证码或付费确认时暂停，让用户手动处理。

---

## 4. 项目目录

每条视频使用独立目录：

```text
wechat-music-video/
├─ input/
│  ├─ dialogue.txt
│  ├─ avatar_a.png
│  ├─ avatar_b.png
│  └─ reference.mp4
├─ planning/
│  ├─ project.yaml
│  ├─ dialogue_v1.json
│  ├─ storyboard_v1.md
│  ├─ lyrics_v1.md
│  ├─ suno_prompt_v1.md
│  ├─ timeline_v1.json
│  └─ workflow-state.json
├─ audio/
│  ├─ candidate_a.mp3
│  ├─ candidate_b.mp3
│  ├─ song_APPROVED.mp3
│  └─ song.wav
├─ chat/
│  ├─ scene_001.png
│  ├─ scene_002.png
│  └─ ...
├─ stickers/
├─ subtitles/
│  └─ final.srt
├─ preview/
│  ├─ preview_15s.mp4
│  └─ contact-sheet.jpg
└─ output/
   └─ final.mp4
```

---

## 5. 输入对话格式

`input/dialogue.txt` 示例：

```text
标题：方律和AAA建材王总
角色A：方律
角色B：王总
角色A性别：女
角色B性别：男
风格：一本正经地胡说八道，结尾连续反转

王总：方律，我已经准备好了。
方律：证据准备好了吗？
王总：准备了很多新证据。
方律：那你谨慎一点。
王总：明天让他们措手不及。
方律：你可真是太刑了。
```

不得使用未获授权的真实头像、姓名、手机号或其他个人信息。成片建议标注“剧情演绎 / 虚构聊天”。

---

## 6. 节点清单

| 节点 | 名称 | 主要产物 | 核心验收内容 |
|---|---|---|---|
| 0 | 项目初始化 | `project.yaml` | 角色、比例、时长、素材完整 |
| 1 | 对话结构化 | `dialogue_v1.json` | 台词准确、人物无错位 |
| 2 | 剧情节奏标记 | `storyboard_v1.md` | 钩子、升级、笑点、结尾 |
| 3 | Suno 歌词排版 | `lyrics_v1.md` | 原台词不改、角色标签正确 |
| 4 | Suno 风格提示词 | `suno_prompt_v1.md` | 英文、黑人福音 R&B、转音 |
| 5 | Suno 音乐生成 | 两个候选音频 | 发音、声线、节奏、时长 |
| 6 | 音乐时间轴 | `timeline_v1.json`、SRT | 歌词与消息逐句对应 |
| 7 | 微信聊天视觉 | 3 张风格样图 | 头像、气泡、字号、背景 |
| 8 | 15 秒样片 | `preview_15s.mp4` | 卡点、可读性、视觉节奏 |
| 9 | 完整粗剪 | `roughcut_v1.mp4` | 全片结构、无错句、无黑帧 |
| 10 | 完整精修 | `final_candidate_v1.mp4` | 字幕、音效、表情包、编码 |
| 11 | 最终交付 | `final.mp4` | 人工确认，不自动发布 |

---

## 7. 节点执行规范

### 节点 0：项目初始化

检查所有输入素材，生成 `planning/project.yaml`：

```yaml
title: 方律和AAA建材王总
resolution: 1080x1920
fps: 30
target_duration_seconds: 60
language: zh-CN
content_label: 剧情演绎 / 虚构聊天
characters:
  - id: a
    name: 方律
    gender: female
    side: left
    avatar: input/avatar_a.png
  - id: b
    name: 王总
    gender: male
    side: right
    avatar: input/avatar_b.png
```

验收：

- [ ] 标题正确。
- [ ] 人物姓名、性别和左右位置正确。
- [ ] 头像和参考视频均可读取。
- [ ] 输出规格为 1080×1920、30fps。
- [ ] 目标时长已确认。

### 节点 1：对话结构化

生成 `planning/dialogue_v1.json`：

```json
{
  "title": "方律和AAA建材王总",
  "characters": {
    "a": {"name": "方律", "side": "left", "gender": "female"},
    "b": {"name": "王总", "side": "right", "gender": "male"}
  },
  "messages": [
    {
      "id": 1,
      "speaker": "b",
      "text": "方律，我已经准备好了。",
      "emotion": "自信",
      "importance": 1
    }
  ]
}
```

验收：

- [ ] 原始台词没有被修改。
- [ ] 台词顺序正确。
- [ ] 人物归属正确。
- [ ] 没有遗漏消息。
- [ ] 没有添加原文不存在的剧情。

### 节点 2：剧情节奏标记

本节点只标记结构，不修改台词：

```text
00:00–00:03  开场钩子
00:03–00:15  信息建立
00:15–00:35  冲突升级
00:35–00:50  核心反转
00:50–结束    笑点重复与收尾
```

验收：

- [ ] 前 3 秒存在悬念或冲突。
- [ ] 每 8～12 秒存在信息升级。
- [ ] 核心笑点位置明确。
- [ ] 结尾有清晰收束。
- [ ] 未修改原台词。

### 节点 3：Suno 歌词排版

本节点禁止改编歌词，只能把已通过的原始对话整理成 Suno Lyrics 格式。

#### 强制规则

1. 不得改写、润色、缩写或扩写原台词。
2. 不得为了押韵改变句子。
3. 不得交换人物台词。
4. 允许添加的内容只有英文演唱标签和段落标签。
5. 长句可以换行，但不能删词或改词。
6. 每个角色必须使用固定标签。
7. 如果建议重复某句形成高潮，必须先在验收报告中提出。
8. 未经用户批准，不得直接添加副歌或重复台词。

格式示例：

```text
[Intro]

[Male Vocal]
方律，我已经准备好了

[Female Vocal]
证据准备好了吗

[Male Vocal]
准备了很多新证据

[Female Vocal]
那你谨慎一点

[Male Vocal]
明天让他们措手不及

[Female Vocal]
你可真是太刑了
```

可用标签：

```text
[Male Vocal]
[Female Vocal]
[Male Vocal 1]
[Male Vocal 2]
[Female Vocal 1]
[Female Vocal 2]
[Duet]
[Choir]
[Melismatic]
[Spoken]
[Intro]
[Verse]
[Outro]
```

验收：

- [ ] 原始台词一字未改。
- [ ] 人物台词没有错位。
- [ ] 每个角色使用不同且固定的标签。
- [ ] 没有擅自增加剧情。
- [ ] 所有建议重复的句子已单独列出。
- [ ] 内容可直接粘贴到 Suno Lyrics。

### 节点 4：Suno 英文风格提示词

图片要求已固化为：

- 黑人福音音乐。
- R&B。
- 明显转音。
- 不同人物使用不同声线。
- Style Prompt 使用英文。
- 原始中文对话不得翻译。

固定基础模板：

```text
Black Gospel R&B, soulful and expressive vocals, rich gospel harmonies,
emotional call and response between two distinct singers,
powerful melismatic vocal runs, smooth R&B phrasing,
warm church choir backing vocals, deep soulful male vocal,
expressive female vocal, dynamic vocal improvisation,
clear Mandarin Chinese pronunciation, conversational storytelling,
gradual emotional build, humorous dramatic tension,
piano, Hammond organ, warm bass, restrained gospel drums,
vocals begin immediately, no long instrumental intro,
modern polished production, catchy repeated ending.
```

人物补充模板：

一男一女：

```text
Male and female duet, clearly separated vocal identities,
natural conversational call and response.
```

两个男性：

```text
Two distinct male vocalists, one calm and restrained,
the other animated and exaggerated.
```

两个女性：

```text
Two distinct female vocalists, one composed and serious,
the other lively and theatrical.
```

排除项：

```text
No rap, no EDM drop, no rock guitars, no long instrumental solo,
no mumbling, no excessive vocal distortion,
do not translate the Chinese lyrics.
```

验收：

- [ ] Style Prompt 完全使用英文。
- [ ] 包含 Black Gospel 和 R&B。
- [ ] 包含 gospel harmonies。
- [ ] 包含 call and response。
- [ ] 包含 melismatic vocal runs。
- [ ] 要求清晰的中文发音。
- [ ] 要求人声立即开始且没有长前奏。
- [ ] 不同角色声线符合人物设定。
- [ ] 未加入用户没有指定的主要曲风。

### 节点 5：Suno 音乐生成

1. 使用 OpenClaw 管理的浏览器打开 Suno。
2. 遇到登录、验证码或付费确认时暂停。
3. 将 `lyrics_APPROVED.md` 填入 Lyrics。
4. 将 `suno_prompt_APPROVED.md` 填入 Style。
5. 每轮生成两个候选版本。
6. 保存为 `audio/candidate_a.mp3` 和 `audio/candidate_b.mp3`。
7. 未经用户选择，不得继续建立时间轴。
8. 不得自动公开或发布歌曲。

验收：

- [ ] 中文发音清楚。
- [ ] 两名角色声线能够区分。
- [ ] 台词顺序正确。
- [ ] 没有严重吞字或错字。
- [ ] 黑人福音 R&B 风格明确。
- [ ] 转音自然，不遮挡文字理解。
- [ ] 开头没有长前奏。
- [ ] 时长符合目标。

用户选择后，将选中版本复制为：

```text
audio/song_APPROVED.mp3
```

### 节点 6：时间轴和字幕

根据最终音乐生成 `planning/timeline_v1.json`：

```json
[
  {
    "scene": "scene_001.png",
    "message_ids": [1],
    "start": 0.0,
    "end": 3.2,
    "subtitle": "方律，我已经准备好了",
    "effect": "zoom_in"
  }
]
```

同时生成 `subtitles/final.srt`。

规则：

- 新消息尽量落在歌词起音或音乐重拍。
- 普通消息停留 1.5～3 秒。
- 核心笑点可以停留 3～5 秒。
- 副歌或高潮允许消息连发和表情包强化。
- 字幕内容必须与原台词一致。

### 节点 7：微信聊天视觉

优先方案：使用本地 HTML/CSS 微信聊天渲染器，根据 JSON 自动生成截图。

备选方案：使用开源微信对话生成器，但必须验证导出结果。

不要使用一张完整长图代替全部场景。必须逐步生成：

```text
scene_001：显示第 1 条消息
scene_002：显示第 1～2 条消息
scene_003：显示第 1～3 条消息
```

先生成 3 张样图供验收：

- 普通对话场景。
- 长消息场景。
- 核心笑点和表情包场景。

验收：

- [ ] 分辨率为 1080×1920。
- [ ] 头像和左右人物固定。
- [ ] 文字没有裁切或溢出。
- [ ] 气泡颜色和背景统一。
- [ ] 字号在手机端清晰可读。
- [ ] 没有真实隐私信息。
- [ ] 带有“剧情演绎 / 虚构聊天”标记。

### 节点 8：15 秒样片

只渲染前 15 秒，验证：

- 消息出现节奏。
- 音乐与画面对齐。
- 字号和构图。
- 缩放方向。
- 表情包出现时机。
- 字幕样式。

15 秒样片未通过，不得渲染完整视频。

### 节点 9：完整粗剪

粗剪只解决：

- 全片消息顺序。
- 时间轴。
- 音画同步。
- 基础缩放和切换。
- 字幕完整性。

本节点不要过度制作装饰效果。

### 节点 10：完整精修

精修内容：

- 重点消息放大。
- 消息弹出动画。
- 表情包和贴纸。
- 必要的提示音和强调音效。
- 字幕位置与安全区域。
- 结尾停留和收束。

### 节点 11：最终交付

输出规格：

```text
容器：MP4
分辨率：1080×1920
帧率：30fps
视频编码：H.264
音频编码：AAC
音频采样率：48kHz
像素格式：yuv420p
```

最终交付只生成本地文件，不自动发布。

---

## 8. FFmpeg 处理

音频标准化：

```powershell
ffmpeg -y -i audio/song_APPROVED.mp3 -ar 48000 -ac 2 audio/song.wav
```

最终编码示例：

```powershell
ffmpeg -y -i preview/silent.mp4 -i audio/song.wav `
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p `
  -c:a aac -b:a 192k -shortest output/final.mp4
```

媒体验证：

```powershell
ffprobe -v error `
  -show_entries format=duration `
  -show_entries stream=codec_name,width,height,r_frame_rate `
  -of json output/final.mp4
```

生成九宫格检查图：

```powershell
ffmpeg -y -i output/final.mp4 `
  -vf "fps=1/8,scale=270:480,tile=3x3" `
  -frames:v 1 preview/contact-sheet.jpg
```

最终验收：

- [ ] 视频为 1080×1920。
- [ ] 帧率为 30fps。
- [ ] 音画时长差不超过 0.2 秒。
- [ ] 没有黑帧或意外空白。
- [ ] 所有文字清晰完整。
- [ ] 人物左右位置无错误。
- [ ] 当前歌词对应当前消息。
- [ ] 结尾没有突然截断。
- [ ] 未经确认没有上传或发布。

---

## 9. 节点验收报告模板

每个节点完成后，OpenClaw 必须使用以下格式：

```markdown
## 节点 N：节点名称

状态：REVIEW

### 本节点输入
- 上游 APPROVED 文件

### 本节点产物
- 本次生成文件路径

### 验收清单
- [ ] 条件 1
- [ ] 条件 2
- [ ] 条件 3

### 本次变更
简要说明生成或修改内容。

### 风险或待确认项
没有则写“无”。

### 请回复
- `通过节点N`
- `驳回节点N：具体修改要求`
```

---

## 10. 状态文件

`planning/workflow-state.json` 示例：

```json
{
  "project": "wechat-music-video",
  "currentNode": 3,
  "paused": false,
  "nodes": {
    "0": {
      "status": "APPROVED",
      "artifact": "planning/project_APPROVED.yaml"
    },
    "1": {
      "status": "APPROVED",
      "artifact": "planning/dialogue_APPROVED.json"
    },
    "2": {
      "status": "APPROVED",
      "artifact": "planning/storyboard_APPROVED.md"
    },
    "3": {
      "status": "REVIEW",
      "artifact": "planning/lyrics_v1.md"
    }
  }
}
```

节点通过后：

1. 把当前产物复制为 `*_APPROVED`。
2. 将当前节点状态写为 `APPROVED`。
3. 将下一节点写为 `PENDING`。
4. 更新 `currentNode`。
5. 不删除旧版本。

---

## 11. OpenClaw 总控提示词

将下面整段发送给 OpenClaw：

```text
你要执行一个严格分节点验收的“微信聊天音乐短视频”工作流。

工作目录：[填写绝对路径]
工作流说明：OPENCLAW_WECHAT_MUSIC_VIDEO_WORKFLOW.md
状态文件：planning/workflow-state.json

总目标：
把input/dialogue.txt中的对话制作成微信聊天形式的竖屏音乐短视频。
音乐使用Suno生成，核心风格为Black Gospel R&B、福音和声、明显转音、
多人call and response，并保持清晰的中文发音。

执行规则：
1. 开始前完整读取工作流说明和状态文件。
2. 每次只执行currentNode指向的一个节点。
3. 节点完成后进入REVIEW并停止。
4. 未收到“通过节点N”不得进入下一节点。
5. 收到驳回指令时，只修复该节点指定问题。
6. 已通过产物复制为*_APPROVED，禁止覆盖。
7. 后续节点只能读取上游APPROVED文件。
8. 修改已通过的上游节点前，先列出受影响的下游节点。
9. Suno登录、验证码、音乐选择、15秒样片、最终成片和发布必须人工确认。
10. 未经明确授权，禁止上传或发布任何内容。

Suno歌词强制规则：
1. 不改写、不润色、不缩写、不扩写原始对话。
2. 只调整为Suno Lyrics排版。
3. 不同人物使用不同且固定的英文中括号标签。
4. 长句只能换行，不能删词或改词。
5. 建议重复某个笑点时，先提出建议，不能直接加入歌词。

Suno风格强制规则：
1. Style Prompt完全使用英文。
2. 核心风格固定为Black Gospel R&B。
3. 必须包含soulful vocals、gospel harmonies、call and response、
   melismatic vocal runs和clear Mandarin Chinese pronunciation。
4. 必须要求vocals begin immediately和no long instrumental intro。
5. 原始中文歌词不得翻译。

视觉强制规则：
1. 生成逐条累积的聊天场景图，不使用一张长图代替全部场景。
2. 头像、人物左右位置和气泡颜色必须全片一致。
3. 所有文字必须适合手机观看，不得裁切或溢出。
4. 画面标记“剧情演绎 / 虚构聊天”。

剪辑强制规则：
1. 先完成15秒样片并等待验收。
2. 样片通过后才能渲染完整粗剪。
3. 新消息尽量跟随歌词起音或音乐重拍出现。
4. 完成后用ffprobe和九宫格检查图验证成片。

现在读取状态文件，只执行当前节点。完成后按照工作流中的验收报告模板汇报并停止。
```

---

## 12. 推荐的首次执行顺序

1. 创建项目目录。
2. 放入 `dialogue.txt`、人物头像和参考视频。
3. 创建初始 `workflow-state.json`，将节点 0 设为 `PENDING`。
4. 把本文件和总控提示词交给 OpenClaw。
5. 每次只回复“通过节点N”或明确的驳回要求。
6. 先完成 15 秒样片，再决定是否渲染完整视频。
