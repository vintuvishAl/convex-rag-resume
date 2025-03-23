// convex/query.ts
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import OpenAI from "openai";

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
      let relevantChunks: { _id: Id<"resumeChunks">; text: string; _score: number }[] = [];
      
      if (args.resumeId) {
        // If a specific resume is chosen, search only within that resume
        relevantChunks = await ctx.runQuery(internal.query.searchResumeChunks, {
          embedding: queryEmbedding,
          resumeId: args.resumeId,
          limit: 5,
        });
      } else {
        // Search across all resumes
        relevantChunks = await ctx.runQuery(internal.query.searchAllResumeChunks, {
          embedding: queryEmbedding,
          limit: 5,
        });
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
      await ctx.runMutation(internal.query.saveQuery, {
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

// Search resume chunks for a specific resume
export const searchResumeChunks = query({
  args: {
    embedding: v.array(v.number()),
    resumeId: v.id("resumes"),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Using vector search directly on the "resumeChunks" table
    const vectorResults = await ctx.db.query("resumeChunks")
      .withIndex("byResumeId", (q) => q.eq("resumeId", args.resumeId))
      .collect();
      
    // For now, simulate vector search by getting all chunks
    // In a real implementation, we'd use the embedding-based similarity
    const results = vectorResults.slice(0, args.limit);
    
    const chunks = await Promise.all(
      results.map(async (chunk) => {
        return {
          _id: chunk._id,
          text: chunk.text,
          _score: 1.0, // Placeholder score since we're not doing real vector search yet
        };
      })
    );
    
    return chunks;
  },
});

// Search all resume chunks
export const searchAllResumeChunks = query({
  args: {
    embedding: v.array(v.number()),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Using regular query for now
    const vectorResults = await ctx.db.query("resumeChunks")
      .take(args.limit);
    
    const chunks = await Promise.all(
      vectorResults.map(async (chunk) => {
        return {
          _id: chunk._id,
          text: chunk.text,
          _score: 1.0, // Placeholder score
        };
      })
    );
    
    return chunks;
  },
});

// Save a query and its response
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