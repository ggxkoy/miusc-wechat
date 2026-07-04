# 节点7 Remotion 视觉样图说明

- Remotion 入口：`remotion/src/index.ts`
- Composition：`ChatVideo`
- 组件：`ChatVideo.tsx`、`MemeOverlay.tsx`
- 数据源：`planning/dialogue_APPROVED.json`、`planning/timeline_APPROVED.json`
- 当前版本按用户反馈改为：黑屏背景 + 当前一句/短语居中大字卡片 + emoji/贴纸强化；长句按标点拆成一句一句出现，避免完整聊天截图里文字不醒目。
- 静帧渲染命令示例：

```bash
cd remotion
npx remotion still src/index.ts ChatVideo ../chat/scene_001.png --frame=180 --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

注：本机网络下载 Remotion Headless Chrome 较慢，因此使用本机 Google Chrome 作为 `--browser-executable`。
