import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    asin: v.optional(v.string()),
    productImages: v.optional(v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.id("_storage")),
      type: v.union(v.literal("main"), v.literal("angle"), v.literal("detail")),
    }))),
    fileId: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    features: v.optional(v.array(v.string())),
    specifications: v.optional(v.object({
      dimensions: v.optional(v.string()),
      weight: v.optional(v.string()),
      materials: v.optional(v.array(v.string())),
      color: v.optional(v.string()),
      size: v.optional(v.string()),
    })),
    keywords: v.optional(v.array(v.string())),
    brandInfo: v.optional(v.object({
      name: v.string(),
      description: v.optional(v.string()),
    })),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    // If we have a storageId, get the URL from Convex storage
    let mainImageUrl = undefined;
    if (args.storageId) {
      const url = await ctx.storage.getUrl(args.storageId);
      if (url) {
        mainImageUrl = url;
      }
    }

    const productId = await ctx.db.insert("products", {
      userId,
      projectId: args.projectId,
      title: args.title,
      asin: args.asin,
      productImages: args.productImages || (mainImageUrl ? [{
        url: mainImageUrl,
        storageId: args.storageId,
        type: "main" as const
      }] : undefined),
      fileId: args.fileId || args.storageId,
      storageId: args.storageId,
      features: args.features,
      specifications: args.specifications,
      keywords: args.keywords,
      brandInfo: args.brandInfo,
      canvasPosition: args.canvasPosition,
      createdAt: Date.now(),
    });
    
    // Return the created product with its data
    const product = await ctx.db.get(productId);
    return product;
  },
});

export const update = mutation({
  args: {
    id: v.id("products"),
    title: v.optional(v.string()),
    asin: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    specifications: v.optional(v.object({
      dimensions: v.optional(v.string()),
      weight: v.optional(v.string()),
      materials: v.optional(v.array(v.string())),
      color: v.optional(v.string()),
      size: v.optional(v.string()),
    })),
    keywords: v.optional(v.array(v.string())),
    brandInfo: v.optional(v.object({
      name: v.string(),
      description: v.optional(v.string()),
    })),
    canvasPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(args.id, updates);
  },
});

// New mutation to update product metadata
export const updateMetadata = mutation({
  args: {
    id: v.id("products"),
    fileSize: v.optional(v.number()),
    resolution: v.optional(v.object({
      width: v.number(),
      height: v.number(),
    })),
    format: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    const { id, ...metadata } = args;
    await ctx.db.patch(args.id, metadata);
    
    return await ctx.db.get(args.id);
  },
});

export const updateProductStorageId = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    // Get the URL from Convex storage
    const url = await ctx.storage.getUrl(args.storageId);
    
    await ctx.db.patch(args.productId, {
      storageId: args.storageId,
      ...(url && {
        productImages: [{
          url,
          storageId: args.storageId,
          type: "main" as const
        }]
      })
    });
  },
});

export const updateProductInfo = mutation({
  args: {
    productId: v.id("products"),
    productName: v.optional(v.string()),
    keyFeatures: v.optional(v.string()),
    targetKeywords: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    customTargetAudience: v.optional(v.string()),
    productCategory: v.optional(v.string()),
    brandVoice: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.productId);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    const { productId, ...updates } = args;
    await ctx.db.patch(args.productId, updates);
    
    return await ctx.db.get(args.productId);
  },
});

export const getByUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const userId = identity.subject;

    return await ctx.db
      .query("products")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
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
      .query("products")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    return product;
  },
});

// New query to get product data for AI generation
export const getWithFeatures = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== userId) {
      return null;
    }

    return {
      title: product.title,
      features: product.features,
      specifications: product.specifications,
      keywords: product.keywords,
      brandInfo: product.brandInfo,
    };
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const userId = identity.subject;

    const product = await ctx.db.get(args.id);
    if (!product || product.userId !== userId) {
      throw new Error("Product not found or unauthorized");
    }

    // Delete all related agents
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_product", (q) => q.eq("productId", args.id))
      .collect();
    
    for (const agent of agents) {
      await ctx.db.delete(agent._id);
    }

    await ctx.db.delete(args.id);
  },
}); 