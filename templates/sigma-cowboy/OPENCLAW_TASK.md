# OpenClaw 执行脚本：制作一集「西格玛牛仔」视频

把下面整段发给 OpenClaw（或 MiniMax M3）。

```text
你要按 VIRAL_VIDEO_REPLICATION_WORKFLOW.md 的规则，用模板
templates/sigma-cowboy/ 制作一集视频。逐节点验收，每个节点完成后
进入 REVIEW 并停止，未收到"通过节点X"不得继续。

== 创作逻辑（必须先读懂再动手）==
本模板是叙事模板：现代牛仔的西格玛式行为。
化身仪式（吸脸颊+戴耳机+压帽檐）→ 六亲不认的步伐 → 在普通环境
做正常事 → 他人需要时出手相助 → 为此付出小代价但毫不在意 →
不回头只挥挥手离开 → 转身后憋不住的笑 → 片尾热舞混剪释放
压抑不住的喜悦。
反差是一切：表面酷、内心乐开花；助人损己、视作小事。
剪辑要为叙事服务：叙事段（日常/善行/代价）单镜头要长到读得懂
剧情，热舞混剪才是炫技的地方。

== 输入 ==
- 模板包：templates/sigma-cowboy/（breakdown.md 拆解、template.yaml
  参数、shotlist.md 拍摄清单、reference/cutlist.json 剪辑点数据）
- 实拍素材：projects/<id>/input/footage/（A1~A6 标志镜头、B1~B4
  本集叙事、C1~C2 热舞碎片、D1 氛围；缺失任何 A/C 组素材则列出
  清单停止等待；B 组缺失时询问本集是否为"纯人设展示集"）
- 音乐：参考视频原声（用户持有版权）。提取：
  ffmpeg -i templates/sigma-cowboy/reference/ref.mp4 -vn -c:a copy
  audio/song_APPROVED.m4a
- 参考视频仅画面对照用，其画面不得进入成片；原声可用。

== 节点 P0：项目初始化 ==
核对素材完整性，ffprobe 登记规格，提取原声，确认本集叙事槽位
（daily_scene/good_deed/cost/dance_style 写入 project.yaml），
母版渠道：抖音/TikTok，1080x1920@30fps。

== 节点 P1：时间轴 ==
timeline_mode=transplant 时：读取 cutlist.json，79 个剪辑点原样
保留，按段落把素材填入槽位：
  hook→A1(希区柯克运镜)；detail_color→A2/A3/A4(化身+步伐)；
  bw_mood→D1/B1(氛围+日常)；eye_transition→C2；
  fit_b_color→B2/B3/B4(善行+代价+泄露的笑)；
  strobe_1/2/3/4→C1 热舞碎片循环（相邻两切不同条）；
  hold_1/hold_2→B4/A5(内心戏与挥手离场)；最后一帧→A6 剪影。
每镜从素材挑表现最好的区间（动作最大/表情最到位），标注源文件、
入点出点、是否黑白、变速倍率。
叙事可读性优先：若 B2 善行事件在移植节奏下读不懂（切太碎），
提议局部改用 narrative_cut_range 并说明影响，等用户裁定。

== 节点 P2：15 秒样片 ==
Remotion 渲染前 15 秒（debug_stamp=true 烧录帧码）。REVIEW。
反馈按工作流第 8 节协议：复述理解→定位参数→给 diff→渲染前后
对比→确认后写入 feedback-log.md。

== 节点 P3：母版成片 ==
全长渲染 output/master_v1.mp4（1080x1920、30fps、H.264/AAC、
-14 LUFS）。自检硬项：
1. ffprobe 规格 + 九宫格检查图（每格标帧号）。
2. 标志性符号齐全性核对（template.yaml narrative.signature_shots
   六项逐一在片中指认帧号）。
3. 叙事三问：善行看得懂吗？代价看得到吗？"不回头挥手"在片中吗？
4. 热舞混剪四段脉冲落位正确、最后一帧是剪影。
REVIEW。

== 节点 P4：渠道适配 ==
按 channels/*.yaml 出渠道版本：
- tiktok/抖音：直出，右侧按钮列安全区检查
- 快手：直出
- 小红书：cover.jpg（建议取压帽檐或剪影帧）+ title.txt 三个候选
  （方向：低门槛互动问句或"今天的牛仔做了什么"系列感标题）
- 视频号：关键动作保持画面中部 6:7 显示区内
- B站：询问竖屏直出还是横屏重构图
每版本 ffprobe 校验。REVIEW。

== 节点 P5：交付 ==
汇总产物路径与校验结果。不上传、不发布。

== 铁律 ==
1. 只用 Remotion CLI + FFmpeg，禁止 GUI 剪辑软件。
2. 全流程 30fps，秒=帧号÷30；REVIEW 产物必须烧录帧码。
3. 收到帧号定位的反馈，先抽帧贴图回显确认再解析。
4. 参考视频的画面不得进入成片；原声可用（用户持有版权），除
   原声外不得混入参考视频的任何内容。
5. 所有观感调整走参数（template.yaml/timeline），禁止硬编码。
6. 标志性符号六项缺一不可；缺失时停止并报告，不得擅自省略。
```

## 说明（给用户，不发给代理）

- 这是叙事模板：agent 只负责"剪"，不负责"拍"。开拍前先定本集剧本（四个槽位：日常场景/善行事件/代价/舞步），再按 `shotlist.md` 拍完 A/B/C 三组素材。
- 版权在手走"时间轴 1:1 移植"：原声直接用、79 个剪辑点照搬（cutlist.json），节奏锁死，成片好坏取决于素材表现力——尤其是 B2 善行事件的可读性和 C1 热舞的"憋不住的开心"。
- 高潮是四段脉冲爆闪（15/12/8/17 切）顶到片尾；母版验收多了"叙事三问"和"标志性符号六项指认"，这是本模板区别于纯卡点模板的地方。
- 模板尚未过 T4 复刻验证（status: DRAFT）；第一集你认可后改 VERIFIED。
- 待你裁定的三个问题见 breakdown.md 末尾（本条参考里善行段的位置、8s 纸张隧道画面的角色、每集时长是否锁 30s）。
