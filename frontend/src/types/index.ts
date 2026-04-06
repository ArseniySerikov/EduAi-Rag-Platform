export interface User {
  id: number;
  email: string;
  username: string;
  role: "user" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Chat {
  id: number;
  user_id: number;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface Source {
  document: string;
  chunk_index: number;
  similarity: number;
  snippet: string;
}

export interface Message {
  id: number;
  chat_id: number;
  role: "user" | "assistant";
  content: string;
  used_rag: boolean;
  tokens_used: number;
  created_at: string;
  sources?: Source[] | null;
}

export interface Document {
  id: number;
  filename: string;
  original_name: string;
  size_bytes: number;
  mime_type: string;
  uploaded_by: number | null;
  created_at: string;
}

export interface NewsItem {
  id: number;
  title: string;
  content: string;
  is_published: boolean;
  author_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  users: number;
  chats: number;
  messages: number;
  documents: number;
  websites?: number;
  rag_requests: number;
  total_tokens: number;
}

export interface WebsiteSource {
  id: number;
  url: string;
  title: string;
  is_enabled: boolean;
  should_parse: boolean;
  last_status: string | null;
  last_error: string | null;
  last_parsed_at: string | null;
  parsed_document_id: number | null;
  created_at: string;
  updated_at: string;
}
