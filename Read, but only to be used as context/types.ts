export interface ProcessedFrame {
  index: number;
  dataUrl: string; // Base64 image
  timestamp: number;
}

export type BlogPostLength = 'short' | 'medium' | 'long';
export type BlogPostTone = 'professional' | 'casual' | 'enthusiastic' | 'instructional';
export type FontFamily = 'sans' | 'serif' | 'mono';
export type ColorTheme = 'modern' | 'classic' | 'dark' | 'nature';

export interface BlogConfiguration {
  // AI Generation Controls
  length: BlogPostLength;
  tone: BlogPostTone;
  targetAudience: string;
  includeConclusion: boolean;
  
  // Visual Styling Controls
  titleFont: FontFamily;
  bodyFont: FontFamily;
  theme: ColorTheme;
  borderRadius: 'none' | 'small' | 'large';
  showReadingTime: boolean;
}

export interface VideoSegment {
  text: string;
  frameIndex: number;
  audioData?: string; // Base64 audio
}

export interface VideoState {
  isActive: boolean;
  status: 'idle' | 'generating_script' | 'synthesizing_audio' | 'ready' | 'playing';
  script: VideoSegment[];
  currentSegmentIndex: number;
}

export interface BlogPostState {
  status: 'idle' | 'processing_video' | 'configuring' | 'generating_text' | 'complete' | 'error';
  progress: number;
  error?: string;
  markdownContent?: string;
  frames: ProcessedFrame[];
  videoName?: string;
  config?: BlogConfiguration;
  video?: VideoState;
}

export enum Tab {
  UPLOAD = 'upload',
  YOUTUBE = 'youtube'
}