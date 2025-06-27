import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

export const generateHeroImage = action({
  args: {
    agentType: v.literal("hero-image"),
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
    console.log("[Hero Image] Starting hero image generation process");
    console.log("[Hero Image] Args received:", {
      agentType: args.agentType,
      productId: args.productId,
      imageCount: args.productImages.length,
      hasFeatures: !!args.productData.features?.length,
      hasProfile: !!args.profileData,
      connectedAgentsCount: args.connectedAgentOutputs.length
    });
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    // Get OpenAI API key from Convex environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Hero Image] OpenAI API key not configured");
      throw new Error("Hero image generation service is not configured. Please contact support.");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // If we have a productId, fetch the latest product data with features
      let productData = args.productData;
      if (args.productId) {
        console.log("[Hero Image] Fetching fresh product data for ID:", args.productId);
        const freshProductData = await ctx.runQuery(api.products.getWithFeatures, {
          id: args.productId,
        });
        console.log("[Hero Image] Fresh product data fetched:", {
          hasTitle: !!freshProductData?.title,
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
          };
        }
      }

      // Validate inputs
      if (!args.productImages || args.productImages.length === 0) {
        throw new Error("No product images provided for hero image generation.");
      }

      // Build a comprehensive prompt for hero image generation
      console.log("[Hero Image] Building hero image generation prompt");
      
      let heroImagePrompt = "Create a stunning Amazon hero image with the following requirements:\n\n";
      
      if (productData.title) {
        heroImagePrompt += `Product Title: ${productData.title}\n`;
      }
      
      if (productData.features && productData.features.length > 0) {
        heroImagePrompt += `\nProduct Features:\n`;
        productData.features.forEach((feature, index) => {
          heroImagePrompt += `${index + 1}. ${feature}\n`;
        });
      }
      
      if (productData.specifications) {
        heroImagePrompt += `\nProduct Specifications:\n`;
        if (productData.specifications.dimensions) {
          heroImagePrompt += `- Dimensions: ${productData.specifications.dimensions}\n`;
        }
        if (productData.specifications.materials?.length) {
          heroImagePrompt += `- Materials: ${productData.specifications.materials.join(', ')}\n`;
        }
        if (productData.specifications.color) {
          heroImagePrompt += `- Color: ${productData.specifications.color}\n`;
        }
      }
      
      if (args.connectedAgentOutputs.length > 0) {
        heroImagePrompt += "\nRelated content:\n";
        args.connectedAgentOutputs.forEach(({ type, content }) => {
          if (type === "title") {
            heroImagePrompt += `- Title suggestion: ${content}\n`;
          }
        });
      }
      
      if (args.profileData) {
        heroImagePrompt += `\nBrand Style:\n`;
        heroImagePrompt += `- ${args.profileData.brandName} (${args.profileData.niche})\n`;
        heroImagePrompt += `- Product Category: ${args.profileData.productCategory}\n`;
        if (args.profileData.tone) {
          heroImagePrompt += `- Tone: ${args.profileData.tone}\n`;
        }
      }
      
      if (args.additionalContext) {
        heroImagePrompt += `\nSpecific requirements: ${args.additionalContext}\n`;
      }
      
      heroImagePrompt += `\nAmazon Hero Image Requirements:\n`;
      heroImagePrompt += `1. Clean white background (RGB 255, 255, 255)\n`;
      heroImagePrompt += `2. Product fills 85% of image frame\n`;
      heroImagePrompt += `3. Professional lighting, no harsh shadows\n`;
      heroImagePrompt += `4. High resolution and crystal clear details\n`;
      heroImagePrompt += `5. Product shown at best angle\n`;
      heroImagePrompt += `6. No text overlays or graphics\n`;
      heroImagePrompt += `7. Premium quality appearance that drives conversions\n`;
      
      console.log("[Hero Image] Prompt created, length:", heroImagePrompt.length);
      
      // First, analyze the uploaded product images with GPT-4 Vision
      console.log("[Hero Image] Analyzing uploaded product images with GPT-4 Vision...");
      console.log("[Hero Image] Number of input images:", args.productImages.length);
      
      const analysisMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an expert Amazon product photographer. Analyze the provided product images and create a detailed hero image concept that will maximize conversions and meet Amazon's requirements.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: heroImagePrompt + "\n\nAnalyze these product images and describe the perfect Amazon hero image based on them. Be specific about visual elements, positioning, lighting, and composition." },
            ...args.productImages.map((image) => ({
              type: "image_url" as const,
              image_url: {
                url: image.dataUrl,
                detail: "high" as const,
              },
            })),
          ],
        },
      ];
      
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: analysisMessages,
        max_tokens: 800,
        temperature: 0.7,
      });
      
      const heroImageConcept = analysisResponse.choices[0].message.content || "";
      console.log("[Hero Image] Analysis complete. Concept:", heroImageConcept.substring(0, 200) + "...");
      
      // Get detailed visual description
      console.log("[Hero Image] Getting detailed visual description...");
      
      const descriptionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are a visual description expert. Describe EXACTLY what you see in these product images in extreme detail, including: product appearance, materials, colors, textures, shape, size, and any distinctive features. Be as specific as possible for Amazon hero image creation.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Describe these product images in extreme detail. I need to create a professional Amazon hero image." },
            ...args.productImages.map((image) => ({
              type: "image_url" as const,
              image_url: {
                url: image.dataUrl,
                detail: "high" as const,
              },
            })),
          ],
        },
      ];
      
      const descriptionResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: descriptionMessages,
        max_tokens: 1000,
        temperature: 0.3,
      });
      
      const visualDescription = descriptionResponse.choices[0].message.content || "";
      console.log("[Hero Image] Visual description complete:", visualDescription.substring(0, 200) + "...");
      
      // Create the hero image generation prompt
      let finalPrompt = `Create a professional Amazon hero image based on this product:\n\n`;
      finalPrompt += `VISUAL DESCRIPTION:\n${visualDescription}\n\n`;
      finalPrompt += `HERO IMAGE CONCEPT:\n${heroImageConcept}\n\n`;
      finalPrompt += `AMAZON REQUIREMENTS:\n`;
      finalPrompt += `- Pure white background (RGB 255,255,255)\n`;
      finalPrompt += `- Product centered and fills 85% of frame\n`;
      finalPrompt += `- Professional studio lighting\n`;
      finalPrompt += `- Sharp focus, high detail\n`;
      finalPrompt += `- Premium commercial photography quality\n`;
      finalPrompt += `- Clean, minimal, conversion-focused\n`;
      
      console.log("[Hero Image] Final prompt length:", finalPrompt.length);
      
      // Generate the hero image using DALL-E 3
      console.log("[Hero Image] Generating hero image with DALL-E 3...");
      const imageResponse = await openai.images.generate({
        model: "dall-e-3",
        prompt: finalPrompt,
        size: "1024x1024",
        quality: "hd",
        n: 1,
        style: "natural",
      });
      
      const imageData = imageResponse.data?.[0];
      if (!imageData?.url) {
        throw new Error("No image URL returned from generation");
      }
      
      console.log("[Hero Image] Hero image generated successfully");
      console.log("[Hero Image] Image URL:", imageData.url.substring(0, 100) + "...");
      
      // Download and store the generated image
      const downloadResponse = await fetch(imageData.url);
      if (!downloadResponse.ok) {
        throw new Error("Failed to download generated hero image");
      }
      
      const imageBlob = await downloadResponse.blob();
      console.log("[Hero Image] Downloaded image blob, size:", imageBlob.size);
      
      // Store in Convex storage
      const storageId = await ctx.storage.store(imageBlob);
      console.log("[Hero Image] Stored in Convex with ID:", storageId);
      
      // Get the final URL
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for stored hero image");
      }
      
      console.log("[Hero Image] Hero image generation completed successfully");
      
      return {
        concept: heroImageConcept,
        imageUrl: finalUrl,
        prompt: finalPrompt,
        storageId: storageId
      };
      
    } catch (error) {
      console.error("[Hero Image] Error generating hero image:", error);
      
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