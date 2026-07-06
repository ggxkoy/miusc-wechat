# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

## FFmpeg / FFprobe (本地静态二进制, arm64)

- `ffmpeg`  → `/Users/lyq/.openclaw/workspace/bin/ffmpeg`  (v6.0, 带 libx264/libx265/aac/libass/libfreetype)
- `ffprobe` → `/Users/lyq/.openclaw/workspace/bin/ffprobe` (v6.0)
- 系统没装 brew；这两个是从 npmmirror 镜像下的静态包，已去 quarantine、可直接执行。
- 用法：`/Users/lyq/.openclaw/workspace/bin/ffmpeg ...` 或先 `export PATH="/Users/lyq/.openclaw/workspace/bin:$PATH"`

## GitHub SSH

- GitHub account: `ggxkoy`
- SSH host: `git@github.com`, using the existing user key `~/.ssh/id_ed25519` via `~/.ssh/config`.
- Main workspace remote: `git@github.com:ggxkoy/miusc-wechat.git`.
- Use native `git fetch`, `git pull`, and `git push`; do not request or embed a Personal Access Token.
- For a new GitHub repository, prefer an SSH remote in the form `git@github.com:OWNER/REPO.git`.
- Never print, copy, upload, or commit the private key. Only the public key is registered with GitHub.

## 微信聊天短视频工作流 (OPENCLAW_WECHAT_MUSIC_VIDEO_WORKFLOW)

- 工作流文档：用户 2026-07-01 提供，2026-07-02 又给了优化版 GitHub 分支 `ggxkoy/miusc-wechat@claude/openclaw-video-workflow-ubjhn6`；已保存到当前项目：`/Users/lyq/.openclaw/workspace/wechat-music-video/OPENCLAW_WECHAT_MUSIC_VIDEO_WORKFLOW.md`。
- 审核分组（用户口头简化）：0-2 准备、3-5 音乐、6-8 画面/15秒样片、9-11 成片；但产物仍保留节点编号和 APPROVED 文件。
- 新版剪辑硬规则：节点 7-10 必须用 Remotion 代码化渲染（`npx remotion still/render`），禁止剪映/CapCut 手工剪辑；FFmpeg 只做音频标准化、最终编码/校验、检查图。
- 视觉基准：参考视频 `reference/方律师_AAA建材王总_参考视频.mp4`，核心复现：开场钩子帧、气泡轻微旋转/缩放“拍入”、镜头跟随最新消息产生动态黑边、高潮气泡视觉复读+表情包插帧、emoji 装饰追加在气泡文字后。
- 当前案例状态：王律/王总案例已完成准备与多轮 Suno 音乐候选；用户要求后续剪辑按新版 Remotion 流程。需等用户选定全男声候选 C/D 后复制为 `audio/song_APPROVED.mp3` 再进入时间轴/Remotion。
- 聊天渲染器（旧节点7验证工具，可作参考/备用）：`/Users/lyq/.openclaw/workspace/wechat-dialog-generator` (gaopengbin/wechat-dialog-generator, React+Vite)
  - 已装依赖+构建通过。dev 预览：`npm run preview -- --port 4713` → http://localhost:4713/wechat-dialog-generator/
  - 导入格式：`**名字**：内容`；时间 `**【3月1日 14:32】**`；特殊 `[图片]url` `[红包]备注` `[转账]金额:备注` `[语音]秒数`
  - ⚠️ 第一个出现的名字=自己(右侧)；导出 1125×2436 (工作流要 1080×1920，需 ffmpeg 缩放/裁剪)
- 视频号下载器(附带装的)：`/Users/lyq/.openclaw/workspace/wx_channels_download/app/wx_video_download` (需 sudo 跑, 装证书+代理)
- Suno：用户本机已登录，user Chrome 接管已由 Codex/权限修复后可用。FFmpeg：已装(见上)。
- 用户偏好：后续给用户查看/交付的截图、样片、成片等文件，除了保留项目内原始路径外，都复制一份到 `/Users/lyq/Downloads/openclaw-wechat-music-video/`，方便用户直接从 Downloads 找。

## Related

- [Agent workspace](/concepts/agent-workspace)
