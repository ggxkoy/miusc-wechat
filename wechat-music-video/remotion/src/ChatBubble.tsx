import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DialogueMessage, Scene} from './timeline.schema';

type Character = {name: string; side: 'left' | 'right'; avatar: string; bubble: string};

export const ChatBubble: React.FC<{
  message: DialogueMessage;
  character?: Character;
  active: boolean;
  entrance?: Scene['entrance'];
  startFrame: number;
  emoji?: string;
  repeatVisual?: Scene['repeat_visual'];
}> = ({message, character, active, entrance, startFrame, emoji, repeatVisual}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = Math.max(0, frame - startFrame);
  const pop = spring({frame: local, fps, config: {damping: 10, stiffness: 180, mass: 0.65}});
  const baseRot = interpolate(pop, [0, 1], [character?.side === 'right' ? 5 : -5, 0], {extrapolateRight: 'clamp'});
  const baseScale = interpolate(pop, [0, 0.65, 1], [0.82, 1.08, 1], {extrapolateRight: 'clamp'});
  let repeatScale = 1;
  let repeatRot = 0;
  if (active && repeatVisual) {
    const elapsed = local / fps;
    for (let i = 0; i < repeatVisual.count; i++) {
      const dt = elapsed - i * repeatVisual.interval;
      if (dt >= 0 && dt < 0.28) {
        repeatScale = 1 + (repeatVisual.scale_step ?? 0.05) * (i + 1) * (1 - dt / 0.28);
        repeatRot = (repeatVisual.rotation_sequence?.[i] ?? 0) * (1 - dt / 0.28);
      }
    }
  }
  const opacity = interpolate(local, [0, 4], [0, 1], {extrapolateRight: 'clamp'});

  if (message.type === 'system') {
    return (
      <div style={{display: 'flex', justifyContent: 'center', margin: '34px 0'}}>
        <div style={{
          background: '#d5d5d5', color: '#fff', borderRadius: 16, padding: '12px 26px', fontSize: 28,
          transform: `scale(${baseScale * repeatScale}) rotate(${baseRot + repeatRot}deg)`, opacity,
          boxShadow: active ? '0 12px 30px rgba(0,0,0,0.18)' : undefined,
        }}>系统提示：{message.text}{emoji ? ` ${emoji}` : ''}</div>
      </div>
    );
  }

  if (!character) return null;
  const right = character.side === 'right';
  const text = message.text + (emoji ? ` ${emoji}` : '');
  return (
    <div style={{display: 'flex', justifyContent: right ? 'flex-end' : 'flex-start', gap: 16, margin: '24px 0', alignItems: 'flex-start'}}>
      {!right && <Avatar src={character.avatar} />}
      <div style={{
        maxWidth: 620,
        background: character.bubble,
        color: '#111',
        borderRadius: 20,
        padding: '22px 26px',
        fontSize: text.length > 34 ? 28 : text.length > 22 ? 32 : 36,
        lineHeight: 1.36,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        boxShadow: '0 3px 10px rgba(0,0,0,0.08)',
        transformOrigin: right ? '100% 30%' : '0% 30%',
        transform: active ? `scale(${baseScale * repeatScale}) rotate(${baseRot + repeatRot}deg)` : 'none',
        opacity: active ? opacity : 1,
        border: character.bubble === '#FFFFFF' ? '1px solid #ddd' : 'none',
      }}>
        {text}
      </div>
      {right && <Avatar src={character.avatar} />}
    </div>
  );
};

const Avatar: React.FC<{src: string}> = ({src}) => (
  <Img src={staticFile(src)} style={{width: 82, height: 82, borderRadius: 14, objectFit: 'cover', flex: '0 0 auto', boxShadow: '0 2px 6px rgba(0,0,0,0.15)'}} />
);
