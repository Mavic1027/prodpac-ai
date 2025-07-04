import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    productId: v.id("products"),
    type: v.union(
      v.literal("title"),
      v.literal("bullet-points"),
      v.literal("hero-image"),
      v.literal("lifestyle-image"),
      v.literal("infographic")
    ),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // Verify product exists and belongs to user
    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    if (!product.projectId) {
      throw new Error("Product must belong to a project");
    }

    // CRITICAL: Initialize connections immediately with the product ID
    // This ensures blank nodes maintain their connections after refresh
    const initialConnections = [args.productId];

    return await ctx.db.insert("agents", {
      productId: args.productId,
      userId,
      projectId: product.projectId,
      type: args.type,
      draft: "",
      connections: initialConnections,
      chatHistory: [],
      canvasPosition: args.canvasPosition,
      status: "idle",
      createdAt: Date.now(),
    });
  },
});

export const updateDraft = mutation({
  args: {
    id: v.id("agents"),
    draft: v.string(),
    status: v.optional(v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    )),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    const updateData: any = {
      draft: args.draft,
      status: args.status || "ready",
    };
    
    if (args.imageUrl !== undefined) {
      updateData.imageUrl = args.imageUrl;
    }
    
    if (args.imageStorageId !== undefined) {
      updateData.imageStorageId = args.imageStorageId;
    }

    await ctx.db.patch(args.id, updateData);
  },
});

export const updateConnections = mutation({
  args: {
    id: v.id("agents"),
    connections: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.patch(args.id, { connections: args.connections });
  },
});

export const addChatMessage = mutation({
  args: {
    id: v.id("agents"),
    role: v.union(v.literal("user"), v.literal("ai")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    const chatHistory = [...agent.chatHistory, {
      role: args.role,
      message: args.message,
      timestamp: Date.now(),
    }];

    await ctx.db.patch(args.id, { chatHistory });
  },
});

export const updatePosition = mutation({
  args: {
    id: v.id("agents"),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.patch(args.id, { canvasPosition: args.canvasPosition });
  },
});

export const getByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("agents")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) {
      return [];
    }

    return await ctx.db
      .query("agents")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    return agent;
  },
});

export const remove = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const agent = await ctx.db.get(args.id);
    if (!agent || agent.userId !== userId) {
      throw new Error("Agent not found or unauthorized");
    }

    await ctx.db.delete(args.id);
  },
});