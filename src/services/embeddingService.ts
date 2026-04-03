import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

let embeddingsInstance: GoogleGenerativeAIEmbeddings | null = null;

function getEmbeddingsModel(): GoogleGenerativeAIEmbeddings {
  if (!embeddingsInstance) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set.');
    }

    embeddingsInstance = new GoogleGenerativeAIEmbeddings({
      apiKey,
      modelName: 'gemini-embedding-001',
    });
  }
  return embeddingsInstance;
}

/**
 * Generate an embedding vector for a single text string.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = getEmbeddingsModel();

  // Truncate very long text to avoid token limits
  const maxChars = 8000;
  const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

  const embedding = await model.embedQuery(truncatedText);
  return embedding;
}

/**
 * Generate embeddings for multiple text strings in a batch.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const model = getEmbeddingsModel();

  const maxChars = 8000;
  const truncatedTexts = texts.map((t) =>
    t.length > maxChars ? t.substring(0, maxChars) : t
  );

  const embeddings = await model.embedDocuments(truncatedTexts);
  return embeddings;
}

/**
 * Get the embedding model for use in vector store initialization.
 */
export function getEmbeddingsInstance(): GoogleGenerativeAIEmbeddings {
  return getEmbeddingsModel();
}
