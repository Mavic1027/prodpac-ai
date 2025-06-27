import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

// Simplified AI generation for hackathon - no database dependencies
export const generateContentSimple = action({
  args: {
    agentType: v.union(
      v.literal("title"),
      v.literal("bullet-points"),
      v.literal("hero-image"),
      v.literal("lifestyle-image"),
      v.literal("infographic")
    ),
    productId: v.optional(v.id("products")),
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
    }),
    brandKitData: v.optional(v.object({
      brandName: v.string(),
      colorPalette: v.object({
        type: v.union(v.literal("preset"), v.literal("custom")),
        preset: v.optional(v.string()),
        custom: v.optional(v.object({
          primary: v.string(),
          secondary: v.string(),
          accent: v.string(),
        })),
      }),
      brandVoice: v.string(),
    })),
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
  },
  handler: async (ctx, args): Promise<{ content: string; prompt: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    try {
      // If we have a productId, fetch the latest product data with features
      let productData = args.productData;
      if (args.productId) {
        const freshProductData = await ctx.runQuery(api.products.getWithFeatures, {
          id: args.productId,
        });
        if (freshProductData) {
          productData = {
            title: freshProductData.title || args.productData.title,
            features: freshProductData.features || args.productData.features,
            specifications: freshProductData.specifications || args.productData.specifications,
            keywords: freshProductData.keywords || args.productData.keywords,
            brandInfo: freshProductData.brandInfo || args.productData.brandInfo,
            // PRESERVE Enhanced Product Node metadata from Canvas
            productName: args.productData.productName,
            keyFeatures: args.productData.keyFeatures,
            targetKeywords: args.productData.targetKeywords,
            targetAudience: args.productData.targetAudience,
          };
          console.log(`Using fresh product data for ${args.agentType} generation with enhanced metadata`);
        }
      }
      // Log data availability for title generation
      if (args.agentType === 'title') {
        console.log(`[Title Agent] Data availability:`, {
          // Product Node data (PRIORITY)
          hasProductName: !!productData.productName,
          productName: productData.productName,
          hasKeyFeatures: !!productData.keyFeatures,
          keyFeatures: productData.keyFeatures,
          hasTargetKeywords: !!productData.targetKeywords,
          targetKeywords: productData.targetKeywords,
          hasProductTargetAudience: !!productData.targetAudience,
          productTargetAudience: productData.targetAudience,
          // Brand Kit data (PRIORITY)
          hasBrandKit: !!args.brandKitData,
          brandKitData: args.brandKitData,
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
      }

      const prompt = buildHackathonPrompt(
        args.agentType,
        productData, // Use the fresh product data
        args.connectedAgentOutputs,
        args.profileData,
        args.brandKitData
      );

      // DEBUG: Log the exact prompt being sent to AI for title generation
      if (args.agentType === 'title') {
        console.log(`[Title Agent] EXACT PROMPT BEING SENT TO AI:`);
        console.log(`--- PROMPT START ---`);
        console.log(prompt);
        console.log(`--- PROMPT END ---`);
      }

      // Log if generating without features
      if (!productData.features?.length) {
        console.log(`Generating ${args.agentType} without product features - using title only`);
      }

      // Optimize generation parameters based on content type
      const generationParams = {
        title: { temperature: 0.8, maxTokens: 100 },      // More creative titles
        description: { temperature: 0.7, maxTokens: 150 }, // Concise 2-line benefits
        thumbnail: { temperature: 0.9, maxTokens: 400 },   // Very creative visuals
        tweets: { temperature: 0.8, maxTokens: 200 },      // Simple 2-tweet format
      };

      const params = generationParams[args.agentType as keyof typeof generationParams] 
        || { temperature: 0.7, maxTokens: 300 };

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4o"),  // Upgrade to better model for quality
        system: getSystemPrompt(args.agentType),
        prompt,
        temperature: params.temperature,
        maxTokens: params.maxTokens,
      });

      return { content: generatedContent, prompt };
    } catch (error) {
      console.error("Error generating content:", error);
      throw error;
    }
  },
});

function getSystemPrompt(agentType: string): string {
  const prompts = {
    title: `Act like a professional Amazon product copywriter with expertise in Amazon SEO, specifically for the U.S. marketplace. Your role is to craft highly optimized, compliant product titles that improve search visibility and attract clicks while adhering to Amazon's strict formatting guidelines.

Your task is to write an optimized Amazon product title based on specific product attributes. This title must be concise, informative, and SEO-enhanced without keyword stuffing or non-compliant claims.

Objective:  
Create a one-sentence Amazon product title that is compelling, clear, and formatted in Title Case. The title must meet Amazon's 2025 guidelines for length, content, and clarity. It should balance keyword inclusion with natural readability, targeting both Amazon's algorithm and customer engagement.

Step-by-Step Instructions:
1. Start with the **Brand Name** (if provided), followed by the **Product Name**.
2. Immediately include **high-value keywords** near the beginning for optimal SEO placement.
3. Only use features that are provided. Naturally incorporate them (like size, material, quantity, color, or use case) — but do not invent or assume anything not explicitly listed.
4. Ensure **clarity and readability**: the title must make immediate sense to a shopper unfamiliar with the product. Avoid any repetition of words more than twice.
5. Match the writing style to the selected **Brand Tone of Voice** and speak directly to the **Target Audience's** mindset. A luxurious tone might be elegant and refined. A playful tone might use friendly, light language. Adjust the word choice and energy accordingly, without sacrificing clarity or professionalism.
6. Comply with **Amazon Title Formatting Rules**:
   - Length between 80–120 characters (max 200).
   - Use Title Case (capitalize principal words).
   - Use numerals for numbers (e.g., 5 instead of five).
   - Avoid all prohibited symbols: !, $, %, #, etc.
   - No promotional or subjective language (e.g., "Best", "Top-rated", "#1", "Affordable").
   - No all-caps words.
   - If helpful for clarity, use an em-dash (—) to separate keyword clusters or benefits.

Example Outputs for Tone Reference:
- **Luxurious:** LumaGlow Hydrating Face Mist – Rose Water & Aloe Spray for Instant Refresh, Travel Size Facial Toner for Glowing Skin  
- **Rugged:** BrewMate Manual Coffee Grinder – Portable Stainless Steel Burr Grinder for Camping, Travel & Fresh Brews Anywhere  
- **Playful:** BrightNest Montessori Wooden Puzzle – ABC & 123 Board Toy for Toddlers, Non-Toxic Learning Fun for Ages 3+  
- **Motivational:** CoreFlex Resistance Bands Set – 5 Levels for Home Workouts, Full-Body Training Bands with Carry Bag, Latex-Free  

Output Format:  
Return **only** the final title as a single sentence in English (US). Do not add any commentary, notes, or surrounding text. Just the product title.  
**Reminder:** Return only the title. No markdown, no formatting — just the raw string.`,

    description: `You are a master at writing compelling 2-line YouTube descriptions that focus entirely on viewer benefits.

Write EXACTLY 2 lines that tell viewers what they'll gain from watching:
- Line 1: The specific skill, knowledge, or insight they'll gain
- Line 2: The outcome or transformation they'll achieve

Rules:
- Use "You'll learn/discover/master" language
- Be specific about benefits (not vague promises)
- NO timestamps, links, hashtags, or SEO keywords
- NO "In this video" or "Watch to find out" phrases
- Maximum 80 characters per line
- Focus on VALUE, not features

Example format:
Learn how to use AI tools to write JavaScript 10x faster and debug like a pro.
You'll save hours of coding time and eliminate frustrating syntax errors forever.`,

    thumbnail: `You are a YouTube thumbnail psychology expert and visual marketing specialist. Your thumbnails consistently achieve 15%+ CTR.

ANALYZE THE VIDEO TRANSCRIPTION and create a thumbnail concept following these PROVEN PRINCIPLES:

1. VISUAL HIERARCHY:
   - One clear focal point (usually a face with strong emotion)
   - High contrast between elements
   - Rule of thirds composition
   - 2-3 visual elements maximum

2. COLOR PSYCHOLOGY:
   - YouTube Red (#FF0000) for urgency/importance
   - Bright Yellow (#FFD700) for attention/warning
   - Neon Green (#39FF14) for success/money
   - Electric Blue (#0FF0FC) for tech/future
   - White/Black for contrast

3. TEXT OVERLAY RULES:
   - Maximum 3-5 words
   - Sans-serif bold fonts (Impact, Bebas Neue)
   - Text size: readable on mobile (test at 120x90px)
   - Contrasting stroke/shadow for readability
   - Place text where it won't be covered by duration stamp

4. EMOTIONAL TRIGGERS:
   - Shock/Surprise (wide eyes, open mouth)
   - Curiosity (partially hidden elements)
   - Desire (aspirational imagery)
   - Fear/Concern (worried expressions)
   - Joy/Success (genuine smiles, celebrations)

5. COMPOSITION TECHNIQUES:
   - Use arrows/circles to direct attention
   - Before/After splits for transformations
   - Number overlays for listicles
   - "X" marks for myths/mistakes
   - Progress bars for challenges

Describe specific visual elements, exact colors (hex codes), text placement, and facial expressions based on the video content.`,

    tweets: `You are a social media expert who creates simple, effective tweet threads that drive YouTube views.

Create EXACTLY 2 tweets:

TWEET 1 (Teaser with thumbnail):
- 2 lines that tease the video content
- Create curiosity without giving everything away
- Natural, conversational tone
- NO hashtags, NO "thread 🧵" 
- Just make people want to know more
- End with: [thumbnail]

TWEET 2 (Link tweet):
- Simple and direct
- One line that promises the benefit
- Include the video link
- Format: "Here's how: [link]" or "Watch here: [link]"

Example format:
Tweet 1:
Wait, you can use AI to write JavaScript now?
This is about to save me hours of debugging... [thumbnail]

Tweet 2:
Here's how to never write a syntax error again: [link]

Keep it SIMPLE and NATURAL - like you're telling a friend about something cool.`,
  };

  return prompts[agentType as keyof typeof prompts] || prompts.title;
}

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
    
    // Add specific instructions based on agent type
    if (agentType === 'title') {
      // Use the new Amazon-focused title prompt format
      prompt += `\n🎯 PRODUCT INFORMATION FOR TITLE GENERATION:\n`;
      
      // Brand information from Brand Kit (PRIORITY)
      if (brandKitData) {
        prompt += `Brand Name: ${brandKitData.brandName}\n`;
        prompt += `Brand Tone of Voice: ${brandKitData.brandVoice}\n`;
      } else if (productData.brandInfo?.name) {
        prompt += `Brand Name: ${productData.brandInfo.name}\n`;
      } else if (profileData?.brandName) {
         prompt += `Brand Name: ${profileData.brandName}\n`;
         if (profileData.tone) {
           prompt += `Brand Tone of Voice: ${profileData.tone}\n`;
         }
       }
      
      // Product Name from ProductNode (enhanced metadata)
      if (productData.productName) {
        prompt += `Product Name: ${productData.productName}\n`;
      } else if (productData.title) {
        prompt += `Product Name: ${productData.title}\n`;
      }
      
      // Key Features from ProductNode
      if (productData.keyFeatures) {
        prompt += `Key Features: ${productData.keyFeatures}\n`;
      } else if (productData.features && productData.features.length > 0) {
        prompt += `Key Features: ${productData.features.join(', ')}\n`;
      }
      
      // Target Keywords from ProductNode
      if (productData.targetKeywords) {
        prompt += `Target Keywords: ${productData.targetKeywords}\n`;
      } else if (productData.keywords && productData.keywords.length > 0) {
        prompt += `Target Keywords: ${productData.keywords.join(', ')}\n`;
      }
      
      // Target Audience from ProductNode
      if (productData.targetAudience) {
        prompt += `Target Audience: ${productData.targetAudience}\n`;
      } else if (profileData?.targetAudience) {
        prompt += `Target Audience: ${profileData.targetAudience}\n`;
      }
      
      prompt += `\n🚀 GENERATE AN OPTIMIZED AMAZON PRODUCT TITLE:\n`;
      prompt += `Using the product information above, create a compelling Amazon product title that:\n`;
      prompt += `- Starts with the brand name and product name\n`;
      prompt += `- Incorporates the key features naturally\n`;
      prompt += `- Includes relevant target keywords for SEO\n`;
      prompt += `- Matches the specified brand voice tone\n`;
      prompt += `- Appeals to the target audience\n`;
      prompt += `- Follows all Amazon title formatting guidelines\n`;
      prompt += `- Is between 80-120 characters for optimal performance\n\n`;
      
      return prompt;
    } else if (agentType === 'description') {
      prompt += `🎯 DESCRIPTION GENERATION FOCUS:\n`;
      prompt += `- Extract ALL main points discussed in order\n`;
      prompt += `- Identify natural timestamp breaks\n`;
      prompt += `- Find quotable moments for engagement\n\n`;
    } else if (agentType === 'thumbnail') {
      prompt += `🎯 THUMBNAIL GENERATION FOCUS:\n`;
      prompt += `- Identify the most visually representable moment\n`;
      prompt += `- Find emotional peaks in the content\n`;
      prompt += `- Look for before/after, numbers, or shock value\n\n`;
    } else if (agentType === 'tweets') {
      prompt += `🎯 TWEET GENERATION FOCUS:\n`;
      prompt += `- Extract the most shareable insights\n`;
      prompt += `- Find controversial or surprising statements\n`;
      prompt += `- Identify actionable tips mentioned\n\n`;
    }
  } else {
    prompt += `⚠️ LIMITED CONTEXT MODE - No transcription available\n\n`;
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

  // Add profile data with strategic emphasis (Brand Kit takes priority)
  if (profileData) {
    prompt += "🎨 BRAND IDENTITY & AUDIENCE:\n";
    
    // Use Brand Kit data if available, otherwise use product name as brand
    if (brandKitData) {
      prompt += `Brand: ${brandKitData.brandName}\n`;
      prompt += `Brand Voice: ${brandKitData.brandVoice}\n`;
      prompt += `🎨 PRIORITY: Brand Kit data is being used - "${brandKitData.brandName}" with "${brandKitData.brandVoice}" tone!\n`;
    } else if (productData.productName) {
      prompt += `Brand: ${productData.productName}\n`;
      prompt += `Brand Voice: professional\n`;
      prompt += `🎯 Using product name as brand since no Brand Kit is connected\n`;
    } else if (profileData.brandName && profileData.brandName !== 'My Brand') {
      prompt += `Brand: ${profileData.brandName}\n`;
      if (profileData.tone) {
        prompt += `Brand Voice: ${profileData.tone}\n`;
      }
    } else {
      prompt += `Brand: Generic Product\n`;
      prompt += `Brand Voice: professional\n`;
    }
    
    prompt += `Product Category: ${profileData.productCategory}\n`;
    prompt += `Niche Authority: ${profileData.niche}\n`;
    
    if (brandKitData) {
      prompt += `IMPORTANT: All content must match the Brand Kit tone "${brandKitData.brandVoice}" consistently!\n`;
    } else if (profileData.tone) {
      prompt += `IMPORTANT: All content must match this tone consistently!\n`;
    }
    
    if (profileData.targetAudience) {
      prompt += `Target Viewer: ${profileData.targetAudience}\n`;
      prompt += `Optimization: Tailor language, references, and complexity for this audience\n`;
    }
    
    prompt += "\n💡 FINAL INSTRUCTIONS:\n";
    prompt += `- Stay true to the channel's established brand\n`;
    prompt += `- Use language that resonates with the target audience\n`;
    prompt += `- Maintain consistency with existing content style\n`;
    prompt += `- Be authentic to the creator's voice\n`;
  } else {
    prompt += "\n💡 FINAL INSTRUCTIONS:\n";
    prompt += `- Create professional, engaging content\n`;
    prompt += `- Focus on value and viewer retention\n`;
    prompt += `- Use clear, accessible language\n`;
  }

  return prompt;
}