import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Helper function to get current user identity
async function getCurrentUserId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  
  return identity.subject;
}

// Get all brand kits for the current user
export const getUserBrandKits = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    return await ctx.db
      .query("brandKits")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// Get user's default brand kit
export const getDefaultBrandKit = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    
    return await ctx.db
      .query("brandKits")
      .withIndex("by_user_default", (q) => q.eq("userId", userId).eq("isDefault", true))
      .first();
  },
});

// Create a new brand kit
export const createBrandKit = mutation({
  args: {
    name: v.string(),
    colorPalette: v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.string(),
      })),
    }),
    brandVoice: v.string(),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("brandKits")
        .withIndex("by_user_default", (q) => q.eq("userId", userId).eq("isDefault", true))
        .collect();
      
      for (const kit of existingDefaults) {
        await ctx.db.patch(kit._id, { isDefault: false });
      }
    }
    
    return await ctx.db.insert("brandKits", {
      userId: userId,
      name: args.name,
      colorPalette: args.colorPalette,
      brandVoice: args.brandVoice,
      isDefault: args.isDefault || false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update an existing brand kit
export const updateBrandKit = mutation({
  args: {
    id: v.id("brandKits"),
    name: v.optional(v.string()),
    colorPalette: v.optional(v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.string(),
      })),
    })),
    brandVoice: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const brandKit = await ctx.db.get(args.id);
    if (!brandKit || brandKit.userId !== userId) {
      throw new Error("Brand kit not found or not owned by user");
    }
    
    // If setting as default, unset other defaults
    if (args.isDefault) {
      const existingDefaults = await ctx.db
        .query("brandKits")
        .withIndex("by_user_default", (q) => q.eq("userId", userId).eq("isDefault", true))
        .collect();
      
      for (const kit of existingDefaults) {
        if (kit._id !== args.id) {
          await ctx.db.patch(kit._id, { isDefault: false });
        }
      }
    }
    
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (args.name !== undefined) updateData.name = args.name;
    if (args.colorPalette !== undefined) updateData.colorPalette = args.colorPalette;
    if (args.brandVoice !== undefined) updateData.brandVoice = args.brandVoice;
    if (args.isDefault !== undefined) updateData.isDefault = args.isDefault;
    
    await ctx.db.patch(args.id, updateData);
    
    return await ctx.db.get(args.id);
  },
});

// Delete a brand kit
export const deleteBrandKit = mutation({
  args: {
    id: v.id("brandKits"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const brandKit = await ctx.db.get(args.id);
    if (!brandKit || brandKit.userId !== userId) {
      throw new Error("Brand kit not found or not owned by user");
    }
    
    await ctx.db.delete(args.id);
  },
});

// Canvas Brand Kit functions

// Get brand kit for a project
export const getProjectBrandKit = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    console.log("[getProjectBrandKit] Query called with:", {
      projectId: args.projectId,
      userId: userId
    });
    
    const result = await ctx.db
      .query("canvasBrandKits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
      
    console.log("[getProjectBrandKit] Query result:", result);
    
    return result;
  },
});

// Create brand kit node on canvas
export const createCanvasBrandKit = mutation({
  args: {
    projectId: v.id("projects"),
    brandKitId: v.optional(v.id("brandKits")),
    brandName: v.string(),
    colorPalette: v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.string(),
      })),
    }),
    brandVoice: v.string(),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    // Check if brand kit already exists for this project
    const existing = await ctx.db
      .query("canvasBrandKits")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();
      
    if (existing) {
      // Update existing instead of creating new
      await ctx.db.patch(existing._id, {
        brandKitId: args.brandKitId,
        brandName: args.brandName,
        colorPalette: args.colorPalette,
        brandVoice: args.brandVoice,
        canvasPosition: args.canvasPosition,
      });
      return existing._id;
    }
    
    return await ctx.db.insert("canvasBrandKits", {
      userId: userId,
      projectId: args.projectId,
      brandKitId: args.brandKitId,
      brandName: args.brandName,
      colorPalette: args.colorPalette,
      brandVoice: args.brandVoice,
      canvasPosition: args.canvasPosition,
      createdAt: Date.now(),
    });
  },
});

// Update canvas brand kit
export const updateCanvasBrandKit = mutation({
  args: {
    id: v.id("canvasBrandKits"),
    brandKitId: v.optional(v.id("brandKits")),
    brandName: v.optional(v.string()),
    colorPalette: v.optional(v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(),
        secondary: v.string(),
        accent: v.string(),
      })),
    })),
    brandVoice: v.optional(v.string()),
    canvasPosition: v.optional(v.object({
      x: v.number(),
      y: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const canvasBrandKit = await ctx.db.get(args.id);
    if (!canvasBrandKit || canvasBrandKit.userId !== userId) {
      throw new Error("Canvas brand kit not found or not owned by user");
    }
    
    const updateData: any = {};
    
    if (args.brandKitId !== undefined) updateData.brandKitId = args.brandKitId;
    if (args.brandName !== undefined) updateData.brandName = args.brandName;
    if (args.colorPalette !== undefined) updateData.colorPalette = args.colorPalette;
    if (args.brandVoice !== undefined) updateData.brandVoice = args.brandVoice;
    if (args.canvasPosition !== undefined) updateData.canvasPosition = args.canvasPosition;
    
    await ctx.db.patch(args.id, updateData);
    
    return await ctx.db.get(args.id);
  },
});

// Delete canvas brand kit
export const deleteCanvasBrandKit = mutation({
  args: {
    id: v.id("canvasBrandKits"),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx);
    
    const canvasBrandKit = await ctx.db.get(args.id);
    if (!canvasBrandKit || canvasBrandKit.userId !== userId) {
      throw new Error("Canvas brand kit not found or not owned by user");
    }
    
    await ctx.db.delete(args.id);
  },
}); 