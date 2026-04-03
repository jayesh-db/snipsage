import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { similaritySearch } from './vectorStoreService';
import { ChatResponse, ContentSource, ChatSessionMessage } from '../types';

let chatModel: ChatGoogleGenerativeAI | null = null;

function getChatModel(): ChatGoogleGenerativeAI {
  if (!chatModel) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set.');
    }

    chatModel = new ChatGoogleGenerativeAI({
      apiKey,
      model: 'gemini-2.5-flash',
      temperature: 0.3,
      maxOutputTokens: 2048,
    });
  }
  return chatModel;
}

// ============================================================
// System Prompts
// ============================================================

const GENERAL_SYSTEM_PROMPT = `You are SnipSage AI, a personal knowledge assistant. You answer questions EXCLUSIVELY based on the user's saved content provided as context below. 

CRITICAL RULES:
1. ONLY use information from the provided context to answer questions.
2. If the context does not contain enough information to answer the question, you MUST say: "I don't have enough information from your saved content to answer this question. Try saving more relevant content using the SnipSage browser extension."
3. NEVER use your general knowledge or training data to supplement answers.
4. When you reference information, mention the source page title when available.
5. Be concise, helpful, and accurate.
6. If the user asks about something completely unrelated to their saved content, politely redirect them.

USER'S SAVED CONTENT CONTEXT:
{context}`;

const SNIPPET_SYSTEM_PROMPT = `You are SnipSage AI, a personal knowledge assistant. You are currently in a focused conversation about a SPECIFIC saved snippet. Answer based ONLY on the following specific saved content.

CRITICAL RULES:
1. ONLY use information from the specific snippet content provided below.
2. If the snippet does not contain enough information to answer, say so clearly.
3. NEVER use your general knowledge or training data to supplement answers.
4. Be concise, helpful, and accurate.
5. Stay focused on the content of this specific snippet.

SPECIFIC SNIPPET CONTENT:
{context}`;

// ============================================================
// Context Building
// ============================================================

function buildContextString(results: Array<{ content: string; metadata: { pageTitle: string; sourceUrl: string } }>): string {
  if (results.length === 0) {
    return 'No relevant saved content found.';
  }

  return results
    .map(
      (r, i) =>
        `--- Source ${i + 1}: "${r.metadata.pageTitle}" (${r.metadata.sourceUrl}) ---\n${r.content}\n`
    )
    .join('\n');
}

// ============================================================
// Core Chat Function
// ============================================================

/**
 * Process a user chat message through the RAG pipeline.
 * Accepts conversation history and optional snippet scoping.
 */
export async function chat(
  userId: string,
  message: string,
  conversationHistory: ChatSessionMessage[],
  snippetId?: string
): Promise<ChatResponse> {
  if (!message || !message.trim()) {
    throw new Error('Message cannot be empty.');
  }

  // Step 1: Vector similarity search scoped to this user (optionally to a snippet)
  const searchResults = await similaritySearch(message, userId, 5, snippetId);

  // Step 2: Build context from retrieved documents
  const contextString = buildContextString(searchResults);
  const promptTemplate = snippetId ? SNIPPET_SYSTEM_PROMPT : GENERAL_SYSTEM_PROMPT;
  const systemPrompt = promptTemplate.replace('{context}', contextString);

  // Step 3: Build conversation messages
  const langchainMessages: BaseMessage[] = [new SystemMessage(systemPrompt)];

  // Add recent conversation history (last 10 messages for context)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      langchainMessages.push(new HumanMessage(msg.content));
    } else {
      langchainMessages.push(new AIMessage(msg.content));
    }
  }

  // Add current message
  langchainMessages.push(new HumanMessage(message));

  // Step 4: Invoke Gemini 2.5 Flash via LangChain
  const model = getChatModel();
  const response = await model.invoke(langchainMessages);

  const aiReply = typeof response.content === 'string'
    ? response.content
    : (response.content as Array<{ type: string; text?: string }>)
        .filter((c) => c.type === 'text')
        .map((c) => c.text || '')
        .join('');

  // Step 5: Build sources from search results
  const sources: ContentSource[] = searchResults.map((r) => ({
    pageTitle: r.metadata.pageTitle,
    sourceUrl: r.metadata.sourceUrl,
    snippet: r.content.substring(0, 150) + (r.content.length > 150 ? '...' : ''),
  }));

  return {
    reply: aiReply,
    sources,
    sessionId: '', // Will be set by chatSessionService
  };
}
