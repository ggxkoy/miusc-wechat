# 爆款复刻工作流 × video-use 引擎 整合设计

## 1. 为什么整合

`video-use`（browser-use 开源，https://github.com/ggxkoy/video-use，已作为 submodule 挂在 `codex/add-video-use-submodule` 分支）是一个**为 agent 设计的 shell 剪辑引擎**：EDL 驱动的分段渲染、调色、字幕、动画槽位、TTS、渲染后自评，并内置 12 条生产正确性硬规则。

我们此前在 `VIRAL_VIDEO_REPLICATION_WORKFLOW.md` 里从零设计的"Remotion 组装 + FFmpeg 编码"渲染层，和 video-use 高度重叠——但 video-use 更成熟、踩坑更少。因此整合方案是**分层**，不是二选一：

```text
┌─────────────────────────────────────────────────────────┐
│ 上层：爆款复刻策略层（本仓库 templates/ + 工作流）          │
│  参考视频拆解 · 叙事骨架 · 可变槽位 · 逐渠道适配           │
│  反馈理解协议 · 帧级反馈 · 节点验收状态机                  │
└───────────────────────────┬─────────────────────────────┘
                            │ 编译为 edl.json（+ 素材 + 解说词/TTS 请求）
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 下层：video-use 引擎层（submodule）                        │
│  render.py（分段提取→无损concat→PTS叠加→字幕最后）        │
│  grade.py · transcribe.py · TTS · 动画槽位 · 自评循环     │
│  12 条硬规则（防爆音/不切词中/字幕最后/…）                 │
└─────────────────────────────────────────────────────────┘
```

**一句话职责边界**：上层决定"剪什么、为什么这样剪、各渠道怎么变"，下层决定"怎么把它无损、无爆音、字幕不被遮地渲染出来"。

## 2. 两层的接口：edl.json

上层每个模板的时间轴（`cutlist.json` / `timeline.json`）最终**编译成 video-use 的 `edl.json`**，交给 `render.py` 出片。EDL 结构（摘自 video-use SKILL.md）：

```json
{
  "version": 1,
  "sources": {"S01": "/abs/S01.mp4", "AD": "/abs/ad.mp4"},
  "ranges": [
    {"source": "S01", "start": 2.42, "end": 6.85, "beat": "HOOK", "quote": "...", "reason": "..."}
  ],
  "grade": "warm_cinematic",
  "overlays": [
    {"file": "edit/animations/slot_pip/render.mp4", "start_in_output": 0.0, "duration": 5.0}
  ],
  "subtitles": "edit/master.srt",
  "total_duration_s": 87.4
}
```

上层因此新增一个统一步骤（放在各模板"时间轴"节点之后）：**`compile_edl`** —— 把模板的时间轴翻译成 EDL，然后调用 `render.py <edl.json> -o <out>`。

## 3. 三个模板如何落到 EDL

### 3.1 sigma-cowboy（叙事实拍 · 时间轴移植）

- `cutlist.json` 的 79 个剪辑点 → EDL `ranges`：每个 range 的 `source` 取该段槽位对应的新拍素材（A1/B2/C1…），`start/end` 取素材内挑好的入出点，`beat` 填叙事语义（HOOK/TRANSFORM/HELP/STROBE…）。
- 黑白段 → `grade` 用分段调色（video-use 支持 per-segment grade），对应 `template.yaml → grading.bw_sections`。
- 片尾剪影收尾 → 最后一个 range 定格 + `total_duration_s` 锁 29.9s。
- 原声 → EDL 不单独列 BGM 字段时，用 render 的音频轨挂载参考原声（版权在手）。
- **手持晃动、爆闪切点**：video-use 硬规则第 7 条"每个切点补 30–200ms"要放宽——爆闪段是刻意贴着切点的，需在 compile_edl 时对 strobe 段关闭 padding（EDL 层标注 `no_pad: true` 或在 render 调用时对该段特殊处理）。这是本模板与 video-use 默认口径的冲突点。

  **冲突裁决原则（用户确认）：爆款模板优先级高于引擎默认。** 当模板的观感要求与 video-use 硬规则冲突时，以模板为准。此处覆盖是安全的：硬规则第 7 条 padding 的本意是吸收 Scribe（ASR）时间戳 50–100ms 的漂移，而爆闪切点来自 `cutlist.json` 的**帧精确剪辑点**，不经 ASR，不存在漂移，因此关闭 padding 不会引入硬规则要防的错误。真正关乎正确性的硬规则（防爆音 30ms 淡变、字幕最后烧录、不双重编码）仍然全部保留——让位的只是"品味型默认值"，不是"正确性规则"。compile_edl 在遇到此类冲突时须在 EDL 里显式标注覆盖项及理由，供 REVIEW 审计。

### 3.2 game-commentary（广告底片 · 画中画 · TTS 配音）

这个模板和 video-use 的契合度最高，几乎是"原生用法 + 一个 PiP 叠加层"：

- 广告底片 → EDL 单一长 `range`（不切，或按解说节奏分几段）。
- 游玩片段画中画 → **动画槽位**：把 PiP 合成为一个带位置/圆角/角标的叠加视频（PIL 或 HyperFrames 槽位都行），产出 `slot_pip/render.mp4`，进 EDL `overlays`，按 `{gameplay:}` 标记的时间窗出现。
- 中文解说 → **TTS**：video-use 自带 ElevenLabs（音质高、付费）。我们模板原定 edge-tts（免费）。二选一见第 4 节。逐句配音→逐句 SRT（用 render 的 `--build-subtitles` 或我们自己生成 master.srt）。
- 原声闪避 + 独立配音轨 → **render.py 原生不做这两件事**（核实过：EDL 只有 sources/ranges/grade/overlays/subtitles，没有 voiceover/music/duck 字段；音频只做分段 concat + 30ms 淡变 + loudnorm）。因此配音混音由上层在 render.py 出片后补一个 ffmpeg pass：把底片原声在每句解说窗口压低 `audio_mix.duck_db`（sidechaincompress 或按时间轴 volume 自动化），叠加 TTS 配音轨，最后 -14 LUFS。分工：render.py 出"画面 + 底片原声 + 字幕"，上层音频 pass 加"配音 + 闪避"。
- 字幕最后烧录 → 硬规则第 1 条，正好符合我们"字幕逐句同步"的要求。
- 画中画摆位 → **render.py 的 overlay 无 x/y，默认贴 0,0（全画布）**。所以 PiP 必须作为动画槽位预合成为"全画布透明 + 角落游玩片段"的带 alpha overlay 视频（ffmpeg/PIL/HyperFrames 出 yuva420p WebM），EDL `overlays[].file` 指向它。`template.yaml → pip.*` 参数在合成 overlay 时消费，不传给 render.py。

### 3.3 wechat-chat-music（图形聊天）

- 聊天气泡本质是"逐条揭示的画面"，更接近**动画槽位**而非实拍剪辑：每个 scene 由一个 Remotion/HyperFrames 槽位渲染成片段，再由 EDL `ranges` 按时间轴串起、`overlays` 叠表情包。
- 音乐（Suno 产物）作为主音轨；卡点仍由上层时间轴决定，EDL 负责串接。
- 这是三个里最不"audio-first"的，video-use 的转写/切词能力用不上，但它的 concat/字幕/叠加/自评仍然可用。

## 4. TTS 选型：edge-tts / MiniMax TTS / ElevenLabs

| | edge-tts | **MiniMax TTS** | ElevenLabs（video-use 默认） |
|---|---|---|---|
| 音质 | 中上，够用 | 高，中文表现力强 | 高，中文自然 |
| 成本 | 免费 | 按量付费，需 API key | 付费，需 API key |
| 部署 | `pip install edge-tts` | MiniMax API | video-use 内置 |
| 声音克隆 | 不支持 | 支持 | 支持 |
| 适配 | 通用 | **执行代理是 MiniMax M3 时同源，最顺** | video-use 原生 |

**建议（用户确认加入 MiniMax）**：
- 免费跑通链路用 **edge-tts**。
- 执行代理是 **MiniMax M3** 时优先用 **MiniMax TTS**（同生态、免额外接引擎、中文表现力好），这是本项目的推荐主力。
- 需要 video-use 原生流程或已有 ElevenLabs key 时用 **ElevenLabs**。

三者都在 `template.yaml → tts.engine` 参数里可切（`edge-tts` / `minimax` / `elevenlabs`），compile_edl 阶段按引擎生成配音文件，对下层 render 透明。

## 5. 目录约定

video-use 要求所有会话产物进 `<videos_dir>/edit/`，不写进引擎目录。我们的 `projects/<id>/` 与之对齐：

```text
projects/<id>/
├─ input/            # 原始素材（同现状）
├─ planning/         # 上层时间轴 timeline.json / cutlist.json（同现状）
└─ edit/             # ← video-use 工作区（EDL、渲染、字幕、动画槽位、自评帧）
   ├─ edl.json       # compile_edl 产物
   ├─ master.srt
   ├─ animations/slot_*/
   ├─ verify/        # 自评抽帧（正好承载我们的"帧级反馈"）
   ├─ preview.mp4
   └─ final.mp4
```

**额外收益**：video-use 的自评循环会在每个切点抽帧存到 `edit/verify/`——这和我们第 8.4 节的"帧级反馈 + 帧码回显"天然合流：REVIEW 时直接引用这些帧，用户按帧号指认，上层再定位参数。

## 6. 保留 vs 让渡

| 能力 | 归属 | 说明 |
|---|---|---|
| 参考视频拆解、叙事骨架、可变槽位 | **上层保留** | video-use 不做"爆款结构"这层 |
| 逐渠道适配（TikTok/小红书/…） | **上层保留** | video-use 只到 output spec，不做多渠道画像 |
| 反馈理解协议（复述→定位参数→diff→对比） | **上层保留** | 这是我们的核心资产 |
| 节点验收状态机 / *_APPROVED | **上层保留** | video-use 是"ask→confirm→execute"，更轻；我们的更严 |
| 分段渲染 / 无损 concat / 防爆音 / 字幕最后 | **下层让渡给 video-use** | 别再自己写，白捡 12 条硬规则 |
| 调色 / 转写 / TTS / 动画槽位 / 自评 | **下层让渡给 video-use** | helpers 已实现 |
| Remotion 从零组装 | **降级** | 从"主渲染器"降为"动画槽位之一" |

## 7. 落地进度

- [x] video-use 作为 submodule 引入本整合分支（`92c2b34`，与 codex 分支同 commit）。
- [x] `VIRAL_VIDEO_REPLICATION_WORKFLOW.md` 强制规则 1 改为默认 video-use；新增第 3.5 节"video-use 引擎与 EDL 编译"。
- [x] **game-commentary 落地**：OPENCLAW_TASK 改为"时间轴 + PiP 槽位 + 编译 EDL → render.py + 音频混音 pass"，记录两处 render.py 原生缺口（配音闪避、overlay 摆位）的上层补法。
- [ ] sigma-cowboy 落地：cutlist → EDL ranges，爆闪段标注关闭 padding。
- [ ] wechat-chat-music 迁移为标准模板包并接 EDL（聊天气泡作为动画槽位）。
- [ ] 首个项目用 game-commentary 跑通端到端，验证分层。

## 8. 决策记录与待确认

已确认：
- [x] **冲突裁决：爆款模板优先于引擎默认**（见 3.1）。正确性硬规则保留，品味型默认值让位。
- [x] **TTS 加入 MiniMax TTS**：执行代理为 M3 时的推荐主力；edge-tts 免费兜底，ElevenLabs 备选（见 4）。

待确认：
- [ ] 整合方向（本文档的分层方案）是否认可？
- [ ] 是否把 video-use 以 submodule 方式并入本整合分支（便于统一克隆）？
- [ ] 先落地哪个模板？（建议 game-commentary）
