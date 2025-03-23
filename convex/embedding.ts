import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import OpenAI from "openai";

// Function to chunk text into smaller pieces
function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Determine the end of the current chunk
    let endIndex = Math.min(startIndex + maxChunkSize, text.length);
    
    // If we're not at the end of the text and we're not at a whitespace,
    // move back until we find a whitespace to avoid cutting words
    if (endIndex < text.length) {
      while (endIndex > startIndex && !text[endIndex].match(/\s/)) {
        endIndex--;
      }
    }
    
    // Extract the chunk
    const chunk = text.slice(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move the start index for the next chunk, considering overlap
    startIndex = endIndex - overlap;
    if (startIndex < 0 || startIndex >= text.length) break;
    
    // Make sure we're starting at a word boundary
    while (startIndex < text.length && !text[startIndex].match(/\s/)) {
      startIndex++;
    }
  }
  
  return chunks;
}

// Define our database insertion function first
export const insertChunk = mutation({
  args: {
    resumeId: v.id("resumes"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("resumeChunks", {
      resumeId: args.resumeId,
      chunkIndex: args.chunkIndex,
      text: args.text,
      embedding: args.embedding,
    });
  },
});

// Now create a standalone function for embedding generation logic
async function generateEmbeddingsLogic(ctx: any, resumeId: Id<"resumes">) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const resume = await ctx.runQuery(internal.resume.getResumeById, {
    id: resumeId,
  });

  const chunks = chunkText(resume.content);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Use insertChunk directly
      await ctx.runMutation(insertChunk, {
        resumeId,
        chunkIndex: i,
        text: chunk,
        embedding,
      });
    } catch (error) {
      console.error(`Error generating embedding for chunk ${i}:`, error);
    }
  }
  
  return chunks.length;
}

// Define the action for saving chunks
export const storeChunkEmbeddingAction = action({
  args: {
    resumeId: v.id("resumes"),
    chunkIndex: v.number(),
    text: v.string(),
    embedding: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(insertChunk, {
      resumeId: args.resumeId,
      chunkIndex: args.chunkIndex,
      text: args.text,
      embedding: args.embedding,
    });
  },
});

// Define the action for generating embeddings
export const generateEmbeddingsAction = action({
  args: { resumeId: v.id("resumes") },
  handler: async (ctx, args) => {
    return await generateEmbeddingsLogic(ctx, args.resumeId);
  },
});

// Export internal functions separately (no circular references)
export const saveChunkEmbedding = internal(insertChunk);
export const storeChunkEmbedding = internal(storeChunkEmbeddingAction);
export const generateEmbeddings = internal(generateEmbeddingsAction);