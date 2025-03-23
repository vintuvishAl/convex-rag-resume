// convex/vectorUtils.ts
import { Id } from "./_generated/dataModel";

/**
 * Calculate the cosine similarity between two vectors
 * @param a First vector
 * @param b Second vector
 * @returns Cosine similarity between the vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same dimensions");
  }
  
  // Calculate the dot product
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  
  // Calculate the magnitudes
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < a.length; i++) {
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  // Calculate the cosine similarity
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

// Define interfaces for our chunk types
export interface ChunkWithEmbedding {
  _id: Id<"resumeChunks">;
  resumeId: Id<"resumes">;
  chunkIndex: number;
  text: string;
  embedding: number[];
}

/**
 * Sort chunks by similarity to a query embedding
 * @param chunks Array of chunks with embeddings
 * @param queryEmbedding Embedding of the query
 * @param limit Maximum number of results to return
 * @returns Array of chunks sorted by similarity
 */
export function sortChunksBySimilarity(
  chunks: ChunkWithEmbedding[],
  queryEmbedding: number[],
  limit: number
): (ChunkWithEmbedding & { _score: number })[] {
  // Calculate similarity for each chunk
  const chunksWithScores = chunks.map(chunk => ({
    ...chunk,
    _score: cosineSimilarity(chunk.embedding, queryEmbedding)
  }));
  
  // Sort by similarity (highest first)
  const sortedChunks = chunksWithScores.sort((a, b) => b._score - a._score);
  
  // Return the top N results
  return sortedChunks.slice(0, limit);
}