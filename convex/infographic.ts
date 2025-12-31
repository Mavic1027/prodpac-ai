import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { generateImage, resolveImageToBase64, base64ToBlob, getApiKey } from "./nanobananaPro";
import { buildInfographicPrompt, type BrandKitData } from "./promptBuilder";

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
      prompt += `• Square (1:1) — 2000×2000 pixels at 300 DPI\n`;
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
          prompt += `• Relevant icons that match the specific benefits (one consistent style)\n`;
          prompt += `• Text in the upper-right safe area, high-contrast, never covering the product\n`;
          prompt += `• Maintain photoreal lighting, realistic shadows/reflections\n`;
          prompt += `• Subtle environment cues (blurred, category-appropriate) may be added to support the story without stealing focus\n\n`;
        } else {
          prompt += `ADD TO THE IMAGE:\n`;
          prompt += `• Compelling headline that speaks directly to ${targetAudience}\n`;
          prompt += `• 2-3 key benefits derived from: ${keyFeatures}\n`;
          prompt += `• Lifestyle scene showing ${targetAudience} naturally using this product (scene tailored to product category)\n`;
          prompt += `• Clean typography and professional layout with proper margins\n`;
          prompt += `• Relevant icons that match the specific benefits (one consistent style)\n`;
          prompt += `• Text in the upper-right safe area, high-contrast, never covering the product\n`;
          prompt += `• Maintain photoreal lighting, realistic shadows/reflections\n\n`;
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
      prompt += `• High contrast for readability; text sits in upper-right when possible, never over key product areas\n`;
      prompt += `• Looks professionally designed, not DIY: consistent spacing/grid, aligned callouts, subtle depth-of-field\n`;
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
    brandKitData: v.optional(v.union(
      v.null(),
      v.object({
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
      })
    )),
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

    // Get nanoBanana Pro API key from Convex environment
    const apiKey = getApiKey();

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

      // Dynamic Hook Generator - Single source of truth for all headlines
      function generateDynamicHook(productData: any, profileData: any, brandKitData: any, templateType: string): {
        primaryHook: string;
        supportingLine: string;
        urgencyPhrase: string;
      } {
        const category = (productData.productCategory || profileData?.productCategory || 'product').toLowerCase();
        const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
          ? productData.customTargetAudience 
          : (productData.targetAudience || profileData?.targetAudience || 'customers');
        const audienceLower = audience.toLowerCase();
        const brandVoice = brandKitData?.brandVoice || 'professional';
        const topFeature = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/)[0] : 
          (productData.features?.[0] || 'key benefit')).trim();

        // DEBUG: Log what we're working with
        console.log(`[Infographic Hook] Category detected: "${category}"`);
        console.log(`[Infographic Hook] Top feature: "${topFeature}"`);
        console.log(`[Infographic Hook] Brand voice: "${brandVoice}"`);
        console.log(`[Infographic Hook] Audience: "${audience}"`);

        // Add randomization for variety
        const randomSeed = Math.floor(Date.now() / 1000) % 3; // Changes every second, 3 variations

        // Dynamic hook generation based on category + audience + brand voice
        let primaryHook = '';
        let supportingLine = '';
        let urgencyPhrase = '';

        // DYNAMIC HOOKS BASED ON ACTUAL BENEFITS (NOT HARDCODED)
        if (templateType === 'main_benefit') {
          // Generate hook directly from the top benefit/feature
          const featureLower = topFeature.toLowerCase();
          
          if (featureLower.includes('breathable') || featureLower.includes('mesh') || featureLower.includes('ventilat')) {
            // Audience-specific breathability hooks
            let breathabilityHooks = [];
            if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
              breathabilityHooks = [
                { hook: 'Never Sweat The Small Stuff', support: `${topFeature} That Actually Works`, urgency: 'Stay Cool From Tee To Green' },
                { hook: 'Finally, Comfort That Lasts', support: `Premium ${topFeature} Design`, urgency: 'Focus On Your Game, Not Your Hat' },
                { hook: 'All-Day Golf Comfort', support: `Advanced ${topFeature} Technology`, urgency: 'Play Better, Feel Better' }
              ];
            } else {
              breathabilityHooks = [
                { hook: 'Stay Cool Under Pressure', support: `${topFeature} That Performs`, urgency: 'Beat the Heat Every Time' },
                { hook: 'All-Day Comfort Guaranteed', support: `Premium ${topFeature} Technology`, urgency: 'Never Overheat Again' },
                { hook: 'Cool When It Counts', support: `Advanced ${topFeature} Innovation`, urgency: 'Stay Fresh Always' }
              ];
            }
            const selected = breathabilityHooks[randomSeed % breathabilityHooks.length];
            primaryHook = selected.hook;
            supportingLine = selected.support;
            urgencyPhrase = selected.urgency;
          } else if (featureLower.includes('adjustable') || featureLower.includes('fit') || featureLower.includes('size')) {
            // Audience-specific fit hooks
            let fitHooks = [];
            if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
              fitHooks = [
                { hook: 'Finally, A Hat That Actually Fits', support: `${topFeature} Just For You`, urgency: 'No More Hat Hair Drama' },
                { hook: 'Adjusts To Your Perfect Fit', support: `Smart ${topFeature} Design`, urgency: 'Comfort That Moves With You' },
                { hook: 'One Hat, Every Head Size', support: `Intelligent ${topFeature} System`, urgency: 'Never Worry About Fit Again' }
              ];
            } else {
              fitHooks = [
                { hook: 'Perfect Fit, Every Single Time', support: `Precision ${topFeature} System`, urgency: 'Find Your Comfort Zone' },
                { hook: 'Custom Comfort Made Simple', support: `Advanced ${topFeature} Design`, urgency: 'Adjust to Perfection' },
                { hook: 'One Size Actually Fits All', support: `Intelligent ${topFeature} Innovation`, urgency: 'Never Worry About Fit' }
              ];
            }
            const selected = fitHooks[randomSeed % fitHooks.length];
            primaryHook = selected.hook;
            supportingLine = selected.support;
            urgencyPhrase = selected.urgency;
          } else if (featureLower.includes('durable') || featureLower.includes('quality') || featureLower.includes('last')) {
            const durabilityHooks = [
              { hook: 'Built to Last', support: `${topFeature} Construction`, urgency: 'Buy Once, Use Forever' },
              { hook: 'Unbreakable Quality', support: `${topFeature} Engineering`, urgency: 'Never Replace Again' },
              { hook: 'Lifetime Durability', support: `${topFeature} Materials`, urgency: 'Invest in Quality' }
            ];
            const selected = durabilityHooks[randomSeed % durabilityHooks.length];
            primaryHook = selected.hook;
            supportingLine = selected.support;
            urgencyPhrase = selected.urgency;
          } else if (featureLower.includes('lightweight') || featureLower.includes('light') || featureLower.includes('comfort')) {
            const comfortHooks = [
              { hook: 'Featherlight Comfort', support: `${topFeature} Feel`, urgency: 'Forget You\'re Wearing It' },
              { hook: 'Ultimate Comfort', support: `${topFeature} Design`, urgency: 'All-Day Wearability' },
              { hook: 'Weightless Performance', support: `${topFeature} Technology`, urgency: 'Move Freely' }
            ];
            const selected = comfortHooks[randomSeed % comfortHooks.length];
            primaryHook = selected.hook;
            supportingLine = selected.support;
            urgencyPhrase = selected.urgency;
          } else {
            // Category-specific fallback if benefit doesn't match common patterns
            if (category.includes('golf')) {
              const golfHooks = [
                { hook: 'Elevate Your Game', support: `${topFeature} Advantage`, urgency: 'Play Better Golf' },
                { hook: 'Golf Excellence', support: `${topFeature} Performance`, urgency: 'Master the Course' },
                { hook: 'Pro-Level Quality', support: `${topFeature} Innovation`, urgency: 'Upgrade Your Golf' }
              ];
              const selected = golfHooks[randomSeed % golfHooks.length];
              primaryHook = selected.hook;
              supportingLine = selected.support;
              urgencyPhrase = selected.urgency;
            } else {
              // Generic benefit-based hooks
              const genericHooks = [
                { hook: 'Game-Changing Quality', support: `${topFeature} Advantage`, urgency: 'Experience the Difference' },
                { hook: 'Superior Performance', support: `${topFeature} Technology`, urgency: 'Upgrade Your Experience' },
                { hook: 'Premium Excellence', support: `${topFeature} Innovation`, urgency: 'Choose Better' }
              ];
              const selected = genericHooks[randomSeed % genericHooks.length];
              primaryHook = selected.hook;
              supportingLine = selected.support;
              urgencyPhrase = selected.urgency;
            }
          }
        } else if (templateType === 'size_chart') {
          // Generate audience-specific, conversion-focused size hooks
          let sizeHooks = [];
          
          if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
            sizeHooks = [
              { hook: 'Never Worry About Fit Again', support: 'Perfect Golf Course Confidence', urgency: 'Look Great Every Round' },
              { hook: 'Guaranteed Comfort All Day', support: 'Fits Like It Was Made For You', urgency: 'Focus On Your Game, Not Your Hat' },
              { hook: 'Skip The Sizing Stress', support: 'Know It Will Fit Before You Order', urgency: 'Confidence From First Tee to 18th' },
              { hook: 'Your Perfect Golf Hat Awaits', support: 'Exact Fit, Maximum Comfort', urgency: 'Order With Complete Confidence' }
            ];
          } else if (audienceLower.includes('golf')) {
            sizeHooks = [
              { hook: 'Precision Fit For Peak Performance', support: 'Exact Measurements, Zero Guesswork', urgency: 'Play Your Best Game' },
              { hook: 'Never Buy The Wrong Size Again', support: 'Professional Grade Fit Guide', urgency: 'Order With Confidence' },
              { hook: 'Perfect Fit, Every Single Time', support: 'Engineered For Comfort', urgency: 'Focus On Your Swing' }
            ];
          } else if (audienceLower.includes('women') || audienceLower.includes('mom')) {
            sizeHooks = [
              { hook: 'Finally, A Hat That Actually Fits', support: 'Say Goodbye To Sizing Mistakes', urgency: 'Look Amazing, Feel Confident' },
              { hook: 'Never Guess Your Size Again', support: 'Perfect Fit Guaranteed', urgency: 'Order Without The Worry' },
              { hook: 'Skip The Return Hassle', support: 'Know Your Perfect Fit Now', urgency: 'Love It From Day One' }
            ];
          } else {
            sizeHooks = [
              { hook: 'End The Sizing Guesswork Forever', support: 'Exact Fit, First Time', urgency: 'Order With Total Confidence' },
              { hook: 'Never Buy The Wrong Size Again', support: 'Precision Measurements', urgency: 'Perfect Fit Guaranteed' },
              { hook: 'Skip The Return Trip', support: 'Know It Will Fit', urgency: 'Order Risk-Free Today' }
            ];
          }
          
          const selected = sizeHooks[randomSeed % sizeHooks.length];
          primaryHook = selected.hook;
          supportingLine = selected.support;
          urgencyPhrase = selected.urgency;
        } else if (templateType === 'feature_callouts') {
          // Generate audience-specific, conversion-focused feature hooks
          let featureHooks = [];
          
          if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
            featureHooks = [
              { hook: 'Everything You Need For The Course', support: 'No More Golf Hat Struggles', urgency: 'Play With Confidence' },
              { hook: 'The Last Golf Hat You\'ll Ever Buy', support: 'Premium Features That Actually Matter', urgency: 'Upgrade Your Golf Game' },
              { hook: 'Stop Settling For Basic Hats', support: 'Get All The Features You Deserve', urgency: 'Look Good, Feel Great' },
              { hook: 'Finally, A Hat Built For Real Golfers', support: 'Every Feature Designed For You', urgency: 'Experience The Difference' }
            ];
          } else if (audienceLower.includes('golf')) {
            featureHooks = [
              { hook: 'Professional-Grade Performance', support: 'Every Feature Engineered For Golf', urgency: 'Elevate Your Game' },
              { hook: 'Why Settle For Less?', support: 'Premium Features, Unbeatable Value', urgency: 'Play Like A Pro' },
              { hook: 'Complete Performance Package', support: 'All The Features You Need', urgency: 'Dominate The Course' }
            ];
          } else if (audienceLower.includes('women') || audienceLower.includes('mom')) {
            featureHooks = [
              { hook: 'Everything You\'ve Been Looking For', support: 'Smart Features For Smart Women', urgency: 'Finally, Something Just For You' },
              { hook: 'No More Compromising', support: 'All The Features You Actually Want', urgency: 'You Deserve Better' },
              { hook: 'Designed With You In Mind', support: 'Features That Actually Matter', urgency: 'Love Every Detail' }
            ];
          } else {
            featureHooks = [
              { hook: 'Stop Settling For Basic', support: 'Premium Features You\'ll Actually Use', urgency: 'Upgrade Your Experience' },
              { hook: 'Everything You Need, Nothing You Don\'t', support: 'Smart Features, Real Benefits', urgency: 'See Why It\'s Different' },
              { hook: 'Built Different, Performs Better', support: 'Features That Actually Work', urgency: 'Experience Premium Quality' }
            ];
          }
          
          const selected = featureHooks[randomSeed % featureHooks.length];
          primaryHook = selected.hook;
          supportingLine = selected.support;
          urgencyPhrase = selected.urgency;
        } else if (templateType === 'whats_included') {
          // Generate value/completeness focused hooks
          let valueHooks = [];
          
          if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
            valueHooks = [
              { hook: 'Everything You Need, Nothing You Don\'t', support: 'Complete Golf Course Ready Package', urgency: 'Start Looking Great Today' },
              { hook: 'No Hidden Extras Required', support: 'Premium Quality, Complete Set', urgency: 'Get Everything In One Order' },
              { hook: 'Unbox & Go Confidence', support: 'Ready For The Course Right Away', urgency: 'Everything Included' },
              { hook: 'Complete Package, Incredible Value', support: 'All Premium Items Included', urgency: 'Why Buy Separately?' }
            ];
          } else if (audienceLower.includes('golf')) {
            valueHooks = [
              { hook: 'Complete Performance Package', support: 'Everything A Pro Needs', urgency: 'Get The Full Setup' },
              { hook: 'No Additional Purchases Needed', support: 'Premium Complete Solution', urgency: 'Start Playing Better Now' },
              { hook: 'Professional Grade Complete Set', support: 'Tournament Ready Package', urgency: 'Everything Included' }
            ];
          } else if (audienceLower.includes('women') || audienceLower.includes('mom')) {
            valueHooks = [
              { hook: 'Everything Included, Nothing Extra To Buy', support: 'Complete Package Just For You', urgency: 'Get It All In One Order' },
              { hook: 'No Surprises, No Hidden Costs', support: 'Premium Complete Solution', urgency: 'Everything You Need Included' },
              { hook: 'Unbox & Love It Immediately', support: 'Complete Set, Ready To Use', urgency: 'All Premium Items Included' }
            ];
          } else {
            valueHooks = [
              { hook: 'Complete Package, Incredible Value', support: 'Everything Included', urgency: 'No Additional Purchases Needed' },
              { hook: 'Unbox & Use Immediately', support: 'Premium Complete Solution', urgency: 'Get Everything In One Order' },
              { hook: 'No Hidden Extras Or Surprises', support: 'All Essential Items Included', urgency: 'Complete Value Package' }
            ];
          }
          
          const selected = valueHooks[randomSeed % valueHooks.length];
          primaryHook = selected.hook;
          supportingLine = selected.support;
          urgencyPhrase = selected.urgency;
        } else if (templateType === 'comparison') {
          // Generate superiority/advantage focused hooks
          let comparisonHooks = [];
          
          if (audienceLower.includes('mom') && (audienceLower.includes('golf') || category.includes('golf'))) {
            comparisonHooks = [
              { hook: 'Why Golf Moms Choose Us Over The Rest', support: 'Superior Quality, Better Style, Perfect Fit', urgency: 'Don\'t Settle For Less' },
              { hook: 'The Clear Winner For Golf Course Style', support: 'Premium Materials Beat Basic Caps Every Time', urgency: 'Choose The Better Option' },
              { hook: 'Not All Golf Hats Are Created Equal', support: 'See Why We\'re The Smart Choice', urgency: 'Experience The Difference' },
              { hook: 'Compare & See Why We Win', support: 'Quality That Speaks For Itself', urgency: 'Make The Right Choice' }
            ];
          } else if (audienceLower.includes('golf')) {
            comparisonHooks = [
              { hook: 'Why Golfers Choose Us Over Competitors', support: 'Performance Meets Style, Every Time', urgency: 'Upgrade Your Game' },
              { hook: 'The Professional Choice vs Basic Options', support: 'Premium Quality You Can Feel', urgency: 'Play With The Best' },
              { hook: 'See Why We Outperform The Competition', support: 'Superior Comfort, Better Durability', urgency: 'Choose Quality Over Compromise' }
            ];
          } else if (audienceLower.includes('women') || audienceLower.includes('mom')) {
            comparisonHooks = [
              { hook: 'Why Smart Women Choose Quality Over Price', support: 'Better Materials, Superior Fit, Lasting Style', urgency: 'Invest In The Best' },
              { hook: 'The Difference Quality Makes', support: 'Compare & See Why We\'re Worth It', urgency: 'Choose What Lasts' },
              { hook: 'Not All Products Are The Same', support: 'Premium vs. Basic - The Choice Is Clear', urgency: 'Get What You Deserve' }
            ];
          } else {
            comparisonHooks = [
              { hook: 'Why We Beat The Competition Every Time', support: 'Superior Quality, Better Value, Proven Results', urgency: 'Choose The Winner' },
              { hook: 'The Clear Choice For Quality', support: 'Compare Features, Compare Value, Compare Results', urgency: 'Make The Smart Decision' },
              { hook: 'See Why Customers Choose Us Over Alternatives', support: 'Premium Quality That Delivers', urgency: 'Experience The Difference' }
            ];
          }
          
          const selected = comparisonHooks[randomSeed % comparisonHooks.length];
          primaryHook = selected.hook;
          supportingLine = selected.support;
          urgencyPhrase = selected.urgency;
        } else {
          // Generic fallback for other templates
          const genericCallouts = [
            { hook: 'Premium Quality', support: 'Superior Design', urgency: 'Upgrade Your Experience' },
            { hook: 'Professional Grade', support: 'Quality Construction', urgency: 'Choose Excellence' },
            { hook: 'Ultimate Performance', support: 'Advanced Features', urgency: 'Get More Value' }
          ];
          const selected = genericCallouts[randomSeed % genericCallouts.length];
          primaryHook = selected.hook;
          supportingLine = selected.support;
          urgencyPhrase = selected.urgency;
        }

        console.log(`[Infographic Hook] Generated: "${primaryHook}" | "${supportingLine}" | "${urgencyPhrase}"`);
        return { primaryHook, supportingLine, urgencyPhrase };
      }

      // Dynamic Scene Generator based on product category
      function generateContextualScene(productData: any, profileData: any): {
        sceneDescription: string;
        lightingStyle: string;
        backgroundElements: string;
      } {
        const category = (productData.productCategory || profileData?.productCategory || 'product').toLowerCase();
        
        console.log(`[Infographic Scene] Category for scene generation: "${category}"`);
        console.log(`[Infographic Scene] Product data available:`, {
          hasProductCategory: !!productData.productCategory,
          hasProfileCategory: !!profileData?.productCategory,
          productCategory: productData.productCategory,
          profileCategory: profileData?.productCategory
        });
        
        if (category.includes('golf')) {
          console.log(`[Infographic Scene] Golf category detected! Generating golf course scene.`);
          
          // Get audience for scene customization
          const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
            ? productData.customTargetAudience 
            : (productData.targetAudience || profileData?.targetAudience || 'golfers');
          
          console.log(`[Infographic Scene] Customizing golf scene for audience: "${audience}"`);
          
          let sceneCustomization = '';
          if (audience.toLowerCase().includes('mom') || audience.toLowerCase().includes('women')) {
            sceneCustomization = 'with elegant, welcoming atmosphere that appeals to women golfers';
          } else if (audience.toLowerCase().includes('professional') || audience.toLowerCase().includes('business')) {
            sceneCustomization = 'with upscale country club atmosphere for professional golfers';
          } else if (audience.toLowerCase().includes('beginner') || audience.toLowerCase().includes('new')) {
            sceneCustomization = 'with approachable, friendly golf course setting for new players';
          } else {
            sceneCustomization = 'with inclusive golf environment welcoming to all players';
          }
          
          return {
            sceneDescription: `golf course setting with lush green fairway background ${sceneCustomization}`,
            lightingStyle: 'natural outdoor lighting with golden hour warmth that feels welcoming and aspirational',
            backgroundElements: `subtle golf course elements, flag pin in distance, professional golf atmosphere tailored for ${audience}`
          };
        } else if (category.includes('beauty') || category.includes('skincare')) {
          return {
            sceneDescription: 'elegant vanity setting with soft, luxurious ambiance',
            lightingStyle: 'soft, flattering beauty lighting with gentle highlights',
            backgroundElements: 'minimal luxury elements, marble textures, spa-like serenity'
          };
        } else if (category.includes('fitness') || category.includes('sports')) {
          return {
            sceneDescription: 'modern gym or athletic environment',
            lightingStyle: 'dynamic lighting with energy and motivation',
            backgroundElements: 'subtle fitness equipment, motivational atmosphere, active lifestyle context'
          };
        } else if (category.includes('kitchen') || category.includes('cooking')) {
          return {
            sceneDescription: 'warm, inviting kitchen with professional cooking vibes',
            lightingStyle: 'warm, appetizing lighting that enhances food appeal',
            backgroundElements: 'natural ingredients, cooking utensils, homestyle warmth'
          };
        } else if (category.includes('tech') || category.includes('electronics')) {
          return {
            sceneDescription: 'clean, modern workspace with tech-forward aesthetic',
            lightingStyle: 'crisp, precise lighting showcasing innovation',
            backgroundElements: 'minimal tech environment, clean lines, forward-thinking atmosphere'
          };
        } else {
          console.log(`[Infographic Scene] Using generic fallback scene for category: "${category}"`);
          return {
            sceneDescription: 'lifestyle environment appropriate to product usage',
            lightingStyle: 'professional lighting that enhances product appeal',
            backgroundElements: 'contextual elements that support the product story'
          };
        }
      }

      // Template registry with structured, step-by-step builders
      const templates: Record<string, { label: string; purpose: string; requires: string[]; builder: (ctx: { productData: any; profileData: any; brandKitData: any; leverSeed: number; }) => string } > = {
        main_benefit: {
          label: "Main Benefit",
          purpose: "Instant #1 reason to buy in <1s",
          requires: [],
          builder: ({ productData, profileData, brandKitData, leverSeed }) => {
            // Generate dynamic hooks and scene
            const hooks = generateDynamicHook(productData, profileData, brandKitData, 'main_benefit');
            const scene = generateContextualScene(productData, profileData);
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
              ? productData.customTargetAudience 
              : (productData.targetAudience || profileData?.targetAudience || 'customers');

            // Get the top feature for visual emphasis
            const topFeature = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/)[0] : 
              (productData.features?.[0] || 'key benefit')).trim();
            const featureLower = topFeature.toLowerCase();

            // Generate feature-specific visual instructions
            let visualDemonstration = '';
            let featureCallout = '';
            let visualElements = '';

            if (featureLower.includes('breathable') || featureLower.includes('mesh') || featureLower.includes('ventilat')) {
              visualDemonstration = 'Position the product at a slight angle to clearly show the mesh panels/breathable sections. Use lighting that highlights the texture and openings of the mesh material.';
              featureCallout = 'Add a zoom-in callout circle or detail box highlighting the mesh area with subtle airflow lines or arrows showing air movement through the material.';
              visualElements = 'Include subtle visual cues like gentle airflow lines or cooling effects around the mesh areas to reinforce the breathability concept.';
            } else if (featureLower.includes('adjustable') || featureLower.includes('fit') || featureLower.includes('strap')) {
              visualDemonstration = 'Show the product with clear visibility of the adjustable components (straps, buckles, sizing elements).';
              featureCallout = 'Add a detail callout showing the adjustment mechanism in action or indicating the range of adjustment.';
              visualElements = 'Include visual indicators like adjustment arrows or size range demonstrations.';
            } else if (featureLower.includes('water') || featureLower.includes('resistant') || featureLower.includes('proof')) {
              visualDemonstration = 'Position the product to show any water-resistant treatments or materials, with lighting that emphasizes protective qualities.';
              featureCallout = 'Add water droplet effects or protective shield imagery to visualize the water resistance.';
              visualElements = 'Include subtle water droplets beading off the surface or protective barrier visualizations.';
            } else if (featureLower.includes('comfort') || featureLower.includes('soft') || featureLower.includes('padding')) {
              visualDemonstration = 'Show the product highlighting any padded areas, soft materials, or comfort features.';
              featureCallout = 'Add a detail callout showing the comfort features with emphasis on cushioning or soft materials.';
              visualElements = 'Include visual cues that suggest comfort like soft shadows or plush material textures.';
            } else {
              // Generic feature visualization
              visualDemonstration = 'Position the product to clearly display the key feature area mentioned in the benefits.';
              featureCallout = `Add a detail callout highlighting the specific area related to "${topFeature}".`;
              visualElements = 'Include visual elements that reinforce the primary benefit through clear design cues.';
            }

            return (
`Create a professional product infographic showcasing this product in ${scene.sceneDescription}. ${visualDemonstration}

FEATURE-FOCUSED COMPOSITION:
The product should occupy 60% of the frame, positioned center-left. ${featureCallout} This callout should be connected to the product with a clean line or arrow, making the connection between the feature and benefit crystal clear.

VISUAL DEMONSTRATION OF BENEFIT:
${visualElements} The goal is to make the "${topFeature}" benefit immediately obvious through both visual cues and strategic product positioning. The viewer should understand the benefit at first glance, before even reading the text.

BACKGROUND AND LIGHTING:
Background: ${scene.sceneDescription} with soft-focus environmental elements that enhance the product story while keeping attention on the feature demonstration.
Lighting: ${scene.lightingStyle} that specifically highlights the key feature area of the product. The lighting should create contrast and emphasis on the benefit-delivering part of the product.

TEXT HIERARCHY AND PLACEMENT (USE EXACT TEXT):
Primary headline: MUST use exactly "${hooks.primaryHook}" - large, bold typography positioned in the upper-right area
Supporting benefit: MUST use exactly "${hooks.supportingLine}" - medium-sized text below the headline, with a relevant icon (like airflow for breathability, adjustment arrows for fit, etc.)
Urgency phrase: MUST use exactly "${hooks.urgencyPhrase}" - smaller call-to-action text positioned at bottom

BENEFIT REINFORCEMENT:
Add a relevant icon next to the supporting text that visually represents the benefit (airflow lines for breathability, size indicators for adjustability, etc.). The icon should immediately connect the text to the visual demonstration on the product.

TECHNICAL EXECUTION:
Typography: Clean, high-contrast fonts with strategic placement to avoid obstructing the feature demonstration
Visual flow: Product → Feature callout → Headline → Supporting text → Urgency phrase
Mobile optimization: All elements clearly visible and readable at thumbnail size
Dimensions: 2000×2000 pixels at 300 DPI

The final result should make the connection between "${topFeature}" and its benefit impossible to miss through coordinated visual demonstration, strategic callouts, and reinforcing text hierarchy.`);
          }
        },
        feature_callouts: {
          label: "Feature Callouts (3–5)",
          purpose: "Highlight 3–5 key features",
          requires: [],
          builder: ({ productData, profileData, brandKitData, leverSeed }) => {
            // Generate dynamic hooks and scene
            const hooks = generateDynamicHook(productData, profileData, brandKitData, 'feature_callouts');
            const scene = generateContextualScene(productData, profileData);
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
              ? productData.customTargetAudience 
              : (productData.targetAudience || profileData?.targetAudience || 'customers');
            
            // Extract 3-5 features for callouts
            const allFeatures = productData.keyFeatures ? 
              productData.keyFeatures.split(/[\n•;,]+/).map((f: string) => f.trim()).filter((f: string) => f.length > 0) :
              (productData.features || []);
            
            const topFeatures = allFeatures.slice(0, 5); // Take up to 5 features
            const featureCount = Math.min(topFeatures.length, 5);

            // Generate feature-specific callout instructions
            let featureCallouts = '';
            let iconInstructions = '';
            
            topFeatures.forEach((feature: string, index: number) => {
              const featureLower = feature.toLowerCase();
              let icon = '';
              let placement = '';
              let visualCue = '';
              
              // Determine icon and visual strategy based on feature type
              if (featureLower.includes('breathable') || featureLower.includes('mesh') || featureLower.includes('ventilat')) {
                icon = 'airflow/wind lines icon';
                placement = 'pointing to mesh/breathable areas on the product';
                visualCue = 'with subtle airflow animation lines';
              } else if (featureLower.includes('adjustable') || featureLower.includes('fit') || featureLower.includes('strap')) {
                icon = 'adjustment arrows/resize icon';
                placement = 'pointing to straps, buckles, or adjustment mechanisms';
                visualCue = 'with directional arrows showing adjustment range';
              } else if (featureLower.includes('water') || featureLower.includes('resistant') || featureLower.includes('proof')) {
                icon = 'water droplet/shield protection icon';
                placement = 'pointing to water-resistant material surfaces';
                visualCue = 'with water droplets beading off the surface';
              } else if (featureLower.includes('comfort') || featureLower.includes('soft') || featureLower.includes('padding')) {
                icon = 'comfort/cushion cloud icon';
                placement = 'pointing to padded or soft comfort areas';
                visualCue = 'with soft shadow/cushioning emphasis';
              } else if (featureLower.includes('durable') || featureLower.includes('strong') || featureLower.includes('tough')) {
                icon = 'strength/shield durability icon';
                placement = 'pointing to reinforced or structural areas';
                visualCue = 'with emphasis on solid construction';
              } else if (featureLower.includes('lightweight') || featureLower.includes('light')) {
                icon = 'feather/weight scale icon';
                placement = 'positioned near the product center';
                visualCue = 'with floating/weightless visual effect';
              } else if (featureLower.includes('quick') || featureLower.includes('fast') || featureLower.includes('easy')) {
                icon = 'speed/clock efficiency icon';
                placement = 'positioned for maximum visibility';
                visualCue = 'with speed/efficiency visual indicators';
              } else {
                icon = 'relevant feature-specific icon';
                placement = 'pointing to the specific product area where this feature is located';
                visualCue = 'with appropriate visual emphasis';
              }
              
              featureCallouts += `
Callout ${index + 1}: "${feature}"
- Icon: ${icon}
- Placement: ${placement}
- Visual enhancement: ${visualCue}
- Connected with clean line/arrow to product area`;
            });

            return (
`Create a professional multi-feature callout infographic showcasing this product in ${scene.sceneDescription}. Position the product centrally, occupying 50% of the frame, angled to display all key feature areas clearly.

MULTI-FEATURE VISUAL STRATEGY:
Display exactly ${featureCount} feature callouts arranged strategically around the product. Each feature should be visually demonstrated on the product itself before the callout explains it.

FEATURE CALLOUTS BREAKDOWN:${featureCallouts}

CALLOUT DESIGN SPECIFICATIONS:
Each callout box should include:
- Feature-matched icon that immediately communicates the benefit
- Concise feature name (2-4 words maximum)
- Clean connecting line/arrow pointing directly to the relevant product area
- Consistent styling with subtle background for readability
- Strategic positioning to create visual balance around the product

VISUAL DEMONSTRATION PRIORITY:
The product should be lit and positioned so all ${featureCount} features are clearly visible. Use lighting that highlights different product areas where each feature is located. Add subtle visual cues (airflow lines, water droplets, adjustment arrows, etc.) directly on or near the product to reinforce each feature benefit.

BACKGROUND AND LIGHTING:
Background: ${scene.sceneDescription} with soft-focus elements that provide context without competing with feature callouts
Lighting: ${scene.lightingStyle} with strategic highlights on each feature area of the product

LAYOUT HIERARCHY (USE EXACT TEXT):
Primary headline: MUST use exactly "${hooks.primaryHook}" - large, bold typography at the top
Product with feature callouts: Central focus with balanced callout arrangement  
Supporting tagline: MUST use exactly "${hooks.supportingLine}" - medium-sized supporting text
Urgency phrase: MUST use exactly "${hooks.urgencyPhrase}" - smaller call-to-action at bottom

CALLOUT POSITIONING STRATEGY:
Arrange the ${featureCount} callouts to frame the product naturally:
- Use a mix of left, right, top, and bottom positions
- Ensure connecting lines don't cross or create visual confusion
- Maintain consistent spacing and visual rhythm
- Balance text density across all quadrants

ICON INTEGRATION:
Use consistent icon style (outline or minimal fill) that matches each feature type. Icons should be simple, immediately recognizable, and professionally designed. Position icons within or adjacent to callout text for maximum clarity.

TECHNICAL EXECUTION:
Typography: Clean, high-contrast sans-serif fonts with clear hierarchy
Visual flow: Headline → Product with surrounding callouts → Supporting text → Urgency phrase
Mobile optimization: All callouts clearly readable at thumbnail size
Dimensions: 2000×2000 pixels at 300 DPI
Brand integration: Subtle brand colors in callout backgrounds and connecting elements

The final result should create an informative feature overview where each of the ${featureCount} features is both visually demonstrated on the product and clearly explained in corresponding callouts, making the product's comprehensive value proposition immediately apparent.`);
          }
        },
        size_chart: {
          label: "Size / Dimensions",
          purpose: "Answer size/fit objections",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            // Generate dynamic hooks and scene
            const hooks = generateDynamicHook(productData, profileData, brandKitData, 'size_chart');
            const scene = generateContextualScene(productData, profileData);
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
              ? productData.customTargetAudience 
              : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const category = (productData.productCategory || profileData?.productCategory || 'product').toLowerCase();

            // Get dimensions from product data (multiple possible sources)
            const rawDimensions = productData.specifications?.dimensions || 
                                productData.dimensions || 
                                productData.keyFeatures?.split(/[\n•;,]+/).find((f: string) => 
                                  f.toLowerCase().includes('size') || 
                                  f.toLowerCase().includes('dimension') ||
                                  f.toLowerCase().includes('length') ||
                                  f.toLowerCase().includes('width') ||
                                  f.toLowerCase().includes('height')
                                )?.trim() || 
                                'product dimensions';

            // Parse dimensions more explicitly for accurate display
            let dimensionDisplay = '';
            let individualMeasurements = '';
            
            if (rawDimensions && rawDimensions !== 'product dimensions') {
              // Handle common dimension formats: "8x2x5", "8 x 2 x 5", "8"x2"x5"", etc.
              const cleanDims = rawDimensions.replace(/['"]/g, '').replace(/\s+/g, '');
              const parts = cleanDims.split(/[x×X]/);
              
              if (parts.length >= 3) {
                const [dim1, dim2, dim3] = parts.slice(0, 3);
                
                // Category-specific dimension mapping
                if (category.includes('hat') || category.includes('cap') || category.includes('headwear')) {
                  // For hats: length=front-to-back, width=side-to-side, height=crown height
                  dimensionDisplay = `${dim1} × ${dim2} × ${dim3}`;
                  individualMeasurements = `Front-to-back: ${dim1}", Side-to-side: ${dim2}", Crown height: ${dim3}"`;
                } else {
                  // Generic mapping
                  dimensionDisplay = `${dim1} × ${dim2} × ${dim3}`;
                  individualMeasurements = `Length: ${dim1}", Width: ${dim2}", Height: ${dim3}"`;
                }
              } else if (parts.length === 2) {
                const [dim1, dim2] = parts;
                if (category.includes('hat') || category.includes('cap') || category.includes('headwear')) {
                  dimensionDisplay = `${dim1} × ${dim2}`;
                  individualMeasurements = `Front-to-back: ${dim1}", Side-to-side: ${dim2}"`;
                } else {
                  dimensionDisplay = `${dim1} × ${dim2}`;
                  individualMeasurements = `Length: ${dim1}", Width: ${dim2}"`;
                }
              } else {
                dimensionDisplay = rawDimensions;
                individualMeasurements = `Measurement: ${rawDimensions}`;
              }
            } else {
              dimensionDisplay = 'See product specifications';
              individualMeasurements = 'Refer to product details for exact measurements';
            }

            // Generate category-specific measurement strategy and placement instructions
            let measurementApproach = '';
            let scaleReference = '';
            let dimensionFocus = '';
            let placementInstructions = '';
            
            if (category.includes('hat') || category.includes('cap') || category.includes('headwear')) {
              measurementApproach = 'Position the hat in the scene to clearly display its three key dimensions from an optimal viewing angle that shows front-to-back, side-to-side, and crown height measurements.';
              scaleReference = 'Use common objects for scale reference (coffee mug, measuring tape, or size chart overlay)';
              dimensionFocus = 'Focus on the three specific hat dimensions: front-to-back length, side-to-side width, and crown height';
              
              // Generate specific placement instructions for hat dimensions
              const measurements = individualMeasurements.split(', ');
              placementInstructions = measurements.map((m: string) => {
                const measurement = m.trim();
                if (measurement.includes('Front-to-back')) {
                  return `- ${measurement} - horizontal line across the hat from front edge to back edge`;
                } else if (measurement.includes('Side-to-side')) {
                  return `- ${measurement} - horizontal line across the hat from left side to right side`;
                } else if (measurement.includes('Crown height')) {
                  return `- ${measurement} - vertical line showing the height of the crown from bottom to top`;
                } else {
                  return `- ${measurement} - positioned appropriately for this measurement type`;
                }
              }).join('\n');
            } else if (category.includes('clothing') || category.includes('apparel')) {
              measurementApproach = 'Display the garment on a body or mannequin to show fit and proportions across different body areas.';
              scaleReference = 'Use body proportions and common garment sizing as reference';
              dimensionFocus = 'Focus on chest, waist, length, and sleeve measurements';
              placementInstructions = individualMeasurements;
            } else if (category.includes('furniture') || category.includes('home')) {
              measurementApproach = 'Show the product in a room setting with clear spatial relationships to demonstrate size in context.';
              scaleReference = 'Use room elements, doorways, or human figures for scale';
              dimensionFocus = 'Focus on overall dimensions and space requirements';
              placementInstructions = individualMeasurements;
            } else if (category.includes('bag') || category.includes('backpack') || category.includes('luggage')) {
              measurementApproach = 'Display the bag being carried or positioned next to common objects to show capacity and portability.';
              scaleReference = 'Use laptop, books, or everyday carry items for scale';
              dimensionFocus = 'Focus on capacity, length, width, and carrying dimensions';
              placementInstructions = individualMeasurements;
            } else {
              measurementApproach = 'Position the product with clear measurement indicators and common reference objects for immediate size comprehension.';
              scaleReference = 'Use household objects or measurement tools for scale reference';
              dimensionFocus = 'Focus on key functional dimensions that matter most to users';
              placementInstructions = individualMeasurements;
            }

            return (
`Create a professional size and dimensions infographic showcasing this product in ${scene.sceneDescription}. ${measurementApproach}

CRITICAL MEASUREMENT REQUIREMENTS - FOLLOW EXACTLY:
Display ONLY these exact dimensions: ${dimensionDisplay}
${individualMeasurements}

MANDATORY DIMENSION RULES:
- Show ONLY the numbers from the parsed dimensions above
- DO NOT add circumference, diameter, or any other measurements
- DO NOT estimate or calculate additional dimensions
- DO NOT use measurements that are not explicitly provided
- Use the exact format: ${dimensionDisplay}

DIMENSION LINE PLACEMENT:
Create EXACTLY THREE dimension lines, no more, no less:
${placementInstructions}

CRITICAL PLACEMENT RULES:
- Use ONLY the three measurements listed above
- NO additional circumference, diameter, or estimated measurements  
- Each line must be clearly distinct and non-overlapping
- Lines should not cross or interfere with each other
- Position lines so they clearly indicate what is being measured
- Do NOT add any extra dimension lines beyond the three specified

SCALE AND CONTEXT:
${scaleReference}. Position scale references naturally within the scene to help ${audience} understand the product size immediately. The scene should feel authentic to how ${audience} would encounter this product.

BACKGROUND AND STAGING:
Background: ${scene.sceneDescription} that provides appropriate context for ${audience} without overwhelming the measurement focus
Lighting: ${scene.lightingStyle} that ensures crystal-clear visibility of all measurement details and dimension lines
Staging: Position the product to showcase all key dimensional aspects clearly and professionally

TEXT HIERARCHY (USE EXACT TEXT):
Primary headline: MUST use exactly "${hooks.primaryHook}" - large, bold typography positioned prominently
Supporting tagline: MUST use exactly "${hooks.supportingLine}" - medium-sized text that reinforces the sizing confidence message
Urgency phrase: MUST use exactly "${hooks.urgencyPhrase}" - smaller call-to-action text

MEASUREMENT ACCURACY VERIFICATION:
Before generating, verify that ONLY these exact measurements appear in the image:
${dimensionDisplay}
Any additional numbers or measurements will be considered an error.

FINAL LINE COUNT CHECK:
- Must show EXACTLY 3 dimension lines (no more, no less)
- Each line must correspond to one of the three measurements above
- Do NOT add any extra measurement lines or numbers
- Do NOT duplicate any dimension lines

VISUAL CLARITY GOALS:
- Eliminate any size uncertainty for ${audience}
- Display ONLY the provided dimensions: ${dimensionDisplay}
- Provide both precise measurements and intuitive scale references
- Create confidence in product sizing before purchase

TECHNICAL EXECUTION:
Typography: Clean, sans-serif fonts with measurement precision and high contrast
Visual hierarchy: Product → Dimension lines → Headlines → Supporting text → Scale references  
Mobile optimization: All measurements and text clearly readable at small sizes
Dimensions: 2000×2000 pixels at 300 DPI
Brand integration: Subtle brand colors in measurement elements only

FINAL VERIFICATION: The image must show exactly these dimensions and no others: ${dimensionDisplay}`);
          }
        },
        whats_included: {
          label: "What's Included",
          purpose: "Show package contents",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            // Generate dynamic hooks and scene
            const hooks = generateDynamicHook(productData, profileData, brandKitData, 'whats_included');
            const scene = generateContextualScene(productData, profileData);
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
              ? productData.customTargetAudience 
              : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const category = (productData.productCategory || profileData?.productCategory || 'product').toLowerCase();

            // Generate category-specific packaging and presentation strategy
            let presentationApproach = '';
            let valueStory = '';
            let layoutStrategy = '';
            let contextualSetting = '';
            
            if (category.includes('hat') || category.includes('cap') || category.includes('headwear')) {
              presentationApproach = 'Create a premium lifestyle presentation showing the hat as the hero item with attention to texture, stitching, and craftsmanship details.';
              valueStory = 'Premium headwear with thoughtful construction details';
              layoutStrategy = 'Hero angle with detailed close-up showing embroidery, materials, and quality construction';
              contextualSetting = 'Elegant surface with lifestyle elements that suggest the usage context for the target audience';
            } else if (category.includes('clothing') || category.includes('apparel')) {
              presentationApproach = 'Display the garment with focus on fabric quality, construction details, and included accessories or care items.';
              valueStory = 'Complete wardrobe solution with quality construction';
              layoutStrategy = 'Styled layout showing garment details, fabric texture, and any included accessories';
              contextualSetting = 'Fashion-forward setting that appeals to the target audience';
            } else if (category.includes('tech') || category.includes('electronics')) {
              presentationApproach = 'Showcase the tech product with all included accessories, cables, and documentation in an organized unboxing layout.';
              valueStory = 'Complete tech solution ready to use immediately';
              layoutStrategy = 'Organized grid showing main device, all accessories, and essential components';
              contextualSetting = 'Clean, modern surface suggesting premium tech unboxing experience';
            } else if (category.includes('beauty') || category.includes('skincare')) {
              presentationApproach = 'Present the beauty products with elegant spacing, emphasizing luxury and completeness of the routine.';
              valueStory = 'Complete beauty routine with premium formulations';
              layoutStrategy = 'Luxurious arrangement showing product hierarchy and routine flow';
              contextualSetting = 'Spa-like or vanity setting with elegant lighting';
            } else {
              presentationApproach = 'Create an organized, premium presentation that showcases the main product and all included components.';
              valueStory = 'Complete solution with everything needed';
              layoutStrategy = 'Logical hierarchy showing main product prominence with supporting items';
              contextualSetting = 'Clean, premium surface that suggests quality and completeness';
            }

            return (
`Create a professional "What's Included" infographic showcasing this product in ${scene.sceneDescription}. ${presentationApproach}

PREMIUM PRESENTATION STRATEGY:
Use ${layoutStrategy} to demonstrate the complete value proposition. The main product should occupy 40% of the visual space as the clear hero, with supporting items arranged to show comprehensive value and completeness.

ENHANCED COMPOSITION TECHNIQUES:
Apply these specific improvements:
- Heroized close-up showing texture, stitching, logo embroidery, and craftsmanship details
- Multiple angles: hero view plus smaller detail inset revealing construction quality
- Lifestyle context elements subtly placed to suggest usage scenarios
- Strategic spacing that prevents overcrowding while conveying abundance

CONTEXTUAL SETTING AND STAGING:
Background: ${contextualSetting} that appeals specifically to ${audience}
Scene Context: ${scene.sceneDescription} with elements that suggest premium unboxing and immediate usability
Lighting: ${scene.lightingStyle} that makes every included item look valuable and intentional

VALUE DEMONSTRATION APPROACH:
Show ${valueStory} through strategic presentation that answers "What exactly am I getting?" Create visual abundance that suggests premium value and completeness without overwhelming the viewer.

BENEFIT-FOCUSED LABELING SYSTEM:
Use benefit-first call-outs instead of basic descriptions:
- "Premium [Material] Build - Included in Every Order" 
- "Your Everyday Essential - Right Out of the Box"
- Add subtle icon sets for Material, Size, Care, or Warranty information
- Format: "[Item Name] - [Key Benefit]" (maximum 8 words)

TEXT HIERARCHY (USE EXACT TEXT):
Primary headline: MUST use exactly "${hooks.primaryHook}" - large, bold typography positioned prominently
Supporting tagline: MUST use exactly "${hooks.supportingLine}" - medium-sized text that reinforces value and completeness
Urgency phrase: MUST use exactly "${hooks.urgencyPhrase}" - smaller call-to-action text

PSYCHOLOGICAL VALUE COMMUNICATION:
- Create abundance mindset: "Look at everything included"
- Build completeness confidence: "Nothing else needed"
- Suggest premium quality: Professional presentation and lighting
- Enable immediate satisfaction: "Ready to use right out of the box"
- Validate smart purchase: "This was clearly the right choice"

MOBILE OPTIMIZATION REQUIREMENTS:
- All item labels clearly readable at thumbnail size
- Key included items visible even in small preview
- Visual hierarchy that immediately communicates value
- Quick scan understanding of package comprehensiveness

TECHNICAL EXECUTION:
Typography: Clean, high-contrast fonts with benefit-focused labeling
Visual flow: Hero product → Supporting items → Headlines → Value reinforcement
Brand integration: Subtle brand colors in accent elements only
Dimensions: 2000×2000 pixels at 300 DPI
Composition: Strategic white space preventing overcrowding while showing abundance

The final result should eliminate any "what's included" uncertainty while creating excitement about the comprehensive value and premium quality of the complete package for ${audience}.`);
          }
        },
        comparison: {
          label: "Comparison",
          purpose: "You vs. Alt / Gen1 vs. Gen2",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            // Generate dynamic hooks and scene
            const hooks = generateDynamicHook(productData, profileData, brandKitData, 'comparison');
            const scene = generateContextualScene(productData, profileData);
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience 
              ? productData.customTargetAudience 
              : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const category = (productData.productCategory || profileData?.productCategory || 'product').toLowerCase();
            
            // Extract features from Product Image node
            const features = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);
            const featureCount = Math.min(features.length, 5); // Limit to 3-5 comparison points
            const topFeatures = features.slice(0, featureCount);

            // Generate category-specific comparison strategy
            let comparisonAngle = '';
            let competitorType = '';
            let ourAdvantages = '';
            let theirLimitations = '';
            
            if (category.includes('hat') || category.includes('cap') || category.includes('headwear')) {
              comparisonAngle = 'Comfort, style, and quality construction comparison';
              competitorType = 'generic baseball caps or low-quality alternatives';
              ourAdvantages = 'Premium materials, better fit, superior style, durability';
              theirLimitations = 'Cheap materials, poor fit, basic design, quick wear';
            } else if (category.includes('clothing') || category.includes('apparel')) {
              comparisonAngle = 'Fabric quality, fit, and style superiority';
              competitorType = 'fast fashion or basic alternatives';
              ourAdvantages = 'Premium fabric, perfect fit, stylish design, lasting quality';
              theirLimitations = 'Cheap fabric, poor fit, outdated style, quick deterioration';
            } else if (category.includes('tech') || category.includes('electronics')) {
              comparisonAngle = 'Performance, reliability, and feature comparison';
              competitorType = 'older models or budget alternatives';
              ourAdvantages = 'Latest tech, reliable performance, advanced features, better value';
              theirLimitations = 'Outdated tech, unreliable, limited features, poor value';
            } else if (category.includes('beauty') || category.includes('skincare')) {
              comparisonAngle = 'Results, ingredients, and safety comparison';
              competitorType = 'drugstore or harsh alternatives';
              ourAdvantages = 'Proven results, premium ingredients, gentle formula, dermatologist-tested';
              theirLimitations = 'Slow results, cheap ingredients, harsh formula, untested';
            } else {
              comparisonAngle = 'Quality, performance, and value comparison';
              competitorType = 'standard or budget alternatives';
              ourAdvantages = 'Superior quality, better performance, excellent value, customer satisfaction';
              theirLimitations = 'Lower quality, poor performance, limited value, mixed reviews';
            }

            // Create feature comparison rows
            let comparisonRows = '';
            if (topFeatures.length > 0) {
              comparisonRows = topFeatures.map((feature: string, index: number) => {
                const benefit = feature.length > 20 ? feature.substring(0, 20) + '...' : feature;
                return `Row ${index + 1}: "${benefit}" (Our Product: ✓ | Competitors: ✗)`;
              }).join('\n');
            } else {
              comparisonRows = `Row 1: "Premium Quality" (Our Product: ✓ | Competitors: ✗)
Row 2: "Superior Performance" (Our Product: ✓ | Competitors: ✗)
Row 3: "Better Value" (Our Product: ✓ | Competitors: ✗)`;
            }

            return (
`Create a professional comparison infographic in ${scene.sceneDescription} showcasing our product's superiority over competitors for ${audience}.

TWO-COLUMN COMPARISON LAYOUT:
Left Column (60% width): Our product in full color with prominent display
- Product photo: Full color, well-lit, premium presentation
- Features: Each with green checkmarks (✓)
- Styling: Bold, confident, premium appearance

Right Column (40% width): Competitor in muted gray tones
- Product image: Gray silhouette of similar product
- Features: Each with red X marks (✗) 
- Styling: Muted, less appealing, clearly inferior

COMPARISON STRATEGY:
Focus: ${comparisonAngle} that matters most to ${audience}
Our advantages: ${ourAdvantages}
Their limitations: ${theirLimitations}
Competitor type: ${competitorType}

SPECIFIC COMPARISON POINTS (${featureCount} rows total):
${comparisonRows}

Each comparison point should be:
- Short and punchy (under 20 characters)
- Benefit-focused, not feature-heavy
- Easy to scan on mobile
- Factual and trustworthy

VISUAL HIERARCHY REQUIREMENTS:
- Our product column: Bright, colorful, highlighted
- Competitor column: Grayscale, muted, clearly secondary
- Green checkmarks (✓) for our advantages
- Red X marks (✗) for competitor disadvantages
- Clean grid layout with plenty of white space
- Professional table aesthetic that builds trust

TEXT HIERARCHY (USE EXACT TEXT):
Top banner headline: MUST use exactly "${hooks.primaryHook}" - large, bold typography
Supporting tagline: MUST use exactly "${hooks.supportingLine}" - reinforces our superiority
Call-to-action: MUST use exactly "${hooks.urgencyPhrase}" - drives purchase decision

CONTEXTUAL SETTING:
Background: ${scene.sceneDescription} with subtle elements that appeal to ${audience}
Lighting: ${scene.lightingStyle} that makes our product look premium
Environment: Clean, professional comparison setting that builds trust

AMAZON OPTIMIZATION:
- Thumbnail readable: Key advantages visible in small preview
- Mobile scannable: 3-second comprehension on phone screens
- High contrast: All text clearly legible
- OCR friendly: Text large enough for Rufus to read
- Purchase confident: Removes doubt about choosing our product

PSYCHOLOGICAL IMPACT:
- Overcome "good enough" mentality
- Show meaningful differences that matter
- Build confidence in smart purchase decision
- Address common objections before they arise
- Create urgency about missing out on our advantages

TECHNICAL EXECUTION:
Two clean columns with consistent product angles
Minimalist grid layout with strategic white space
High-contrast typography for mobile readability
Professional credibility aesthetic
Dimensions: 2000×2000 pixels at 300 DPI

The final result should make the choice obvious: our product is clearly superior to ${competitorType} in every way that matters to ${audience}.`);
          }
        },
        materials: {
          label: "Material/Ingredients",
          purpose: "Show materials or ingredients",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const materials = productData.specifications?.materials?.join(', ') || 'key materials';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');

            // Dynamic material story based on category
            const categoryLower = subject.toLowerCase();
            let materialStory = '';
            let qualityIndicators = '';
            let visualStyle = '';
            
            if (categoryLower.includes('beauty') || categoryLower.includes('skincare')) {
              materialStory = 'Premium ingredient transparency that builds trust and efficacy confidence';
              qualityIndicators = 'Natural sourcing, purity levels, dermatologist-tested credentials';
              visualStyle = 'Clean, medical-grade aesthetic with ingredient close-ups and purity indicators';
            } else if (categoryLower.includes('clothing') || categoryLower.includes('fabric')) {
              materialStory = 'Fabric quality and comfort story that justifies premium feel';
              qualityIndicators = 'Thread count, durability ratings, comfort certifications';
              visualStyle = 'Tactile macro photography showing texture, weave, and quality details';
            } else if (categoryLower.includes('food') || categoryLower.includes('supplement')) {
              materialStory = 'Ingredient purity and sourcing transparency for health confidence';
              qualityIndicators = 'Organic certifications, source locations, nutritional benefits';
              visualStyle = 'Fresh, natural aesthetic showing ingredient origins and purity';
            } else if (categoryLower.includes('tech') || categoryLower.includes('electronics')) {
              materialStory = 'Premium build materials that suggest durability and performance';
              qualityIndicators = 'Material grades, durability ratings, quality certifications';
              visualStyle = 'Technical precision showing material engineering and build quality';
            } else {
              materialStory = 'Quality materials story that builds confidence in craftsmanship';
              qualityIndicators = 'Material quality indicators and durability benefits';
              visualStyle = 'Professional material showcase highlighting quality and attention to detail';
            }

            return (
`🔬 STRATEGIC MATERIALS TRANSPARENCY SHOWCASE

MISSION: Build ${audience} confidence through material quality transparency and superior craftsmanship story.

🎯 MATERIAL CONFIDENCE STRATEGY:
• Core narrative: "${materialStory}"
• Featured materials: ${materials}
• Quality story: ${qualityIndicators}
• Trust building: Show why these materials matter for performance and value

🔍 VISUAL TRANSPARENCY APPROACH:
• Presentation style: ${visualStyle}
• Product integration: 50% product showcase, 50% material detail exploration
• Macro photography: Close-up material details that prove quality claims
• Context creation: Show materials in action or natural state
• Authenticity: Real material textures, not stylized representations

📊 MATERIAL STORYTELLING FRAMEWORK:
• Primary focus: Why these specific materials were chosen
• Quality indicators: Visual proof of superior material choices
• Benefit translation: How material quality improves user experience
• Comparison suggestions: Subtle hints at inferior alternatives
• Certification highlights: Any relevant quality or safety certifications

💡 PSYCHOLOGICAL QUALITY ASSURANCE:
• Address quality concerns: "Is this actually well-made?"
• Build premium perception: Materials suggest thoughtful engineering
• Create value justification: Premium materials warrant premium price
• Establish trust: Transparency suggests nothing to hide
• Enable confident purchase: Materials prove long-term satisfaction

🎨 PROFESSIONAL EXECUTION STANDARDS:
• Lighting: Precise lighting that shows true material colors and textures
• Typography: Clean, scientific labeling that builds credibility
• Layout: Organized material showcase with clear identification
• Background: Neutral backdrop that lets materials be the star
• Detail level: Macro detail sufficient to see quality differences

TECHNICAL EXECUTION:
• Dimensions: 2000×2000 pixels (perfect square)
• Resolution: 300 DPI for material detail clarity
• Color accuracy: True material colors and textures
• Detail preservation: Macro details visible at all viewing sizes
• Professional credibility: Looks like official material documentation`);
          }
        },
        use_cases: {
          label: "Use Cases",
          purpose: "Grid of scenarios",
          requires: [],
          builder: ({ productData, profileData, brandKitData, leverSeed }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const features = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);

            // Dynamic use case strategy based on category
            const categoryLower = subject.toLowerCase();
            let useCaseStrategy = '';
            let scenarioTypes = '';
            let visualStyle = '';
            
            if (categoryLower.includes('fitness') || categoryLower.includes('sports')) {
              useCaseStrategy = 'Show versatility across different workout scenarios and fitness levels';
              scenarioTypes = 'Home workout, Gym session, Outdoor activity, Recovery time';
              visualStyle = 'Dynamic, energetic scenes showing real workout scenarios';
            } else if (categoryLower.includes('tech') || categoryLower.includes('electronics')) {
              useCaseStrategy = 'Demonstrate adaptability across work, entertainment, and daily life';
              scenarioTypes = 'Productivity setup, Entertainment use, Travel companion, Daily convenience';
              visualStyle = 'Clean, modern environments showing seamless integration';
            } else if (categoryLower.includes('kitchen') || categoryLower.includes('cooking')) {
              useCaseStrategy = 'Show cooking versatility from basic meals to gourmet creations';
              scenarioTypes = 'Quick breakfast, Family dinner, Meal prep, Special occasions';
              visualStyle = 'Warm, inviting kitchen scenes with appetizing food context';
            } else if (categoryLower.includes('beauty') || categoryLower.includes('skincare')) {
              useCaseStrategy = 'Demonstrate routine integration and occasion versatility';
              scenarioTypes = 'Morning routine, Evening care, Special events, Travel essentials';
              visualStyle = 'Elegant, aspirational settings with soft, flattering lighting';
            } else {
              useCaseStrategy = 'Show practical versatility across daily life scenarios';
              scenarioTypes = 'Daily use, Special situations, Problem-solving, Convenience moments';
              visualStyle = 'Authentic lifestyle scenes that feel natural and approachable';
            }

            return (
`🎯 STRATEGIC USE CASE VISUALIZATION GRID

MISSION: Show ${audience} exactly how this ${subject} fits into and improves their daily life across multiple scenarios.

🔄 VERSATILITY DEMONSTRATION STRATEGY:
• Core approach: "${useCaseStrategy}"
• Scenario types: ${scenarioTypes}
• Visual execution: ${visualStyle}
• Grid layout: 2x2 or 3x2 format optimized for mobile viewing
• Story arc: From basic use to advanced applications

📱 GRID DESIGN FRAMEWORK:
• Cell hierarchy: Each scenario equally important but with natural flow
• Visual consistency: Uniform lighting, style, and product prominence across all cells
• Scenario labeling: 3-5 word descriptive labels that instantly communicate context
• Product integration: Product clearly visible and naturally used in each scenario
• Audience authenticity: People who look like target audience in realistic settings

💡 SCENARIO SELECTION PSYCHOLOGY:
• Address usage uncertainty: "How would I actually use this?"
• Show unexpected versatility: Scenarios they might not have considered
• Build daily relevance: Connect to their existing routines and needs
• Create aspiration: Show lifestyle they want to achieve
• Eliminate hesitation: Prove it works in their specific context

🎨 VISUAL EXECUTION STANDARDS:
• Consistency: Uniform style, lighting, and energy across all grid cells
• Authenticity: Real scenarios, not staged product shots
• Mobile optimization: Clear scenario distinction even at thumbnail size
• Text placement: Scenario labels positioned for maximum readability
• Product prominence: Hero product visible and naturally integrated in each scene

🔍 CONVERSION OPTIMIZATION:
• Immediate comprehension: Understand all use cases in 5 seconds
• Purchase confidence: "This definitely works for my lifestyle"
• Value multiplication: More scenarios = more value perception
• Social proof: See people like them successfully using product
• Objection handling: Address "limited use" concerns proactively

TECHNICAL EXECUTION:
• Dimensions: 2000×2000 pixels (perfect square)
• Resolution: 300 DPI for clear detail in each grid cell
• Grid precision: Clean, consistent spacing and alignment
• Visual balance: Equal visual weight across all scenarios
• Mobile readability: All scenario labels legible at small sizes`);
          }
        },
        before_after: {
          label: "Before/After",
          purpose: "Show relevant transformation",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const features = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);

            // Dynamic transformation story based on category
            const categoryLower = subject.toLowerCase();
            let transformationType = '';
            let measurementFocus = '';
            let credibilityStrategy = '';
            
            if (categoryLower.includes('beauty') || categoryLower.includes('skincare')) {
              transformationType = 'Visible skin improvement or beauty enhancement';
              measurementFocus = 'Skin clarity, texture smoothness, or visible anti-aging results';
              credibilityStrategy = 'Realistic improvement timeframes with honest before/after comparison';
            } else if (categoryLower.includes('cleaning') || categoryLower.includes('organization')) {
              transformationType = 'Space or item transformation from cluttered to organized';
              measurementFocus = 'Cleanliness level, organization efficiency, or space utilization';
              credibilityStrategy = 'Dramatic but achievable transformation showing real-world mess to clean';
            } else if (categoryLower.includes('fitness') || categoryLower.includes('health')) {
              transformationType = 'Performance improvement or physical capability enhancement';
              measurementFocus = 'Strength gains, flexibility improvement, or stamina increase';
              credibilityStrategy = 'Realistic timeline expectations with achievable improvement metrics';
            } else if (categoryLower.includes('tech') || categoryLower.includes('productivity')) {
              transformationType = 'Workflow efficiency or performance improvement';
              measurementFocus = 'Time savings, productivity gains, or quality improvements';
              credibilityStrategy = 'Quantifiable metrics showing clear before/after performance difference';
            } else {
              transformationType = 'Problem-to-solution transformation relevant to product benefits';
              measurementFocus = 'Key improvement metric that matters to target audience';
              credibilityStrategy = 'Honest, achievable improvement that builds trust';
            }

            return (
`🔄 STRATEGIC TRANSFORMATION VISUALIZATION

MISSION: Prove to ${audience} the tangible improvement this ${subject} delivers through credible before/after demonstration.

🎯 TRANSFORMATION STRATEGY:
• Focus area: ${transformationType}
• Measurement approach: ${measurementFocus}
• Credibility framework: ${credibilityStrategy}
• Core question answered: "What specific improvement will I see?"

📊 VISUAL COMPARISON FRAMEWORK:
• Split design: Clean left/right or top/bottom division with clear transition
• Before state: Authentic representation of problem/starting point
• After state: Realistic improvement showing product impact
• Transition element: Visual bridge showing the product's role in transformation
• Timeline indicators: Realistic timeframe expectations for seen results

💡 CREDIBILITY AND TRUST BUILDING:
• Honest representation: No exaggerated or impossible transformations
• Quantifiable metrics: Specific measurements or observable improvements
• Realistic timeline: Show appropriate time expectations for results
• Authentic lighting: Consistent lighting conditions between before/after
• Natural progression: Transformation that feels achievable and believable

🎨 PROFESSIONAL EXECUTION STANDARDS:
• Visual consistency: Same lighting, angle, and conditions for fair comparison
• Typography: Bold before/after labels with clear measurement indicators
• Product integration: Show product's role in achieving transformation
• Mobile optimization: Clear comparison visible even at thumbnail size
• Trust indicators: Visual elements that suggest authenticity and honesty

📱 AMAZON CONVERSION OPTIMIZATION:
• Immediate impact: Transformation visible in 2-second glance
• Purchase motivation: Clear value demonstration through visible results
• Expectation management: Realistic results that won't disappoint
• Social proof: Transformation that audience can relate to and achieve
• Confidence building: Proof that investment will deliver real results

TECHNICAL EXECUTION:
• Dimensions: 2000×2000 pixels (perfect square)
• Resolution: 300 DPI for clear detail comparison
• Color consistency: Accurate colors for honest before/after representation
• Layout precision: Clean split design with professional comparison aesthetic
• Measurement clarity: Any metrics or indicators clearly legible on mobile`);
          }
        },
        tech_exploded: {
          label: "Tech Exploded",
          purpose: "Components exploded view",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');
            const features = (productData.keyFeatures ? productData.keyFeatures.split(/[\n•;,]+/) : (productData.features || [])).map((s: string) => s.trim()).filter(Boolean);

            // Dynamic exploded view strategy based on category
            const categoryLower = subject.toLowerCase();
            let explosionStrategy = '';
            let componentFocus = '';
            let technicalStyle = '';
            
            if (categoryLower.includes('tech') || categoryLower.includes('electronics')) {
              explosionStrategy = 'Technical precision showing engineering sophistication and build quality';
              componentFocus = 'Internal components, circuit boards, precision engineering, quality materials';
              technicalStyle = 'Clean, technical aesthetic with precise labeling and professional engineering feel';
            } else if (categoryLower.includes('watch') || categoryLower.includes('mechanical')) {
              explosionStrategy = 'Mechanical precision showing craftsmanship and component quality';
              componentFocus = 'Movement parts, case construction, precision mechanisms, quality materials';
              technicalStyle = 'Luxury craftsmanship aesthetic highlighting precision and attention to detail';
            } else if (categoryLower.includes('tool') || categoryLower.includes('equipment')) {
              explosionStrategy = 'Durability showcase showing robust construction and quality components';
              componentFocus = 'Handle construction, blade/working parts, safety features, material quality';
              technicalStyle = 'Industrial design aesthetic emphasizing durability and professional quality';
            } else if (categoryLower.includes('appliance') || categoryLower.includes('kitchen')) {
              explosionStrategy = 'Internal mechanism revelation showing how it delivers superior performance';
              componentFocus = 'Motor/heating elements, safety features, efficiency components, ease-of-use design';
              technicalStyle = 'Consumer-friendly technical view that builds confidence in engineering';
            } else {
              explosionStrategy = 'Internal construction showcase revealing quality and thoughtful design';
              componentFocus = 'Key functional components, quality materials, thoughtful engineering details';
              technicalStyle = 'Professional exploded view that builds confidence in product quality';
            }

            return (
`🔧 STRATEGIC TECHNICAL BREAKDOWN VISUALIZATION

MISSION: Build ${audience} confidence through engineering transparency and component quality revelation.

🎯 TECHNICAL TRANSPARENCY STRATEGY:
• Approach: ${explosionStrategy}
• Component highlights: ${componentFocus}
• Visual execution: ${technicalStyle}
• Core message: "Look at the quality engineering inside"

⚙️ EXPLODED VIEW FRAMEWORK:
• Component separation: 4-6 key components with clear spatial relationships
• Labeling strategy: Technical component names + benefit explanation
• Visual hierarchy: Main components larger, supporting parts proportionally smaller
• Connection lines: Clean, professional callout lines linking labels to components
• Assembly logic: Show how components work together for superior performance

🔍 ENGINEERING CONFIDENCE BUILDING:
• Quality indicators: Visual proof of premium component choices
• Precision showcase: Technical tolerances and engineering excellence
• Material transparency: High-quality materials and construction methods
• Innovation highlights: Unique engineering solutions that create competitive advantage
• Durability implications: Construction details that suggest long-term reliability

💡 PSYCHOLOGICAL QUALITY ASSURANCE:
• Address quality concerns: "Is this actually well-engineered?"
• Build premium perception: Internal components suggest serious engineering
• Create value justification: Quality internals warrant higher price
• Establish technical credibility: Professional engineering builds trust
• Enable confident purchase: Technical transparency proves quality claims

🎨 PROFESSIONAL EXECUTION STANDARDS:
• Technical accuracy: Realistic component relationships and proportions
• Typography: Clean, technical labeling with consistent hierarchy
• Background: Neutral backdrop that emphasizes component details
• Lighting: Technical lighting that shows component textures and materials
• Precision aesthetic: CAD-like precision that suggests engineering excellence

📱 MOBILE OPTIMIZATION:
• Component clarity: All major components visible at thumbnail size
• Label legibility: Component names readable on mobile screens
• Visual flow: Natural eye movement through component hierarchy
• Technical credibility: Professional appearance that builds engineering confidence

TECHNICAL EXECUTION:
• Dimensions: 2000×2000 pixels (perfect square)
• Resolution: 300 DPI for precise component detail
• Technical precision: Accurate component relationships and engineering aesthetics
• Professional credibility: Looks like official technical documentation
• Component clarity: All parts clearly distinguishable with proper labeling`);
          }
        },
        compatibility: {
          label: "Compatibility Guide",
          purpose: "Show what it works with",
          requires: [],
          builder: ({ productData, profileData, brandKitData }) => {
            const subject = productData.productCategory || productData.title || 'product';
            const audience = productData.targetAudience === 'Custom' && productData.customTargetAudience ? productData.customTargetAudience : (productData.targetAudience || profileData?.targetAudience || 'customers');

            // Dynamic compatibility strategy based on category
            const categoryLower = subject.toLowerCase();
            let compatibilityStrategy = '';
            let compatibilityCategories = '';
            let visualOrganization = '';
            
            if (categoryLower.includes('phone') || categoryLower.includes('case') || categoryLower.includes('mobile')) {
              compatibilityStrategy = 'Device compatibility showcase with popular model coverage';
              compatibilityCategories = 'iPhone models, Android flagships, Screen sizes, Port types';
              visualOrganization = 'Device grid showing compatible phones with clear model identification';
            } else if (categoryLower.includes('headphone') || categoryLower.includes('audio') || categoryLower.includes('speaker')) {
              compatibilityStrategy = 'Audio device compatibility across platforms and connection types';
              compatibilityCategories = 'Bluetooth versions, Wired connections, Platform compatibility, Audio codecs';
              visualOrganization = 'Connection type grid with device ecosystem compatibility';
            } else if (categoryLower.includes('clothing') || categoryLower.includes('apparel') || categoryLower.includes('wearable')) {
              compatibilityStrategy = 'Size and fit compatibility across body types and preferences';
              compatibilityCategories = 'Size ranges, Body types, Activity levels, Style preferences';
              visualOrganization = 'Size chart integration with fit recommendations';
            } else if (categoryLower.includes('software') || categoryLower.includes('app') || categoryLower.includes('digital')) {
              compatibilityStrategy = 'Platform and system compatibility showcase';
              compatibilityCategories = 'Operating systems, Browser support, Device types, Version requirements';
              visualOrganization = 'Platform grid showing supported systems and requirements';
            } else if (categoryLower.includes('accessory') || categoryLower.includes('adapter')) {
              compatibilityStrategy = 'Universal compatibility with popular devices and standards';
              compatibilityCategories = 'Device brands, Connection standards, Size compatibility, Version support';
              visualOrganization = 'Compatibility matrix showing supported devices and connections';
            } else {
              compatibilityStrategy = 'Broad compatibility showcase reducing purchase hesitation';
              compatibilityCategories = 'Popular brands, Standard sizes, Common uses, Version compatibility';
              visualOrganization = 'Clear compatibility grid with popular options highlighted';
            }

            return (
`🔗 STRATEGIC COMPATIBILITY ASSURANCE GUIDE

MISSION: Eliminate compatibility concerns for ${audience} and prove this ${subject} works with their existing setup.

🎯 COMPATIBILITY CONFIDENCE STRATEGY:
• Approach: ${compatibilityStrategy}
• Key categories: ${compatibilityCategories}
• Visual structure: ${visualOrganization}
• Core assurance: "Yes, this works with what you already have"

📱 COMPATIBILITY FRAMEWORK DESIGN:
• Organization strategy: Logical groupings that match customer decision-making
• Visual hierarchy: Most popular/relevant compatibility options prominently featured
• Reassurance messaging: Clear "yes/no" indicators for compatibility status
• Popular focus: Highlight compatibility with most common devices/standards
• Universal appeal: Show broad compatibility range to maximize audience confidence

🔍 PURCHASE BARRIER ELIMINATION:
• Address compatibility anxiety: "Will this work with my iPhone/Android/setup?"
• Show universal appeal: Compatible with wide range of popular options
• Highlight standards: Works with industry-standard connections/formats
• Future-proof messaging: Compatible with current and recent generations
• Easy verification: Simple way to confirm their specific device/need is covered

💡 PSYCHOLOGICAL CONFIDENCE BUILDING:
• Reduce purchase risk: Clear compatibility removes major objection
• Show thoughtful design: Engineered for broad compatibility
• Create inclusive feeling: "This product was made for people like me"
• Enable quick decision: Instant compatibility verification
• Build brand trust: Comprehensive compatibility suggests quality engineering

🎨 VISUAL EXECUTION STANDARDS:
• Icon consistency: Uniform icon style for different compatibility categories
• Typography: Clear, scannable labeling with high contrast
• Color coding: Green for "yes", neutral for "check specs", clear status indicators
• Layout organization: Logical groupings that match how customers think about compatibility
• Mobile optimization: All compatibility info readable at thumbnail size

📱 AMAZON CONVERSION OPTIMIZATION:
• Quick compatibility check: Instant verification for most common scenarios
• Purchase confidence: Removes compatibility as barrier to buying
• Broad appeal: Shows product works for wide audience
• Technical credibility: Suggests thoughtful engineering and quality testing
• Decision support: Clear information for confident purchase choice

TECHNICAL EXECUTION:
• Dimensions: 2000×2000 pixels (perfect square)
• Resolution: 300 DPI for clear compatibility text and icons
• Visual organization: Clean, scannable layout with logical groupings
• Information hierarchy: Most important compatibility info prominently featured
• Mobile readability: All compatibility details legible at small viewing sizes`);
          }
        },
      };

      // Default to main_benefit template if no template specified
      const templateId = args.templateId || 'main_benefit';
      const leverSeed = Math.max(1, (args.agentInstance || 1));

      console.log(`[Infographic] Template ID: ${templateId} (original: ${args.templateId})`);
      console.log(`[Infographic] Using optimized Gemini 3 Pro structured prompts`);

      // Validate template requirements
      const templateRequirements: Record<string, string[]> = {
        size_chart: ['dimensions'],
      };
      const requires = templateRequirements[templateId] || [];
      if (requires.includes('dimensions') && !productData.specifications?.dimensions) {
        throw new Error("Add dimensions in Product node to unlock Size / Dimensions template.");
      }

      // Use the optimized structured prompt builder for Gemini 3 Pro Image
      console.log(`[Infographic] Building optimized structured prompt for template: ${templateId}`);
      let infographicPrompt = buildInfographicPrompt(
        productData,
        args.profileData,
        args.brandKitData,
        templateId,
        args.usingHeroImageBase || false
      );

      console.log("[Infographic] Structured JSON prompt generated successfully");



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

      // Convert first product image to base64 for nanoBanana Pro
      // Convert first product image to base64 for nanoBanana Pro
      // Uses resolveImageToBase64 to handle both URLs (from Convex storage) and data URLs
      console.log("[Infographic] Converting product image for nanoBanana Pro...");
      const sourceImage = args.productImages[0];
      const referenceImageBase64 = await resolveImageToBase64(sourceImage.dataUrl);
      console.log("[Infographic] Reference image base64 length:", referenceImageBase64.length);

      // Use Gemini 3 Pro Image (gemini-3-pro-image-preview) for infographic generation
      console.log("[Infographic] Generating infographic with gemini-3-pro-image-preview...");
      const imageResponse = await generateImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        {
          prompt: infographicPrompt,
          referenceImages: [referenceImageBase64],
        }
      );
      
      if (!imageResponse.success) {
        throw new Error(imageResponse.error || "Failed to generate infographic");
      }

      // Get base64 from response (Gemini API always returns base64 directly)
      if (!imageResponse.imageBase64) {
        throw new Error("No image data returned from Gemini API");
      }
      const base64String = imageResponse.imageBase64;
      
      console.log("[Infographic] Infographic generation completed successfully");
      
      // Convert base64 to blob for storage
      const generatedImageBlob = base64ToBlob(base64String);
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
        : "Professional Amazon infographic created by transforming your uploaded product image with nanoBanana Pro - designed with perfect square format and accurate product colors";
        
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