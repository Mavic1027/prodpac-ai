import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateImage, imageUrlToBase64, base64ToBlob, getApiKey } from "./nanobananaPro";
import { buildRefinementPrompt } from "./promptBuilder";

export const refineHeroImage = action({
  args: {
    agentId: v.id("agents"),
    currentImageUrl: v.string(),
    userMessage: v.string(),
    productId: v.optional(v.id("products")),
    profileData: v.optional(
      v.object({
        brandName: v.string(),
        productCategory: v.string(),
        niche: v.string(),
        tone: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ 
    concept: string; 
    imageUrl: string; 
    prompt?: string;
    storageId?: string;
  }> => {
    console.log("[Hero Image Refine] Starting hero image refinement");
    console.log("[Hero Image Refine] User message:", args.userMessage);
    console.log("[Hero Image Refine] Current image URL:", args.currentImageUrl);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get nanoBanana Pro API key from Convex environment
    const apiKey = getApiKey();

    try {
      // Get product data if available
      let productData: any = {};
      if (args.productId) {
        const freshProductData = await ctx.runQuery(api.products.getWithFeatures, {
          id: args.productId,
        });
        if (freshProductData) {
          productData = freshProductData;
        }
      }

      // Convert current hero image to base64 for nanoBanana Pro
      console.log("[Hero Image Refine] Converting current hero image to base64...");
      const currentImageBase64 = await imageUrlToBase64(args.currentImageUrl);
      console.log("[Hero Image Refine] Image converted, base64 length:", currentImageBase64.length);

      // Build optimized refinement prompt for Gemini 3 Pro Image
      console.log("[Hero Image Refine] Building optimized prompt for gemini-3-pro-image-preview");
      const refinementPrompt = buildRefinementPrompt(
        args.userMessage,
        productData,
        args.profileData
      );
      console.log("[Hero Image Refine] Refinement prompt length:", refinementPrompt.length);

      // Use Gemini 3 Pro Image (gemini-3-pro-image-preview) to refine the hero image
      console.log("[Hero Image Refine] Generating refined hero image with gemini-3-pro-image-preview...");
      const imageResponse = await generateImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        {
          prompt: refinementPrompt,
          referenceImages: [currentImageBase64],
        }
      );
      
      if (!imageResponse.success) {
        throw new Error(imageResponse.error || "Failed to refine hero image");
      }

      // Get base64 from response (Gemini API always returns base64 directly)
      if (!imageResponse.imageBase64) {
        throw new Error("No image data returned from Gemini API");
      }
      const base64String = imageResponse.imageBase64;

      // Convert base64 to blob for storage
      const refinedImageBlob = base64ToBlob(base64String);
      console.log("[Hero Image Refine] Refined image blob size:", refinedImageBlob.size);
      
      // Store in Convex
      const storageId = await ctx.storage.store(refinedImageBlob);
      const finalImageUrl = await ctx.storage.getUrl(storageId);
      if (!finalImageUrl) {
        throw new Error("Failed to get URL for stored refined image");
      }

      console.log("[Hero Image Refine] Hero image refinement completed successfully");
      
      return {
        concept: `Refined hero image based on your feedback: "${args.userMessage}"`,
        imageUrl: finalImageUrl,
        prompt: refinementPrompt,
        storageId: storageId
      };
      
    } catch (error) {
      console.error("[Hero Image Refine] Error refining hero image:", error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("content_policy") || error.message.includes("safety")) {
          throw new Error("The refinement request doesn't meet image generation guidelines. Please try different feedback or generate a new image.");
        } else if (error.message.includes("rate_limit")) {
          throw new Error("Too many requests. Please wait a moment and try again.");
        } else if (error.message.includes("quota")) {
          throw new Error("Image generation quota exceeded. Please try again later.");
        }
      }
      
      throw error;
    }
  },
});
