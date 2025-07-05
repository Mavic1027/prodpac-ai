import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

// Import the proven prompt building function from aiHackathon
function buildHackathonPrompt(
  agentType: string,
  productData: { 
    title?: string; 
    features?: string[];
    specifications?: {
      dimensions?: string;
      weight?: string;
      materials?: string[];
      color?: string;
      size?: string;
    };
    keywords?: string[];
    brandInfo?: {
      name: string;
      description?: string;
    };
    format?: string;
    // Enhanced product metadata from ProductNode
    productName?: string;
    keyFeatures?: string;
    targetKeywords?: string;
    targetAudience?: string;
    customTargetAudience?: string;
    productCategory?: string;
  },
  connectedOutputs: Array<{ type: string; content: string }>,
  profileData?: {
    brandName: string;
    productCategory: string;
    niche: string;
    tone?: string;
    targetAudience?: string;
  },
  brandKitData?: {
    brandName: string;
    colorPalette: {
      type: "preset" | "custom";
      preset?: string;
      custom?: {
        primary: string;
        secondary: string;
        accent: string;
      };
    };
    brandVoice: string;
  }
): string {
  let prompt = "";

  // Always process product data (features OR Product Node data)
  if (productData.features && productData.features.length > 0 || productData.productName || productData.keyFeatures) {
    prompt += `🎯 PRODUCT ANALYSIS:\n`;
    const featureCount = productData.features?.length || 0;
    prompt += `- Feature count: ${featureCount}\n`;
    prompt += `- Product complexity: ${featureCount > 5 ? 'Feature-rich' : featureCount > 2 ? 'Standard' : 'Simple'}\n\n`;
    
    if (productData.features && productData.features.length > 0) {
      prompt += `📝 PRODUCT FEATURES (Analyze carefully for benefits and selling points):\n`;
      productData.features.forEach((feature, index) => {
        prompt += `${index + 1}. ${feature}\n`;
      });
      prompt += `\n`;
    }
    
    if (productData.title) {
      prompt += `Current Product Title: ${productData.title}\n\n`;
    }
    
    if (productData.keywords && productData.keywords.length > 0) {
      prompt += `🎯 TARGET KEYWORDS:\n`;
      productData.keywords.forEach(keyword => {
        prompt += `- ${keyword}\n`;
      });
      prompt += `\n`;
    }
    
    if (productData.brandInfo) {
      prompt += `🏷️ BRAND INFO:\n`;
      prompt += `- Brand: ${productData.brandInfo.name}\n`;
      if (productData.brandInfo.description) {
        prompt += `- Description: ${productData.brandInfo.description}\n`;
      }
      prompt += `\n`;
    }
    
    if (agentType === 'infographic') {
      prompt += `\n🎯 PRODUCT INFORMATION FOR INFOGRAPHIC GENERATION:\n`;
      
      // Product Name from ProductNode (required input)
      let productName = '';
      if (productData.productName) {
        productName = productData.productName;
        prompt += `Product Name: ${productData.productName}\n`;
      } else if (productData.title) {
        productName = productData.title;
        prompt += `Product Name: ${productData.title}\n`;
      }
      
      // Key Features from ProductNode (required input)
      let keyFeatures = '';
      if (productData.keyFeatures) {
        keyFeatures = productData.keyFeatures;
        prompt += `Key Features: ${productData.keyFeatures}\n`;
      } else if (productData.features && productData.features.length > 0) {
        keyFeatures = productData.features.join(', ');
        prompt += `Key Features: ${productData.features.join(', ')}\n`;
      }
      
      // Target Audience from ProductNode
      let targetAudience = '';
      if (productData.targetAudience === "Custom" && productData.customTargetAudience) {
        targetAudience = productData.customTargetAudience;
        prompt += `Target Audience: ${productData.customTargetAudience}\n`;
      } else if (productData.targetAudience) {
        targetAudience = productData.targetAudience;
        prompt += `Target Audience: ${productData.targetAudience}\n`;
      } else if (profileData?.targetAudience) {
        targetAudience = profileData.targetAudience;
        prompt += `Target Audience: ${profileData.targetAudience}\n`;
      }
      
      // Product Category from ProductNode (PRIORITY) or Profile (fallback)
      let productCategory = '';
      if (productData.productCategory) {
        productCategory = productData.productCategory;
        prompt += `Product Category: ${productData.productCategory}\n`;
      } else if (profileData?.productCategory) {
        productCategory = profileData.productCategory;
        prompt += `Product Category: ${profileData.productCategory}\n`;
      }
      
      // Product specifications if available
      if (productData.specifications) {
        prompt += `Product Specifications:\n`;
        if (productData.specifications.dimensions) {
          prompt += `- Dimensions: ${productData.specifications.dimensions}\n`;
        }
        if (productData.specifications.materials?.length) {
          prompt += `- Materials: ${productData.specifications.materials.join(', ')}\n`;
        }
        if (productData.specifications.color) {
          prompt += `- Color: ${productData.specifications.color}\n`;
        }
        if (productData.specifications.size) {
          prompt += `- Size: ${productData.specifications.size}\n`;
        }
      }
      
      prompt += `\n🚀 GENERATE AMAZON INFOGRAPHIC DESIGN:\n\n`;
      
      prompt += `/* SYSTEM */\n`;
      prompt += `You are a senior infographic designer who creates Amazon PRODUCT infographics that boost conversion rates and provide clear value propositions. Design clean, professional infographics that highlight key features, benefits, and specifications in an easy-to-read format.\n\n`;
      
      prompt += `/* USER */\n`;
      prompt += `Create one high-quality product infographic using the details below.\n\n`;
      
      prompt += `Product (reference image): {{source_image}}      ←–– exact user uploaded product image for reference\n`;
      prompt += `Product name: **${productName}**\n`;
      prompt += `Key features: ${keyFeatures}\n`;
      prompt += `Target audience: ${targetAudience}                ←–– ex: "busy professionals"\n`;
      prompt += `Product category: ${productCategory}              ←–– ex: "Home & Kitchen"\n\n`;
      
      prompt += `**Design guidelines**\n`;
      prompt += `• Create a clean, modern infographic layout with clear sections\n`;
      prompt += `• Feature the product prominently with feature callouts and benefits\n`;
      prompt += `• Use professional color scheme (blues, grays, whites work well for Amazon)\n`;
      prompt += `• Include icons, arrows, and visual elements to guide the eye\n`;
      prompt += `• Organize information in digestible chunks (features, benefits, specs)\n`;
      prompt += `• Ensure text is large enough to read on mobile devices\n\n`;
      
      prompt += `**Content structure**\n`;
      prompt += `• Product image/photo as the central element\n`;
      prompt += `• Key features with corresponding icons or visual callouts\n`;
      prompt += `• Benefits that solve customer pain points\n`;
      prompt += `• Technical specifications if relevant\n`;
      prompt += `• Comparison points or competitive advantages\n`;
      prompt += `• Clear hierarchy with the most important info prominently placed\n\n`;
      
      prompt += `**Hard requirements**\n`;
      prompt += `1. Clean, professional design suitable for Amazon product listings\n`;
      prompt += `2. High contrast text that's easily readable\n`;
      prompt += `3. Product should be clearly visible and well-integrated\n`;
      prompt += `4. No competitor brands, logos, or trademarked content\n`;
      prompt += `5. Resolution ≥ 1600 × 1600 px, square format for Amazon compatibility\n`;
      prompt += `6. Modern, clean aesthetic that builds trust and credibility\n`;
      prompt += `7. Information organized logically from most to least important\n`;
      prompt += `8. Visual elements (icons, arrows, boxes) enhance rather than clutter\n\n`;
      
      prompt += `The final infographic should help shoppers quickly understand the product's value proposition and key differentiators.\n\n`;
      
      return prompt;
    }
  } else {
    prompt += `⚠️ LIMITED CONTEXT MODE - No product data available\n\n`;
    if (productData.title) {
      prompt += `Product Title: ${productData.title}\n`;
    }
    prompt += `Generate high-quality ${agentType} content based on the title and any connected content.\n`;
    prompt += `Focus on creating compelling, clickable content that aligns with the title's topic.\n\n`;
  }

  // Add connected agent outputs
  if (connectedOutputs.length > 0) {
    prompt += "Related content from other agents:\n";
    connectedOutputs.forEach(({ type, content }) => {
      prompt += `${type}: ${content}\n`;
    });
    prompt += "\n";
  }

  // Add profile data as fallback
  if (profileData) {
    prompt += "Brand Information:\n";
    prompt += `Brand Name: ${profileData.brandName}\n`;
    prompt += `Product Category: ${profileData.productCategory}\n`;
    prompt += `Niche: ${profileData.niche}\n`;
    if (profileData.tone) {
      prompt += `Tone: ${profileData.tone}\n`;
    }
    if (profileData.targetAudience) {
      prompt += `Target Audience: ${profileData.targetAudience}\n`;
    }
  }

  return prompt;
}

export const generateInfographic = action({
  args: {
    agentType: v.string(),
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
    console.log("[Infographic] Starting infographic generation process");
    console.log("[Infographic] Args received:", {
      agentType: args.agentType,
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

    // Get OpenAI API key from Convex environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[Infographic] OpenAI API key not configured");
      throw new Error("Infographic generation service is not configured. Please contact support.");
    }

    const openai = new OpenAI({ apiKey });

    try {
      // If we have a productId, fetch the latest product data with features
      let productData = args.productData;
      if (args.productId) {
        console.log("[Infographic] Fetching fresh product data for ID:", args.productId);
        const freshProductData = await ctx.runQuery(api.products.getWithFeatures, {
          id: args.productId,
        });
        console.log("[Infographic] Fresh product data fetched:", {
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

      // Log data availability using same pattern as other image generators
      console.log(`[Infographic] Data availability:`, {
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

      // Validate we have a product image for reference
      if (!args.productImages || args.productImages.length === 0) {
        throw new Error("No product images provided. Please connect to a Product Image Node with uploaded images.");
      }

      // Use the proven buildHackathonPrompt function like other image generators
      console.log("[Infographic] Building infographic prompt using proven logic");
      let infographicPrompt = buildHackathonPrompt(
        'infographic',
        productData,
        args.connectedAgentOutputs,
        args.profileData
      );

      // If user provided specific instructions via chat, incorporate them
      if (args.additionalContext && args.additionalContext.trim()) {
        console.log("[Infographic] Adding user-specific instructions:", args.additionalContext);
        infographicPrompt += `\n\n🎯 USER REQUEST: The user specifically requested: "${args.additionalContext}"\nPlease incorporate this request while maintaining the professional infographic design and Amazon compliance.`;
      }

      // DEBUG: Log the exact prompt being sent to AI
      console.log(`[Infographic] EXACT PROMPT BEING SENT TO AI:`);
      console.log(`--- PROMPT START ---`);
      console.log(infographicPrompt);
      console.log(`--- PROMPT END ---`);

      // Convert first product image to the format needed for gpt-image-1
      console.log("[Infographic] Converting product image for gpt-image-1...");
      const sourceImage = args.productImages[0];
      
      // Convert dataUrl to blob
      const response = await fetch(sourceImage.dataUrl);
      const imageBlob = await response.blob();
      console.log("[Infographic] Source image blob size:", imageBlob.size);
      
      // Convert blob to OpenAI file format
      const imageFile = await toFile(imageBlob, 'source-product-image.png', {
        type: imageBlob.type || 'image/png',
      });

      // Use gpt-image-1 for infographic generation (taking existing product image and creating infographic design)
      console.log("[Infographic] Generating infographic with gpt-image-1...");
      const imageResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: infographicPrompt,
      });
      
      const imageData = imageResponse.data?.[0];
      if (!imageData?.b64_json) {
        throw new Error("No base64 image data returned from gpt-image-1 API");
      }
      
      console.log("[Infographic] Infographic generation completed successfully");
      
      // Convert base64 to blob for storage (browser-compatible)
      const base64String = imageData.b64_json;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const generatedImageBlob = new Blob([bytes], { type: 'image/png' });
      console.log("[Infographic] Generated image blob size:", generatedImageBlob.size);
      
      // Store in Convex storage
      const storageId = await ctx.storage.store(generatedImageBlob);
      console.log("[Infographic] Stored in Convex with ID:", storageId);
      
      // Get the final URL
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for stored infographic");
      }
      
      console.log("[Infographic] Infographic generation completed successfully");
      
      return {
        concept: "Professional Amazon infographic created by transforming your uploaded product image with gpt-image-1 - clean layout highlighting key features, benefits, and specifications",
        imageUrl: finalUrl,
        storageId: storageId
      };
      
    } catch (error) {
      console.error("[Infographic] Error generating infographic:", error);
      
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