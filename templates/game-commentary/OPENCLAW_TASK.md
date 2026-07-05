# OpenClaw 执行脚本：制作一期「游戏解说」视频

把下面整段发给 OpenClaw（或 MiniMax M3），并在开头附上本期广告视频链接。

```text
你要按 VIRAL_VIDEO_REPLICATION_WORKFLOW.md 的规则，用模板
templates/game-commentary/ 制作一期游戏解说视频。逐节点验收，
每个节点完成后进入 REVIEW 并停止，未收到"通过节点X"不得继续。

== 本期输入 ==
- 广告视频：[粘贴链接，或写明本地文件路径]
- 游玩片段：projects/<id>/input/gameplay/*.mp4
- 解说词：projects/<id>/input/script.txt
  （格式见模板包 script_format.md；该文件是用户产物，只读不改）

== 节点 P0：项目初始化 ==
0. 确认依赖：yt-dlp（缺则 pip install -U yt-dlp）、所选 TTS 引擎、
   ffmpeg。
1. 广告视频是链接则用 yt-dlp 抓取入库（保留原始文件与 info.json）；
   遇登录墙/验证码/风控暂停请用户手动提供文件，不得反复重试。
2. ffprobe 登记广告与每条游玩片段的规格；统一转 30fps 工作副本；
   母版画幅跟随广告底片。
3. 请用户确认广告素材使用授权（自有推广素材/官方授权/二创评论
   用途）；未确认前只出内部样片。
4. 校验 script.txt 格式，列出解析结果（共几句、几句带时间锁定、
   几句带 gameplay 标记、时间冲突清单）。REVIEW。

== 节点 P1：TTS 配音 ==
1. 按标点切句，切句结果列表报告（原文一字不改，只切不改）。
2. 用 template.yaml 的引擎生成 2~3 个候选音色小样（试听句取
   解说词第一句），交用户选定音色，回填 tts.voice。
3. 批量逐句生成 audio/voice/line_001.mp3 ...，登记每句实际时长。
4. 逐句可重做：用户指出某句问题时只重生成该句。
REVIEW（附全部句子的试听文件与时长表）。

== 节点 P2：时间轴 + PiP 槽位 + 编译 EDL ==
渲染统一走 video-use 引擎（video-use/helpers/render.py），本节产出
projects/<id>/edit/ 下的 EDL 与配套素材：
1. 时间轴 planning/timeline_v1.json：
   - 带 [时间] 标记的句子锁定起点；未标记的接上一句结束 + tts.gap_s。
   - 冲突（上一句未读完已到下一句锁定时间）列清单请用户裁定，
     不得删句、不得擅自加速。
   - 每句登记：字幕文本、配音文件、入点出点（字幕=配音入出点，
     出点 + fade_out_delay_s）。
2. 字幕 edit/master.srt：按输出时间轴逐句生成（video-use 硬规则5
   的 output-timeline 偏移）。
3. PiP 动画槽位（关键：render.py 的 overlay 是全画布贴 0,0，不带
   x/y，所以画中画必须预合成为"全画布透明 + 角落游玩片段"的带
   alpha overlay 视频）：
   - 在 edit/animations/slot_pip_<n>/ 用 ffmpeg 把 {gameplay:} 指定
     的游玩片段按 template.yaml 的 pip.* 参数（位置/宽度比/圆角/
     边框/角标）合成为全画布透明 WebM（yuva420p）。
   - 每个 pip 出现窗口一个 slot；EDL overlays[] 指向各 render.webm，
     start_in_output/duration 取该窗口。
4. 编译 EDL → edit/edl.json：
   - sources：广告底片（+需要分段时的切点）。
   - ranges：底片按解说节奏分段（不需要切时就一个整段）。
   - overlays：上面的 pip 槽位。
   - subtitles：edit/master.srt。
   - total_duration_s：与底片一致或按解说收尾。
   注意 render.py EDL 原生不含配音轨与原声闪避，配音在 P3 的音频
   pass 里叠加，EDL 本身只负责画面 + 底片原声 + 字幕。
REVIEW（附 edl.json、master.srt、pip 槽位预览帧）。

== 节点 P3：15 秒样片（video-use 渲染 + 音频混音 pass）==
1. 视觉：video-use 出片
   python video-use/helpers/render.py edit/edl.json -o edit/preview_visual.mp4 --preview
   （得到广告画面 + PiP + 字幕，音频是底片原声）
2. 音频混音 pass（上层 ffmpeg，render.py 不做这步）：
   把 edit/preview_visual.mp4 的底片原声在每句解说窗口内压低
   duck_db（audio_mix），叠加 audio/voice/line_*.mp3 配音轨，
   duck_attack_ms 平滑，整体 -14 LUFS。用 sidechaincompress 或按
   时间轴做 volume 自动化。
3. 烧录帧码（debug_stamp），选"第一句解说 + 第一次 pip"所在 15 秒
   输出 preview/preview_15s.mp4。REVIEW。
反馈按工作流第 8 节协议（复述理解→定位参数→diff→前后对比→
确认写入 feedback-log.md）；参数落在 template.yaml/timeline/edl。

== 节点 P4：母版成片 ==
按 P3 同样两步（render.py 去掉 --preview 出全长 + 音频 pass）产出
output/master_v1.mp4（跟随底片画幅、30fps、H.264/AAC、-14 LUFS）。
自检硬项：
1. ffprobe 规格 + 九宫格检查图（每格标帧号）。
2. 字幕逐句与 script.txt 比对，确认一字未改。
3. 抽查 3 句：字幕入点与配音起音误差 ≤0.2s。
4. pip 不遮挡广告关键信息（版号/品牌标识/UI 演示区），不与字幕
   重叠；每次 pip 出现时机与解说内容对应。
5. 闪避听感自然：解说清晰，间隙原声回升无跳变。
6. 复用 video-use 自评：在渲染成品的切点/pip 边界抽帧自查（闪切、
   字幕被 overlay 遮挡=硬规则1、overlay 错帧=硬规则4）。
REVIEW。

== 节点 P5：渠道适配 ==
按 channels/*.yaml 出渠道版本；注意本模板母版画幅跟随广告底片：
- B站：横屏底片直出横屏；竖屏底片询问是否需要横屏版
- 抖音/快手/视频号：横屏底片转竖屏时采用"上下留白+居中"或
  "背景模糊铺满"方案（询问用户），pip 与字幕位置按竖屏安全区
  重新布局
- 小红书：cover.jpg + title.txt 三个候选标题
每版本 ffprobe 校验 + 安全区检查。REVIEW。

== 节点 P6：交付 ==
汇总产物路径与校验结果。不上传、不发布。

== 铁律 ==
1. 渲染走 video-use（render.py）+ 上层音频混音 ffmpeg pass + TTS
   命令行，禁止 GUI 剪辑软件。画中画作为全画布透明 overlay 槽位，
   不要指望 render.py 帮你摆位置。
2. 全流程 30fps，秒=帧号÷30；REVIEW 产物必须烧录帧码。
3. 收到帧号定位的反馈，先抽帧贴图回显确认再解析。
4. 解说词一字不改；script.txt 只读。
5. 广告素材授权未确认前不出交付成片；游玩片段必须是用户提供的
   文件，不得用网络素材顶替。
6. 所有观感调整走参数（template.yaml/timeline），禁止硬编码。
7. TTS 音色未经用户选定不得批量生成；换音色属于参数变更，走
   反馈协议。
```

## 说明（给用户，不发给代理）

- 每期只需要三样东西：广告链接（或文件）、你的游玩片段、解说词 txt。解说词格式见 `script_format.md`——时间标记和 gameplay 标记都是可选的，全不标也能跑（agent 顺序排布后给你审）。
- 解说词受"一字不改"保护，与聊天模板的台词同级；agent 只能切句，改词必须由你自己改 txt。
- TTS：执行代理是 MiniMax M3 时用 MiniMax TTS 作主力；免费跑通用 edge-tts；见 breakdown.md 选型表，改 template.yaml 的 tts.engine 即可。
- 渲染引擎是 video-use（submodule）：画面（广告底片+画中画+字幕）由它的 render.py 出，配音+原声闪避由上层再补一个 ffmpeg 音频 pass——因为 render.py 原生不做独立配音轨。这条分工写在 INTEGRATION.md，第一次跑之前值得看一眼。
- 首期建议流程：先只给一段 30 秒广告 + 三五句解说词跑通全链路（音色选择→同步→画中画槽位→混音），验收细节再上正式内容。
