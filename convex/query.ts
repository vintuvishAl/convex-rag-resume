// convex/query.ts
import { v } from "convex/values";
import { action, internalQuery, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { sortChunksBySimilarity, ChunkWithEmbedding } from "./vectorUtils";

// Function to handle user queries
export const processQuery = action({
  args: {
    query: v.string(),
    resumeId: v.optional(v.id("resumes")),
  },
  handler: async (ctx, args) => {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    try {
      // Generate embedding for the query
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: args.query,
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      
      // Retrieve relevant chunks based on semantic similarity
      let relevantChunks: { text: string; _score: number }[] = [];
      
      if (args.resumeId) {
        // If a specific resume is chosen, search only within that resume
        const chunks = await ctx.runQuery(internal.query.internalSearchResumeChunks, {
          embedding: queryEmbedding,
          resumeId: args.resumeId,
          limit: 5,
        });
        relevantChunks = chunks;
      } else {
        // Search across all resumes
        const chunks = await ctx.runQuery(internal.query.internalSearchAllResumeChunks, {
          embedding: queryEmbedding,
          limit: 5,
        });
        relevantChunks = chunks;
      }
      
      // Prepare context from relevant chunks
      const context = relevantChunks
        .map((chunk) => chunk.text)
        .join("\n\n");
      
      // Generate response using OpenAI's chat completion API
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a helpful resume analyst. Use the provided resume context to answer the user's question accurately. If the answer is not present in the context, say that you don't have enough information.`,
          },
          {
            role: "user",
            content: `Context from resume:\n${context}\n\nQuestion: ${args.query}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 500,
      });
      
      const response = completion.choices[0].message.content || "Sorry, I couldn't generate a response.";
      
      // Store the query and response
      await ctx.runMutation(internal.query.internalSaveQuery, {
        query: args.query,
        response,
        resumeId: args.resumeId,
      });
      
      return { response, context };
    } catch (error) {
      console.error("Error processing query:", error);
      return {
        response: "Sorry, there was an error processing your query. Please try again.",
        context: "",
      };
    }
  },
});

// Search resume chunks for a specific resume with custom vector search
export const internalSearchResumeChunks = internalQuery({
  args: {
    embedding: v.array(v.number()),
    resumeId: v.id("resumes"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all chunks for this resume
    const allChunks = await ctx.db
      .query("resumeChunks")
      .withIndex("byResumeId", (q) => q.eq("resumeId", args.resumeId))
      .collect();
    
    // Sort chunks by similarity to the query embedding
    const sortedChunks = sortChunksBySimilarity(allChunks, args.embedding, args.limit);
    
    // Extract and return just the text and score
    return sortedChunks.map((chunk: ChunkWithEmbedding & { _score: number }) => ({
      text: chunk.text,
      _score: chunk._score
    }));
  },
});

// Search all resume chunks with custom vector search
export const internalSearchAllResumeChunks = internalQuery({
  args: {
    embedding: v.array(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all chunks
    const allChunks = await ctx.db
      .query("resumeChunks")
      .collect();
    
    // Sort chunks by similarity to the query embedding
    const sortedChunks = sortChunksBySimilarity(allChunks, args.embedding, args.limit);
    
    // Extract and return just the text and score
    return sortedChunks.map((chunk: ChunkWithEmbedding & { _score: number }) => ({
      text: chunk.text,
      _score: chunk._score
    }));
  },
});

// Save a query and its response
export const internalSaveQuery = internalMutation({
  args: {
    query: v.string(),
    response: v.string(),
    resumeId: v.optional(v.id("resumes")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("queries", {
      query: args.query,
      response: args.response,
      resumeId: args.resumeId,
      createdAt: Date.now(),
    });
  },
});

// Public version of save query
export const saveQuery = mutation({
  args: {
    query: v.string(),
    response: v.string(),
    resumeId: v.optional(v.id("resumes")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("queries", {
      query: args.query,
      response: args.response,
      resumeId: args.resumeId,
      createdAt: Date.now(),
    });
  },
});

// Get recent queries
export const getRecentQueries = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("queries")
      .withIndex("byTimestamp")
      .order("desc")
      .take(limit);
  },
});