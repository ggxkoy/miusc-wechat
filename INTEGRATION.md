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
- **手持晃动、爆闪切点**：video-use 硬规则第 7 条"每个切点补 30–200ms"要放宽——爆闪段是刻意贴着切点的，需在 compile_edl 时对 strobe 段关闭 padding（EDL 层标注 `no_pad: true` 或在 render 调用时对该段特殊处理）。这是本模板与 video-use 默认口径的唯一冲突点，已记录。

### 3.2 game-commentary（广告底片 · 画中画 · TTS 配音）

这个模板和 video-use 的契合度最高，几乎是"原生用法 + 一个 PiP 叠加层"：

- 广告底片 → EDL 单一长 `range`（不切，或按解说节奏分几段）。
- 游玩片段画中画 → **动画槽位**：把 PiP 合成为一个带位置/圆角/角标的叠加视频（PIL 或 HyperFrames 槽位都行），产出 `slot_pip/render.mp4`，进 EDL `overlays`，按 `{gameplay:}` 标记的时间窗出现。
- 中文解说 → **TTS**：video-use 自带 ElevenLabs（音质高、付费）。我们模板原定 edge-tts（免费）。二选一见第 4 节。逐句配音→逐句 SRT（用 render 的 `--build-subtitles` 或我们自己生成 master.srt）。
- 原声闪避 → video-use 音频处理天然支持在解说段压低底片原声（sidechain/音量自动化）；`template.yaml → audio_mix.duck_db` 映射为 render 的混音参数。
- 字幕最后烧录 → 硬规则第 1 条，正好符合我们"字幕逐句同步"的要求。

### 3.3 wechat-chat-music（图形聊天）

- 聊天气泡本质是"逐条揭示的画面"，更接近**动画槽位**而非实拍剪辑：每个 scene 由一个 Remotion/HyperFrames 槽位渲染成片段，再由 EDL `ranges` 按时间轴串起、`overlays` 叠表情包。
- 音乐（Suno 产物）作为主音轨；卡点仍由上层时间轴决定，EDL 负责串接。
- 这是三个里最不"audio-first"的，video-use 的转写/切词能力用不上，但它的 concat/字幕/叠加/自评仍然可用。

## 4. TTS 选型：ElevenLabs vs edge-tts

| | ElevenLabs（video-use 默认） | edge-tts（我们模板原定） |
|---|---|---|
| 音质 | 高，中文自然 | 中上，够用 |
| 成本 | 付费，需 API key | 免费 |
| 部署 | 已在 video-use 内置 | `pip install edge-tts` |
| 声音克隆 | 支持 | 不支持 |

**建议**：默认用 **edge-tts 起步跑通链路**（零成本、免 key），成片质量要上台面或要克隆自己的声音时切 ElevenLabs。两者都在 `template.yaml → tts.engine` 参数里可切，compile_edl 阶段按引擎生成配音文件即可，对下层 render 透明。

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

## 7. 落地步骤（待用户认可本文档后执行）

1. 把 video-use 作为 submodule 引入本整合分支（复用 `codex/add-video-use-submodule` 的做法）。
2. 在 `VIRAL_VIDEO_REPLICATION_WORKFLOW.md` 里把"渲染引擎"章节改写为"调用 video-use"，并新增 `compile_edl` 节点。
3. 三个模板的 OPENCLAW_TASK 各加一段"编译 EDL → 调 render.py"的指令；PiP、TTS、闪避映射为 EDL/render 参数。
4. 记录唯一冲突点（sigma-cowboy 爆闪段关闭 padding）的处理方式。
5. 首个项目用 game-commentary 跑通端到端（契合度最高），验证分层可行后再推广。

## 8. 待用户确认

- [ ] 整合方向（本文档的分层方案）是否认可？
- [ ] TTS 默认 edge-tts 起步、按需升级 ElevenLabs，是否同意？
- [ ] 是否把 video-use 以 submodule 方式并入本整合分支（便于统一克隆）？
- [ ] 先落地哪个模板？（建议 game-commentary）
