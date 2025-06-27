import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const generateContent = action({
  args: {
    agentId: v.id("agents"),
    productData: v.optional(v.object({
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
      // Enhanced product metadata from ProductNode
      productName: v.optional(v.string()),
      keyFeatures: v.optional(v.string()),
      targetKeywords: v.optional(v.string()),
      targetAudience: v.optional(v.string()),
    })),
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
    connectedAgentOutputs: v.optional(v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    )),
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
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.runQuery(api.agents.getById, { id: args.agentId });
    if (!agent) throw new Error("Agent not found");

    try {
      const prompt = buildPrompt(
        agent.type,
        args.productData || {},
        args.connectedAgentOutputs || [],
        args.profileData,
        args.brandKitData
      );

      const { text: generatedContent } = await generateText({
        model: openai("gpt-4o-mini"),
        system: getSystemPrompt(agent.type),
        prompt,
        temperature: 0.7,
        maxTokens: agent.type === "bullet-points" ? 500 : 300,
      });

      // Update agent with generated content
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: generatedContent,
        status: "ready",
      });

      return generatedContent;
    } catch (error) {
      // Update status to error
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: agent.draft,
        status: "error",
      });
      throw error;
    }
  },
});

export const refineContent = action({
  args: {
    agentId: v.id("agents"),
    userMessage: v.string(),
    currentDraft: v.string(),
    productData: v.optional(v.object({
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
      // Enhanced product metadata from ProductNode
      productName: v.optional(v.string()),
      keyFeatures: v.optional(v.string()),
      targetKeywords: v.optional(v.string()),
      targetAudience: v.optional(v.string()),
    })),
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
    connectedAgentOutputs: v.optional(v.array(
      v.object({
        type: v.string(),
        content: v.string(),
      })
    )),
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
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const agent = await ctx.runQuery(api.agents.getById, { id: args.agentId });
    if (!agent) throw new Error("Agent not found");

    // Add user message to chat history
    await ctx.runMutation(api.agents.addChatMessage, {
      id: args.agentId,
      role: "user",
      message: args.userMessage,
    });

    try {
      // Build context with all available information
      let contextMessage = `Current draft: ${args.currentDraft}\n\n`;
      
      if (args.productData) {
        contextMessage += "Product Context:\n";
        if (args.productData.title) {
          contextMessage += `Title: ${args.productData.title}\n`;
        }
        if (args.productData.features && args.productData.features.length > 0) {
          contextMessage += `Features: ${args.productData.features.join(', ')}\n`;
        }
        if (args.productData.keywords && args.productData.keywords.length > 0) {
          contextMessage += `Keywords: ${args.productData.keywords.join(', ')}\n`;
        }
        contextMessage += "\n";
      }
      
      if (args.connectedAgentOutputs && args.connectedAgentOutputs.length > 0) {
        contextMessage += "Connected Agent Outputs:\n";
        args.connectedAgentOutputs.forEach(({ type, content }) => {
          contextMessage += `${type}: ${content}\n`;
        });
        contextMessage += "\n";
      }
      
      if (args.profileData) {
        contextMessage += "Brand Profile:\n";
        contextMessage += `Brand: ${args.profileData.brandName} (${args.profileData.niche})\n`;
        contextMessage += `Product Category: ${args.profileData.productCategory}\n`;
        if (args.profileData.tone) {
          contextMessage += `Tone: ${args.profileData.tone}\n`;
        }
        if (args.profileData.targetAudience) {
          contextMessage += `Target Audience: ${args.profileData.targetAudience}\n`;
        }
      }

      const { text: refinedContent } = await generateText({
        model: openai("gpt-4o-mini"),
        system: getSystemPrompt(agent.type),
        messages: [
          {
            role: "assistant",
            content: contextMessage,
          },
          {
            role: "user",
            content: args.userMessage,
          },
        ],
        temperature: 0.7,
        maxTokens: agent.type === "bullet-points" ? 500 : 300,
      });

      // Update agent with refined content
      await ctx.runMutation(api.agents.updateDraft, {
        id: args.agentId,
        draft: refinedContent,
        status: "ready",
      });

      // Add AI response to chat history
      await ctx.runMutation(api.agents.addChatMessage, {
        id: args.agentId,
        role: "ai",
        message: refinedContent,
      });

      return refinedContent;
    } catch (error) {
      console.error("Error refining content:", error);
      throw error;
    }
  },
});

function getSystemPrompt(agentType: string): string {
  const prompts = {
    title: "You are an expert Amazon listing title creator. Create compelling, SEO-optimized titles that maximize conversion rates while accurately representing the product. Keep titles under 200 characters and include relevant keywords.",
    "bullet-points": "You are an expert Amazon listing bullet point writer. Create compelling bullet points that highlight key benefits and features. Focus on customer value and use action-oriented language.",
    "hero-image": "You are an expert Amazon product photographer. Describe compelling hero image concepts that showcase the product professionally with clean white backgrounds and optimal positioning.",
    "lifestyle-image": "You are an expert lifestyle photographer. Create engaging lifestyle image concepts that show the product in real-world use cases and demonstrate its value to customers.",
    infographic: "You are an expert infographic designer. Create detailed concepts for product infographics that highlight key features, benefits, and specifications in a visually appealing way.",
  };

  return prompts[agentType as keyof typeof prompts] || prompts.title;
}

function buildPrompt(
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
  let promptText: string;
  
  // For title generation, use the structured prompt format
  if (agentType === 'title') {
    promptText = `Inputs (to be filled in dynamically):\n`;
    
    // Product Name from ProductNode (enhanced metadata)
    if (productData.productName) {
      promptText += `- Product Name: ${productData.productName}\n`;
    } else if (productData.title) {
      promptText += `- Product Name: ${productData.title}\n`;
    }
    
    // Key Features from ProductNode
    if (productData.keyFeatures) {
      promptText += `- Key Features: ${productData.keyFeatures}\n`;
    } else if (productData.features && productData.features.length > 0) {
      promptText += `- Key Features: ${productData.features.join(', ')}\n`;
    }
    
    // Target Keywords from ProductNode
    if (productData.targetKeywords) {
      promptText += `- Target Keywords: ${productData.targetKeywords}\n`;
    } else if (productData.keywords && productData.keywords.length > 0) {
      promptText += `- Target Keywords: ${productData.keywords.join(', ')}\n`;
    }
    
    // Target Audience from ProductNode
    if (productData.targetAudience) {
      promptText += `- Target Audience: ${productData.targetAudience}\n`;
    } else if (profileData?.targetAudience) {
      promptText += `- Target Audience: ${profileData.targetAudience}\n`;
    }
    
    // Brand information from Brand Kit
    if (brandKitData) {
      promptText += `- Brand Name: ${brandKitData.brandName}\n`;
      promptText += `- Brand Tone of Voice: ${brandKitData.brandVoice}\n`;
    } else if (productData.brandInfo?.name) {
      promptText += `- Brand Name: ${productData.brandInfo.name}\n`;
    } else if (profileData?.brandName) {
      promptText += `- Brand Name: ${profileData.brandName}\n`;
      if (profileData.tone) {
        promptText += `- Brand Tone of Voice: ${profileData.tone}\n`;
      }
    }
    
    promptText += `\n`;
    return promptText;
  }

  // For other agent types, use the original format
  promptText = `Generate ${agentType} content for an Amazon product listing.\n\n`;

  // Add product data
  if (productData.title) {
    promptText += `Product Title: ${productData.title}\n`;
  }
  if (productData.features && productData.features.length > 0) {
    promptText += `Product Features:\n`;
    productData.features.forEach((feature, index) => {
      promptText += `${index + 1}. ${feature}\n`;
    });
    promptText += `\n`;
  }
  
  if (productData.specifications) {
    promptText += `Product Specifications:\n`;
    if (productData.specifications.dimensions) {
      promptText += `- Dimensions: ${productData.specifications.dimensions}\n`;
    }
    if (productData.specifications.weight) {
      promptText += `- Weight: ${productData.specifications.weight}\n`;
    }
    if (productData.specifications.materials?.length) {
      promptText += `- Materials: ${productData.specifications.materials.join(', ')}\n`;
    }
    if (productData.specifications.color) {
      promptText += `- Color: ${productData.specifications.color}\n`;
    }
    if (productData.specifications.size) {
      promptText += `- Size: ${productData.specifications.size}\n`;
    }
    promptText += `\n`;
  }

  if (productData.keywords && productData.keywords.length > 0) {
    promptText += `Target Keywords: ${productData.keywords.join(', ')}\n\n`;
  }

  // Add connected agent outputs
  if (connectedOutputs.length > 0) {
    promptText += "Related content from other agents:\n";
    connectedOutputs.forEach(({ type, content }) => {
      promptText += `${type}: ${content}\n`;
    });
    promptText += "\n";
  }

  // Add profile data
  if (profileData) {
    promptText += "Brand Information:\n";
    promptText += `Brand Name: ${profileData.brandName}\n`;
    promptText += `Product Category: ${profileData.productCategory}\n`;
    promptText += `Niche: ${profileData.niche}\n`;
    if (profileData.tone) {
      promptText += `Tone: ${profileData.tone}\n`;
    }
    if (profileData.targetAudience) {
      promptText += `Target Audience: ${profileData.targetAudience}\n`;
    }
  }

  return promptText;
}