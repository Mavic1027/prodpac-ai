import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import OpenAI, { toFile } from "openai";

// Feature parser for Agent 2 dynamic cycling
function parseIndividualFeatures(keyFeatures: string): string[] {
  if (!keyFeatures || !keyFeatures.trim()) {
    return ['key feature'];
  }
  
  // Split on common delimiters and clean up
  return keyFeatures
    .split(/[,;•\n]/)
    .map(feature => feature.trim())
    .filter(feature => feature.length > 0 && feature.length < 200) // Reasonable feature length
    .slice(0, 10); // Limit to 10 features max for cycling
}

// Generate context-aware lifestyle scenes based on product category, audience, and feature
function generateContextAwareScene(productCategory: string, targetAudience: string, selectedFeature: string, cycleValue: number): string {
  const categoryLower = productCategory.toLowerCase();
  const audienceLower = targetAudience.toLowerCase();
  const featureLower = selectedFeature.toLowerCase();
  
  // Create feature-aware scene variations
  let sceneOptions: string[] = [];
  
  // Electronics/Tech Products
  if (categoryLower.includes('electronics') || categoryLower.includes('tech')) {
    if (featureLower.includes('wireless') || featureLower.includes('bluetooth')) {
      sceneOptions = ['workout session with wireless freedom', 'commute with hands-free convenience', 'home office without cable clutter', 'outdoor adventure staying connected'];
    } else if (featureLower.includes('waterproof') || featureLower.includes('water resistant')) {
      sceneOptions = ['rainy day outdoor activity', 'poolside relaxation', 'kitchen cooking scenario', 'bathroom morning routine'];
    } else if (featureLower.includes('battery') || featureLower.includes('long lasting')) {
      sceneOptions = ['all-day work session', 'long road trip', 'camping weekend', 'busy day running errands'];
    } else {
      sceneOptions = ['modern workspace setup', 'evening entertainment at home', 'creative project time', 'weekend tech exploration'];
    }
  }
  // Health/Fitness/Sports
  else if (categoryLower.includes('health') || categoryLower.includes('fitness') || categoryLower.includes('sports')) {
    if (featureLower.includes('lightweight') || featureLower.includes('portable')) {
      sceneOptions = ['travel workout in hotel room', 'outdoor park exercise', 'quick home workout', 'gym bag convenience'];
    } else if (featureLower.includes('durable') || featureLower.includes('strong')) {
      sceneOptions = ['intense workout session', 'outdoor rugged terrain', 'everyday wear and tear', 'challenging sports activity'];
    } else {
      sceneOptions = ['morning fitness routine', 'post-workout recovery', 'sports performance moment', 'healthy lifestyle scene'];
    }
  }
  // Beauty/Skincare
  else if (categoryLower.includes('beauty') || categoryLower.includes('skincare')) {
    if (featureLower.includes('anti-aging') || featureLower.includes('wrinkle')) {
      sceneOptions = ['morning bathroom mirror routine', 'evening skincare ritual', 'getting ready for important event', 'self-care spa moment'];
    } else if (featureLower.includes('moisturizing') || featureLower.includes('hydrating')) {
      sceneOptions = ['post-shower skincare routine', 'winter weather protection', 'after sun care moment', 'daily moisture ritual'];
    } else {
      sceneOptions = ['confident mirror moment', 'makeup application prep', 'self-care evening routine', 'morning glow-up session'];
    }
  }
  // Home/Kitchen
  else if (categoryLower.includes('home') || categoryLower.includes('kitchen')) {
    if (featureLower.includes('space saving') || featureLower.includes('compact')) {
      sceneOptions = ['small apartment kitchen', 'organized storage reveal', 'efficient meal prep', 'tidy home solution'];
    } else if (featureLower.includes('easy clean') || featureLower.includes('dishwasher safe')) {
      sceneOptions = ['post-dinner cleanup', 'busy parent quick cleaning', 'effortless maintenance moment', 'spotless kitchen pride'];
    } else {
      sceneOptions = ['family meal preparation', 'entertaining guests scene', 'cozy home cooking moment', 'kitchen efficiency showcase'];
    }
  }
  // Fashion/Clothing
  else if (categoryLower.includes('fashion') || categoryLower.includes('clothing') || categoryLower.includes('apparel')) {
    if (featureLower.includes('comfortable') || featureLower.includes('soft')) {
      sceneOptions = ['all-day wear comfort', 'relaxed weekend vibe', 'long travel day', 'work-from-home style'];
    } else if (featureLower.includes('versatile') || featureLower.includes('multi-purpose')) {
      sceneOptions = ['day-to-night transition', 'casual to formal switch', 'travel wardrobe essential', 'multiple styling options'];
    } else {
      sceneOptions = ['confident style moment', 'special occasion wear', 'everyday fashion choice', 'personal style expression'];
    }
  }
  // Generic fallback
  else {
    sceneOptions = ['authentic daily use moment', 'problem-solving scenario', 'lifestyle improvement scene', 'satisfaction demonstration moment'];
  }
  
  // Select scene based on cycle value for variety
  const sceneIndex = cycleValue % sceneOptions.length;
  return sceneOptions[sceneIndex];
}

// Generate model variation for demographic diversity
function generateModelVariation(targetAudience: string, cycleValue: number): string {
  const audienceLower = targetAudience.toLowerCase();
  
  // Base demographic options that cycle through
  const demographicVariations = [
    'diverse young adult',
    'middle-aged professional',
    'energetic millennial',
    'confident Gen Z',
    'experienced mature adult',
    'active lifestyle enthusiast',
    'busy working parent',
    'health-conscious individual'
  ];
  
  // Hair and appearance variations that cycle
  const appearanceVariations = [
    'with curly dark hair',
    'with straight blonde hair',
    'with natural black hair',
    'with wavy brown hair',
    'with short stylish hair',
    'with long flowing hair',
    'with trendy colored hair',
    'with classic styled hair'
  ];
  
  // Skin tone variations that cycle
  const skinToneVariations = [
    'with warm medium skin tone',
    'with fair complexion',
    'with rich dark skin tone',
    'with olive skin tone',
    'with light tan complexion',
    'with deep brown skin tone',
    'with golden skin tone',
    'with neutral complexion'
  ];
  
  // Select variations based on cycle value for diversity
  const demoIndex = cycleValue % demographicVariations.length;
  const hairIndex = (cycleValue + 1) % appearanceVariations.length;
  const skinIndex = (cycleValue + 2) % skinToneVariations.length;
  
  return `${demographicVariations[demoIndex]} ${skinToneVariations[skinIndex]} ${appearanceVariations[hairIndex]}`;
}

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
  },
  usingHeroImageBase?: boolean,
  agentInstance?: number
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
      // Extract essential data only
      const keyFeatures = productData.keyFeatures || (productData.features && productData.features.length > 0 ? productData.features.join(', ') : 'key features');
      const targetAudience = productData.targetAudience === "Custom" && productData.customTargetAudience 
        ? productData.customTargetAudience 
        : productData.targetAudience || profileData?.targetAudience || "customers";
      const productCategory = productData.productCategory || profileData?.productCategory || "products";
      const brandVoice = brandKitData?.brandVoice || 'professional';
      const currentAgentInstance = agentInstance || 1;
      
      // For Agent 2+, parse features and select one using timestamp-based cycling
      let selectedFeature = '';
      if (currentAgentInstance >= 2) {
        const individualFeatures = parseIndividualFeatures(keyFeatures);
        // Use timestamp-based cycling instead of static agentInstance for regeneration variety
        const cycleIndex = Math.floor(Date.now() / 1000) % individualFeatures.length;
        selectedFeature = individualFeatures[cycleIndex];
        console.log(`[Infographic] Timestamp-based feature cycling: ${individualFeatures.length} features, cycle index ${cycleIndex}, selected "${selectedFeature}"`);
      }
      
      // DEBUG: Log resolved values for infographic
      console.log(`[Infographic] Agent ${currentAgentInstance} - Resolved prompt values:`, {
        keyFeatures,
        targetAudience,
        productCategory,
        brandVoice,
        agentInstance: currentAgentInstance,
        selectedFeature: selectedFeature || 'N/A (Agent 1)'
      });
      
      prompt += `\n🎯 INFOGRAPHIC EDIT INSTRUCTIONS:\n\n`;
      
      // TECHNICAL REQUIREMENTS - BULLETPROOF
      prompt += `TECHNICAL REQUIREMENTS:\n`;
      prompt += `• Square (1:1) — 1024x1024 pixels\n`;
      prompt += `• Preserve original product colors exactly as shown in source image\n`;
      prompt += `• No brand names or company names visible anywhere in the image\n\n`;
      
      // AGENT 1: BENEFIT BREAKDOWN (Existing behavior)
      if (currentAgentInstance === 1) {
        console.log(`[Infographic] Using Agent 1: Benefit Breakdown`);
        
        // EDIT MISSION - Different based on image type
        if (usingHeroImageBase) {
          prompt += `BASE IMAGE TYPE:\n`;
          prompt += `You are working with a professional Amazon hero image (clean white background, studio lighting, product-focused).\n\n`;
          
          prompt += `EDIT MISSION:\n`;
          prompt += `Add compelling infographic text overlays to this existing hero image to create a conversion-focused benefit breakdown that makes ${targetAudience} want to buy immediately.\n\n`;
        } else {
          prompt += `EDIT MISSION:\n`;
          prompt += `Transform this product image into a conversion-focused infographic that makes ${targetAudience} want to buy immediately.\n\n`;
        }
        
        // WHAT TO ADD TO THE IMAGE
        if (usingHeroImageBase) {
          prompt += `ADD TEXT OVERLAYS TO HERO IMAGE:\n`;
          prompt += `• Compelling headline that speaks directly to ${targetAudience}\n`;
          prompt += `• 2-3 key benefits derived from: ${keyFeatures}\n`;
          prompt += `• Clean typography that complements the existing professional layout\n`;
          prompt += `• Relevant icons that match the specific benefits\n`;
          prompt += `• Text placement that doesn't obscure the main product\n\n`;
        } else {
          prompt += `ADD TO THE IMAGE:\n`;
          prompt += `• Compelling headline that speaks directly to ${targetAudience}\n`;
          prompt += `• 2-3 key benefits derived from: ${keyFeatures}\n`;
          prompt += `• Lifestyle scene showing ${targetAudience} naturally using this product\n`;
          prompt += `• Clean typography and professional layout\n`;
          prompt += `• Relevant icons that match the specific benefits\n\n`;
        }
      }
      // AGENT 2+: FUNCTION IN ACTION (New behavior)
      else {
        console.log(`[Infographic] Using Agent ${currentAgentInstance}: Function in Action`);
        console.log(`[Infographic] Selected feature for this instance: "${selectedFeature}"`);
        
        prompt += `AGENT TYPE: Function in Action\n`;
        prompt += `FEATURE FOCUS: ${selectedFeature}\n\n`;
        
        prompt += `EDIT MISSION:\n`;
        prompt += `Transform this product image into a lifestyle scene showing the product in authentic use, with a dynamic zoom-in callout highlighting ONE specific feature: "${selectedFeature}". Make ${targetAudience} visualize themselves using this exact feature.\n\n`;
        
        // Generate context-aware lifestyle scene and model variation using timestamp-based cycling
        const generationCycle = Math.floor(Date.now() / 1000); // Changes every second for variety
        const lifestyleScene = generateContextAwareScene(productCategory, targetAudience, selectedFeature, generationCycle);
        const modelVariation = generateModelVariation(targetAudience, generationCycle);
        
        console.log(`[Infographic] Context-aware scene: "${lifestyleScene}"`);
        console.log(`[Infographic] Model variation: "${modelVariation}"`);
        
        prompt += `LIFESTYLE SCENE TO CREATE:\n`;
        prompt += `• ${modelVariation} person naturally using the product in ${lifestyleScene}\n`;
        prompt += `• Authentic ${productCategory} usage scenario that showcases "${selectedFeature}" naturally\n`;
        prompt += `• Scene should make sense for demonstrating the "${selectedFeature}" benefit\n`;
        prompt += `• Person should look engaged and satisfied with this specific benefit\n\n`;
        
        prompt += `HEADLINE + CALLOUT DESIGN:\n`;
        prompt += `• Compelling headline that speaks directly to ${targetAudience}\n`;
        prompt += `• Zoom-in circle or callout box highlighting the "${selectedFeature}" area of the product\n`;
        prompt += `• Short, conversion-focused caption explaining this feature's benefit (max 25 words)\n`;
        prompt += `• Clean pointer/arrow connecting the feature to the callout\n`;
        prompt += `• High-contrast text that's easily readable on mobile\n\n`;
        
        prompt += `CAPTION STYLE:\n`;
        prompt += `• Focus on the immediate benefit of "${selectedFeature}" to the user's life\n`;
        prompt += `• Use ${brandVoice} tone but keep it conversational and specific to this feature\n`;
        prompt += `• Answer: "Why does this specific feature matter to me?"\n`;
        prompt += `• Example format: "${selectedFeature}: [benefit in 5-8 words]"\n\n`;
      }
      
      // STYLE REQUIREMENTS (shared by both agents)
      prompt += `STYLE:\n`;
      prompt += `• ${brandVoice} tone throughout all text\n`;
      prompt += `• Clean, audience-native design that feels natural to ${targetAudience} and ${productCategory}\n`;
      prompt += `• High contrast for readability\n`;
      prompt += `• Product must keep original colors - infographic should enhance, not overpower\n`;
      
      // Add SUBTLE brand colors - just accents, not dominant
      if (brandKitData?.colorPalette) {
        console.log(`[Infographic] Adding subtle brand color accents`);
        
        if (brandKitData.colorPalette.type === "preset") {
          const subtleColorMappings = {
            "Professional Blue": "subtle blue accents (#2563eb) for text highlights and small icons only",
            "Warm Earth": "subtle earth tone accents (#92400e) for text highlights and small icons only", 
            "Bold Modern": "subtle modern accents (#1f2937) for text highlights and small icons only"
          };
          const colorScheme = subtleColorMappings[brandKitData.colorPalette.preset as keyof typeof subtleColorMappings];
          if (colorScheme) {
            prompt += `• Brand color accents: ${colorScheme}. Background should remain neutral and product-focused.\n`;
          }
        } else if (brandKitData.colorPalette.custom) {
          const { primary, secondary, accent } = brandKitData.colorPalette.custom;
          prompt += `• Brand color accents: Use ${primary} sparingly for text highlights and small icons only. Background should remain neutral and product-focused.\n`;
        }
      }
      
      prompt += `\n`;
      
      // MODEL INTEGRATION (different for each agent)
      if (currentAgentInstance === 1) {
        if (usingHeroImageBase) {
          prompt += `LAYOUT REQUIREMENTS:\n`;
          prompt += `• Work with the existing professional product presentation\n`;
          prompt += `• Add text and icons that enhance rather than compete with the product\n`;
          prompt += `• Maintain the clean, Amazon-compliant aesthetic\n`;
          prompt += `• Focus on benefit callouts and compelling copy\n\n`;
        } else {
          prompt += `MODEL REQUIREMENTS:\n`;
          prompt += `• Show person naturally wearing/using the actual product from the image\n`;
          prompt += `• Person should look like they belong in ${targetAudience} demographic\n`;
          prompt += `• Natural integration - not pasted on top\n`;
          prompt += `• Authentic ${productCategory} usage scenario\n\n`;
        }
        
        if (usingHeroImageBase) {
          prompt += `FINAL RESULT: Hero image enhanced with compelling benefit callouts that stop scrolling and drive conversions.\n\n`;
        } else {
          prompt += `FINAL RESULT: Professional infographic that stops scrolling and drives conversions.\n\n`;
        }
      } else {
        prompt += `LIFESTYLE INTEGRATION REQUIREMENTS:\n`;
        prompt += `• Person should naturally demonstrate the "${selectedFeature}" through their usage\n`;
        prompt += `• Authentic body language showing satisfaction with this specific benefit\n`;
        prompt += `• Scene should make ${targetAudience} think "I need that feature in my life"\n`;
        prompt += `• Natural lighting and setting appropriate for the product category\n\n`;
        
        prompt += `FINAL RESULT: Lifestyle scene with focused feature callout that answers one specific buyer question and drives immediate conversions.\n\n`;
      }
      
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

// Enhanced conflict resolution function for infographic chat - handles ANY user instruction
function resolveInfographicConflicts(basePrompt: string, userInstructions: string): string {
  if (!userInstructions.trim()) return basePrompt;
  
  let resolvedPrompt = basePrompt;
  const userLower = userInstructions.toLowerCase();
  console.log(`[Infographic] Processing user instruction: "${userInstructions}"`);
  
  // Track replacements made
  const replacements = [];
  
  // 1. PERSON/MODEL CHANGES - Like "woman in her 20s", "professional man", "teenager"
  const personKeywords = ['person', 'model', 'woman', 'man', 'mom', 'dad', 'teen', 'teenager', 'professional', 'athlete', 'student', 'young', 'old', 'elderly', 'senior'];
  const personMatch = personKeywords.find(keyword => userLower.includes(keyword));
  if (personMatch) {
    let newAudience = '';
    
    // Extract age/demographic info
    if (userLower.includes('20s') || userLower.includes('twenties')) {
      newAudience = userLower.includes('woman') ? 'young women in their 20s' : 'young adults in their 20s';
    } else if (userLower.includes('30s') || userLower.includes('thirties')) {
      newAudience = userLower.includes('woman') ? 'women in their 30s' : 'adults in their 30s';
    } else if (userLower.includes('teen') || userLower.includes('teenager')) {
      newAudience = 'teenagers (16-19)';
    } else if (userLower.includes('professional')) {
      newAudience = 'professional adults (25-45)';
    } else if (userLower.includes('senior') || userLower.includes('elderly')) {
      newAudience = 'senior adults (60+)';
    } else if (userLower.includes('mom') || userLower.includes('mother')) {
      newAudience = 'moms (30s-40s)';
    } else {
      // Use the exact description from user
      newAudience = userInstructions.match(/(?:woman|man|person|model)\s+[^,\n.]*/i)?.[0] || personMatch;
    }
    
    // Replace target audience in multiple places (fixed regex patterns to be more precise)
    resolvedPrompt = resolvedPrompt.replace(
      /makes ([^}]+?) want to buy immediately/g,
      `makes ${newAudience} want to buy immediately`
    );
    resolvedPrompt = resolvedPrompt.replace(
      /speaks directly to ([^}\n]+?)(\n|$)/g,
      `speaks directly to ${newAudience}$2`
    );
    resolvedPrompt = resolvedPrompt.replace(
      /showing ([^}]+?) naturally using this product/g,
      `showing ${newAudience} naturally using this product`
    );
    resolvedPrompt = resolvedPrompt.replace(
      /Person should look like they belong in ([^}]+?) demographic/g,
      `Person should look like they belong in ${newAudience} demographic`
    );
    
    replacements.push(`person/model → ${newAudience}`);
  }
  
  // 2. COLOR CHANGES - Like "make it more colorful", "use blue colors", "darker theme"
  const colorKeywords = ['color', 'blue', 'red', 'green', 'orange', 'purple', 'yellow', 'pink', 'bright', 'dark', 'colorful', 'vibrant'];
  const colorMatch = colorKeywords.find(keyword => userLower.includes(keyword));
  if (colorMatch) {
    let colorInstruction = '';
    
    if (userLower.includes('bright') || userLower.includes('colorful') || userLower.includes('vibrant')) {
      colorInstruction = 'vibrant, eye-catching colors with high energy';
    } else if (userLower.includes('dark') || userLower.includes('darker')) {
      colorInstruction = 'darker color scheme with deep, professional tones';
    } else if (userLower.includes('blue')) {
      colorInstruction = 'blue-focused color scheme with professional blues and whites';
    } else if (userLower.includes('warm')) {
      colorInstruction = 'warm color palette with oranges, reds, and earth tones';
    } else {
      // Extract color instruction from user message
      colorInstruction = userInstructions.match(/[^.]*color[^.]*/i)?.[0] || `${colorMatch} color scheme`;
    }
    
    // Replace background color instructions (fixed regex to be more precise)
    resolvedPrompt = resolvedPrompt.replace(
      /• Background colors can use brand palette, but product must keep original colors([^\n]*)/g,
      `• Background colors: ${colorInstruction}, but product must keep original colors$1`
    );
    
    replacements.push(`colors → ${colorInstruction}`);
  }
  
  // 3. SCENE/SETTING CHANGES - Like "office setting", "outdoor scene", "at home"
  const sceneKeywords = ['scene', 'setting', 'environment', 'background', 'office', 'home', 'outdoor', 'gym', 'kitchen', 'park', 'beach'];
  const sceneMatch = sceneKeywords.find(keyword => userLower.includes(keyword));
  if (sceneMatch) {
    let sceneInstruction = '';
    
    if (userLower.includes('office')) {
      sceneInstruction = 'professional office environment with clean, modern workspace';
    } else if (userLower.includes('home') || userLower.includes('house')) {
      sceneInstruction = 'comfortable home environment with personal touches';
    } else if (userLower.includes('outdoor') || userLower.includes('outside')) {
      sceneInstruction = 'outdoor setting with natural lighting and environment';
    } else if (userLower.includes('gym') || userLower.includes('fitness')) {
      sceneInstruction = 'fitness/gym environment with exercise equipment';
    } else {
      // Use exact scene description from user
      sceneInstruction = userInstructions.match(/[^.]*(?:scene|setting|environment)[^.]*/i)?.[0] || `${sceneMatch} setting`;
    }
    
    // Replace lifestyle scene instruction (fixed regex to be more precise)
    resolvedPrompt = resolvedPrompt.replace(
      /• Lifestyle scene showing ([^}]+?) naturally using this product/g,
      `• Lifestyle scene: ${sceneInstruction} showing person naturally using this product`
    );
    
    replacements.push(`scene → ${sceneInstruction}`);
  }
  
  // 4. CONTENT/CALLOUT CHANGES - Like "add size info", "highlight benefits", "show features"
  const contentKeywords = ['callout', 'text', 'headline', 'benefit', 'feature', 'size', 'dimension', 'highlight', 'emphasize', 'focus'];
  const contentMatch = contentKeywords.find(keyword => userLower.includes(keyword));
  if (contentMatch) {
    let contentInstruction = '';
    
    if (userLower.includes('benefit')) {
      contentInstruction = 'key benefits and value propositions';
    } else if (userLower.includes('size') || userLower.includes('dimension')) {
      contentInstruction = 'size information and dimensional details';
    } else if (userLower.includes('feature')) {
      contentInstruction = 'product features and functionality';
    } else if (userLower.includes('headline')) {
      contentInstruction = 'compelling headline and primary messaging';
    } else {
      // Extract content focus from user message
      contentInstruction = userInstructions.match(/[^.]*(?:callout|text|highlight)[^.]*/i)?.[0] || `${contentMatch} content`;
    }
    
    // Replace content focus
    resolvedPrompt = resolvedPrompt.replace(
      /• 2-3 key benefits derived from: [^}]+/g,
      `• Focus on ${contentInstruction} derived from product features`
    );
    
    replacements.push(`content focus → ${contentInstruction}`);
  }
  
  // 5. STYLE CHANGES - Like "more modern", "minimalist", "bold design"
  const styleKeywords = ['style', 'design', 'modern', 'minimalist', 'bold', 'clean', 'elegant', 'professional', 'casual'];
  const styleMatch = styleKeywords.find(keyword => userLower.includes(keyword));
  if (styleMatch) {
    let styleInstruction = '';
    
    if (userLower.includes('modern')) {
      styleInstruction = 'modern, contemporary design with clean lines';
    } else if (userLower.includes('minimalist')) {
      styleInstruction = 'minimalist design with lots of white space and simple elements';
    } else if (userLower.includes('bold')) {
      styleInstruction = 'bold, high-impact design with strong visual elements';
    } else if (userLower.includes('elegant')) {
      styleInstruction = 'elegant, sophisticated design with refined aesthetics';
    } else {
      styleInstruction = userInstructions.match(/[^.]*(?:style|design)[^.]*/i)?.[0] || `${styleMatch} design approach`;
    }
    
    // Replace design aesthetic
    resolvedPrompt = resolvedPrompt.replace(
      /• Magazine-quality design aesthetic/g,
      `• ${styleInstruction} with high-quality aesthetic`
    );
    
    replacements.push(`style → ${styleInstruction}`);
  }
  
  // Log what replacements were made
  if (replacements.length > 0) {
    console.log(`[Infographic] Applied smart replacements:`, replacements);
  } else {
    console.log(`[Infographic] No specific patterns detected, will use as general context`);
  }
  
  return resolvedPrompt;
}

// Add simplified hook-focused prompt variation function
function applyInfographicPromptVariations(basePrompt: string, agentInstance: number, productData: any, profileData: any, brandKitData?: any, selectedFeature?: string): string {
  console.log(`[Infographic] Applying hook-focused prompt variations for agent instance ${agentInstance}`);
  
  // Extract product context for intelligent variations
  const targetAudience = productData.targetAudience === "Custom" && productData.customTargetAudience 
    ? productData.customTargetAudience 
    : productData.targetAudience || profileData?.targetAudience || "general customers";
  
  const productCategory = productData.productCategory || profileData?.productCategory || "General Products";
  const keyFeatures = productData.keyFeatures || (productData.features && productData.features.length > 0 ? productData.features.join(', ') : 'key features');
  
  console.log(`[Infographic] Product context: Category=${productCategory}, Audience=${targetAudience}, Features=${keyFeatures}`);
  
  // Simplified hook types focused ONLY on headline generation
  type HookVariationConfig = {
    type: string;
    hookStyle: string;
    characterLimit: number;
  };
  
  // Detect specific product categories for targeted hook styles
  const categoryLower = productCategory.toLowerCase();
  const audienceLower = targetAudience.toLowerCase();
  
  let variations: { [key: number]: HookVariationConfig } = {};
  
  // Category-specific hook variations - SIMPLE AND FOCUSED
  if (categoryLower.includes('electronics') || categoryLower.includes('tech')) {
    variations = {
      1: { type: "Performance Hook", hookStyle: "performance benefit that saves time or improves results", characterLimit: 40 },
      2: { type: "Compatibility Hook", hookStyle: "compatibility or ease-of-use advantage", characterLimit: 35 },
      3: { type: "Innovation Hook", hookStyle: "cutting-edge feature that sets it apart", characterLimit: 40 },
      4: { type: "Value Hook", hookStyle: "value proposition vs expensive alternatives", characterLimit: 35 }
    };
  }
  else if (categoryLower.includes('home') || categoryLower.includes('kitchen')) {
    variations = {
      1: { type: "Convenience Hook", hookStyle: "time-saving or convenience benefit for busy lives", characterLimit: 40 },
      2: { type: "Quality Hook", hookStyle: "quality or durability advantage", characterLimit: 35 },
      3: { type: "Versatility Hook", hookStyle: "multiple uses or versatility", characterLimit: 40 },
      4: { type: "Space Hook", hookStyle: "space-saving or organization benefit", characterLimit: 35 }
    };
  }
  else if (categoryLower.includes('health') || categoryLower.includes('fitness') || categoryLower.includes('sports')) {
    variations = {
      1: { type: "Performance Hook", hookStyle: "performance improvement or fitness goal", characterLimit: 40 },
      2: { type: "Motivation Hook", hookStyle: "motivational or confidence-building message", characterLimit: 35 },
      3: { type: "Results Hook", hookStyle: "visible results or transformation", characterLimit: 40 },
      4: { type: "Ease Hook", hookStyle: "ease of use or accessibility for all levels", characterLimit: 35 }
    };
  }
  else if (categoryLower.includes('beauty') || categoryLower.includes('skincare')) {
    variations = {
      1: { type: "Transformation Hook", hookStyle: "beauty transformation or skin improvement", characterLimit: 40 },
      2: { type: "Confidence Hook", hookStyle: "confidence-boosting or self-care message", characterLimit: 35 },
      3: { type: "Natural Hook", hookStyle: "natural ingredients or gentle care", characterLimit: 40 },
      4: { type: "Results Hook", hookStyle: "visible results or anti-aging benefit", characterLimit: 35 }
    };
  }
  // Generic fallback - simple and effective
  else {
    variations = {
      1: { type: "Benefit Hook", hookStyle: "primary benefit that transforms daily life", characterLimit: 40 },
      2: { type: "Problem-Solution Hook", hookStyle: "solution to a common frustration", characterLimit: 35 },
      3: { type: "Quality Hook", hookStyle: "superior quality or craftsmanship", characterLimit: 40 },
      4: { type: "Value Hook", hookStyle: "exceptional value or smart choice", characterLimit: 35 }
    };
  }
  
  // Apply the variation based on agent instance
  const variation = variations[agentInstance as keyof typeof variations] || variations[1];
  
  let modifiedPrompt = basePrompt;
  
  // CRITICAL FIX: Replace the lazy headline instruction with focused hook generation
  console.log(`[Infographic] Generating ${variation.type} for ${targetAudience} (max ${variation.characterLimit} chars)`);
  
  // Feature-specific hook generation for Agent 2+
  if (agentInstance >= 2 && selectedFeature) {
    console.log(`[Infographic] Generating feature-specific hook for "${selectedFeature}"`);
    // Replace the headline instruction with feature-focused hook generation
    modifiedPrompt = modifiedPrompt.replace(
      /• Compelling headline that speaks directly to [^}\n]+/g,
      `• Create a ${variation.type} (${variation.characterLimit} characters max): Write a ${variation.hookStyle} specifically about "${selectedFeature}" for ${targetAudience}. Focus on WHY this specific feature matters to them. Keep it short, punchy, and native to the ${productCategory} world. NO demographic labels - focus on the feature's aspiration and benefit.`
    );
  } else {
    // Original hook generation for Agent 1
    modifiedPrompt = modifiedPrompt.replace(
      /• Compelling headline that speaks directly to [^}\n]+/g,
      `• Create a ${variation.type} (${variation.characterLimit} characters max): Write a ${variation.hookStyle} specifically for ${targetAudience}. Keep it short, punchy, and native to the ${productCategory} world. NO demographic labels - focus on aspiration and benefit.`
    );
  }
  
  console.log(`[Infographic] Applied ${variation.type} variation with ${variation.characterLimit} character limit`);
  
  return modifiedPrompt;
}



export const generateInfographic = action({
  args: {
    agentType: v.literal("infographic"),
    agentInstance: v.optional(v.number()),
    agentId: v.optional(v.id("agents")),
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
    additionalContext: v.optional(v.string()),
    usingHeroImageBase: v.optional(v.boolean()), // NEW: Indicates if using hero image as base
    templateId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ concept: string; imageUrl: string; prompt?: string; storageId?: string }> => {
    console.log("[Infographic] Starting infographic generation process");
    console.log("[Infographic] Args received:", {
      agentType: args.agentType,
      agentInstance: args.agentInstance,
      productId: args.productId,
      imageCount: args.productImages.length,
      hasProductName: !!args.productData.productName,
      hasKeyFeatures: !!args.productData.keyFeatures,
      hasFeatures: !!args.productData.features?.length,
      hasProfile: !!args.profileData,
      hasBrandKit: !!args.brandKitData,
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
        hasCustomTargetAudience: !!productData.customTargetAudience,
        customTargetAudience: productData.customTargetAudience,
        hasProductCategory: !!productData.productCategory,
        productCategory: productData.productCategory,
        // Legacy database features (fallback)
        hasDatabaseFeatures: !!productData.features?.length,
        databaseFeaturesCount: productData.features?.length || 0,
        // Connected agents
        hasConnectedAgents: args.connectedAgentOutputs.length > 0,
        // Profile data (fallback only)
        hasProfile: !!args.profileData,
        profileProductCategory: args.profileData?.productCategory || null,
        profileTargetAudience: args.profileData?.targetAudience || null,
        // Brand Kit data (NEW)
        hasBrandKit: !!args.brandKitData,
        brandKitName: args.brandKitData?.brandName || null,
        brandKitVoice: args.brandKitData?.brandVoice || null,
        brandKitColorType: args.brandKitData?.colorPalette?.type || null,
      });

      // Validate we have a product image for reference
      if (!args.productImages || args.productImages.length === 0) {
        throw new Error("No product images provided. Please connect to a Product Image Node with uploaded images.");
      }

      // Template registry (full set with lean builders)
      const templates: Record<string, { label: string; purpose: string; requires: string[]; builder: (ctx: { productData: any; profileData: any; brandKitData: any; leverSeed: number; }) => string } > = {
        main_benefit: {
          label: "Main Benefit",
          purpose: "Instant #1 reason to buy in <1s",
          requires: [],
          builder: ({ productData, profileData, brandKitData, leverSeed }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const featuresArr = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);
            const topFeature = featuresArr[0] || 'a clear primary benefit';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const brandVoice = brandKitData?.brandVoice;
            const angles = ['0°', '15°', '30°'];
            const backgrounds = ['soft gradient', 'neutral texture', 'clean studio'];
            const callouts = ['icon + label', 'line + label'];
            const angle = angles[leverSeed % angles.length];
            const background = backgrounds[leverSeed % backgrounds.length];
            const calloutStyle = callouts[leverSeed % callouts.length];
            const voiceLine = brandVoice ? `; one short headline (3–4 words) in ${brandVoice}` : '';
            const colorLine = brandKitData?.colorPalette ? `• Background minimal; use brand accents only (never dominant)` : '• Background minimal; keep accents subtle if any';
            return (
`System: Act as an Amazon art director. Generate a clean infographic image (not a poster).
User:
Create a MAIN BENEFIT image for a ${subject} for ${audience}.
• Show one unmistakable proof of the top benefit: ${topFeature}
• Large product, crisp edges, photoreal lighting${voiceLine}
${colorLine}
Vary by seed: angle ${angle}, composition (center/off-center), callout style ${calloutStyle}, background ${background}
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        feature_callouts: {
          label: "Feature Callouts (3–5)",
          purpose: "Highlight 3–5 key features",
          requires: [],
          builder: ({ productData, profileData, brandKitData, leverSeed }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const raw = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);
            const features3 = raw.slice(0, 3).join(', ');
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const brandVoice = brandKitData?.brandVoice;
            const layout = ['grid', 'radial', 'stacked'][leverSeed % 3];
            const voiceLine = brandVoice ? `; tone ${brandVoice}` : '';
            return (
`System: Design a clean, scannable callout layout for mobile.
User:
Create FEATURE CALLOUTS for a ${subject} for ${audience}.
• 3–5 concise callouts from: ${features3}
• Large labels, consistent icons; no body text
• Neutral background; balanced spacing; pro typography${voiceLine}
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        size_chart: {
          label: "Size / Dimensions",
          purpose: "Answer size/fit objections",
          requires: ['dimensions'],
          builder: ({ productData }) => {
            const dims = productData.specifications?.dimensions || 'dimensions';
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Design a readable size diagram for Amazon mobile.
User:
Create a SIZE DIAGRAM for a ${subject} showing ${dims}.
• White/neutral background; product ~75–80% of frame
• Clean lines + arrows; large labels; no paragraphs
• Add in‑hand/common‑object reference if helpful
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        whats_included: {
          label: "What’s Included",
          purpose: "Show package contents",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Lay out package contents clearly and credibly.
User:
Create a WHAT’S INCLUDED image for a ${subject}.
• Show each included item distinctly with a short label
• Consistent lighting; neutral background; no clutter
• Optional micro note per item (≤3–5 words); no body text
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        comparison: {
          label: "Comparison",
          purpose: "You vs. Alt / Gen1 vs. Gen2",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Build a scannable comparison chart that reads at a glance.
User:
Create a COMPARISON chart for a ${subject} vs alternative.
• 3–5 rows; one benefit per row (short phrases)
• “Ours” vs “Theirs” with clear check/neutral markers
• Strong contrast, generous spacing; no paragraphs
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        materials: {
          label: "Material/Ingredients",
          purpose: "Show materials or ingredients",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const materials = productData.specifications?.materials?.join(', ') || 'key materials';
            return (
`System: Visualize materials/ingredients credibly and clearly.
User:
Create a MATERIALS/INGREDIENTS image for a ${subject}, featuring: ${materials}.
• Macro detail crops or clean icons; minimal labels
• Neutral background; honest color; no exaggeration
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        use_cases: {
          label: "Use Cases",
          purpose: "Grid of scenarios",
          requires: [],
          builder: ({ productData, profileData, leverSeed }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const grid = ['2x2', '3x2'][leverSeed % 2];
            return (
`System: Show realistic, value-focused scenarios that feel native to the audience.
User:
Create a USE CASES grid (${grid}) for a ${subject} for ${audience}.
• One clear scenario label per cell; minimal copy
• Consistent look across cells; mobile-first contrast
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        before_after: {
          label: "Before/After",
          purpose: "Show relevant transformation",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Present a credible transformation; avoid exaggerated claims.
User:
Create a BEFORE/AFTER image for a ${subject} demonstrating a realistic, quantifiable improvement (derive metric from product context).
• Clear split (left/right or top/bottom); large labels
• Realistic lighting and texture; no unrealistic edits
• Short phrases only; legible on mobile
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        tech_exploded: {
          label: "Tech Exploded",
          purpose: "Components exploded view",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Build an exploded view that’s easy to scan.
User:
Create a TECH EXPLODED diagram for a ${subject}.
• Separate key components with lines + labels (4–6 items)
• Balanced spacing; neutral background; crisp edges
• Minimal text; no paragraphs
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
        compatibility: {
          label: "Compatibility Guide",
          purpose: "Show what it works with",
          requires: [],
          builder: ({ productData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            return (
`System: Present compatibility info compactly and clearly.
User:
Create a COMPATIBILITY GUIDE for a ${subject}, deriving common compatible devices/sizes from context (e.g., “compatible with most adult head sizes”, “works with iPhone/Android/USB‑C”).
• Logical groups; large labels; consistent icons
• No dense copy; short scannable lines
• Neutral background; strong contrast
Technical Specifications: High-resolution image at 300 DPI for clear detail.
Dimensions: Optimized for online listings at 2000×2000 pixels.`);
          }
        },
      };

      const useTemplate = !!args.templateId && templates[args.templateId!];
      const leverSeed = Math.max(1, (args.agentInstance || 1));

      let infographicPrompt: string;
      if (useTemplate) {
        console.log(`[Infographic] Using template: ${args.templateId}`);
        // Requirement checks
        const requires = templates[args.templateId!].requires || [];
        if (requires.includes('dimensions') && !productData.specifications?.dimensions) {
          throw new Error("Add dimensions in Product node to unlock Size / Dimensions template.");
        }
        infographicPrompt = templates[args.templateId!].builder({
          productData,
          profileData: args.profileData,
          brandKitData: args.brandKitData,
          leverSeed,
        });
      } else {
        // Fallback to existing logic
      console.log("[Infographic] Building infographic prompt using proven logic with Brand Kit integration");
      console.log("[Infographic] Using hero image base:", !!args.usingHeroImageBase);
        infographicPrompt = buildHackathonPrompt(
        'infographic',
        productData,
        args.connectedAgentOutputs,
        args.profileData,
        args.brandKitData,
        args.usingHeroImageBase,
        args.agentInstance
      );

        // Sophisticated variations only in fallback mode
        let selectedFeatureForHook = '';
        const currentAgentInstance = args.agentInstance || 1;
        if (currentAgentInstance >= 2) {
          const keyFeatures = productData.keyFeatures || (productData.features && productData.features.length > 0 ? productData.features.join(', ') : 'key features');
          const individualFeatures = parseIndividualFeatures(keyFeatures);
          const cycleIndex = Math.floor(Date.now() / 1000) % individualFeatures.length;
          selectedFeatureForHook = individualFeatures[cycleIndex];
          console.log(`[Infographic] Selected feature for hook generation (timestamp cycle ${cycleIndex}): "${selectedFeatureForHook}"`);
        }
        infographicPrompt = applyInfographicPromptVariations(
          infographicPrompt,
          currentAgentInstance,
          productData,
          args.profileData,
          args.brandKitData,
          selectedFeatureForHook
        );
      }

      // RE-ENABLED: Sophisticated Hook Generation System for compelling storytelling
      console.log("[Infographic] Applying sophisticated prompt variations for compelling hooks and storytelling");
      
      // Calculate selected feature for Agent 2+ hook generation using timestamp-based cycling
      let selectedFeatureForHook = '';
      const currentAgentInstance = args.agentInstance || 1;
      if (currentAgentInstance >= 2) {
        const keyFeatures = productData.keyFeatures || (productData.features && productData.features.length > 0 ? productData.features.join(', ') : 'key features');
        const individualFeatures = parseIndividualFeatures(keyFeatures);
        // Use same timestamp-based cycling for consistency
        const cycleIndex = Math.floor(Date.now() / 1000) % individualFeatures.length;
        selectedFeatureForHook = individualFeatures[cycleIndex];
        console.log(`[Infographic] Selected feature for hook generation (timestamp cycle ${cycleIndex}): "${selectedFeatureForHook}"`);
      }
      
      // Apply the sophisticated variation system that creates emotional headlines
      infographicPrompt = applyInfographicPromptVariations(
        infographicPrompt,
        currentAgentInstance,
        productData,
        args.profileData,
        args.brandKitData,
        selectedFeatureForHook
      );



      // Smart user instructions handling with intelligent conflict resolution (like Lifestyle Agent)
      if (args.additionalContext && args.additionalContext.trim()) {
        console.log("[Infographic] Adding user-specific instructions:", args.additionalContext);
        console.log("[Infographic] Original prompt length before conflict resolution:", infographicPrompt.length);
        console.log("[Infographic] Resolving prompt conflicts with user instructions...");
        
        // Apply smart conflict resolution that replaces specific prompt parts intelligently
        const originalPrompt = infographicPrompt;
        infographicPrompt = resolveInfographicConflicts(infographicPrompt, args.additionalContext);
        
        console.log("[Infographic] Prompt length after conflict resolution:", infographicPrompt.length);
        console.log("[Infographic] Prompt modified?", originalPrompt !== infographicPrompt);
        
        // Always add user context for clarity, but preserve all the structured content
        infographicPrompt += `\n\n🎯 USER CONTEXT: User requested "${args.additionalContext}" - this has been intelligently integrated into the prompt above.`;
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
        // Note: size parameter not supported in images.edit, must rely on prompt instructions
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
      
      console.log("[Infographic] Streamlined infographic generation completed successfully");
      
      const conceptMessage = args.usingHeroImageBase 
        ? "Professional benefit breakdown created by adding compelling text overlays to your Hero Image Designer 1 - leveraging the existing clean design with conversion-focused callouts"
        : "Professional Amazon infographic created by transforming your uploaded product image with gpt-image-1 - designed with perfect square format and accurate product colors";
        
      return {
        concept: conceptMessage,
        imageUrl: finalUrl,
        prompt: infographicPrompt,
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