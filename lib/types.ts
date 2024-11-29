// types.ts
export interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];  // Array of base64-encoded image strings
  timestamp?: Date;
}
  
// lib/types.ts
export interface Dataset {
  topic: string;
  startdate: string | null;
  enddate: string | null;
  title: string;
  url: string;
  organization: string;
}
  
  export interface Conversation {
    chatId: string;
    userId: string;
    title: string;
    messages: Message[];
    selectedDataset: Dataset[];
    lastUpdated: Date;
  }
  
  export interface ConversationData {
    chatId: string;
    userId: string;
    title: string;
    messages: Message[];
    selectedDataset: Dataset[];
  }