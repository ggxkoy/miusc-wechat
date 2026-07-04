import React from 'react';
import {Composition, staticFile} from 'remotion';
import {ChatVideo} from './ChatVideo';
import timelineData from '../../planning/timeline_APPROVED.json';
import dialogueData from '../../planning/dialogue_APPROVED.json';

const timeline = timelineData as any;
const dialogue = dialogueData as any;
const fps = timeline.fps || 30;
const lastEnd = Math.max(...timeline.scenes.map((s: any) => s.end));
const durationInFrames = Math.ceil((lastEnd + 1.2) * fps);

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ChatVideo"
      component={ChatVideo}
      durationInFrames={durationInFrames}
      fps={fps}
      width={timeline.resolution.width}
      height={timeline.resolution.height}
      defaultProps={{
        timeline,
        dialogue,
        audioSrc: staticFile('audio/song.wav'),
      }}
    />
  );
};
