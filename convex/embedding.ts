// convex/embedding.ts
import { v } from "convex/values";
import {  internalAction, mutation, internalMutation, internalQuery, } from "./_generated/server";

import { internal } from "./_generated/api";
import OpenAI from "openai";

// Define our database insertion function as an internal mutation
export const saveChunkEmbedding = internalMutation({
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

// Create a table to store chunking progress
export const saveChunkingProgress = internalMutation({
  args: {
    resumeId: v.id("resumes"),
    position: v.number(),
    chunkIndex: v.number(),
    isComplete: v.boolean(),
  },
  handler: async (ctx, args) => {
    // First check if we already have a progress record
    const existing = await ctx.db
      .query("chunkingProgress")
      .withIndex("byResumeId", q => q.eq("resumeId", args.resumeId))
      .unique();
    
    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        position: args.position,
        chunkIndex: args.chunkIndex,
        isComplete: args.isComplete,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("chunkingProgress", {
        resumeId: args.resumeId,
        position: args.position,
        chunkIndex: args.chunkIndex,
        isComplete: args.isComplete,
      });
    }
  },
});

// Helper function to get resume content for a specific range
export const getResumeContentRange = internalQuery({
  args: {
    resumeId: v.id("resumes"),
    startPosition: v.number(),
    maxLength: v.number(),
  },
  handler: async (ctx, args) => {
    const resume = await ctx.db.get(args.resumeId);
    if (!resume) {
      throw new Error("Resume not found");
    }
    
    const endPosition = Math.min(args.startPosition + args.maxLength, resume.content.length);
    
    return {
      content: resume.content.substring(args.startPosition, endPosition),
      totalLength: resume.content.length,
      endPosition: endPosition
    };
  }
});

// Process a single word-boundary chunk at the given position
export const processSingleChunk = internalAction({
  args: {
    resumeId: v.id("resumes"),
    position: v.number(),
    chunkIndex: v.number(),
  },
  handler: async (ctx, args): Promise<boolean> => {
    const { resumeId, position, chunkIndex } = args;
    
    try {
      // Get a small segment of the resume content
      const contentRange = await ctx.runQuery(internal.embedding.getResumeContentRange, {
        resumeId,
        startPosition: position,
        maxLength: 300 // Get slightly more than we need to find a good break point
      });
      
      // Check if we're at the end
      if (position >= contentRange.totalLength) {
        // Mark chunking as complete
        await ctx.runMutation(internal.embedding.saveChunkingProgress, {
          resumeId,
          position,
          chunkIndex,
          isComplete: true,
        });
        console.log(`Completed chunking for resume ${resumeId} with ${chunkIndex} chunks`);
        return true;
      }
      
      // Define small chunk size
      const chunkSize = 200;
      
      // Determine the end position for this chunk within our range
      let endPositionInRange = Math.min(chunkSize, contentRange.content.length);
      
      // Find a good break point - look for space, period, comma, newline
      if (endPositionInRange < contentRange.content.length) {
        const nextSmallSection = contentRange.content.substring(
          endPositionInRange, 
          Math.min(endPositionInRange + 20, contentRange.content.length)
        );
        const breakPoint = nextSmallSection.search(/[\s.,\n]/);
        if (breakPoint !== -1) {
          endPositionInRange += breakPoint;
        }
      }
      
      // Extract the chunk text
      const chunkText = contentRange.content.substring(0, endPositionInRange).trim();
      
      // Skip empty chunks
      if (!chunkText) {
        // Schedule next chunk and return
        await ctx.scheduler.runAfter(100, internal.embedding.processSingleChunk, {
          resumeId,
          position: position + endPositionInRange + 1, // Skip the delimiter
          chunkIndex, // Keep same index since we didn't process anything
        });
        return false;
      }
      
      // Get embedding for this chunk
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunkText,
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Save the chunk
      await ctx.runMutation(internal.embedding.saveChunkEmbedding, {
        resumeId,
        chunkIndex,
        text: chunkText,
        embedding,
      });
      
      console.log(`Processed chunk ${chunkIndex} at position ${position} (${chunkText.length} chars)`);
      
      // Calculate global position for next chunk
      const nextPosition = position + endPositionInRange;
      
      // Update progress
      await ctx.runMutation(internal.embedding.saveChunkingProgress, {
        resumeId,
        position: nextPosition,
        chunkIndex: chunkIndex + 1,
        isComplete: false,
      });
      
      // Schedule processing the next chunk with a delay
      await ctx.scheduler.runAfter(200, internal.embedding.processSingleChunk, {
        resumeId,
        position: nextPosition,
        chunkIndex: chunkIndex + 1,
      });
      
      return false; // Not complete yet
    } catch (error) {
      console.error(`Error processing chunk at position ${position}:`, error);
      
      // On error, wait longer and try again from the same position
      await ctx.scheduler.runAfter(2000, internal.embedding.processSingleChunk, {
        resumeId,
        position,
        chunkIndex,
      });
      
      return false;
    }
  },
});

// Define the main action for generating embeddings
export const generateEmbeddings = internalAction({
  args: { 
    resumeId: v.id("resumes") 
  },
  handler: async (ctx, args): Promise<number> => {
    // Initialize chunking progress
    await ctx.runMutation(internal.embedding.saveChunkingProgress, {
      resumeId: args.resumeId,
      position: 0,
      chunkIndex: 0,
      isComplete: false,
    });
    
    // Start processing chunks one by one
    await ctx.runAction(internal.embedding.processSingleChunk, {
      resumeId: args.resumeId,
      position: 0,
      chunkIndex: 0,
    });
    
    return 0; // Just return right away, processing continues asynchronously
  },
});

// Public function to insert a chunk directly (if needed)
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