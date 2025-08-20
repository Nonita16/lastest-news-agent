export type ToneType = 'formal' | 'casual' | 'enthusiastic';
export type FormatType = 'bullet points' | 'paragraphs';
export type InteractionStyleType = 'concise' | 'detailed';
export type RoleType = 'user' | 'assistant' | 'system';

export interface UserPreferences {
  tone: ToneType | null;
  format: FormatType | null;
  language: string | null;
  interaction_style: InteractionStyleType | null;
  topics: string[] | null;
}

export interface QuickReplyOption {
  label: string;
  value: string;
}

export interface ChatMessage {
  role: RoleType;
  content: string;
  timestamp: string;
  quick_reply_options?: QuickReplyOption[] | null;
  is_preference_question?: boolean;
  preference_type?: string;
  selection_type?: 'single' | 'multiple';
}

export interface ChatRequest {
  message: string;
  conversation_id: string;
  preferences?: UserPreferences | null;
  session_id?: string | null;
}

export interface ChatResponse {
  message: ChatMessage;
  preferences: UserPreferences;
  conversation_id: string;
  requires_tool: boolean;
}