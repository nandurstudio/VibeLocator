export type Action = 'SAVE' | 'FIND' | 'DELETE' | 'UPDATE' | 'NONE';
export type Language = 'su' | 'id' | 'en';
export type AvatarState = 'idle' | 'listening' | 'processing' | 'confirming' | 'error';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isSystem?: boolean;
  avatarState?: AvatarState;
  audioBase64?: string; // Cache for Gemini Speech
  isGeneratingAudio?: boolean; // True while waiting for TTS API
  isFallback?: boolean; // True if using Browser TTS fallback
  showFeedbackButton?: boolean; // True to show developer feedback button
  technicalDetails?: string;
}


export interface Item {
  id: string;
  name: string;
  location: string;
  category: string;
  timestamp: number;
}

export interface AIResponse {
  action: Action;
  avatarState: AvatarState;
  item: string;
  location: string;
  category: string;
  message: string;
  is_found?: boolean;
  target_ids?: string[];
}
