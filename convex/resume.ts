// convex/resume.ts
import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Function to handle resume upload
export const uploadResume = mutation({
  args: {
    filename: v.string(),
    contentType: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Store the resume in the database
    const resumeId = await ctx.db.insert("resumes", {
      filename: args.filename,
      contentType: args.contentType,
      content: args.content,
      uploadedAt: Date.now(),
    });

    // Generate embeddings asynchronously
    await ctx.scheduler.runAfter(0, internal.embedding.generateEmbeddings, {
      resumeId,
    });

    return resumeId;
  },
});

// Query to fetch all uploaded resumes
export const getResumes = query({
  handler: async (ctx) => {
    const resumes = await ctx.db.query("resumes").collect();
    return resumes.map(resume => ({
      id: resume._id,
      filename: resume.filename,
      uploadedAt: resume.uploadedAt,
    }));
  },
});

// Query to get details of a specific resume
export const getResumeById = query({
  args: { id: v.id("resumes") },
  handler: async (ctx, args) => {
    const resume = await ctx.db.get(args.id);
    if (!resume) {
      throw new Error("Resume not found");
    }
    return resume;
  },
});

// Make this function available internally to other Convex functions
export const internalGetResumeById = internalQuery({
  args: { id: v.id("resumes") },
  handler: async (ctx, args) => {
    const resume = await ctx.db.get(args.id);
    if (!resume) {
      throw new Error("Resume not found");
    }
    return resume;
  },
});

// Delete a resume and its associated chunks
export const deleteResume = mutation({
  args: { id: v.id("resumes") },
  handler: async (ctx, args) => {
    // Delete all chunks associated with this resume
    const chunks = await ctx.db
      .query("resumeChunks")
      .withIndex("byResumeId", q => q.eq("resumeId", args.id))
      .collect();
    
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }
    
    // Delete the resume record
    await ctx.db.delete(args.id);
    return true;
  },
});