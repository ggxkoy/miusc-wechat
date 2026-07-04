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
- 音乐：projects/<id>/input/music.mp3（用户授权曲目；禁止使用参考
  视频原声）
- 参考视频：templates/street-fit-transition/reference/ref.mp4
  （仅对照学习用，其任何画面与声音不得进入成片）

== 节点 P0：项目初始化 ==
核对素材完整性（S01~S12 + music.mp3），ffprobe 登记每条素材规格，
生成 project.yaml（母版渠道：抖音/TikTok，1080x1920@30fps）。

== 节点 P1：节拍网格 ==
分析 music.mp3：BPM、每拍时间戳、能量峰值位置（可用 librosa 或
aubio，输出 planning/beatgrid.json）。确认高潮峰值落在全片 70%~85%
区间；不满足则给出音乐裁剪方案（从哪一秒切入）供用户确认。

== 节点 P2：时间轴 ==
按 template.yaml 的 structure 生成 planning/timeline_v1.json：
1. 每个剪辑点吸附 beatgrid 的拍点（beat_snap）。
2. 段落顺序：S01钩子(约2s) → S02/S03/S04碎剪(0.4~1.2s/镜) →
   S05/S06黑白段(0.7~2s/镜) → S07眼睛转场(0.1s) →
   S08/S09第二造型 → strobe爆闪段(1.6s内12切，素材用S10四条循环，
   对齐音乐能量峰值) → S11舞蹈 → S12剪影定格(2s)。
3. 每镜标注：源文件、入点出点、是否黑白、变速倍率。
总时长控制在 28~32s。

== 节点 P3：15 秒样片 ==
用 Remotion 工程（<OffthreadVideo> 挂实拍素材，参数全部来自
template.yaml + timeline，debug_stamp=true 烧录帧码）渲染前 15 秒。
REVIEW。用户反馈按工作流第 8 节协议处理：复述理解→定位参数→
给 diff→渲染前后对比→确认后写入 feedback-log.md。

== 节点 P4：母版成片 ==
全长渲染 output/master_v1.mp4（1080x1920、30fps、H.264/AAC、
-14 LUFS 响度归一）。ffprobe + 九宫格检查图（每格标帧号）自检：
无黑帧、无跳帧、爆闪段确实落在音乐峰值、黑白段正确。REVIEW。

== 节点 P5：渠道适配 ==
母版通过后按 channels/*.yaml 出渠道版本：
- tiktok/抖音：直出，检查右侧按钮列安全区
- 快手：直出
- 小红书：附 cover.jpg（建议取收尾剪影帧）+ title.txt 三个候选标题
  （方向："你今天感觉怎么样"式低门槛互动问句）
- 视频号：关键人物动作保持画面中部 6:7 显示区内
- B站：询问用户要竖屏直出还是横屏重构图
每个版本 ffprobe 校验。REVIEW。

== 节点 P6：交付 ==
汇总全部产物路径与校验结果。不上传、不发布。

== 铁律 ==
1. 只用 Remotion CLI + FFmpeg，禁止 GUI 剪辑软件。
2. 全流程 30fps，秒=帧号÷30；REVIEW 产物必须烧录帧码。
3. 收到帧号定位的反馈，先抽帧贴图回显确认再解析。
4. 参考视频画面与原声绝不进入成片。
5. 所有观感调整走参数（template.yaml/timeline），禁止硬编码。
```

## 说明（给用户，不发给代理）

- 这个模板与微信聊天模板的本质区别：原料是真人实拍素材，agent 只负责"剪"，不负责"拍"。先按 `shotlist.md` 拍完 12 组素材再启动。
- 节点 P1 把音乐节拍变成数据（beatgrid.json），后面所有卡点都是程序化吸附，这是"卡点比人手准"的关键。
- 爆闪段（12 切/1.6 秒）是本模板的记忆点，素材 S10 拍得越夸张效果越好。
- 模板尚未过 T4 复刻验证（status: DRAFT）；第一个项目跑完、你认可观感后，把 template.yaml 的 status 改为 VERIFIED。
