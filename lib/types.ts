export type Action = 'SAVE' | 'FIND' | 'DELETE' | 'UPDATE';
export type Language = 'su' | 'id' | 'en';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isSystem?: boolean;
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
  item: string;
  location: string;
  category: string;
  message: string;
  is_found?: boolean;
  target_ids?: string[];
}
