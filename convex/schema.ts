// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Store original resume documents
  resumes: defineTable({
    filename: v.string(),
    contentType: v.string(),
    content: v.string(), // Raw text content of the resume
    metadata: v.optional(v.object({
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      // Add more metadata fields as needed
    })),
    uploadedAt: v.number(), // Timestamp
  }),

  // Store chunked resume text with embeddings
  resumeChunks: defineTable({
    resumeId: v.id("resumes"),
    chunkIndex: v.number(),
    text: v.string(), // The chunk of text
    embedding: v.array(v.number()), // Vector embedding for this chunk
  }).index("byResumeId", ["resumeId"]).vectorIndex("byEmbedding", {
    vectorField: "embedding",
    dimensions: 1536, // For OpenAI's text-embedding-ada-002
    filterFields: ["resumeId"]
  }),

  // Store user queries and responses
  queries: defineTable({
    query: v.string(),
    response: v.string(),
    resumeId: v.optional(v.id("resumes")),
    createdAt: v.number(), // Timestamp
  }).index("byTimestamp", ["createdAt"]),
});