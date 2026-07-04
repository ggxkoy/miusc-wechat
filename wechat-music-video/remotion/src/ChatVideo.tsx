import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DialogueMessage, Timeline, Scene} from './timeline.schema';

const STICKER_FILES = [
  'stickers/emojis/angry.png',
  'stickers/emojis/shocked.png',
  'stickers/emojis/tired.png',
  'stickers/emojis/flushed.png',
  'stickers/emojis/see_no_evil.png',
  'stickers/emojis/broken_heart.png',
  'stickers/emojis/hundred.png',
  'stickers/emojis/fire.png',
  'stickers/emojis/collision.png',
  'stickers/emojis/police_light.png',
  'stickers/emojis/thumbs_down.png',
  'stickers/emojis/thinking.png',
  'stickers/emojis/eye_roll.png',
  'stickers/emojis/angry_devil.png',
  'stickers/emojis/memo.png',
];

export const ChatVideo: React.FC<{timeline: Timeline; dialogue: {messages: DialogueMessage[]}; audioSrc: string}> = ({timeline, dialogue, audioSrc}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const hookActive = t < timeline.hook.duration;
  const scene = hookActive ? {...timeline.scenes[0], start: 0, end: timeline.hook.duration} : (getSceneAt(t, timeline.scenes) ?? timeline.scenes[0]);
  const localFrame = Math.max(0, frame - Math.floor(scene.start * fps));
  const currentId = scene.message_ids[scene.message_ids.length - 1];
  const current = dialogue.messages.find((m) => m.id === currentId) ?? dialogue.messages[0];

  return (
    <AbsoluteFill style={{background: '#060606', fontFamily: 'PingFang SC, Helvetica Neue, Arial, sans-serif', overflow: 'hidden'}}>
      <Audio src={audioSrc} />
      <CinematicBackground />
      <StickerDecorations t={t} memes={timeline.memes} />
      <CenterBubble timeline={timeline} scene={scene} message={current} localFrame={localFrame} />
      <div style={{position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.70)', fontSize: 25, fontWeight: 650, letterSpacing: 2, textShadow: '0 2px 10px rgba(0,0,0,0.8)'}}>
        {timeline.content_label}
      </div>
    </AbsoluteFill>
  );
};

const getSceneAt = (t: number, scenes: Scene[]) => scenes.find((s) => t >= s.start && t < s.end) ?? (t >= scenes[scenes.length - 1].end ? scenes[scenes.length - 1] : undefined);

const splitIntoFocusLines = (text: string) => {
  const parts = text
    .replace(/([，。！？；…])/g, '$1|')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length <= 1 && text.length > 18) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 16) chunks.push(text.slice(i, i + 16));
    return chunks;
  }
  return parts.length ? parts : [text];
};

const appendSceneEmoji = (text: string, scene: Scene | undefined, isLastPart: boolean) => {
  if (!scene?.emoji || !isLastPart) return text;
  return /^[？！!?.。…、，,；;：:❗？]+$/.test(scene.emoji) ? `${text}${scene.emoji}` : `${text} ${scene.emoji}`;
};

// === 反馈1: 每句话画面中央，不展示上下文 ===
// === 反馈2: 文字跟音乐同步出现，不重复 ===
const CenterBubble: React.FC<{
  timeline: Timeline;
  scene: Scene;
  message: DialogueMessage;
  localFrame: number;
}> = ({timeline, scene, message, localFrame}) => {
  const {fps} = useVideoConfig();
  const fullText = scene.subtitle || message.text;
  const parts = splitIntoFocusLines(fullText);
  const durationFrames = Math.max(1, Math.round((scene.end - scene.start) * fps));
  // 当前应该显示第几句（从0开始），每句只出现一次，不重复
  const partIndex = Math.min(parts.length - 1, Math.floor((localFrame / durationFrames) * parts.length));
  const displayText = appendSceneEmoji(parts[partIndex], scene, partIndex === parts.length - 1);

  // 每句出现时的弹入动画
  const partDuration = durationFrames / parts.length;
  const partLocal = localFrame - Math.floor(partIndex * partDuration);
  const pop = spring({frame: Math.max(0, partLocal), fps, config: {damping: 13, stiffness: 160, mass: 0.7}});
  const scale = interpolate(pop, [0, 0.75, 1], [0.88, 1.04, 1], {extrapolateRight: 'clamp'});
  const opacity = interpolate(partLocal, [0, 6], [0, 1], {extrapolateRight: 'clamp'});
  const translateY = interpolate(pop, [0, 1], [30, 0], {extrapolateRight: 'clamp'});

  if (message.type === 'system') {
    return (
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 80px'}}>
        <div style={{opacity, transform: `translateY(${translateY}px) scale(${scale})`}}>
          <div style={{
            background: 'rgba(150,150,150,0.88)', color: '#fff', borderRadius: 18,
            padding: '28px 36px', fontSize: 46, lineHeight: 1.25, fontWeight: 700,
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            {displayText}
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  const character = timeline.characters[message.speaker as 'a' | 'b'];
  const right = character.side === 'right';
  const fontSize = displayText.length > 24 ? 46 : displayText.length > 14 ? 54 : 62;

  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', padding: '0 80px'}}>
      <div style={{opacity, transform: `translateY(${translateY}px) scale(${scale})`, transformOrigin: '50% 50%'}}>
        <div style={{display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 20}}>
          {!right && <Avatar src={character.avatar} />}
          <div style={{position: 'relative', maxWidth: 760}}>
            <div style={{
              position: 'absolute', top: '50%', [right ? 'right' : 'left']: -10,
              width: 20, height: 20, background: character.bubble, transform: 'translateY(-50%) rotate(45deg)',
              borderLeft: !right && character.bubble === '#FFFFFF' ? '1px solid rgba(0,0,0,0.08)' : undefined,
              borderBottom: !right && character.bubble === '#FFFFFF' ? '1px solid rgba(0,0,0,0.08)' : undefined,
            }} />
            <div style={{
              position: 'relative', background: character.bubble, color: '#111', borderRadius: 12,
              padding: '26px 32px', fontSize, lineHeight: 1.3, fontWeight: 450,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              border: character.bubble === '#FFFFFF' ? '1px solid rgba(0,0,0,0.08)' : 'none',
            }}>
              {displayText}
            </div>
          </div>
          {right && <Avatar src={character.avatar} />}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Avatar: React.FC<{src: string}> = ({src}) => (
  <Img src={staticFile(src)} style={{width: 88, height: 88, borderRadius: 10, objectFit: 'cover', flex: '0 0 auto', display: 'block'}} />
);

// === 反馈3修正: 只在有情绪强调的 scene 才出现表情包 ===
// 使用 timeline.memes 的时间点，而非每个 scene 都塞
const StickerDecorations: React.FC<{t: number; memes: Timeline['memes']}> = ({t, memes}) => {
  if (!memes || memes.length === 0) return null;
  const activeMemes = memes.filter((m) => t >= m.start && t < m.end);
  if (activeMemes.length === 0) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {activeMemes.map((meme, i) => {
        const file = stickerFileForMeme(meme.file);
        if (!file) return null;
        const progress = (t - meme.start) / Math.max(0.01, meme.end - meme.start);
        const opacity = interpolate(progress, [0, 0.15, 0.85, 1], [0, 0.78, 0.78, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        if (opacity <= 0.01) return null;
        const size = 220 + (meme.scale ?? 1) * 100;
        const isTop = i % 2 === 0;
        const xPercent = isTop ? 30 : 70;
        const yPercent = isTop ? 28 : 72;
        return (
          <div key={`${meme.file}-${i}-${meme.start}`} style={{
            position: 'absolute', left: `${xPercent}%`, top: `${yPercent}%`,
            transform: `translate(-50%, -50%) rotate(${meme.rotation ?? 0}deg)`,
            opacity, pointerEvents: 'none',
          }}>
            <Img src={staticFile(file)} style={{width: size, height: size, filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))'}} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const stickerFileForMeme = (memeFile: string): string | null => {
  // timeline memes 里的文件名映射到实际下载的表情包
  const map: Record<string, string> = {
    'stickers/command_explosion.png': 'stickers/emojis/collision.png',
    'stickers/shock_evidence.png': 'stickers/emojis/shocked.png',
    'stickers/lawyer_angry.png': 'stickers/emojis/angry.png',
    'stickers/blacklist_stamp.png': 'stickers/emojis/police_light.png',
  };
  return map[memeFile] ?? null;
};

const CinematicBackground: React.FC = () => (
  <AbsoluteFill style={{
    background: 'radial-gradient(circle at 28% 22%, rgba(97,72,56,0.55) 0%, transparent 26%), radial-gradient(circle at 75% 78%, rgba(24,79,76,0.46) 0%, transparent 34%), linear-gradient(145deg, #090909 0%, #1a1512 42%, #030303 100%)',
  }}>
    <AbsoluteFill style={{backdropFilter: 'blur(18px)', background: 'rgba(0,0,0,0.32)'}} />
    <AbsoluteFill style={{opacity: 0.16, backgroundImage: 'radial-gradient(rgba(255,255,255,0.28) 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
    <AbsoluteFill style={{boxShadow: 'inset 0 0 260px rgba(0,0,0,0.92)'}} />
  </AbsoluteFill>
);
