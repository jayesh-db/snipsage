import Content from '../models/Content';
import { IContent, ContentCapturePayload, ContentListQuery, ContentListResponse } from '../types';
import { generateEmbedding } from './embeddingService';
import { invalidateUserCache } from './vectorStoreService';
import { Types } from 'mongoose';

const CHUNK_SIZE = 1500; // ~1500 characters per chunk
const CHUNK_OVERLAP = 200; // overlap for context continuity

/**
 * Split text into chunks by paragraph boundaries, respecting a max size.
 */
function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If a single paragraph exceeds the chunk size, split it by sentences
    if (trimmed.length > CHUNK_SIZE) {
      // Flush current chunk first
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Split long paragraph by sentences
      const sentences = trimmed.match(/[^.!?]+[.!?]+\s*/g) || [trimmed];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if (sentenceChunk.length + sentence.length > CHUNK_SIZE && sentenceChunk.trim()) {
          chunks.push(sentenceChunk.trim());
          // Keep overlap from end of previous chunk
          const words = sentenceChunk.trim().split(/\s+/);
          const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 6));
          sentenceChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          sentenceChunk += sentence;
        }
      }
      if (sentenceChunk.trim()) {
        currentChunk = sentenceChunk;
      }
      continue;
    }

    // Check if adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmed.length + 2 > CHUNK_SIZE && currentChunk.trim()) {
      chunks.push(currentChunk.trim());
      // Keep some overlap
      const words = currentChunk.trim().split(/\s+/);
      const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 6));
      currentChunk = overlapWords.join(' ') + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If no chunks were created (e.g., no paragraph breaks), create single chunk
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }

  return chunks;
}

/**
 * Save new captured content with embedding generation.
 * For full-page captures, chunks the content and stores each chunk separately.
 */
export async function saveContent(
  userId: string,
  payload: ContentCapturePayload
): Promise<IContent> {
  const { text, sourceUrl, pageTitle, captureType = 'selection' } = payload;

  if (!text || !sourceUrl || !pageTitle) {
    throw new Error('Text, source URL, and page title are required.');
  }

  if (text.trim().length === 0) {
    throw new Error('Content text cannot be empty.');
  }

  const userObjId = new Types.ObjectId(userId);

  if (captureType === 'full-page') {
    return saveFullPageContent(userObjId, text, sourceUrl, pageTitle);
  }

  return saveSelectionContent(userObjId, text, sourceUrl, pageTitle);
}

/**
 * Save a text selection — single record with embedding.
 */
async function saveSelectionContent(
  userId: Types.ObjectId,
  text: string,
  sourceUrl: string,
  pageTitle: string
): Promise<IContent> {
  let embedding: number[] = [];
  try {
    embedding = await generateEmbedding(text);
  } catch (error) {
    console.error('Failed to generate embedding, saving without:', error);
  }

  const content = new Content({
    userId,
    text: text.trim(),
    sourceUrl,
    pageTitle,
    savedAt: new Date(),
    embedding,
    captureType: 'selection',
  });

  await content.save();
  invalidateUserCache(userId.toString());

  const saved = content.toObject() as unknown as Record<string, unknown>;
  delete saved.embedding;
  return saved as unknown as IContent;
}

/**
 * Save a full-page capture — parent record + chunked child records with embeddings.
 */
async function saveFullPageContent(
  userId: Types.ObjectId,
  text: string,
  sourceUrl: string,
  pageTitle: string
): Promise<IContent> {
  // 1. Create the parent record (no embedding — it's too large)
  const parent = new Content({
    userId,
    text: text.trim(),
    sourceUrl,
    pageTitle,
    savedAt: new Date(),
    embedding: [],
    captureType: 'full-page',
  });
  await parent.save();

  // 2. Chunk the text
  const chunks = chunkText(text);

  // 3. Generate embeddings and save chunks in parallel (batched)
  const chunkPromises = chunks.map(async (chunkText, index) => {
    let embedding: number[] = [];
    try {
      embedding = await generateEmbedding(chunkText);
    } catch (error) {
      console.error(`Failed to generate embedding for chunk ${index}:`, error);
    }

    const chunk = new Content({
      userId,
      text: chunkText,
      sourceUrl,
      pageTitle,
      savedAt: parent.savedAt,
      embedding,
      captureType: 'full-page',
      parentId: parent._id,
      chunkIndex: index,
    });

    return chunk.save();
  });

  await Promise.all(chunkPromises);
  console.log(`📄 Full-page capture saved: ${chunks.length} chunks for "${pageTitle}"`);

  invalidateUserCache(userId.toString());

  const saved = parent.toObject() as unknown as Record<string, unknown>;
  delete saved.embedding;
  return saved as unknown as IContent;
}

/**
 * Get user's content with pagination and optional text search.
 * Excludes chunk records — only shows parent/selection records.
 */
export async function getUserContent(
  userId: string,
  query: ContentListQuery
): Promise<ContentListResponse> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  let filter: Record<string, unknown> = {
    userId: new Types.ObjectId(userId),
    parentId: { $exists: false }, // Exclude chunk records
  };

  if (query.search && query.search.trim()) {
    filter = {
      ...filter,
      $text: { $search: query.search.trim() },
    };
  }

  const [contents, total] = await Promise.all([
    Content.find(filter)
      .sort({ savedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Content.countDocuments(filter),
  ]);

  return {
    contents: contents as unknown as IContent[],
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Delete content by ID (ownership verified).
 * If it's a parent full-page capture, also deletes all chunks.
 */
export async function deleteContent(
  userId: string,
  contentId: string
): Promise<boolean> {
  const contentObjId = new Types.ObjectId(contentId);
  const userObjId = new Types.ObjectId(userId);

  // First, find the content to check if it's a parent
  const content = await Content.findOne({
    _id: contentObjId,
    userId: userObjId,
  });

  if (!content) {
    return false;
  }

  // Delete the content itself
  await Content.deleteOne({ _id: contentObjId });

  // If it's a parent full-page capture, delete all its chunks
  if (content.captureType === 'full-page' && !content.parentId) {
    const deleteResult = await Content.deleteMany({ parentId: contentObjId });
    if (deleteResult.deletedCount > 0) {
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} chunks for parent ${contentId}`);
    }
  }

  invalidateUserCache(userId);
  return true;
}

/**
 * Get a single content item (ownership verified).
 */
export async function getContentById(
  userId: string,
  contentId: string
): Promise<IContent | null> {
  const content = await Content.findOne({
    _id: new Types.ObjectId(contentId),
    userId: new Types.ObjectId(userId),
  }).lean();

  return content as unknown as IContent | null;
}
