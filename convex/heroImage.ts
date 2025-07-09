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
    
    if (agentType === 'hero-image') {
      // EXACT COPY of Title Generator logic - just changing the final prompt text
      prompt += `\n🎯 PRODUCT INFORMATION FOR HERO IMAGE GENERATION:\n`;
      
      // Product Name from ProductNode (enhanced metadata) - EXACT SAME AS TITLE
      if (productData.productName) {
        prompt += `Product Name: ${productData.productName}\n`;
      } else if (productData.title) {
        prompt += `Product Name: ${productData.title}\n`;
      }
      
      // Key Features from ProductNode - EXACT SAME AS TITLE  
      if (productData.keyFeatures) {
        prompt += `Key Features: ${productData.keyFeatures}\n`;
      } else if (productData.features && productData.features.length > 0) {
        prompt += `Key Features: ${productData.features.join(', ')}\n`;
      }
      
      // Target Keywords from ProductNode - EXACT SAME AS TITLE
      if (productData.targetKeywords) {
        prompt += `Target Keywords: ${productData.targetKeywords}\n`;
      } else if (productData.keywords && productData.keywords.length > 0) {
        prompt += `Target Keywords: ${productData.keywords.join(', ')}\n`;
      }
      
      // Target Audience from ProductNode (with custom audience priority) - EXACT SAME AS TITLE
      if (productData.targetAudience === "Custom" && productData.customTargetAudience) {
        prompt += `Target Audience: ${productData.customTargetAudience}\n`;
      } else if (productData.targetAudience) {
        prompt += `Target Audience: ${productData.targetAudience}\n`;
      } else if (profileData?.targetAudience) {
        prompt += `Target Audience: ${profileData.targetAudience}\n`;
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
      
      prompt += `\n🚀 GENERATE AMAZON HERO IMAGE PROMPT:\n`;
      prompt += `You are a veteran e-commerce photographer who shoots Amazon MAIN images that dominate search results. Follow Amazon's image policy to the letter while maximizing click-through rate.\n\n`;
      prompt += `Transform the user-supplied source_image into one perfect Amazon hero shot.\n`;
      prompt += `Source image: {{source_image}}\n`;
      prompt += `Angle: three-quarter (45°) front view\n`;
      prompt += `Lighting: bright, even, pro-studio lighting\n`;
      prompt += `Background: pure white (RGB 255,255,255)\n`;
      prompt += `Shadow: soft, natural shadow directly beneath product\n\n`;
      prompt += `Hard requirements:\n`;
      prompt += `1. Show the entire product exactly as in source_image—no missing parts, no added items.\n`;
      prompt += `2. Center the product and fill ~85 – 90 % of the frame.\n`;
      prompt += `3. Background must be 100 % pure white—no props, text, logos, watermarks, gradients, or reflections.\n`;
      prompt += `4. Keep colors true to the source; preserve material textures.\n`;
      prompt += `5. Output one ultra-sharp, photorealistic square JPEG, ≥ 3000 × 3000 px.\n`;
      prompt += `6. Subtle depth-of-field is OK, but all product edges stay crisp.\n\n`;
      prompt += `Negative prompt: extra objects, packaging variations, people, text, watermark, illustration style, low-resolution, noise.\n\n`;
      prompt += `Return exactly one compliant, high-impact image ready for Amazon upload.\n\n`;
      
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

// Function to apply prompt variations for different agent instances
function applyPromptVariations(agentType: string, basePrompt: string, agentInstance: number): string {
  // Only apply variations to hero-image agents for now
  if (agentType !== "hero-image" || agentInstance === 1) {
    return basePrompt; // Return original prompt for non-hero agents or first instance
  }

  // For hero images, we need to REPLACE the angle instruction, not append to it
  const angleReplacements = {
    2: "Angle: perfect side profile view (90° side angle)",
    3: "Angle: straight-on front view (0° direct front)",
    4: "Angle: dramatic overhead view (60° bird's eye perspective)"
  };

  const angleReplacement = angleReplacements[agentInstance as keyof typeof angleReplacements];
  if (angleReplacement) {
    // Replace the existing angle instruction
    const modifiedPrompt = basePrompt.replace(
      /Angle: three-quarter \(45°\) front view/g,
      angleReplacement
    );
    
    // Add specific variation instructions
    const variationInstructions = {
      2: "\n\n🎨 SIDE PROFILE FOCUS: Show the complete side silhouette of the product. Emphasize the product's profile, depth, and side details. Perfect for showing product thickness, side features, and overall side design.",
      3: "\n\n🎨 FRONT-FACING FOCUS: Show the product straight-on, completely centered and symmetrical. Perfect for displaying front branding, labels, and main product features directly facing the camera.",
      4: "\n\n🎨 OVERHEAD PERSPECTIVE: Capture from above to show the top surface, opening, or interior details. Great for products with interesting top designs, lids, or internal features."
    };

    const instruction = variationInstructions[agentInstance as keyof typeof variationInstructions];
    return modifiedPrompt + instruction;
  }

  return basePrompt; // Fallback to original prompt if no variation found
}

// Add this function after the imports and before the main action
function resolvePromptConflicts(basePrompt: string, userInstructions: string): string {
  if (!userInstructions.trim()) return basePrompt;
  
  let resolvedPrompt = basePrompt;
  const userLower = userInstructions.toLowerCase();
  
  // Dynamic angle instruction replacement - prioritize what the user is asking for
  let angleReplacement = null;
  let replacementText = '';
  
  if (userLower.includes('front') && (userLower.includes('facing') || userLower.includes('view'))) {
    angleReplacement = 'Angle: straight-on front view (0° direct front)';
    replacementText = 'straight-on front view (0° direct front)';
  } else if (userLower.includes('side') && (userLower.includes('profile') || userLower.includes('view'))) {
    angleReplacement = 'Angle: perfect side profile view (90° side angle)';
    replacementText = 'perfect side profile view (90° side angle)';
  } else if (userLower.includes('back') || userLower.includes('behind') || userLower.includes('rear')) {
    angleReplacement = 'Angle: straight-on back view (180° rear view)';
    replacementText = 'straight-on back view (180° rear view)';
  } else if (userLower.includes('left') || userLower.includes('rotate left') || userLower.includes('turn left')) {
    angleReplacement = 'Angle: left side view (45° left angle)';
    replacementText = 'left side view (45° left angle)';
  } else if (userLower.includes('right') || userLower.includes('rotate right') || userLower.includes('turn right')) {
    angleReplacement = 'Angle: right side view (45° right angle)';
    replacementText = 'right side view (45° right angle)';
  } else if (userLower.includes('overhead') || userLower.includes('bird') || userLower.includes('top')) {
    angleReplacement = 'Angle: TOP-DOWN OVERHEAD VIEW (90° directly above looking down)';
    replacementText = 'TOP-DOWN OVERHEAD VIEW (90° directly above looking down)';
    
    // Add prominent instructions for overhead only
    resolvedPrompt = `🚨 CRITICAL: OVERHEAD SHOT REQUIRED - Position camera directly above product, looking straight down (90° top-down view). This is the PRIMARY requirement.\n\n${resolvedPrompt}`;
  }
  
  // Apply the angle replacement if we found one
  if (angleReplacement) {
    resolvedPrompt = resolvedPrompt.replace(/Angle: [^\\n]+/g, angleReplacement);
    console.log(`[Hero Image] Replaced angle instruction with: ${replacementText}`);
    
    // Add reminder at the end for overhead shots
    if (userLower.includes('overhead') || userLower.includes('bird') || userLower.includes('top')) {
      resolvedPrompt += `\n\n🚨 REMINDER: This must be an OVERHEAD shot - camera positioned directly above the product, looking down.`;
    }
  }
  
  // Check for other conflicting instructions and remove them
  const userWords = userLower.split(/\\s+/);
  const conflictPatterns = [
    // Position conflicts
    { 
      pattern: /Position: [^\\n]+/g, 
      conflicts: ['position', 'placement', 'center', 'left', 'right', 'top', 'bottom'] 
    },
    // Lighting conflicts
    { 
      pattern: /Lighting: [^\\n]+/g, 
      conflicts: ['lighting', 'light', 'bright', 'dark', 'shadow', 'illumination'] 
    },
    // Background conflicts
    { 
      pattern: /Background: [^\\n]+/g, 
      conflicts: ['background', 'backdrop', 'surface', 'setting'] 
    }
  ];
  
  for (const conflict of conflictPatterns) {
    const hasConflict = conflict.conflicts.some(keyword => userWords.includes(keyword));
    if (hasConflict) {
      resolvedPrompt = resolvedPrompt.replace(conflict.pattern, '');
      console.log(`[Hero Image] Removed conflicting instructions matching pattern: ${conflict.pattern}`);
    }
  }
  
  return resolvedPrompt;
}

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
    agentInstance: v.optional(v.number()), // Agent instance number for prompt variations (1-4)
  },
  handler: async (ctx, args): Promise<{ concept: string; imageUrl: string; prompt?: string; storageId?: string }> => {
    console.log("[Hero Image] Starting hero image generation process");
    console.log("[Hero Image] Args received:", {
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

      // Log data availability using same pattern as Title Generator
      console.log(`[Hero Image] Data availability:`, {
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
        // Profile data (fallback only)
        hasProfile: !!args.profileData,
        profileFallback: args.profileData ? {
          brandName: args.profileData.brandName,
          productCategory: args.profileData.productCategory,
          targetAudience: args.profileData.targetAudience,
        } : null
      });

      // Validate we have a product image to edit
      if (!args.productImages || args.productImages.length === 0) {
        throw new Error("No product images provided. Please connect to a Product Image Node with uploaded images.");
      }

      // Use the proven buildHackathonPrompt function like Title Generator
      console.log("[Hero Image] Building hero image editing prompt using proven logic");
      let heroImagePrompt = buildHackathonPrompt(
        'hero-image',
        productData,
        args.connectedAgentOutputs,
        args.profileData
      );

      // Apply prompt variations based on agent instance
      const agentInstance = args.agentInstance || 1;
      console.log(`[Hero Image] Applying prompt variations for agent instance ${agentInstance}`);
      heroImagePrompt = applyPromptVariations('hero-image', heroImagePrompt, agentInstance);

          // If user provided specific instructions via chat, resolve conflicts first
    if (args.additionalContext && args.additionalContext.trim()) {
      console.log("[Hero Image] Adding user-specific instructions:", args.additionalContext);
      console.log("[Hero Image] Resolving prompt conflicts with user instructions...");
      
      // Smart conflict resolution - replaces base instructions with specific photography terms
      const originalPrompt = heroImagePrompt;
      heroImagePrompt = resolvePromptConflicts(heroImagePrompt, args.additionalContext);
      
      // Check if we made a smart replacement or need to add user instructions
      if (originalPrompt !== heroImagePrompt) {
        // Smart replacement was made, add user context for clarity
        heroImagePrompt += `\n\n🎯 USER CONTEXT: User requested "${args.additionalContext}" - this has been translated into precise photography instructions above.`;
      } else {
        // No smart replacement, add user instructions as primary directive
        heroImagePrompt += `\n\n🎯 PRIMARY USER REQUEST: "${args.additionalContext}"\n`;
        heroImagePrompt += `IMPORTANT: The user's request above is the PRIMARY instruction. Follow it precisely while maintaining Amazon compliance (white background, studio lighting, etc.).\n`;
        heroImagePrompt += `If there are any conflicts between the user's request and other instructions, ALWAYS prioritize the user's request.`;
      }
    }

      // DEBUG: Log the exact prompt being sent to AI
      console.log(`[Hero Image] EXACT PROMPT BEING SENT TO AI:`);
      console.log(`--- PROMPT START ---`);
      console.log(heroImagePrompt);
      console.log(`--- PROMPT END ---`);

      // Convert first product image to the format needed for gpt-image-1 editing
      console.log("[Hero Image] Converting product image for gpt-image-1 editing...");
      const sourceImage = args.productImages[0];
      
      // Convert dataUrl to blob
      const response = await fetch(sourceImage.dataUrl);
      const imageBlob = await response.blob();
      console.log("[Hero Image] Source image blob size:", imageBlob.size);
      
      // Convert blob to OpenAI file format
      const imageFile = await toFile(imageBlob, 'source-product-image.png', {
        type: imageBlob.type || 'image/png',
      });

      // Use gpt-image-1 for hero image editing (taking existing product image and making it Amazon-compliant)
      console.log("[Hero Image] Editing product image with gpt-image-1...");
      const imageResponse = await openai.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt: heroImagePrompt,
      });
      
      const imageData = imageResponse.data?.[0];
      if (!imageData?.b64_json) {
        throw new Error("No base64 image data returned from gpt-image-1 API");
      }
      
      console.log("[Hero Image] Hero image editing completed successfully");
      
      // Convert base64 to blob for storage (browser-compatible)
      const base64String = imageData.b64_json;
      const binaryString = atob(base64String);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const generatedImageBlob = new Blob([bytes], { type: 'image/png' });
      console.log("[Hero Image] Generated image blob size:", generatedImageBlob.size);
      
      // Store in Convex storage
      const storageId = await ctx.storage.store(generatedImageBlob);
      console.log("[Hero Image] Stored in Convex with ID:", storageId);
      
      // Get the final URL
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for stored hero image");
      }
      
      console.log("[Hero Image] Hero image generation completed successfully");
      
      return {
        concept: "Professional Amazon hero shot created by transforming your uploaded product image with gpt-image-1 - pure white background, studio lighting, and Amazon compliance",
        imageUrl: finalUrl,
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