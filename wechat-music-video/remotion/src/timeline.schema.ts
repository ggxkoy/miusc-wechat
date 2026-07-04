export type CharacterId = 'a' | 'b';
export type DialogueMessage = {
  id: number;
  speaker?: CharacterId;
  type?: 'system';
  text: string;
  emotion?: string;
  importance?: number;
};
export type Scene = {
  scene: string;
  message_ids: number[];
  start: number;
  end: number;
  subtitle: string;
  emoji?: string | null;
  camera?: {follow: 'last_message' | 'full_thread'; zoom: number; pan: 'up' | 'center'};
  entrance?: 'tilt_drop' | 'system_stamp';
  repeat_visual?: {count: number; interval: number; scale_step?: number; rotation_sequence?: number[]};
  beat?: string;
  hold_last?: number;
};
export type MemeEvent = {
  file: string;
  start: number;
  end: number;
  rotation?: number;
  scale?: number;
  anchor?: string;
};
export type Timeline = {
  version: string;
  fps: number;
  resolution: {width: number; height: number};
  audio: {file: string; duration: number};
  content_label: string;
  hook: {contact_name: string; account_name: string; first_message_id: number; duration: number};
  characters: Record<CharacterId, {name: string; side: 'left' | 'right'; avatar: string; bubble: string}>;
  scenes: Scene[];
  memes: MemeEvent[];
};
