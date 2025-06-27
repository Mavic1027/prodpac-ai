import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const openai = new OpenAI({ apiKey });

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

      // First, analyze the current hero image with GPT-4 Vision
      console.log("[Hero Image Refine] Analyzing current hero image...");
      
      const analysisMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: "You are an expert Amazon product photographer. Analyze the current hero image and understand what needs to be changed based on the user's feedback for Amazon listing optimization.",
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Current hero image analysis needed. User feedback: "${args.userMessage}"\n\nAnalyze this Amazon hero image and describe:\n1. Product positioning and background\n2. Lighting and image quality\n3. Compliance with Amazon requirements\n4. What specific changes are needed based on the user's feedback` 
            },
            {
              type: "image_url" as const,
              image_url: {
                url: args.currentImageUrl,
                detail: "high" as const,
              },
            },
          ],
        },
      ];
      
      const analysisResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: analysisMessages,
        max_tokens: 500,
      });
      
      const currentAnalysis = analysisResponse.choices[0].message.content || "";
      console.log("[Hero Image Refine] Current hero image analysis:", currentAnalysis);

      // Download the current hero image to use as base
      console.log("[Hero Image Refine] Downloading current hero image...");
      let imageFile;
      
      try {
        const imageResponse = await fetch(args.currentImageUrl);
        if (!imageResponse.ok) {
          throw new Error("Failed to download current hero image");
        }
        
        const imageBlob = await imageResponse.blob();
        console.log("[Hero Image Refine] Image blob size:", imageBlob.size);
        
        // If image is too large, we might need to resize it
        if (imageBlob.size > 4 * 1024 * 1024) { // 4MB limit
          console.warn("[Hero Image Refine] Image is large, may cause issues");
        }
        
        // Create file directly from blob
        imageFile = await toFile(imageBlob, 'current-hero-image.png', {
          type: imageBlob.type || 'image/png',
        });
      } catch (downloadError) {
        console.error("[Hero Image Refine] Error downloading image:", downloadError);
        throw new Error("Failed to process current hero image. Please try generating a new image instead.");
      }

      // Build refinement prompt
      let refinementPrompt = "Edit this Amazon hero image based on user feedback:\n\n";
      
      refinementPrompt += `USER FEEDBACK: ${args.userMessage}\n\n`;
      refinementPrompt += `CURRENT IMAGE ANALYSIS:\n${currentAnalysis}\n\n`;
      
      if (productData.title) {
        refinementPrompt += `PRODUCT TITLE: ${productData.title}\n\n`;
      }
      
      if (productData.features && productData.features.length > 0) {
        refinementPrompt += `PRODUCT FEATURES:\n`;
        productData.features.forEach((feature: string, index: number) => {
          refinementPrompt += `${index + 1}. ${feature}\n`;
        });
        refinementPrompt += `\n`;
      }
      
      refinementPrompt += "AMAZON HERO IMAGE REQUIREMENTS:\n";
      refinementPrompt += "- Apply the user's requested changes while maintaining Amazon compliance\n";
      refinementPrompt += "- Clean white background (RGB 255, 255, 255)\n";
      refinementPrompt += "- Product fills 85% of image frame\n";
      refinementPrompt += "- Professional lighting, no harsh shadows\n";
      refinementPrompt += "- High resolution and sharp focus\n";
      refinementPrompt += "- No text overlays or graphics\n";
      
      if (args.profileData) {
        refinementPrompt += `\nBRAND STYLE: ${args.profileData.brandName} - ${args.profileData.niche}\n`;
        refinementPrompt += `PRODUCT CATEGORY: ${args.profileData.productCategory}\n`;
      }

      console.log("[Hero Image Refine] Refinement prompt:", refinementPrompt.substring(0, 200) + "...");

      // Use images.edit to refine the hero image
      console.log("[Hero Image Refine] Generating refined hero image...");
      let imageEditResponse;
      
      try {
        imageEditResponse = await openai.images.edit({
          model: "dall-e-2",
          image: imageFile,
          prompt: refinementPrompt,
          size: "1024x1024",
        });
      } catch (apiError: any) {
        console.error("[Hero Image Refine] OpenAI API error:", apiError);
        console.log("[Hero Image Refine] Falling back to generation instead of edit");
        
        // Fallback: Generate a new image based on the analysis and user feedback
        const fallbackPrompt = `Create an Amazon hero image that incorporates these changes:\n\n${refinementPrompt}\n\nBased on analysis of previous image:\n${currentAnalysis}`;
        
        imageEditResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: fallbackPrompt,
          size: "1024x1024",
          quality: "hd",
          n: 1,
          style: "natural",
        });
      }

      // Handle the response
      const imageData = imageEditResponse.data?.[0];
      if (!imageData) {
        throw new Error("No image data returned from refinement");
      }

      let finalImageUrl: string;
      let storageId: string;

      if (imageData.b64_json) {
        // Handle base64 response
        console.log("[Hero Image Refine] Processing base64 image...");
        const base64Data = imageData.b64_json;
        
        // Convert base64 to blob
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const refinedImageBlob = new Blob([bytes], { type: 'image/png' });
        
        // Store in Convex
        storageId = await ctx.storage.store(refinedImageBlob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) {
          throw new Error("Failed to get URL for stored refined image");
        }
        finalImageUrl = url;
      } else if (imageData.url) {
        // Handle URL response
        console.log("[Hero Image Refine] Downloading refined image from URL...");
        const downloadResponse = await fetch(imageData.url);
        if (!downloadResponse.ok) {
          throw new Error("Failed to download refined hero image");
        }
        
        const refinedImageBlob = await downloadResponse.blob();
        
        // Store in Convex
        storageId = await ctx.storage.store(refinedImageBlob);
        const url = await ctx.storage.getUrl(storageId);
        if (!url) {
          throw new Error("Failed to get URL for stored refined image");
        }
        finalImageUrl = url;
      } else {
        throw new Error("No image data in response");
      }

      console.log("[Hero Image Refine] Hero image refinement completed successfully");
      
      return {
        concept: currentAnalysis,
        imageUrl: finalImageUrl,
        prompt: refinementPrompt,
        storageId: storageId
      };
      
    } catch (error) {
      console.error("[Hero Image Refine] Error refining hero image:", error);
      
      // Provide helpful error messages
      if (error instanceof Error) {
        if (error.message.includes("content_policy")) {
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