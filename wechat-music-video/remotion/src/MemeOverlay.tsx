import React from 'react';
import {Img, interpolate, staticFile} from 'remotion';
import type {MemeEvent} from './timeline.schema';

const LABELS: Record<string, {emoji: string; text: string}> = {
  'stickers/command_explosion.png': {emoji: '💥', text: '全部发给我!!!'},
  'stickers/shock_evidence.png': {emoji: '😳', text: '还有证据?!'},
  'stickers/lawyer_angry.png': {emoji: '😡', text: '一句不提???'},
  'stickers/blacklist_stamp.png': {emoji: '🚫', text: '已拉黑'},
};

export const MemeOverlay: React.FC<{memes: MemeEvent[]; time: number}> = ({memes, time}) => {
  const active = memes.filter((m) => time >= m.start && time < m.end);
  return (
    <>
      {active.map((m, idx) => {
        const progress = (time - m.start) / Math.max(0.001, m.end - m.start);
        const scale = (m.scale ?? 1) * interpolate(progress, [0, 0.2, 1], [0.6, 1.12, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const opacity = interpolate(progress, [0, 0.1, 0.85, 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const label = LABELS[m.file] ?? {emoji: '🔥', text: '爆点'};
        return (
          <div key={`${m.file}-${m.start}-${idx}`} style={{
            position: 'absolute', left: '50%', top: '64%', width: 350, height: 350,
            marginLeft: -175, marginTop: -175,
            transform: `scale(${scale}) rotate(${m.rotation ?? 0}deg)`, opacity,
            filter: 'drop-shadow(0 22px 35px rgba(0,0,0,0.35))',
          }}>
            <Img src={staticFile(m.file)} style={{width: '100%', height: '100%', borderRadius: 54}} />
            <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textShadow: '0 4px 12px rgba(0,0,0,0.65)', fontWeight: 900}}>
              <div style={{fontSize: 82, lineHeight: 1}}>{label.emoji}</div>
              <div style={{fontSize: 38, marginTop: 22, textAlign: 'center'}}>{label.text}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};
