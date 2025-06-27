import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  // Brand Kits - saved brand presets for users
  brandKits: defineTable({
    userId: v.string(),
    name: v.string(), // Brand name
    colorPalette: v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(), // Hex color
        secondary: v.string(), // Hex color
        accent: v.string(), // Hex color
      })),
    }),
    brandVoice: v.string(), // Same options as products
    isDefault: v.optional(v.boolean()), // User's default brand kit
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_default", ["userId", "isDefault"]),

  projects: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    isArchived: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_updated", ["updatedAt"])
    .index("by_user_archived", ["userId", "isArchived"]),

  // Brand Kit Nodes on Canvas
  canvasBrandKits: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    brandKitId: v.optional(v.id("brandKits")), // Reference to saved brand kit
    // Direct brand settings (can override saved brand kit)
    brandName: v.string(),
    colorPalette: v.object({
      type: v.union(v.literal("preset"), v.literal("custom")),
      preset: v.optional(v.union(
        v.literal("professional-blue"),
        v.literal("warm-earth"),
        v.literal("bold-modern")
      )),
      custom: v.optional(v.object({
        primary: v.string(), // Hex color
        secondary: v.string(), // Hex color
        accent: v.string(), // Hex color
      })),
    }),
    brandVoice: v.string(),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_brand_kit", ["brandKitId"]),

  products: defineTable({
    userId: v.string(),
    projectId: v.optional(v.id("projects")),
    title: v.optional(v.string()),
    asin: v.optional(v.string()), // Amazon ASIN
    productImages: v.optional(v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.id("_storage")),
      type: v.union(v.literal("main"), v.literal("angle"), v.literal("detail")), // Image type
    }))),
    fileId: v.optional(v.string()), // Keep for backward compatibility
    storageId: v.optional(v.id("_storage")), // Keep for backward compatibility
    
    // Product Info Form Fields
    productName: v.optional(v.string()), // Main product name
    keyFeatures: v.optional(v.string()), // Textarea content as string
    targetKeywords: v.optional(v.string()), // Comma-separated keywords
    targetAudience: v.optional(v.string()), // Dropdown selection
    customTargetAudience: v.optional(v.string()), // Custom audience when "Custom" is selected
    productCategory: v.optional(v.string()), // Product category
    // brandVoice moved to Brand Kit - remove from here for new workflow
    
    // Legacy fields (keeping for compatibility)
    features: v.optional(v.array(v.string())), // Product features list
    specifications: v.optional(v.object({
      dimensions: v.optional(v.string()),
      weight: v.optional(v.string()),
      materials: v.optional(v.array(v.string())),
      color: v.optional(v.string()),
      size: v.optional(v.string()),
    })),
    keywords: v.optional(v.array(v.string())), // Target keywords
    brandInfo: v.optional(v.object({
      name: v.string(),
      description: v.optional(v.string()),
    })),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    // Keep some original fields for compatibility
    fileSize: v.optional(v.number()), // Size in bytes
    resolution: v.optional(v.object({
      width: v.number(),
      height: v.number(),
    })),
    format: v.optional(v.string()), // Image format
    metadata: v.optional(v.any()), // Additional metadata
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_created", ["createdAt"])
    .index("by_asin", ["asin"]),

  agents: defineTable({
    productId: v.id("products"), // Changed from videoId
    userId: v.string(),
    projectId: v.optional(v.id("projects")),
    type: v.union(
      v.literal("title"),
      v.literal("bullet-points"), // Renamed from "description"
      v.literal("hero-image"),    // Renamed from "thumbnail"
      v.literal("lifestyle-image"), // Renamed from "tweets"
      v.literal("infographic")    // New agent type
    ),
    draft: v.string(),
    imageUrl: v.optional(v.string()), // Renamed from thumbnailUrl
    imageStorageId: v.optional(v.id("_storage")), // Renamed from thumbnailStorageId
    connections: v.array(v.string()),
    chatHistory: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("ai")),
        message: v.string(),
        timestamp: v.number(),
      })
    ),
    canvasPosition: v.object({
      x: v.number(),
      y: v.number(),
    }),
    status: v.union(
      v.literal("idle"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("error")
    ),
    createdAt: v.number(),
  })
    .index("by_product", ["productId"]) // Changed from "by_video"
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_type", ["type"]),

  profiles: defineTable({
    userId: v.string(),
    brandName: v.string(), // Changed from channelName
    productCategory: v.string(), // Changed from contentType
    niche: v.string(),
    links: v.array(v.string()),
    tone: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    sellerType: v.optional(v.string()), // e.g., "FBA", "FBM", "Private Label"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  shares: defineTable({
    shareId: v.string(),
    projectId: v.id("projects"),
    userId: v.string(),
    canvasState: v.object({
      nodes: v.array(v.any()),
      edges: v.array(v.any()),
      viewport: v.optional(v.object({
        x: v.number(),
        y: v.number(),
        zoom: v.number(),
      })),
    }),
    viewCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_shareId", ["shareId"])
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  projectCanvases: defineTable({
    userId: v.string(),
    projectId: v.id("projects"),
    nodes: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        position: v.object({
          x: v.number(),
          y: v.number(),
        }),
        data: v.any(),
      })
    ),
    edges: v.array(
      v.object({
        id: v.string(),
        source: v.string(),
        target: v.string(),
        sourceHandle: v.optional(v.string()),
        targetHandle: v.optional(v.string()),
      })
    ),
    viewport: v.object({
      x: v.number(),
      y: v.number(),
      zoom: v.number(),
    }),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"]),
});
