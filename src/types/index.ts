import { Document, Types } from 'mongoose';
import { Request } from 'express';

// ============================================================
// User Types
// ============================================================

export interface IUser extends Document {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface SignupPayload {
  email: string;
  name: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

// ============================================================
// Content Types
// ============================================================

export type CaptureType = 'selection' | 'full-page';

export interface IContent extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  text: string;
  sourceUrl: string;
  pageTitle: string;
  savedAt: Date;
  embedding: number[];
  captureType: CaptureType;
  parentId?: Types.ObjectId;
  chunkIndex?: number;
}

export interface ContentCapturePayload {
  text: string;
  sourceUrl: string;
  pageTitle: string;
  captureType?: CaptureType;
}

export interface ContentListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ContentListResponse {
  contents: IContent[];
  total: number;
  page: number;
  totalPages: number;
}

// ============================================================
// Chat Types
// ============================================================

export interface ChatSessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ContentSource[];
}

export interface IChatSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  messages: ChatSessionMessage[];
  snippetId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentSource {
  pageTitle: string;
  sourceUrl: string;
  snippet: string;
}

export interface ChatRequestPayload {
  message: string;
}

export interface CreateSessionPayload {
  title?: string;
  snippetId?: string;
}

export interface ChatResponse {
  reply: string;
  sources: ContentSource[];
  sessionId: string;
}

export interface ChatHistoryItem {
  sessionId: string;
  title: string;
  messageCount: number;
  snippetId?: string;
  snippetTitle?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy type kept for internal use in ragService
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: ContentSource[];
}

export interface ChatSession {
  sessionId: string;
  userId: string;
  messages: ChatMessage[];
  createdAt: Date;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

// ============================================================
// Express Extension
// ============================================================

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ============================================================
// Vector Store Types
// ============================================================

export interface VectorSearchResult {
  content: string;
  metadata: {
    contentId: string;
    userId: string;
    sourceUrl: string;
    pageTitle: string;
    savedAt: string;
  };
  score: number;
}

export type VectorStoreType = 'memory' | 'atlas';
