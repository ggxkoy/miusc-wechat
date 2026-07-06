# 爆款视频复刻工作流（通用版）

## 1. 工作流目标与定位

把"一条爆款参考视频 + 用户的爆款拆解思路"固化成可复用的视频模板，再用该模板批量生产内容，并按投放渠道（TikTok、小红书、哔哩哔哩、微信视频号、快手）输出各自适配的版本。

执行代理可以是 OpenClaw 或 MiniMax M3（下文统称"执行代理"），要求具备文件、Shell 和无头浏览器操作能力。工作流本身与代理无关，同一份总控提示词两者通用。

整个体系分为两条流水线：

```text
阶段 T（模板固化，每种爆款做一次）：
参考视频（本地文件或平台链接）+ 用户拆解思路
  → 结构化拆解 → 参数化 → Remotion 组件实现 → 复刻验证
  → 产出 templates/<template_id>/ 模板包

阶段 P（内容生产，每条视频跑一次）：
选模板 + 新内容素材
  → 内容结构化 → 音频 → 时间轴 → 样片 → 母版成片
  → 反馈循环（见第 8 节，本工作流最重要的部分）
  → 渠道适配 → 交付
```

本仓库已有的 `OPENCLAW_WECHAT_MUSIC_VIDEO_WORKFLOW.md`（微信聊天音乐视频）就是第一个模板：其节点 0～6 对应阶段 P 的内容生产环节，节点 7～10 的 Remotion 规范对应模板包里的组件实现。新模板一律按本文档的模板包格式沉淀，微信聊天模板后续也应迁移到 `templates/wechat-chat-music/`。

---

## 2. 总体原则

### 2.1 强制规则

沿用微信聊天工作流的全部强制规则（逐节点验收、`REVIEW` 后停止、`*_APPROVED` 产物不可覆盖、未经授权不得上传发布、节点级驳回只修被驳回节点），并新增：

1. 剪辑渲染必须使用可脚本化引擎，禁止剪映、CapCut 等 GUI 工具人工剪辑；产物必须能由命令行复现。**默认引擎为 video-use**（`video-use/` submodule，browser-use 开源，见第 3.5 节）：上层时间轴编译成 video-use 的 `edl.json`，交给 `video-use/helpers/render.py` 出片，白捡它的分段无损渲染、防爆音、字幕最后烧录等 12 条生产硬规则。Remotion/HyperFrames/PIL 降为 video-use 的动画槽位之一。整合方案详见 `INTEGRATION.md`。
2. 所有影响观感的效果（节奏、镜头、构图、表情包密度、字幕样式等）必须落在结构化参数文件里（`template.yaml`、`timeline.json`），不允许把效果硬写死在组件代码里无法调整——这是第 8 节反馈协议能运转的前提。
3. 用户的拆解思路原文必须原样保留（`breakdown.md` 的"原文"区），执行代理的结构化整理只能追加在后面，不得改写、缩写或"优化"用户的表述。
4. 收到自然语言反馈后，必须先输出"反馈解析报告"（第 8.2 节格式）并获确认，才能修改参数；禁止直接改完回复"已按意见调整"。
5. 通用素材库（`library/`）的素材必须登记来源和授权状态；未确认授权的素材只能用于内部样片，不得进入对外交付的成片。
6. 渠道适配只做变换（裁切、时长压缩、字幕/封面调整），不得改变已通过母版的台词内容和剧情结构；若某渠道确需内容级修改，必须回到对应生产节点重新走验收。
7. 全流程统一 30fps：母版、样片、对比样片、全部渠道版本均为 30fps，帧号与时间的换算固定为 `秒 = 帧号 ÷ 30`。参考视频若不是 30fps，抽帧分析时按其原生帧率处理，但所有产出物一律 30fps，保证"第 N 帧"在整个项目里指向唯一画面。

### 2.2 状态机与用户口令

与微信聊天工作流相同：

```text
PENDING → RUNNING → REVIEW → APPROVED
                         ↘ REJECTED → RUNNING
```

```text
通过节点T2 / 通过节点P4
驳回节点P4：开头前3秒太拖
反馈：高潮那里表情包太密了，节奏乱
查看当前状态
暂停工作流 / 继续工作流
```

注意区分两种输入：`驳回节点N：...` 是节点级驳回（重做该节点）；`反馈：...` 进入第 8 节的反馈解析流程（定位参数、给 diff、渲染对比），不自动等于驳回。

### 2.3 验收粒度（v1 实跑后转正的配置）

v1 实际执行中"逐节点验收"被证明对短片过于琐碎（12 个节点被现场合并成 4 个阶段打包验收）。现将阶段级验收转正为正式配置，写在 `project.yaml`：

```yaml
review_granularity: stage   # node=逐节点验收 / stage=按阶段打包验收（默认）
stages:                     # stage 模式下的分组（可按模板调整）
  A_准备: [P0, P1]
  B_制作: [P2, P3]
  C_成片: [P4]
  D_交付: [P5, P6]
```

- `stage` 模式下口令为 `通过阶段B` / `驳回阶段B：...`；阶段内节点仍逐个执行并留档产物，只是验收停顿合并。
- **样片节点规则**：每个模板**首次投产的项目必须走样片验收**；该模板出过一条用户通过的成片后，后续项目可在 `project.yaml` 写 `skip_preview: true` 跳过样片直出完整候选片（v1 用户口头指示的正式化）。
- 粗剪与精修默认合并为一个节点（v1 实跑证明拆分是过度设计）；模板需要精细打磨时可在模板包里声明拆开。

---

## 3. 执行代理与环境要求

- OpenClaw 或 MiniMax M3，启用文件、Shell、无头浏览器能力。
- Node.js 20+、npm、Git。
- Remotion（随各模板包的 `remotion/` 子工程安装）；FFmpeg/FFprobe（带 `libass`）。
- **yt-dlp**：凡是以链接为输入的模板（sigma-cowboy 抓参考视频、game-commentary 抓广告底片）都用它下载。`pip install -U yt-dlp` 或 `pipx install yt-dlp`；建议定期升级，平台改版后旧版本会失效。遇登录墙/验证码/风控时暂停，请用户手动下载后以文件方式提供，不得反复重试触发风控。
- **TTS**：game-commentary 等需要配音的模板用。默认 `pip install edge-tts`（免费、CLI、零部署）；音质升级或声音克隆见该模板 `breakdown.md` 选型表。
- 需要生成音乐的模板：可用的 Suno 账号（登录、验证码、付费确认必须人工介入）。
- **video-use 引擎**：`git submodule update --init video-use` 拉取；按 `video-use/install.md` 装 Python 依赖（`uv sync` 或 `pip install -e .`）。TTS 用 MiniMax/edge-tts 时不需要 ElevenLabs key；用 video-use 原生 TTS 才需要。
- 检查命令、Remotion 初始化、与 FFmpeg 的分工，全部沿用 `OPENCLAW_WECHAT_MUSIC_VIDEO_WORKFLOW.md` 第 3、8、9 节，不重复。

### 3.5 video-use 引擎与 EDL 编译

渲染统一走 video-use（`video-use/` submodule）。上层各模板的时间轴（`cutlist.json` / `timeline.json`）新增一个 **`compile_edl`** 环节，翻译成 video-use 的 `edl.json`，再调 `render.py` 出片：

```bash
# 编译（上层脚本产出）→ 渲染（video-use 引擎）
python video-use/helpers/render.py projects/<id>/edit/edl.json \
  -o projects/<id>/edit/preview.mp4 --preview        # 样片
python video-use/helpers/render.py projects/<id>/edit/edl.json \
  -o projects/<id>/edit/final.mp4                     # 母版（默认 -14 LUFS）
```

EDL 结构与三个模板的映射见 `INTEGRATION.md` 第 2～3 节。五条要点：

1. **overlay 是全画布叠加**（render.py 的 overlay 无 x/y，默认贴 0,0）。画中画、贴纸等要作为**动画槽位**预合成为"全画布透明 + 目标位置内容"的 overlay 视频（PIL/HyperFrames 出带 alpha 的 WebM），EDL 的 `overlays[].file` 指向它。
2. **render.py 原生不含独立配音轨与原声闪避**：需要 TTS 解说 + 底片原声压低的模板（game-commentary），在 render.py 出片后由上层补一个 ffmpeg 音频混音 pass（见该模板 OPENCLAW_TASK）。
3. **冲突以模板优先**（用户确认）：模板观感与 video-use 硬规则冲突时以模板为准，但只让位"品味型默认值"（如 padding），防爆音/字幕最后/不双重编码等正确性硬规则保留；覆盖须在 EDL 显式标注理由供审计（详见 `INTEGRATION.md` 3.1）。
4. **不需要 ElevenLabs key**：video-use 的冷启动检查要求 `ELEVENLABS_API_KEY`，但那只有它的 `transcribe.py`（ASR 转写）用得到。本工作流三个模板都不需要转写（解说词/台词由用户提供，牛仔片无台词），TTS 走 MiniMax/edge-tts——执行代理应跳过该项检查，不要向用户索要 ElevenLabs key，除非某模板明确要用 Scribe 转写或 ElevenLabs TTS。
5. **强制 30fps**：video-use 输出规格默认"跟随源"，与本工作流"全流程统一 30fps"（总体原则第 7 条）不一致。compile_edl 前把所有非 30fps 源转出 30fps 工作副本，渲染后用 ffprobe 验证输出为 30fps。

---

## 4. 目录结构

**本仓库根目录即工厂根目录**（下文的 `viral-video-factory/` 就是仓库根，不需要再套一层）。`library/`、`channels/`、`projects/` 已在仓库中建好骨架；媒体与文本的 git 边界由根目录 `.gitignore` 划定——项目工作区只跟踪 `planning/`、`feedback-log.md`、`edit/edl.json`、`edit/master.srt` 等小文本，输入素材、音频、渲染产物一律不进 git（按 `library/index.json` 的 source 字段可重新获取，团队同步用网盘或 Git LFS）。

```text
viral-video-factory/   ← 即仓库根
├─ library/                        # 通用素材库（跨模板共享，见第 5 节）
│  ├─ memes/                       # 表情包/meme 图
│  ├─ music/                       # 音乐（含授权信息）
│  ├─ sfx/                         # 音效（提示音、鼓点、whoosh 等）
│  ├─ fonts/                       # 字体（注意商用授权）
│  └─ index.json                   # 素材索引：标签、情绪、来源、授权状态
├─ templates/                      # 模板包 = 纯文本配方，不存任何媒体
│  └─ <template_id>/
│     ├─ breakdown.md              # 用户拆解思路原文 + 结构化拆解
│     ├─ template.yaml             # 可调参数及默认值（每项带观感注释）
│     ├─ cutlist.json / acceptance.md 等派生数据与清单
│     └─ （可选）remotion/ 等代码工程
├─ channels/                       # 渠道画像（见第 9 节）
│  ├─ tiktok.yaml
│  ├─ xiaohongshu.yaml
│  ├─ bilibili.yaml
│  ├─ wechat-channels.yaml
│  └─ kuaishou.yaml
└─ projects/                       # 每条内容一个项目；阶段 T 也是项目
   ├─ tpl-<template_id>/           # 模板固化项目：参考视频放 input/reference/
   └─ <project_id>/
      ├─ input/                    # 本条内容的原始素材（含 reference/）
      ├─ planning/                 # project.yaml、timeline_v1.json、workflow-state.json
      ├─ audio/
      ├─ preview/                  # 样片、对比样片、九宫格检查图
      ├─ feedback-log.md           # 反馈台账（见第 8.5 节）
      ├─ output/                   # 母版成片
      └─ variants/                 # 渠道版本
         ├─ tiktok/final.mp4
         ├─ xiaohongshu/final.mp4 + cover.jpg + title.txt
         └─ ...
```

---

## 5. 素材库规范

### 5.1 通用素材库 `library/`

`index.json` 是执行代理选素材的唯一入口，每个素材必须登记：

```json
{
  "id": "meme_panda_taixing",
  "file": "memes/panda_taixing.png",
  "type": "meme",
  "tags": ["熊猫头", "太刑了", "手铐"],
  "emotion": ["搞笑", "社死", "危"],
  "source": "用户提供",
  "license": "user_confirmed",
  "added": "2026-07-04"
}
```

规则：

- `license` 取值：`user_confirmed`（用户确认可用）、`royalty_free`（免版税，注明出处）、`unverified`（未确认，只能用于内部样片）。
- 执行代理挑选素材时按 `tags`/`emotion` 匹配拆解思路里的情绪点，给出 2～3 个候选让用户选，不自作主张定稿。
- 新素材入库必须同步更新 `index.json`，不允许目录里出现未登记文件。

### 5.2 素材归属规则（用户裁定：非通用素材一律跟随项目）

媒体素材只有两个家：

1. **`library/`**：跨模板可复用的通用素材（meme、音乐、音效、字体），入库必须登记授权。
2. **`projects/<id>/input/`**：其余一切媒体——本期实拍/游玩片段、广告底片、**参考视频**（放 `input/reference/`）。阶段 T（模板固化）本身就是一个项目，目录约定 `projects/tpl-<template_id>/`。

模板包（`templates/<id>/`）**只存文本配方**：拆解、参数、剪辑点数据、清单、代码工程，不存任何媒体文件。某模板每集都要用的素材（如固定 BGM、专属贴纸）进 `library/` 并在 index.json 打上 `template:<id>` 标签。判断口诀：通用进库、其余随项目、模板只放字。

---

## 6. 阶段 T：模板固化流程

每引入一种新爆款跑一次。产物是完整的模板包。

| 节点 | 名称 | 主要产物 | 核心验收内容 |
|---|---|---|---|
| T0 | 素材入库 | `projects/tpl-<id>/input/reference/`、`breakdown.md`（原文区） | 参考视频可读、拆解原文完整保留 |
| T1 | 结构化拆解 | `breakdown.md`（结构化区） | 与用户思路一致、疑点已提问 |
| T2 | 参数化 | `template.yaml` | 每个观感维度都有对应参数 |
| T3 | 组件实现 | `remotion/` 工程 | 可无头渲染、参数全部生效 |
| T4 | 复刻验证 | `preview/replica_vs_reference.mp4` | 并排对比达到验收清单标准 |

### 节点 T0：素材入库

参考视频接受两种输入方式：

- **文件**：直接放入 `projects/tpl-<template_id>/input/reference/`。
- **链接**：抖音/TikTok/小红书/B站/快手等平台的分享链接。执行代理用无头浏览器或下载工具获取视频文件存入 `projects/tpl-<template_id>/input/reference/`，并在 `breakdown.md` 登记来源 URL 和抓取日期。注意：
  - 遇到登录墙、验证码或反爬拦截时暂停，请用户手动下载后以文件方式提供，不得反复重试触发风控。
  - 平台水印无需去除——参考视频只用于内部拆解学习，不进入任何交付成片。
  - 链接可能失效，抓取成功后以本地文件为准，后续节点不再依赖原链接。
  - 参考视频等媒体不进 git（.gitignore 已划界）；来源链接和规格登记在 breakdown.md 里以便重取。用户手工提供、没有来源链接的媒体，提醒用户自行备份（网盘/本地）。

入库步骤：

1. 参考视频（无论来源）用 ffprobe 登记规格（分辨率、帧率、时长），写入 `breakdown.md` 头部。
2. 用户的爆款拆解思路原文写入 `breakdown.md` 的"## 用户拆解原文"区，一字不动。
3. 若用户提供了多条同款爆款，全部入库并标注主参考。

### 节点 T1：结构化拆解

执行代理逐帧抽样参考视频（`ffmpeg -ss <t> -frames:v 1`，间隔 2～5 秒，关键段加密抽帧），结合用户拆解原文，在 `breakdown.md` 追加"## 结构化拆解"区：

```markdown
### 钩子（0s～Xs）
形式 / 信息量 / 为什么能留住人（引用用户原文的判断）

### 节奏结构
分段时间轴：铺垫段、升级点、爆点、收尾；每段的剪辑密度

### 画面与构图
镜头运动规律 / 主体位置 / 留白与黑边 / 字幕位置

### 情绪曲线与强化手段
每个情绪拐点用了什么手段（表情包、音效、复读、变速）

### 可变槽位（slots）
哪些是"换内容就能复用"的位置：台词、头像、素材图、BGM
哪些是模板固有不该动的：节奏骨架、构图、动效风格
```

强制要求：用户拆解原文与代理的画面观察冲突时，以用户原文为准并单独列出冲突点请用户裁定；代理不确定的手法（如"这里是变速还是丢帧"）必须列入"待确认项"提问，不得擅自定论。

### 节点 T2：参数化

把结构化拆解翻译成 `template.yaml`。这是反馈协议的地基：后续用户说"节奏太慢"，代理就是来这里找参数的。每个参数必须带"观感注释"——说明它调大调小观感上会怎么变：

```yaml
template_id: wechat-chat-music
name: 微信聊天音乐短视频
master_spec: { width: 1080, height: 1920, fps: 30 }

pacing:                      # 节奏
  scene_hold_normal: 2.2     # 普通消息停留秒数。调小→节奏变快
  scene_hold_punchline: 4.0  # 笑点停留秒数。调大→给观众反应时间
  beat_snap: true            # 新消息吸附音乐重拍
  beat_offset_ms: 0          # 卡点整体偏移。观感"慢半拍"时调负值

camera:                      # 镜头与构图
  follow_zoom: 1.15          # 跟随镜头缩放。调大→画面更满、黑边更少
  punchline_zoom: 1.3        # 爆点放大倍数
  safe_margin_px: 72         # 内容距边缘安全距离。字被渠道 UI 挡→调大

emphasis:                    # 强化手段
  meme_density: medium       # low/medium/high。反馈"表情包太多"→降档
  repeat_visual_max: 4       # 爆点画面复读次数上限
  sfx_enabled: true

style:                       # 视觉风格
  bubble_font_size: 56
  entrance: tilt_drop        # 消息入场动效
```

验收：拆解里的每个观感维度（节奏/画面/构图/情绪强化/风格）都能在 yaml 里找到至少一个对应参数；参数注释写明白调整方向与观感的关系。

### 节点 T3：组件实现

按微信聊天工作流第 8 节的规范建 `remotion/` 工程，组件从 `template.yaml` + 项目的 `timeline.json` 读取全部参数。验收重点：随机改动 yaml 里任意参数重新渲染，画面必须相应变化——证明没有硬编码。

### 节点 T4：复刻验证（模板通过的硬标准）

用与参考视频相同（或等价）的内容素材，通过模板渲染一条复刻版，并生成并排对比：

```powershell
ffmpeg -y -i input/reference/ref.mp4 -i preview/replica.mp4 `
  -filter_complex "[0:v]scale=540:960[l];[1:v]scale=540:960[r];[l][r]hstack" `
  preview/replica_vs_reference.mp4
```

对照 `acceptance.md` 逐条验收（钩子形式、入场动效、镜头跟随、爆点强化、收尾方式）。达不到参考视频观感的模板不得进入生产阶段。

---

## 7. 阶段 P：内容生产流程

每条视频跑一次。前置条件：所选模板已通过 T4。

| 节点 | 名称 | 主要产物 | 说明 |
|---|---|---|---|
| P0 | 项目初始化 | `project.yaml` | 选模板、定目标渠道集合、登记内容素材 |
| P1 | 内容结构化 | `content_v1.json` | 按模板 slots 填充新内容（台词/图/人物） |
| P2 | 音频制作 | `audio/song_APPROVED.mp3` | 需要音乐的模板走 Suno 流程（沿用原工作流节点 3～5），或从 `library/music/` 选曲 |
| P3 | 时间轴 | `timeline_v1.json` | 卡点、镜头、强化事件；schema 沿用原工作流节点 6 并叠加 template.yaml |
| P4 | 15 秒样片 | `preview/preview_15s.mp4` | Remotion 渲染，首个反馈循环入口 |
| P5 | 母版成片 | `output/master_v1.mp4` | 主渠道规格全长渲染，反馈循环直到通过 |
| P6 | 渠道适配 | `variants/<channel>/` | 按渠道画像批量变换（第 9 节） |
| P7 | 交付 | 全部渠道版本 + 检查图 | ffprobe 校验，人工确认，不自动发布 |

要点：

- P0 必须明确"母版渠道"（通常选目标渠道中规格最严的竖屏渠道），母版按该渠道规格制作，其余渠道由 P6 变换得到。
- P4/P5 的每一轮用户意见都走第 8 节反馈协议；`通过节点P5` 后母版锁定为 `master_APPROVED.mp4`，P6 只做变换。
- 所有渲染命令、编码规格、ffprobe/九宫格校验沿用原工作流第 8～9 节。

---

## 8. 反馈理解协议（本工作流最重要的部分）

用户反馈是自然语言（"节奏太慢""高潮不够炸""构图偏了""没内味"），执行代理的职责是把它翻译成参数级修改，并证明自己理解对了。

### 8.1 总流程

```text
用户反馈（自然语言，可含帧号/秒数定位）
  → ⓪ 若含帧号/秒数：抽帧回显确认（见 8.4 节）
  → ① 复述理解（用自己的话说用户想要什么观感变化）
  → ② 定位（哪个时间段/哪一帧、哪些参数/时间轴事件受影响）
  → ③ 提案（参数 diff：旧值 → 新值；模糊程度词给保守/激进两档）
  → ④ 渲染对比（只渲染受影响片段的 before/after，并排或先后播放）
  → ⑤ 用户确认后写入，并记入 feedback-log.md
```

### 8.2 反馈解析报告格式

```markdown
## 反馈解析 #<序号>

**反馈原文**：高潮那里表情包太密了，节奏乱

**我的理解**：46～50s 爆点段，表情包插帧频率过高，
干扰了"画面复读卡鼓点"的主节奏，希望强化主节奏、弱化装饰。

**定位**：timeline.memes 在 46.0～49.5s 区间有 5 个事件；
template.yaml → emphasis.meme_density: high

**提案**：
- 方案 A（保守）：meme_density high→medium，该区间保留 3 个卡在重拍上的
- 方案 B（激进）：该区间只保留 1 个，复读次数 4→5 补强节奏

**对比样片**：preview/fb03_A.mp4 / fb03_B.mp4（44～52s 片段）

**请回复**：采纳A / 采纳B / 继续调整：<新要求>
```

规则：

- 禁止跳过报告直接改；禁止"已按意见优化"这类无 diff 的回复。
- 一次反馈只动被点名的维度；顺手觉得"别处也该改"只能列入"建议项"，不得一并改动。
- 程度词（"再快一点""稍微大一些"）必须翻译成具体数值并说明幅度依据（如"快一点 = 普通消息停留 2.2s→1.8s，约提速 18%"）。
- 用户连续两轮说"不对，不是这个意思"时，停止提案，改为提问式澄清（列出该时间段所有可调维度让用户指认）。

### 8.3 反馈词典（初始版，随使用扩充）

| 用户常说 | 大概率指向的参数 |
|---|---|
| 节奏太慢 / 拖 / 闷 | `pacing.scene_hold_*` 调小、删铺垫段、转场加密 |
| 卡点不准 / 慢半拍 | `pacing.beat_offset_ms`、重对 beat grid |
| 开头抓不住人 | 钩子时长压缩、爆点信息前移进前 3 秒 |
| 画面太空 / 太素 | `camera.follow_zoom` 调大、装饰元素密度升档 |
| 太满 / 太乱 / 喘不过气 | `emphasis.meme_density` 降档、复读次数减、留白段加长 |
| 构图偏了 / 字被挡 | `camera.safe_margin_px`、元素锚点、检查目标渠道 UI 遮挡区 |
| 高潮不够炸 | `punchline_zoom` 调大、音效叠加、复读+插帧组合加强 |
| 没内味 / 不像参考视频 | 回到模板 `acceptance.md` 逐条对照，找出走样项再定位参数 |
| 字太小 / 看不清 | `style.bubble_font_size`、对比度、停留时长 |

词典只是初筛辅助——报告里仍要写"我的理解"让用户确认，不能拿词典当免检通道。

### 8.4 帧级反馈与帧码烧录

用户可以用帧号或秒数精确指认画面（"第 1200 帧字被挡了""40 秒那里构图偏了"），这是最高优先级的定位方式，比自然语言描述段落更准。配套机制：

1. **审片版烧录帧码**：所有进入 REVIEW 的视频产物（15 秒样片、母版候选、反馈对比样片）必须在角落烧录 `帧号 | 秒数` 计数器；交付版本（P7 及渠道版本）不带帧码。Remotion 组件里做一个 `DebugFrameStamp` 叠层，由渲染参数 `debug_stamp: true/false` 控制开关——这也是一个不允许硬编码的参数。
2. **回显确认**：收到帧级反馈后，先抽出该帧（`ffmpeg -ss <帧号/30> -i ... -frames:v 1`）贴回给用户："你说的第 1200 帧是这个画面（贴图），确认后我继续解析"——防止帧号口误或换算错位改错地方。用户确认后再走 8.2 的解析报告流程。
3. **帧号换算**：全流程统一 30fps（总体原则第 7 条），`秒 = 帧号 ÷ 30`，不存在多帧率歧义。执行代理在报告里同时写帧号和秒数（如"第 1200 帧 / 40.0s"）。
4. **视觉核对**：具备视觉能力的执行代理必须实际查看被指认的帧再写"我的理解"，不得只按帧号盲改参数；若执行代理不具备读图能力，必须在解析报告里声明"未经视觉核对"，并把该帧图片附给用户人工核对。
5. 九宫格检查图（contact sheet）的每格标注对应帧号，方便用户快速指认。

### 8.5 反馈台账与偏好沉淀

每轮反馈记入项目的 `feedback-log.md`：

```markdown
| # | 反馈原文 | 解读 | 采纳的 diff | 结果 |
|---|---|---|---|---|
| 3 | 高潮表情包太密 | 爆点段装饰过载 | meme_density high→medium | 用户通过 |
```

沉淀规则：同一模板下，同类反馈在不同项目里出现 ≥2 次（如每次都嫌默认节奏慢），执行代理应提议把该修改写回 `templates/<id>/template.yaml` 的默认值，经用户批准后生效，并在模板包的变更记录里注明依据（引用相关 feedback-log 条目）。这样模板会越用越贴合用户口味。

### 8.6 飞书多维表格：正式反馈入口（v1 实跑后转正）

v1 实际运转中反馈通道已迁移到飞书多维表格（agent 上传成片建记录、读"反馈"字段拿意见），比聊天窗口更适合批量作品管理，现予转正。但 v1 同时暴露了协议断裂：反馈被直接执行、没有解析报告、没有 feedback-log。规则如下：

表格字段（在 v1 现有五列基础上扩展）：

| 字段 | 谁写 | 说明 |
|---|---|---|
| 视频名称 / 项目类型 / 制作日期 / 视频文件 | agent | 上传成片时创建 |
| 反馈 | 用户 | 自然语言意见，可含帧号/秒数 |
| 反馈状态 | agent | `待解析` / `已出解析报告` / `已确认执行` / `已完成` |
| 解析报告 | agent | 8.2 格式报告的正文或链接（复述理解+参数 diff+对比样片路径） |

强制规则：

1. **读到反馈 ≠ 可以直接改**。从表格读到的反馈与聊天反馈完全同权，必须走 8.1 的解析流程：复述理解 → 定位参数 → 给 diff（模糊词给两档）→ 渲染前后对比 → 用户确认后才执行。解析报告写回表格"解析报告"列，状态推进用"反馈状态"列。
2. **禁止绕过参数直接重渲**（v1 教训：PIP 改左下角是 ad-hoc FFmpeg 重渲的，project.yaml 还停在旧值，下次复跑必回退）。每条已执行的反馈，对应的 `template.yaml`/`project.yaml`/`timeline.json` 参数必须同步落盘，做到"删掉成片也能按参数一键复现"。
3. **feedback-log.md 照写不误**：表格是沟通界面，台账是工程资产；每条反馈仍按 8.5 记入项目的 feedback-log.md（含表格记录 ID），偏好沉淀依据台账进行。
4. 明确"已确认执行"的简单反馈（用户在表格里直接写"按方案A执行"）可省略二次确认，但报告与台账不可省。

---

## 9. 渠道适配规范

### 9.1 渠道画像文件

每个渠道一个 yaml，字段固定，数值是**初始默认值**，应随实际投放数据修订：

```yaml
# channels/tiktok.yaml
channel: tiktok
aspect: "9:16"
resolution: 1080x1920
duration: { min: 8, sweet: [15, 34], max: 60 }
hook_window_s: 1.5          # 爆点必须出现在此时间内
ui_unsafe:                   # 平台 UI 遮挡区，内容避开
  bottom_px: 300             # 文案/进度条区
  right_px: 140              # 点赞/评论按钮列
subtitle: { position: center-low, max_lines: 2 }
pacing_bias: fast            # fast/medium/slow：对 pacing 参数的整体倾向
audio_loudness_lufs: -14
cover_required: false
content_label: "剧情演绎"    # 平台合规标注要求
notes: 完播率导向，前 2 秒流失最重；BGM 热度影响分发
```

### 9.2 五渠道初始画像速览

| 渠道 | 画幅/母版关系 | 时长偏好 | 节奏倾向 | 特殊要点 |
|---|---|---|---|---|
| TikTok | 9:16 直出 | 15～34s | 快 | 前 1.5s 必须见爆点；右侧按钮列避让 |
| 快手 | 9:16 直出 | 20～57s | 中快 | 叙事完整、结尾收得住比纯快更重要；老铁向表达可保留 |
| 小红书 | 9:16 或 3:4 裁切 | 15～60s | 中 | 封面图+标题决定点击，`cover.jpg`/`title.txt` 是必交付物；画面调性偏干净 |
| 哔哩哔哩 | 可竖可横（横屏需重构图时回 P5 确认） | 30s～3min 容忍度高 | 中慢 | 开头可稍缓但需"值得看完"的信息密度；字幕规范、弹幕梗可用 |
| 微信视频号 | 9:16（显示区近 6:7，关键内容居中） | 30～60s | 中 | 社交转发驱动，受众年龄偏高：字号加大、节奏略缓、避免过密网络梗 |

### 9.3 适配节点（P6）执行规则

1. 母版 → 渠道版只允许四类变换：画幅裁切/加边、时长压缩（只删铺垫和重复段，不砍爆点链条）、字幕/字号/安全区调整、封面与标题生成。
2. 时长压缩后必须重新校验卡点（音乐剪切点落在乐句边界，用淡出衔接）。
3. 每个渠道版本单独过 ffprobe + 九宫格检查，并对照该渠道 yaml 的 `ui_unsafe` 检查关键文字是否被遮挡。
4. 小红书版本必须附 `cover.jpg`（从成片选帧或单独渲染静帧）和 `title.txt`（2～3 个候选标题）。
5. 任何渠道版本都不自动发布；发布动作永远由用户执行。

---

## 10. 状态文件

`projects/<id>/planning/workflow-state.json` 沿用原格式，`currentNode` 取值扩展为 `T0..T4` / `P0..P7`；另在根目录维护 `templates/registry.json` 登记各模板的状态（`DRAFT`/`VERIFIED`/`DEPRECATED`）与版本。

---

## 11. 总控提示词

```text
你要执行"爆款视频复刻工作流"（VIRAL_VIDEO_REPLICATION_WORKFLOW.md）。

工作目录：[绝对路径]
当前阶段与节点：读取 planning/workflow-state.json

铁律：
1. 按 project.yaml 的 review_granularity 执行：stage 模式（默认）
   按阶段打包验收（阶段内节点逐个执行留档，验收停顿合并，口令
   "通过阶段X"）；node 模式逐节点 REVIEW。样片节点在该模板首次
   投产时必做，之后 skip_preview: true 可跳。
2. 未收到"通过节点X"不得继续；驳回只修被驳回节点。
3. 已通过产物复制为 *_APPROVED，禁止覆盖；下游只读 APPROVED 文件。
4. 渲染只用 Remotion CLI + FFmpeg，禁止任何 GUI 剪辑软件。
5. 所有观感效果必须是 template.yaml / timeline.json 里的参数，
   不得硬编码进组件。
6. 用户拆解思路原文一字不改地保留在 breakdown.md。
7. 收到"反馈：..."时执行反馈协议：复述理解→定位参数→给出
   具体 diff（模糊程度词translate成数值并给保守/激进两档）→
   渲染受影响片段的前后对比→等用户确认后才写入，并记入
   feedback-log.md。禁止无 diff 的"已优化"式回复。
8. 一次反馈只改被点名的维度；同类反馈出现两次以上时，提议
   沉淀为模板默认值。
8b. 全流程统一30fps，秒=帧号÷30。所有REVIEW产物烧录"帧号|秒数"
    帧码（debug_stamp参数控制，交付版关闭）。收到帧号/秒数定位的
    反馈时，先抽出该帧贴图回显确认，再进入解析；有视觉能力必须
    实际查看该帧，无视觉能力必须声明"未经视觉核对"。
9. 素材必须从 library/index.json 或模板 assets/ 中选取，给出
   2~3 个候选由用户定；未确认授权的素材不得进交付成片。
10. 渠道适配只做画幅/时长/字幕/封面四类变换，不改内容；每个
    渠道版本按 channels/<渠道>.yaml 校验安全区和规格。
11. Suno 等外部服务的登录、验证码、付费由用户人工处理。
12. 未经用户明确授权，禁止上传、公开或发布任何内容。

现在读取状态文件，执行当前节点，完成后按验收报告模板汇报并停止。
```

---

## 12. 首次执行顺序

1. 建立 `viral-video-factory/` 目录骨架与 `library/index.json` 空索引。
2. 把第一批通用素材（表情包、音效、音乐）入库并登记授权状态。
3. 建立五个渠道的 `channels/*.yaml`（用第 9.2 节初始画像填默认值）。
4. 挑第一个爆款：放入参考视频，写下你的拆解思路，跑 T0～T4 固化模板（微信聊天模板可直接按现有文档迁移为 `templates/wechat-chat-music/`）。
5. 跑第一个生产项目 P0～P7，重点磨合第 8 节反馈协议——前几轮刻意用你平时的说话方式给反馈，检验代理的解析报告是否译得准，把误译补进反馈词典。
6. 每次投放后把渠道数据（完播率、点击）反馈给代理，修订 `channels/*.yaml` 的初始默认值。
