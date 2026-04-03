import ChatSessionModel from '../models/ChatSession';
import Content from '../models/Content';
import { chat as ragChat } from './ragService';
import {
  IChatSession,
  ChatResponse,
  ChatHistoryItem,
  ChatSessionMessage,
  ContentSource,
} from '../types';
import { Types } from 'mongoose';

/**
 * Create a new chat session.
 */
export async function createSession(
  userId: string,
  title?: string,
  snippetId?: string
): Promise<IChatSession> {
  const sessionData: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    title: title || 'New Conversation',
    messages: [],
  };

  if (snippetId) {
    // Verify the snippet exists and belongs to the user
    const snippet = await Content.findOne({
      _id: new Types.ObjectId(snippetId),
      userId: new Types.ObjectId(userId),
      parentId: { $exists: false }, // Must be a parent/selection, not a chunk
    });

    if (!snippet) {
      throw new Error('Snippet not found or does not belong to this user.');
    }

    sessionData.snippetId = snippet._id;
    sessionData.title = title || `Chat: ${snippet.pageTitle.substring(0, 60)}`;
  }

  const session = new ChatSessionModel(sessionData);
  await session.save();
  return session;
}

/**
 * Get all chat sessions for a user, sorted by most recent.
 */
export async function getUserSessions(
  userId: string
): Promise<ChatHistoryItem[]> {
  const sessions = await ChatSessionModel.find({
    userId: new Types.ObjectId(userId),
  })
    .sort({ updatedAt: -1 })
    .select('title messages snippetId createdAt updatedAt')
    .lean();

  // Collect snippet IDs to fetch titles
  const snippetIds = sessions
    .filter((s) => s.snippetId)
    .map((s) => s.snippetId as Types.ObjectId);

  const snippetMap = new Map<string, string>();
  if (snippetIds.length > 0) {
    const snippets = await Content.find({
      _id: { $in: snippetIds },
    })
      .select('pageTitle')
      .lean();

    for (const snippet of snippets) {
      snippetMap.set(snippet._id.toString(), snippet.pageTitle);
    }
  }

  return sessions.map((s) => ({
    sessionId: s._id.toString(),
    title: s.title,
    messageCount: s.messages?.length || 0,
    snippetId: s.snippetId?.toString(),
    snippetTitle: s.snippetId ? snippetMap.get(s.snippetId.toString()) : undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));
}

/**
 * Get a specific session with full messages (ownership verified).
 */
export async function getSessionById(
  userId: string,
  sessionId: string
): Promise<IChatSession | null> {
  const session = await ChatSessionModel.findOne({
    _id: new Types.ObjectId(sessionId),
    userId: new Types.ObjectId(userId),
  });

  return session;
}

/**
 * Send a message to a chat session, run RAG pipeline, and return the AI response.
 */
export async function addMessageAndRespond(
  userId: string,
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty.');
  }

  // 1. Load the session (ownership verified)
  const session = await ChatSessionModel.findOne({
    _id: new Types.ObjectId(sessionId),
    userId: new Types.ObjectId(userId),
  });

  if (!session) {
    throw new Error('Chat session not found or does not belong to this user.');
  }

  // 2. Auto-set title from first message if still default
  if (session.messages.length === 0 && session.title === 'New Conversation') {
    session.title = message.substring(0, 60) + (message.length > 60 ? '...' : '');
  }

  // 3. Build conversation history for RAG
  const conversationHistory: ChatSessionMessage[] = session.messages.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
    sources: m.sources,
  }));

  // 4. Run RAG pipeline
  const snippetId = session.snippetId?.toString();
  const result = await ragChat(userId, message, conversationHistory, snippetId);

  // 5. Build sources for storage
  const sources: ContentSource[] = result.sources.map((s) => ({
    pageTitle: s.pageTitle,
    sourceUrl: s.sourceUrl,
    snippet: s.snippet,
  }));

  // 6. Append user message and AI response to session
  session.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date(),
  } as ChatSessionMessage);

  session.messages.push({
    role: 'assistant',
    content: result.reply,
    timestamp: new Date(),
    sources: sources.length > 0 ? sources : undefined,
  } as ChatSessionMessage);

  await session.save();

  return {
    reply: result.reply,
    sources: result.sources,
    sessionId: session._id.toString(),
  };
}

/**
 * Delete a chat session (ownership verified).
 */
export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const result = await ChatSessionModel.deleteOne({
    _id: new Types.ObjectId(sessionId),
    userId: new Types.ObjectId(userId),
  });

  return result.deletedCount > 0;
}
