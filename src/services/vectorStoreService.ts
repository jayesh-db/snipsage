import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { Document } from '@langchain/core/documents';
import { getEmbeddingsInstance, generateEmbedding } from './embeddingService';
import Content from '../models/Content';
import { VectorSearchResult, VectorStoreType } from '../types';
import { Types } from 'mongoose';

// In-memory store cache per user for the "memory" strategy
const userStoreCache = new Map<string, { store: MemoryVectorStore; lastBuilt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getStoreType(): VectorStoreType {
  return (process.env.VECTOR_STORE_TYPE as VectorStoreType) || 'memory';
}

// ============================================================
// Memory Vector Store (Local Development)
// ============================================================

async function buildMemoryStoreForUser(userId: string): Promise<MemoryVectorStore> {
  const cached = userStoreCache.get(userId);
  if (cached && Date.now() - cached.lastBuilt < CACHE_TTL_MS) {
    return cached.store;
  }

  // Only fetch content records that have embeddings (exclude parent full-page records)
  const contents = await Content.find({
    userId,
    $or: [
      { parentId: { $exists: true } },   // Chunk records
      { captureType: { $ne: 'full-page' } }, // Selection records
      { captureType: { $exists: false } },   // Legacy records without captureType
    ],
  })
    .select('+embedding')
    .lean();

  const embeddings = getEmbeddingsInstance();
  const store = new MemoryVectorStore(embeddings);

  // Add documents that already have embeddings
  const docsWithEmbeddings: Array<{ doc: Document; embedding: number[] }> = [];

  for (const content of contents) {
    if (content.embedding && content.embedding.length > 0) {
      const doc = new Document({
        pageContent: content.text,
        metadata: {
          contentId: content._id.toString(),
          userId: content.userId.toString(),
          sourceUrl: content.sourceUrl,
          pageTitle: content.pageTitle,
          savedAt: content.savedAt?.toISOString() || new Date().toISOString(),
          parentId: content.parentId ? content.parentId.toString() : undefined,
        },
      });
      docsWithEmbeddings.push({ doc, embedding: content.embedding });
    }
  }

  if (docsWithEmbeddings.length > 0) {
    // Add documents with pre-computed embeddings directly
    await store.addVectors(
      docsWithEmbeddings.map((d) => d.embedding),
      docsWithEmbeddings.map((d) => d.doc)
    );
  }

  userStoreCache.set(userId, { store, lastBuilt: Date.now() });
  return store;
}

async function memorySearch(
  query: string,
  userId: string,
  k: number,
  snippetId?: string
): Promise<VectorSearchResult[]> {
  const store = await buildMemoryStoreForUser(userId);

  const results = await store.similaritySearchWithScore(query, k * 3); // Fetch extra for filtering

  let filtered = results;

  if (snippetId) {
    // Filter to only results belonging to this snippet
    // The snippet could be a selection (contentId matches) or parent (parentId matches)
    filtered = results.filter(([doc]) => {
      const contentId = doc.metadata.contentId as string;
      const parentId = doc.metadata.parentId as string | undefined;
      return contentId === snippetId || parentId === snippetId;
    });
  }

  return filtered.slice(0, k).map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: {
      contentId: doc.metadata.contentId as string,
      userId: doc.metadata.userId as string,
      sourceUrl: doc.metadata.sourceUrl as string,
      pageTitle: doc.metadata.pageTitle as string,
      savedAt: doc.metadata.savedAt as string,
    },
    score,
  }));
}

// ============================================================
// Atlas Vector Search (Production)
// ============================================================

async function atlasSearch(
  query: string,
  userId: string,
  k: number,
  snippetId?: string
): Promise<VectorSearchResult[]> {
  // Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  const indexName = process.env.ATLAS_VECTOR_SEARCH_INDEX_NAME || 'vector_index';

  // Build filter
  const filter: Record<string, unknown> = {
    userId: { $eq: new Types.ObjectId(userId) },
  };

  if (snippetId) {
    const snippetObjId = new Types.ObjectId(snippetId);
    // Match content with this ID or chunks with this parentId
    filter.$or = [
      { _id: { $eq: snippetObjId } },
      { parentId: { $eq: snippetObjId } },
    ];
  } else {
    // Exclude parent full-page records (they have no embeddings)
    // Only include chunks and selections
    filter.$or = [
      { parentId: { $exists: true } },
      { captureType: { $ne: 'full-page' } },
    ];
  }

  // Use MongoDB aggregation pipeline with $vectorSearch
  const results = await Content.aggregate([
    {
      $vectorSearch: {
        index: indexName,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: k * 10,
        limit: k,
        filter,
      },
    },
    {
      $project: {
        text: 1,
        sourceUrl: 1,
        pageTitle: 1,
        savedAt: 1,
        userId: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]);

  return results.map((r: Record<string, unknown>) => ({
    content: r.text as string,
    metadata: {
      contentId: (r._id as string).toString(),
      userId: (r.userId as string).toString(),
      sourceUrl: r.sourceUrl as string,
      pageTitle: r.pageTitle as string,
      savedAt: r.savedAt ? (r.savedAt as Date).toISOString() : new Date().toISOString(),
    },
    score: r.score as number,
  }));
}

// ============================================================
// Public API
// ============================================================

/**
 * Perform vector similarity search scoped to a specific user.
 * Optionally filter to a specific snippet (by contentId) for snippet-scoped chat.
 */
export async function similaritySearch(
  query: string,
  userId: string,
  k: number = 5,
  snippetId?: string
): Promise<VectorSearchResult[]> {
  const storeType = getStoreType();

  if (storeType === 'atlas') {
    return atlasSearch(query, userId, k, snippetId);
  }

  return memorySearch(query, userId, k, snippetId);
}

/**
 * Invalidate the in-memory cache for a user (call after adding new content).
 */
export function invalidateUserCache(userId: string): void {
  userStoreCache.delete(userId);
}

/**
 * Clear the entire in-memory cache.
 */
export function clearCache(): void {
  userStoreCache.clear();
}
