# OpenClaw 执行脚本：复刻「街拍变装运镜卡点」视频

把下面整段发给 OpenClaw（或 MiniMax M3）。

```text
你要按 VIRAL_VIDEO_REPLICATION_WORKFLOW.md 的规则，用模板
templates/street-fit-transition/ 制作一条复刻视频。逐节点验收，
每个节点完成后进入 REVIEW 并停止，未收到"通过节点X"不得继续。

== 输入 ==
- 模板包：templates/street-fit-transition/（breakdown.md 拆解、
  template.yaml 参数、shotlist.md 拍摄清单）
- 实拍素材：projects/<id>/input/footage/（S01~S12，人工已按清单拍好；
  若缺失任何一条，列出缺失清单并停止等待，不得用其他素材顶替）
- 音乐：参考视频原声（用户持有版权，可直接使用）。用
  ffmpeg 从 reference/ref.mp4 提取：
  ffmpeg -i ref.mp4 -vn -c:a copy audio/song_APPROVED.m4a
- 参考视频：templates/street-fit-transition/reference/ref.mp4
  （用户持有版权；本次采用"时间轴 1:1 移植"模式——原声和剪辑点
  直接复用，画面全部换新拍素材）
- 剪辑点数据：reference/cutlist.json（79 个剪辑点，含帧号与段落标注）

== 节点 P0：项目初始化 ==
核对素材完整性（S01~S12），ffprobe 登记每条素材规格，提取原声，
生成 project.yaml（母版渠道：抖音/TikTok，1080x1920@30fps）。

== 节点 P1：时间轴移植 ==
读取 cutlist.json，生成 planning/timeline_v1.json：
1. 79 个剪辑点原样保留（这锁死了节奏骨架，是本片爆的核心）。
2. 按 segment 标注把新素材填入对应槽位：
   hook→S01；detail_color→S02/S03/S04；bw_mood→S05/S06；
   eye_transition→S07；fit_b_color→S08/S09；
   strobe_1/2/3/4→S10 四条循环交替（相邻两切不用同一条素材）；
   hold_1/hold_2→S11。
3. 每镜从素材中挑表现最好的区间做入点（动作最大/表情最到位处），
   标注：源文件、入点出点、是否黑白、变速倍率。
4. 黑白段按 template.yaml 的 grading.bw_sections 处理。
总时长与参考一致（29.9s）。

== 节点 P2：15 秒样片 ==
用 Remotion 工程（<OffthreadVideo> 挂实拍素材，参数全部来自
template.yaml + timeline，debug_stamp=true 烧录帧码）渲染前 15 秒。
REVIEW。用户反馈按工作流第 8 节协议处理：复述理解→定位参数→
给 diff→渲染前后对比→确认后写入 feedback-log.md。

== 节点 P3：母版成片 ==
全长渲染 output/master_v1.mp4（1080x1920、30fps、H.264/AAC、
-14 LUFS 响度归一）。ffprobe + 九宫格检查图（每格标帧号）自检：
无黑帧、无跳帧、爆闪段确实落在音乐峰值、黑白段正确。REVIEW。

== 节点 P4：渠道适配 ==
母版通过后按 channels/*.yaml 出渠道版本：
- tiktok/抖音：直出，检查右侧按钮列安全区
- 快手：直出
- 小红书：附 cover.jpg（建议取收尾剪影帧）+ title.txt 三个候选标题
  （方向："你今天感觉怎么样"式低门槛互动问句）
- 视频号：关键人物动作保持画面中部 6:7 显示区内
- B站：询问用户要竖屏直出还是横屏重构图
每个版本 ffprobe 校验。REVIEW。

== 节点 P5：交付 ==
汇总全部产物路径与校验结果。不上传、不发布。

== 铁律 ==
1. 只用 Remotion CLI + FFmpeg，禁止 GUI 剪辑软件。
2. 全流程 30fps，秒=帧号÷30；REVIEW 产物必须烧录帧码。
3. 收到帧号定位的反馈，先抽帧贴图回显确认再解析。
4. 参考视频的画面不得进入成片；原声可用（用户持有版权），
   除原声外不得混入参考视频的任何内容。
5. 所有观感调整走参数（template.yaml/timeline），禁止硬编码。
```

## 说明（给用户，不发给代理）

- 这个模板与微信聊天模板的本质区别：原料是真人实拍素材，agent 只负责"剪"，不负责"拍"。先按 `shotlist.md` 拍完 12 组素材再启动。
- 版权在手，本次走"时间轴 1:1 移植"：原声直接用、79 个剪辑点照搬（cutlist.json），节奏这个最大变量被锁死，成片好坏只取决于素材表现力。
- 高潮是四段脉冲爆闪（15/12/8/17 切）顶到片尾，S10 爆闪碎片拍得越夸张、姿势差异越大效果越好。
- 模板尚未过 T4 复刻验证（status: DRAFT）；第一个项目跑完、你认可观感后，把 template.yaml 的 status 改为 VERIFIED。
