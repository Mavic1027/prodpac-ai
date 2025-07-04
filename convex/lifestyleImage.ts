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

  // Add product metadata if available
  if (productData.specifications) {
    prompt += "Product Technical Details:\n";
    if (productData.specifications.dimensions) {
      prompt += `- Dimensions: ${productData.specifications.dimensions}\n`;
    }
    if (productData.specifications.weight) {
      prompt += `- Weight: ${productData.specifications.weight}\n`;
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
    prompt += "\n";
  }

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
    
    if (agentType === 'lifestyle-image') {
      prompt += `\n🎯 PRODUCT INFORMATION FOR LIFESTYLE IMAGE GENERATION:\n`;
      
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
      
      // Target Audience from ProductNode (with custom audience priority)
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
      
      prompt += `\n🚀 GENERATE AMAZON LIFESTYLE IMAGE PROMPT:\n\n`;
      
      // User's exact prompt template with variable substitution
      prompt += `/* SYSTEM */\n`;
      prompt += `You are a senior e-commerce photographer who creates Amazon LIFESTYLE images that (1) boost conversion and (2) deliver crystal-clear visual data to Amazon's Rufus AI. Follow Amazon image rules; keep scenes authentic, photorealistic, and information-rich—no text overlays or brand-name props.\n\n`;
      
      prompt += `/* USER */\n`;
      prompt += `Generate one high-resolution lifestyle photo using the details below.\n\n`;
      
      prompt += `Product (reference image): {{source_image}}      ←–– exact user uploaded product image, do not alter\n`;
      prompt += `Product name: **${productName}**\n`;
      prompt += `Key features: ${keyFeatures}\n`;
      prompt += `Target audience: ${targetAudience}                ←–– ex: "health-conscious moms"\n`;
      prompt += `Product category: ${productCategory}              ←–– ex: "Lawn & Garden"\n\n`;
      
      prompt += `**Scene guidance**\n`;
      prompt += `• Pick a realistic environment that naturally fits the product category.\n`;
      prompt += `  – Kitchen / dining area for Home & Kitchen\n`;
      prompt += `  – Backyard / lawn for Lawn & Garden\n`;
      prompt += `  – Gym / trail for Sports & Outdoors\n`;
      prompt += `  – …(adapt as needed)\n`;
      prompt += `• Place a ${targetAudience} model using or interacting with the product in a way that spotlights at least one key feature.\n`;
      prompt += `• Add only props that reinforce those features (e.g., gardening gloves beside a lawn tool).\n\n`;
      
      prompt += `**Hard requirements**\n`;
      prompt += `1. Product looks identical to {{source_image}}—no extra parts, no missing details, true colors.\n`;
      prompt += `2. Main subject: product + user; keep both fully visible and in clear focus.\n`;
      prompt += `3. Lighting: natural and flattering for the setting (golden-hour sun for outdoors, soft window light for indoors). Avoid harsh shadows.\n`;
      prompt += `4. Composition: rule of thirds or centered—whichever best emphasizes product use.\n`;
      prompt += `5. Resolution ≥ 3000 × 3000 px, photorealistic, DSLR-level detail. Subtle depth-of-field OK, but product edges must stay sharp.\n`;
      prompt += `6. Pure lifestyle photo only—**no** on-image text, logos, watermarks, or unrelated items.\n`;
      prompt += `7. Deliver one square JPEG.\n\n`;
      
      prompt += `The final image should instantly help shoppers (and Rufus) understand **who** it's for, **where** it's used, and **why** It matters.\n\n`;
      
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

export const generateLifestyleImage = action({
  args: {
    agentType: v.literal("lifestyle-image"),
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
      console.error("[Lifestyle Image] OpenAI API key not configured");
      throw new Error("Lifestyle image generation service is not configured. Please contact support.");
    }

    const openai = new OpenAI({ apiKey });

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

      // Use the proven buildHackathonPrompt function like Hero Image Generator
      console.log("[Lifestyle Image] Building lifestyle image editing prompt using proven logic");
      let lifestyleImagePrompt = buildHackathonPrompt(
        'lifestyle-image',
        productData,
        args.connectedAgentOutputs,
        args.profileData
      );

      // If user provided specific instructions via chat, incorporate them
      if (args.additionalContext && args.additionalContext.trim()) {
        console.log("[Lifestyle Image] Adding user-specific instructions:", args.additionalContext);
        lifestyleImagePrompt += `\n\n🎯 USER REQUEST: The user specifically requested: "${args.additionalContext}"\nPlease incorporate this request while maintaining the lifestyle context and Amazon compliance.`;
      }

      // DEBUG: Log the exact prompt being sent to AI
      console.log(`[Lifestyle Image] EXACT PROMPT BEING SENT TO AI:`);
      console.log(`--- PROMPT START ---`);
      console.log(lifestyleImagePrompt);
      console.log(`--- PROMPT END ---`);

      // Convert first product image to the format needed for gpt-image-1 editing
      console.log("[Lifestyle Image] Converting product image for gpt-image-1 editing...");
      const sourceImage = args.productImages[0];
      
      // Convert dataUrl to blob
      const response = await fetch(sourceImage.dataUrl);
      const imageBlob = await response.blob();
      console.log("[Lifestyle Image] Source image blob size:", imageBlob.size);
      
      // Convert blob to OpenAI file format
      const imageFile = await toFile(imageBlob, 'source-product-image.png', {
        type: imageBlob.type || 'image/png',
      });

      // Use gpt-image-1 for lifestyle image editing (taking existing product image and creating lifestyle scene)
      console.log("[Lifestyle Image] Editing product image with gpt-image-1...");
      const imageResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: lifestyleImagePrompt,
      });
      
      const imageData = imageResponse.data?.[0];
      if (!imageData?.b64_json) {
        throw new Error("No base64 image data returned from gpt-image-1 API");
      }
      
      console.log("[Lifestyle Image] Lifestyle image editing completed successfully");
      
      // Convert base64 to blob for storage (browser-compatible)
      const base64String = imageData.b64_json;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const generatedImageBlob = new Blob([bytes], { type: 'image/png' });
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
        concept: "Professional Amazon lifestyle shot created by transforming your uploaded product image with gpt-image-1 - realistic scene with target audience and natural environment",
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