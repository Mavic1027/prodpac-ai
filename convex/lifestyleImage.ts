import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateImage, resolveImageToBase64, base64ToBlob, getApiKey } from "./nanobananaPro";
import { buildLifestyleImagePrompt } from "./promptBuilder";

export const generateLifestyleImage = action({
  args: {
    agentType: v.literal("lifestyle-image"),
    agentInstance: v.optional(v.number()),
    productId: v.optional(v.id("products")),
    productImages: v.array(
      v.object({
        dataUrl: v.string(),
        timestamp: v.optional(v.number()),
      })
    ),
    productData: v.object({
      title: v.optional(v.string()),
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
      format: v.optional(v.string()),
      // Enhanced product metadata from ProductNode
      productName: v.optional(v.string()),
      keyFeatures: v.optional(v.string()),
      targetKeywords: v.optional(v.string()),
      targetAudience: v.optional(v.string()),
      customTargetAudience: v.optional(v.string()),
      productCategory: v.optional(v.string()),
    }),
    connectedAgentOutputs: v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    ),
    profileData: v.optional(
      v.object({
        brandName: v.string(),
        productCategory: v.string(),
        niche: v.string(),
        tone: v.optional(v.string()),
        targetAudience: v.optional(v.string()),
      })
    ),
    additionalContext: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ concept: string; imageUrl: string; prompt?: string; storageId?: string }> => {
    console.log("[Lifestyle Image] Starting lifestyle image generation process");
    console.log("[Lifestyle Image] Args received:", {
      agentType: args.agentType,
      agentInstance: args.agentInstance,
      productId: args.productId,
      imageCount: args.productImages.length,
      hasProductName: !!args.productData.productName,
      hasKeyFeatures: !!args.productData.keyFeatures,
      hasFeatures: !!args.productData.features?.length,
      hasProfile: !!args.profileData,
      connectedAgentsCount: args.connectedAgentOutputs.length
    });
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get nanoBanana Pro API key from Convex environment
    const apiKey = getApiKey();

    try {
      // If we have a productId, fetch the latest product data with features
      let productData = args.productData;
      if (args.productId) {
        console.log("[Lifestyle Image] Fetching fresh product data for ID:", args.productId);
        const freshProductData = await ctx.runQuery(api.products.getWithFeatures, {
          id: args.productId,
        });
        console.log("[Lifestyle Image] Fresh product data fetched:", {
          hasTitle: !!freshProductData?.title,
          hasProductName: !!freshProductData?.productName,
          hasKeyFeatures: !!freshProductData?.keyFeatures,
          hasFeatures: !!freshProductData?.features?.length,
          featuresCount: freshProductData?.features?.length || 0
        });
        if (freshProductData) {
          productData = {
            title: freshProductData.title || args.productData.title,
            features: freshProductData.features || args.productData.features,
            specifications: freshProductData.specifications || args.productData.specifications,
            keywords: freshProductData.keywords || args.productData.keywords,
            brandInfo: freshProductData.brandInfo || args.productData.brandInfo,
            // Enhanced ProductNode metadata
            productName: freshProductData.productName || args.productData.productName,
            keyFeatures: freshProductData.keyFeatures || args.productData.keyFeatures,
            targetKeywords: freshProductData.targetKeywords || args.productData.targetKeywords,
            targetAudience: freshProductData.targetAudience || args.productData.targetAudience,
            customTargetAudience: freshProductData.customTargetAudience || args.productData.customTargetAudience,
            productCategory: freshProductData.productCategory || args.productData.productCategory,
          };
        }
      }

      // Log data availability using same pattern as Hero Image Generator
      console.log(`[Lifestyle Image] Data availability:`, {
        // Product Node data (PRIORITY)
        hasProductName: !!productData.productName,
        productName: productData.productName,
        hasKeyFeatures: !!productData.keyFeatures,
        keyFeatures: productData.keyFeatures,
        hasTargetKeywords: !!productData.targetKeywords,
        targetKeywords: productData.targetKeywords,
        hasProductTargetAudience: !!productData.targetAudience,
        productTargetAudience: productData.targetAudience,
        // Legacy database features (fallback)
        hasDatabaseFeatures: !!productData.features?.length,
        databaseFeaturesCount: productData.features?.length || 0,
        // Connected agents
        hasConnectedAgents: args.connectedAgentOutputs.length > 0,
        // Profile data (critical for product category)
        hasProfile: !!args.profileData,
        profileProductCategory: args.profileData?.productCategory || null,
        profileTargetAudience: args.profileData?.targetAudience || null,
      });

      // Validate we have a product image to edit
      if (!args.productImages || args.productImages.length === 0) {
        throw new Error("No product images provided. Please connect to a Product Image Node with uploaded images.");
      }

      // Build optimized structured prompt for Gemini 3 Pro Image
      const agentInstance = args.agentInstance || 1;
      console.log("[Lifestyle Image] Building optimized prompt for gemini-3-pro-image-preview");
      console.log("[Lifestyle Image] Agent instance:", agentInstance);
      
      let lifestyleImagePrompt = buildLifestyleImagePrompt(
        productData,
        args.profileData,
        null, // brandKitData not typically used for lifestyle images
        agentInstance
      );

      // If user provided specific instructions via chat, append them
      if (args.additionalContext && args.additionalContext.trim()) {
        console.log("[Lifestyle Image] Adding user-specific instructions:", args.additionalContext);
        lifestyleImagePrompt += `\n\nUser override: ${args.additionalContext}`;
      }

      // DEBUG: Log the exact prompt being sent to AI
      console.log(`[Lifestyle Image] EXACT PROMPT BEING SENT TO AI:`);
      console.log(`--- PROMPT START ---`);
      console.log(lifestyleImagePrompt);
      console.log(`--- PROMPT END ---`);

      // Convert first product image to base64 for Gemini
      console.log("[Lifestyle Image] Converting product image for Gemini...");
      const sourceImage = args.productImages[0];
      const referenceImageBase64 = await resolveImageToBase64(sourceImage.dataUrl);
      console.log("[Lifestyle Image] Reference image base64 length:", referenceImageBase64.length);

      // Use Gemini 3 Pro Image (gemini-3-pro-image-preview) for lifestyle image editing
      console.log("[Lifestyle Image] Generating lifestyle image with gemini-3-pro-image-preview...");
      const imageResponse = await generateImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        {
          prompt: lifestyleImagePrompt,
          referenceImages: [referenceImageBase64],
        }
      );
      
      if (!imageResponse.success) {
        throw new Error(imageResponse.error || "Failed to generate lifestyle image");
      }

      // Get base64 from response (Gemini API always returns base64 directly)
      if (!imageResponse.imageBase64) {
        throw new Error("No image data returned from Gemini API");
      }
      const base64String = imageResponse.imageBase64;
      
      console.log("[Lifestyle Image] Lifestyle image generation completed successfully");
      
      // Convert base64 to blob for storage
      const generatedImageBlob = base64ToBlob(base64String);
      console.log("[Lifestyle Image] Generated image blob size:", generatedImageBlob.size);
      
      // Store in Convex storage
      const storageId = await ctx.storage.store(generatedImageBlob);
      console.log("[Lifestyle Image] Stored in Convex with ID:", storageId);
      
      // Get the final URL
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for stored lifestyle image");
      }
      
      console.log("[Lifestyle Image] Lifestyle image generation completed successfully");
      
      return {
        concept: "Professional Amazon lifestyle shot created by transforming your uploaded product image with Gemini 3 Pro - realistic scene with target audience and natural environment",
        imageUrl: finalUrl,
        storageId: storageId
      };
      
    } catch (error) {
      console.error("[Lifestyle Image] Error generating lifestyle image:", error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("content_policy")) {
          throw new Error("The product image content doesn't meet image generation guidelines. Please try with different product images or adjust your requirements.");
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
