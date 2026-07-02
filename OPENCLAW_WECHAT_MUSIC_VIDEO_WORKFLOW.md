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

参考效果：`reference/方律师_AAA建材王总_参考视频.mp4`（1080×1920、30fps、约 68 秒）。该视频的核心手法是本工作流节点 7～10 必须复现的基准：

- 开场先用一帧真实感的微信对话框（联系人名 + 第一条消息）当作钩子，再切入逐条气泡场景。
- 每条新消息以轻微旋转、缩放的“拍入”动作出现，而不是直接淡入或硬切。
- 镜头始终跟随最新消息做竖向缩放/平移，画面上下留黑边，模拟手机竖屏录屏被剪辑软件二次构图的效果，而不是整屏铺满静态截图。
- 高潮句会让同一条消息气泡连续复现多次（画面复读、每次带轻微旋转抖动），并在气泡之间快速插入表情包大图（如愤怒/社死类 meme），配合鼓点制造节奏冲击。
- 字幕就是聊天气泡本身，没有额外的底部字幕条；表情强调靠在文字后追加 emoji，而不是改写台词。

之所以过去用剪映人工剪辑效果差，是因为“镜头跟随缩放的动态黑边”“气泡拍入动画”“气泡连续复读+表情包插帧”这几个手法很难靠人工点击稳定还原，且每次剪辑结果不可复现、无法逐节点回归验收。因此节点 7～10 改为由 Remotion（代码驱动、可无头渲染）实现，具体规范见第 8 节。

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
11. 节点 7～10（视觉、样片、粗剪、精修）必须通过可脚本化的渲染引擎完成（默认 Remotion，见第 8 节），不得使用剪映、CapCut 等图形界面剪辑软件人工剪辑。原因：GUI 剪辑无法被 OpenClaw 直接调用、每次结果不可复现、也无法进行逐节点回归验收；参考视频（`reference/`）展示的效果必须通过代码化的组件参数复现，而不是人工重新拼一遍。

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
- Chrome、Edge 或 Chromium（供 OpenClaw 操作 Suno 网页使用；Remotion 另外通过 `npx remotion browser ensure` 安装独立的无头 Chromium，两者不是同一个浏览器实例）。
- FFmpeg 和 FFprobe，且 FFmpeg 需带 `libass`（用于字幕滤镜和最终校验）。
- Node.js 20 或更高版本，以及 npm。
- Remotion（`@remotion/cli`、`@remotion/renderer`，作为节点 7～10 的剪辑引擎，见第 8 节），随项目 `remotion/` 子工程一起安装，不做全局依赖。
- Git。
- 可正常使用的 Suno 账号。

检查命令：

```powershell
ffmpeg -version
ffmpeg -filters | findstr ass
ffprobe -version
node --version
npm --version
git --version
openclaw browser status --json
```

浏览器操作应优先使用 OpenClaw 管理的独立浏览器。需要登录、验证码或付费确认时暂停，让用户手动处理。

授权与替代方案：

- Remotion 对个人使用和不超过 3 人的团队免费；团队规模更大或商用规模化时需要购买企业授权，首次搭建项目时应向用户确认当前使用场景是否在免费范围内。
- 如果不方便安装 Node/Remotion，可退回纯 FFmpeg 方案：所有场景预渲染为 PNG 序列，缩放/跟随镜头用 `zoompan` 滤镜、表情包插帧用 `overlay=enable='between(t,a,b)'`、字幕用 `subtitles`/`ass` 滤镜，由脚本根据 `timeline_v1.json` 生成 `filter_complex` 命令。第 8 节以 Remotion 为默认方案，同时给出与之对应的 FFmpeg 关键滤镜，便于该场景下替换。

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
├─ remotion/
│  ├─ package.json
│  ├─ remotion.config.ts
│  └─ src/
│     ├─ Root.tsx
│     ├─ ChatVideo.tsx
│     ├─ ChatBubble.tsx
│     ├─ MemeOverlay.tsx
│     └─ timeline.schema.ts
├─ preview/
│  ├─ preview_15s.mp4
│  └─ contact-sheet.jpg
└─ output/
   └─ final.mp4
```

`chat/scene_*.png` 仍用于节点 7 的样图验收（人工快速预览风格），但节点 8～10 的实际视频不再由这些静态截图拼接而成，而是由 `remotion/` 工程直接读取 `dialogue_APPROVED.json`、`timeline_APPROVED.json`、`stickers/` 和 `audio/song.wav` 渲染。`stickers/` 目录存放表情包/meme 素材（如参考视频中的“太刑了”熊猫头图），文件名需与 `timeline_v1.json` 里的 `meme.file` 字段一致。

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
| 6 | 音乐时间轴 | `timeline_v1.json`、SRT | 歌词与消息逐句对应、镜头/表情包/复读事件完整 |
| 7 | 微信聊天视觉（Remotion 组件） | 3 张风格样图 + `remotion/src/ChatBubble.tsx` | 头像、气泡、字号、背景、拍入动画、跟随镜头 |
| 8 | 15 秒样片（Remotion 渲染） | `preview_15s.mp4` | 卡点、可读性、视觉节奏 |
| 9 | 完整粗剪（Remotion 渲染） | `roughcut_v1.mp4` | 全片结构、无错句、无黑帧 |
| 10 | 完整精修（Remotion 渲染） | `final_candidate_v1.mp4` | 字幕、音效、表情包、编码 |
| 11 | 最终交付 | `final.mp4` | 人工确认，不自动发布 |

节点 7～10 全部通过 `remotion/` 工程完成，不允许在这几个节点中出现“打开剪映/CapCut 手动剪辑”的步骤；产物必须能由 `npx remotion render` 命令重新生成。

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

根据最终音乐生成 `planning/timeline_v1.json`，schema 需覆盖参考视频里出现的“跟随镜头”“拍入动画”“表情包插帧”“高潮气泡复读”四类事件，且要能被 Remotion 组件直接读取为 props：

```json
{
  "hook": {
    "contact_name": "AAA建材批发王总",
    "first_message_id": 1,
    "duration": 1.5
  },
  "scenes": [
    {
      "scene": "scene_001",
      "message_ids": [1],
      "start": 0.0,
      "end": 3.2,
      "subtitle": "方律，我已经准备好了",
      "emoji": null,
      "camera": { "follow": "last_message", "zoom": 1.15, "pan": "up" },
      "entrance": "tilt_drop"
    },
    {
      "scene": "scene_009",
      "message_ids": [9],
      "start": 46.0,
      "end": 49.5,
      "subtitle": "你可真是太刑了",
      "emoji": "😱",
      "camera": { "follow": "last_message", "zoom": 1.3, "pan": "up" },
      "entrance": "tilt_drop",
      "repeat_visual": { "count": 4, "interval": 0.35 }
    }
  ],
  "memes": [
    { "file": "stickers/panda_taixing.png", "start": 46.2, "end": 46.9, "rotation": -8 },
    { "file": "stickers/panda_taixing.png", "start": 47.6, "end": 48.2, "rotation": 6 }
  ]
}
```

同时生成 `subtitles/final.srt`（仅用于人工核对和无障碍导出，实际画面字幕由 Remotion 组件里的气泡文字承担，不再单独叠加底部字幕条）。

规则：

- 新消息尽量落在歌词起音或音乐重拍。
- 普通消息停留 1.5～3 秒。
- 核心笑点可以停留 3～5 秒。
- 副歌或高潮允许消息连发和表情包强化。
- 字幕（`subtitle` 字段）内容必须与原台词一致，`emoji` 字段只是装饰性追加，不计入字幕/歌词文本，也不得改变原意。
- `repeat_visual` 只允许对画面气泡做视觉复读（同一条消息在短时间内反复“拍入”几次），用于配合鼓点或反复的人声花腔；如果对应的人声歌词本身也需要重复演唱，必须先按节点 3 的规则单独提出并获批准，不能因为要做视觉复读就默认歌词也重复。
- `camera.follow` 只能取 `last_message`（跟随最新消息）或 `full_thread`（展示到目前为止的完整对话），不得凭空定义新的相机行为。
- `memes` 数组里的每个表情包展示时长建议 0.3～1 秒，且必须落在 `scenes` 里某个场景的时间范围内，不得覆盖到下一句台词还没出现的时间段。

### 节点 7：微信聊天视觉（Remotion 组件）

方案：`remotion/src/ChatBubble.tsx` 组件按 `dialogue_APPROVED.json` 逐条渲染微信聊天气泡，不使用截图拼接、不使用一张完整长图代替全部场景。组件必须实现参考视频里出现的四个视觉要点：

1. **开场钩子帧**：`remotion/src/ChatVideo.tsx` 顶部按 `timeline.hook` 渲染一帧真实感的微信对话框（返回箭头 + 联系人名 + 第一条消息），停留时长取 `hook.duration`，之后再切入逐条气泡场景。
2. **拍入动画**：每条新消息用 `interpolate()` 驱动“轻微旋转 + 缩放”的进入动作（对应 `timeline` 里的 `entrance: "tilt_drop"`），不能用纯淡入或硬切代替。
3. **跟随镜头**：整个聊天窗口按 `scene.camera` 做竖向缩放/平移，画面上下动态留黑边，模拟手机竖屏录屏被二次构图，不能让画面整屏铺满静态截图。
4. **情绪表情装饰**：`scene.emoji` 若存在，追加显示在气泡文字之后，不写入气泡正文，不改变字幕文本。

逐步生成（与旧方案一致，仍作为验收样图用途）：

```text
scene_001：显示第 1 条消息
scene_002：显示第 1～2 条消息
scene_003：显示第 1～3 条消息
```

先用 `npx remotion still` 生成 3 张静帧样图供验收：

- 普通对话场景。
- 长消息场景。
- 核心笑点和表情包场景（含 `MemeOverlay.tsx` 叠加效果）。

验收：

- [ ] 分辨率为 1080×1920。
- [ ] 头像和左右人物固定。
- [ ] 文字没有裁切或溢出。
- [ ] 气泡颜色和背景统一。
- [ ] 字号在手机端清晰可读。
- [ ] 没有真实隐私信息。
- [ ] 带有“剧情演绎 / 虚构聊天”标记。
- [ ] 拍入动画、跟随镜头、表情装饰三项效果在样图/样片里可见。
- [ ] 未使用剪映、CapCut 或其他 GUI 工具生成或修饰画面。

### 节点 8：15 秒样片（Remotion 渲染）

用 Remotion CLI 只渲染前 15 秒（30fps 对应帧 0～449），不打开任何图形界面剪辑软件：

```powershell
npx remotion render ChatVideo preview/preview_15s.mp4 `
  --props=planning/timeline_APPROVED.json `
  --frames=0-449
```

验证：

- 消息出现节奏。
- 音乐与画面对齐。
- 字号和构图。
- 缩放方向（跟随镜头）。
- 拍入动画是否自然。
- 表情包出现时机。
- 高潮句的画面复读（`repeat_visual`）效果是否卡点。

15 秒样片未通过，不得渲染完整视频。

### 节点 9：完整粗剪（Remotion 渲染）

```powershell
npx remotion render ChatVideo output/roughcut_v1.mp4 `
  --props=planning/timeline_APPROVED.json
```

粗剪只解决：

- 全片消息顺序。
- 时间轴。
- 音画同步。
- 基础缩放和跟随镜头。
- 字幕（气泡文字）完整性。

本节点不要过度制作装饰效果，`repeat_visual`、`memes` 等强调类事件先在 `timeline_v1.json` 里标好，实际视觉打磨放到节点 10。

### 节点 10：完整精修（Remotion 渲染）

在 `remotion/src/` 组件层面完成以下效果，改完后重新执行 `npx remotion render` 输出 `final_candidate_v1.mp4`：

- 重点消息放大（`scene.camera.zoom` 加大）。
- 消息拍入动画的旋转幅度和时长微调。
- 表情包和贴纸（`MemeOverlay.tsx` 读取 `timeline.memes`，按 `rotation` 叠加短暂展示）。
- 必要的提示音和强调音效（用 `<Audio startFrom=... endAt=...>` 或独立音效轨叠加在 `song.wav` 之上，不覆盖主旋律）。
- 气泡安全区域（避免贴近屏幕边缘被裁切）。
- 结尾停留和收束（`hook`/最后一个 `scene` 延长 `end`）。

任何本节点的调整都必须落到 `remotion/src/*.tsx` 或 `timeline_v1.json` 里，不允许绕过代码在成片文件上直接用其他工具做二次剪辑。

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

## 8. Remotion 剪辑工程

节点 7～10 共用同一个 `remotion/` 子工程。首次搭建项目时初始化，此后只修改组件代码和 `timeline_v1.json`，不重新建工程。

### 8.1 初始化

```powershell
cd remotion
npm init -y
npm install remotion @remotion/cli @remotion/renderer react react-dom
npx remotion browser ensure
```

### 8.2 工程结构约定

```text
remotion/
├─ package.json
├─ remotion.config.ts        # 固定输出 1080x1920、30fps、H.264
└─ src/
   ├─ Root.tsx                # 注册 Composition，id="ChatVideo"
   ├─ ChatVideo.tsx           # 顶层组合：hook 帧 + 逐条 scene + memes 轨 + <Audio>
   ├─ ChatBubble.tsx          # 单条气泡：拍入动画、头像、emoji 装饰
   ├─ MemeOverlay.tsx         # 表情包插帧：按 timeline.memes 定时展示 + 旋转
   └─ timeline.schema.ts      # 对应第 6 节 timeline_v1.json 的类型定义
```

`Root.tsx` 中的 Composition 时长由脚本读取 `timeline_APPROVED.json` 最后一个 `scene.end`（加收尾停留）乘以 30fps 计算得到，不写死常量。

### 8.3 渲染命令

样图（节点 7）：

```powershell
npx remotion still ChatVideo chat/scene_003.png `
  --props=planning/timeline_v1.json --frame=90
```

15 秒样片（节点 8）：

```powershell
npx remotion render ChatVideo preview/preview_15s.mp4 `
  --props=planning/timeline_APPROVED.json --frames=0-449
```

完整粗剪/精修（节点 9、10）：

```powershell
npx remotion render ChatVideo output/roughcut_v1.mp4 `
  --props=planning/timeline_APPROVED.json
```

### 8.4 为什么不用剪映（选型结论，避免反复讨论）

剪映并非完全无法程序化：开源库 pyJianYingDraft 可以用 Python 直接生成剪映草稿 JSON（支持关键帧、动画、贴纸、字幕导入），生成环节对 agent 是友好的。但导出环节是死穴：

- 剪映没有渲染 CLI，自动导出只支持剪映 6 及更早版本，且依赖 Windows UI 自动化（窗口须保持前台、建议闲时运行）；剪映 7+ 隐藏了导出控件，自动化已失效。
- 剪映 6+ 的草稿文件通常加密，模板复用受版本影响大，等于把整条流水线锁死在一个特定旧版本上。
- 本工作流是"逐节点验收、驳回重做"的状态机，节点 8～10 会反复重渲染；导出不能自动化，意味着每轮迭代都要人工打开剪映点导出，验收循环退化回人工流程。

因此选型结论：OpenClaw 全自动流程一律走 Remotion。剪映路线只保留一个可选用途——如果用户明确要求拿到"可以自己在剪映里继续手调的工程"，可以在节点 10 之后额外用 pyJianYingDraft 按 `timeline_APPROVED.json` 生成一份剪映草稿作为交接物；该草稿只是给人用的副产品，成片仍以 `npx remotion render` 的输出为准，验收也只针对 Remotion 产物。

### 8.5 与 FFmpeg 的分工

- Remotion 负责所有“看得见的效果”：气泡拍入动画、跟随镜头缩放/黑边、表情包插帧、画面复读、片内音效叠加、片尾收束——这些都必须是组件代码里的可复现逻辑，不是事后在成片上手动加的。
- FFmpeg（见第 9 节）只负责音频预处理、最终编码规格校验、生成检查图，以及在极少数需要导出外部字幕文件（无障碍/上传素材）时做字幕烧录，不用于制作画面效果。
- 如果某个效果既能在 Remotion 组件里做也能靠 FFmpeg 滤镜做（例如 Ken Burns 缩放），一律以 Remotion 组件为准，FFmpeg 版本只在“环境要求”里提到的无 Node 环境兜底场景使用。

---

## 9. FFmpeg 处理

音频标准化：

```powershell
ffmpeg -y -i audio/song_APPROVED.mp3 -ar 48000 -ac 2 audio/song.wav
```

Remotion 渲染出的 `output/roughcut_v1.mp4` / `final_candidate_v1.mp4` 已经是画面+音频合成好的 MP4（`ChatVideo.tsx` 内用 `<Audio src="audio/song.wav">` 挂载音轨），本节的“最终编码”步骤只用于统一封装规格、做必要的重新编码校验，不再需要单独的无声视频 + 音频合并：

```powershell
ffmpeg -y -i output/final_candidate_v1.mp4 `
  -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p `
  -c:a aac -b:a 192k -ar 48000 output/final.mp4
```

如需导出带烧录字幕的版本（例如给不支持内嵌气泡样式的平台），可选用 `ass`/`subtitles` 滤镜叠加 `subtitles/final.srt`，但默认交付版本仍以气泡文字为准，不额外烧录字幕：

```powershell
ffmpeg -y -i output/final.mp4 -vf "subtitles=subtitles/final.srt" `
  -c:v libx264 -preset medium -crf 20 -c:a copy output/final_with_srt.mp4
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
- [ ] 成片可由 `npx remotion render` + 本节 FFmpeg 命令完整复现，过程中未使用剪映、CapCut 等图形界面工具。

---

## 10. 节点验收报告模板

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

## 11. 状态文件

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

## 12. OpenClaw 总控提示词

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
11. 节点7～10必须使用remotion/子工程通过npx remotion render/still渲染，
    禁止使用剪映、CapCut等图形界面工具人工剪辑或修饰画面。

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
5. 参考reference/目录下的参考视频复现拍入动画、跟随镜头动态黑边、
   emoji装饰、高潮句画面复读+表情包插帧这四类效果，效果参数写入
   timeline_v1.json，由remotion/组件读取，不手工调整成片。

剪辑强制规则：
1. 节点7～10只能使用remotion/子工程：npx remotion still生成样图，
   npx remotion render生成样片/粗剪/精修，不得打开任何图形界面剪辑
   软件（剪映、CapCut等）。
2. 先完成15秒样片并等待验收。
3. 样片通过后才能渲染完整粗剪。
4. 新消息尽量跟随歌词起音或音乐重拍出现。
5. FFmpeg只用于音频预处理、最终编码规格统一、字幕导出和检查图生成，
   不用于制作画面效果。
6. 完成后用ffprobe和九宫格检查图验证成片。

现在读取状态文件，只执行当前节点。完成后按照工作流中的验收报告模板汇报并停止。
```

---

## 13. 推荐的首次执行顺序

1. 创建项目目录。
2. 放入 `dialogue.txt`、人物头像和参考视频。
3. 按第 8.1 节初始化 `remotion/` 子工程（`npm install` + `npx remotion browser ensure`），确认 `ffmpeg -filters` 含 `ass`。
4. 创建初始 `workflow-state.json`，将节点 0 设为 `PENDING`。
5. 把本文件和总控提示词交给 OpenClaw。
6. 每次只回复“通过节点N”或明确的驳回要求。
7. 先完成 15 秒样片，再决定是否渲染完整视频。
8. 全程不打开剪映、CapCut 等图形界面剪辑软件；如果发现节点7～10 的产物无法用 `npx remotion render` 复现，视为流程违规，需要驳回重做。
