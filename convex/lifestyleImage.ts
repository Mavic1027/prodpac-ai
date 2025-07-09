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

// Enhanced conflict resolution function for multiple variables
function resolvePromptConflicts(basePrompt: string, userInstructions: string): string {
  if (!userInstructions.trim()) return basePrompt;
  
  let resolvedPrompt = basePrompt;
  const userLower = userInstructions.toLowerCase();
  
  // Dynamic variable replacement system for lifestyle images
  const variableReplacements = [];
  
  // Person/User variable detection and replacement
  const personKeywords = ['person', 'user', 'model', 'mom', 'dad', 'teen', 'teenager', 'senior', 'woman', 'man', 'child', 'adult', 'elderly', 'young', 'professional', 'athlete', 'student'];
  const personMatch = personKeywords.find(keyword => userLower.includes(keyword));
  if (personMatch) {
    let personReplacement = '';
    if (userLower.includes('mom') || userLower.includes('mother')) {
      personReplacement = 'mom (30s-40s)';
    } else if (userLower.includes('dad') || userLower.includes('father')) {
      personReplacement = 'dad (30s-40s)';
    } else if (userLower.includes('teen') || userLower.includes('teenager')) {
      personReplacement = 'teenager (16-19)';
    } else if (userLower.includes('senior') || userLower.includes('elderly')) {
      personReplacement = 'senior adult (60+)';
    } else if (userLower.includes('professional')) {
      personReplacement = 'professional (25-45)';
    } else if (userLower.includes('athlete')) {
      personReplacement = 'athlete/fitness enthusiast (20s-30s)';
    } else if (userLower.includes('student')) {
      personReplacement = 'college student (18-25)';
    } else if (userLower.includes('young')) {
      personReplacement = 'young adult (20s-30s)';
    } else {
      personReplacement = `${personMatch} (appropriate age demographic)`;
    }
    
    variableReplacements.push({
      pattern: /Target audience: [^\n]+/g,
      replacement: `Target audience: ${personReplacement}`,
      type: 'person'
    });
    console.log(`[Lifestyle Image] Replaced person with: ${personReplacement}`);
  }
  
  // Setting/Location variable detection and replacement  
  const settingKeywords = ['setting', 'location', 'place', 'kitchen', 'bedroom', 'office', 'gym', 'beach', 'park', 'outdoor', 'indoor', 'backyard', 'garden', 'living room', 'bathroom', 'garage', 'studio', 'restaurant', 'cafe', 'home', 'work'];
  const settingMatch = settingKeywords.find(keyword => userLower.includes(keyword));
  if (settingMatch) {
    let settingReplacement = '';
    if (userLower.includes('kitchen')) {
      settingReplacement = 'modern kitchen with natural lighting';
    } else if (userLower.includes('bedroom')) {
      settingReplacement = 'clean, well-lit bedroom';
    } else if (userLower.includes('office')) {
      settingReplacement = 'professional office or home office space';
    } else if (userLower.includes('gym')) {
      settingReplacement = 'well-equipped gym or fitness environment';
    } else if (userLower.includes('beach')) {
      settingReplacement = 'beautiful beach or coastal outdoor setting';
    } else if (userLower.includes('park')) {
      settingReplacement = 'scenic park or outdoor recreational area';
    } else if (userLower.includes('backyard') || userLower.includes('garden')) {
      settingReplacement = 'well-maintained backyard or garden space';
    } else if (userLower.includes('living room')) {
      settingReplacement = 'comfortable, modern living room';
    } else if (userLower.includes('outdoor')) {
      settingReplacement = 'appropriate outdoor environment';
    } else if (userLower.includes('indoor')) {
      settingReplacement = 'suitable indoor environment';
    } else {
      settingReplacement = `${settingMatch} environment`;
    }
    
    // Replace the scene guidance section
    const scenePattern = /• Pick a realistic environment that naturally fits[^•]+/gs;
    variableReplacements.push({
      pattern: scenePattern,
      replacement: `• Scene: ${settingReplacement}\n`,
      type: 'setting'
    });
    console.log(`[Lifestyle Image] Replaced setting with: ${settingReplacement}`);
  }
  
  // Activity variable detection and replacement
  const activityKeywords = ['activity', 'action', 'using', 'holding', 'doing', 'performing', 'exercise', 'exercising', 'work', 'working', 'play', 'playing', 'cook', 'cooking', 'clean', 'cleaning', 'relax', 'relaxing', 'study', 'studying'];
  const activityMatch = activityKeywords.find(keyword => userLower.includes(keyword));
  if (activityMatch) {
    let activityReplacement = '';
    if (userLower.includes('cook') || userLower.includes('cooking')) {
      activityReplacement = 'cooking or meal preparation';
    } else if (userLower.includes('exercise') || userLower.includes('exercising') || userLower.includes('workout')) {
      activityReplacement = 'exercising or working out';
    } else if (userLower.includes('work') || userLower.includes('working')) {
      activityReplacement = 'working or being productive';
    } else if (userLower.includes('relax') || userLower.includes('relaxing')) {
      activityReplacement = 'relaxing or leisure activity';
    } else if (userLower.includes('clean') || userLower.includes('cleaning')) {
      activityReplacement = 'cleaning or organizing';
    } else if (userLower.includes('study') || userLower.includes('studying')) {
      activityReplacement = 'studying or learning';
    } else {
      activityReplacement = `${activityMatch}`;
    }
    
    // Replace the interaction description
    const interactionPattern = /• Place a [^•]+model using or interacting with the product[^•]+/gs;
    variableReplacements.push({
      pattern: interactionPattern,
      replacement: `• Show the model ${activityReplacement} with the product in a way that highlights its key features.\n`,
      type: 'activity'
    });
    console.log(`[Lifestyle Image] Replaced activity with: ${activityReplacement}`);
  }
  
  // Apply all replacements
  for (const replacement of variableReplacements) {
    resolvedPrompt = resolvedPrompt.replace(replacement.pattern, replacement.replacement);
  }
  
  // If no specific variables were replaced but user has instructions, add as context
  if (variableReplacements.length === 0) {
    console.log(`[Lifestyle Image] No specific variables detected, adding as general context enhancement`);
  }
  
  return resolvedPrompt;
}

// Add prompt variation function based on agent instance and product context
function applyPromptVariations(basePrompt: string, agentInstance: number, productData: any, profileData: any): string {
  console.log(`[Lifestyle Image] Applying prompt variations for agent instance ${agentInstance}`);
  
  // Extract product context for intelligent variations
  const targetAudience = productData.targetAudience === "Custom" && productData.customTargetAudience 
    ? productData.customTargetAudience 
    : productData.targetAudience || profileData?.targetAudience || "general audience";
  
  const productCategory = productData.productCategory || profileData?.productCategory || "General Products";
  
  console.log(`[Lifestyle Image] Product context: Category=${productCategory}, Audience=${targetAudience}`);
  
  // Smart context-aware variations
  type VariationConfig = {
    person: string;
    setting: string;
    context: string;
    focus: string;
  };
  
  let variations: { [key: number]: VariationConfig } = {
    1: { person: targetAudience, setting: "home environment", context: "daily routine", focus: "convenience and practical use" },
    2: { person: targetAudience, setting: "outdoor environment", context: "leisure activities", focus: "outdoor use and benefits" },
    3: { person: targetAudience, setting: "social environment", context: "social activities", focus: "social confidence" },
    4: { person: targetAudience, setting: "professional environment", context: "professional occasions", focus: "quality and professional applications" }
  };
  
  // Detect specific context combinations and create targeted variations
  const audienceLower = targetAudience.toLowerCase();
  const categoryLower = productCategory.toLowerCase();
  
  // Golf-related contexts
  if (audienceLower.includes('golf') || categoryLower.includes('golf') || audienceLower.includes('golfer')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "golf course during active play",
        context: "mid-swing action shot showing product in dynamic use",
        focus: "ACTION SHOT: Show ${targetAudience} in mid-golf swing or putting stance, with product clearly visible during athletic movement. Focus on dynamic motion and performance."
      },
      2: {
        person: `${targetAudience}`,
        setting: "golf course preparation area with golf bag and equipment",
        context: "getting ready for golf, organizing gear and equipment",
        focus: "PREPARATION SCENE: Show ${targetAudience} standing full-body next to golf bag, selecting clubs or organizing equipment, with product as part of complete golf outfit. Focus on the ritual of preparing for golf."
      },
      3: {
        person: `${targetAudience}`,
        setting: "golf cart or clubhouse social environment",
        context: "social golf moment, interacting with others or enjoying break",
        focus: "SOCIAL MOMENT: Show ${targetAudience} in golf cart between holes, or casual conversation at clubhouse, with product visible during social interaction. Focus on the community aspect of golf."
      },
      4: {
        person: `${targetAudience}`,
        setting: "golf green during quiet moment",
        context: "close-up lifestyle moment, adjusting product or taking a break",
        focus: "INTIMATE MOMENT: Close-up or portrait shot of ${targetAudience} adjusting product (like visor), taking a drink, or quiet moment of focus on the green. Show product as personal gear that enhances the experience."
      }
    };
  }
  // Tennis-related contexts
  else if (audienceLower.includes('tennis') || categoryLower.includes('tennis')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "tennis court during active play",
        context: "action shot during tennis match or practice",
        focus: "ACTION SHOT: Show ${targetAudience} in mid-serve, forehand swing, or athletic movement, with product clearly visible during dynamic tennis action. Focus on performance and movement."
      },
      2: {
        person: `${targetAudience}`,
        setting: "tennis court sideline with racquet and gear",
        context: "between sets, organizing equipment and taking break",
        focus: "GEAR MOMENT: Show ${targetAudience} full-body with tennis racquet, towel, and equipment, with product as part of complete tennis outfit. Focus on the professional preparation aspect."
      },
      3: {
        person: `${targetAudience}`,
        setting: "tennis club social area or bench",
        context: "post-match social interaction or rest",
        focus: "SOCIAL MOMENT: Show ${targetAudience} sitting on bench, talking with partner, or casual moment at tennis club, with product visible during social interaction. Focus on tennis community."
      },
      4: {
        person: `${targetAudience}`,
        setting: "tennis court close-up during break",
        context: "intimate moment adjusting product or hydrating",
        focus: "PERSONAL MOMENT: Close-up shot of ${targetAudience} adjusting product, wiping sweat, or drinking water between games. Show product as essential personal gear."
      }
    };
  }
  // Running/Fitness contexts
  else if (audienceLower.includes('run') || audienceLower.includes('fitness') || audienceLower.includes('athlete') || categoryLower.includes('fitness') || categoryLower.includes('sports')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "outdoor trail or track during active workout",
        context: "mid-run or active exercise motion",
        focus: "ACTION SHOT: Show ${targetAudience} in mid-stride running, jumping, or dynamic exercise movement, with product clearly visible during athletic performance. Focus on motion and energy."
      },
      2: {
        person: `${targetAudience}`,
        setting: "gym or fitness facility with equipment",
        context: "strength training or workout preparation",
        focus: "WORKOUT SCENE: Show ${targetAudience} full-body with weights, exercise equipment, or gym setup, with product as part of complete workout attire. Focus on serious training preparation."
      },
      3: {
        person: `${targetAudience}`,
        setting: "post-workout recovery area or locker room",
        context: "cooling down, hydrating, or post-workout social moment",
        focus: "RECOVERY MOMENT: Show ${targetAudience} stretching, drinking water, or casual conversation after workout, with product visible during recovery. Focus on the post-exercise lifestyle."
      },
      4: {
        person: `${targetAudience}`,
        setting: "outdoor fitness environment during break",
        context: "checking fitness tracker, taking selfie, or quiet moment",
        focus: "PERSONAL MOMENT: Close-up or portrait of ${targetAudience} checking phone/watch, adjusting product, or taking a break. Show product as personal fitness companion."
      }
    };
  }
  // Kitchen/Cooking contexts
  else if (audienceLower.includes('cook') || audienceLower.includes('chef') || categoryLower.includes('kitchen') || categoryLower.includes('cooking')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "kitchen during active cooking",
        context: "mid-cooking action, stirring, chopping, or preparing food",
        focus: "ACTION SHOT: Show ${targetAudience} actively cooking, stirring pot, chopping vegetables, or hands-on food preparation, with product clearly visible during cooking action. Focus on culinary skill in motion."
      },
      2: {
        person: `${targetAudience}`,
        setting: "kitchen with ingredients and cooking tools laid out",
        context: "meal planning and ingredient preparation",
        focus: "PREPARATION SCENE: Show ${targetAudience} full-body organizing ingredients, reading recipe, or setting up cooking station, with product as part of complete cooking setup. Focus on the ritual of meal preparation."
      },
      3: {
        person: `${targetAudience}`,
        setting: "dining area or kitchen island with finished meal",
        context: "presenting finished dish or sharing meal with others",
        focus: "PRESENTATION MOMENT: Show ${targetAudience} serving food, setting table, or sharing meal with family/friends, with product visible during social dining. Focus on the joy of sharing food."
      },
      4: {
        person: `${targetAudience}`,
        setting: "kitchen during quiet cooking moment",
        context: "tasting food, taking break, or enjoying cooking process",
        focus: "INTIMATE MOMENT: Close-up of ${targetAudience} tasting food, adjusting seasoning, or peaceful moment during cooking, with product as personal cooking companion. Focus on the meditative aspect of cooking."
      }
    };
  }
  // Parent/Family contexts
  else if (audienceLower.includes('parent') || audienceLower.includes('mom') || audienceLower.includes('dad') || audienceLower.includes('family')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "home during busy family activity",
        context: "multitasking, helping children, or managing household tasks",
        focus: "ACTION SHOT: Show ${targetAudience} in motion helping children, carrying items, or managing multiple tasks, with product clearly visible during active parenting. Focus on the dynamic nature of family life."
      },
      2: {
        person: `${targetAudience}`,
        setting: "family space with children and family items",
        context: "family time, playing with children, or organizing family activities",
        focus: "FAMILY SCENE: Show ${targetAudience} full-body with children, toys, or family gear, with product as part of complete family lifestyle. Focus on the joy of family interaction."
      },
      3: {
        person: `${targetAudience}`,
        setting: "quiet family moment or evening routine",
        context: "bedtime routine, reading to children, or peaceful family time",
        focus: "NURTURING MOMENT: Show ${targetAudience} reading to child, tucking in, or gentle family interaction, with product visible during tender moments. Focus on the caring aspect of parenting."
      },
      4: {
        person: `${targetAudience}`,
        setting: "personal space during rare quiet moment",
        context: "self-care break, coffee time, or personal reflection",
        focus: "PERSONAL MOMENT: Close-up of ${targetAudience} enjoying coffee, reading, or taking a personal break, with product as personal comfort item. Focus on the importance of self-care for parents."
      }
    };
  }
  // Professional/Work contexts
  else if (audienceLower.includes('professional') || audienceLower.includes('business') || audienceLower.includes('office') || audienceLower.includes('work')) {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "office during active work",
        context: "focused work session, presenting, or collaborative meeting",
        focus: "ACTION SHOT: Show ${targetAudience} actively working at computer, presenting to colleagues, or engaged in dynamic work activity, with product clearly visible during professional performance. Focus on competence and focus."
      },
      2: {
        person: `${targetAudience}`,
        setting: "office or workspace with professional tools",
        context: "workspace organization, planning, or preparing for work",
        focus: "WORKSPACE SCENE: Show ${targetAudience} full-body with desk, documents, or professional equipment, with product as part of complete professional setup. Focus on preparation and organization."
      },
      3: {
        person: `${targetAudience}`,
        setting: "business networking or meeting environment",
        context: "professional networking, client meeting, or business social event",
        focus: "NETWORKING MOMENT: Show ${targetAudience} shaking hands, in conversation, or at business event, with product visible during professional interaction. Focus on professional relationships."
      },
      4: {
        person: `${targetAudience}`,
        setting: "quiet office moment or break area",
        context: "coffee break, reflection, or personal moment at work",
        focus: "PERSONAL MOMENT: Close-up of ${targetAudience} drinking coffee, looking out window, or quiet moment of reflection, with product as personal professional companion. Focus on work-life balance."
      }
    };
  }
  // Generic fallback - only used if no specific context detected
  else {
    variations = {
      1: {
        person: `${targetAudience}`,
        setting: "home environment during active use",
        context: "person actively using or interacting with product in daily routine",
        focus: "ACTION SHOT: Show ${targetAudience} actively using the product in daily routine, with product clearly visible during functional use. Focus on practical application and everyday utility."
      },
      2: {
        person: `${targetAudience}`,
        setting: "lifestyle environment with personal items",
        context: "product as part of complete lifestyle setup",
        focus: "LIFESTYLE SCENE: Show ${targetAudience} full-body with product as part of complete personal style or setup, surrounded by relevant lifestyle items. Focus on how product fits into their world."
      },
      3: {
        person: `${targetAudience}`,
        setting: "social environment with others",
        context: "sharing or enjoying product in social setting",
        focus: "SOCIAL MOMENT: Show ${targetAudience} using product while interacting with others, sharing experience, or in community setting. Focus on social confidence and connection."
      },
      4: {
        person: `${targetAudience}`,
        setting: "personal space during quiet moment",
        context: "intimate personal moment with product",
        focus: "PERSONAL MOMENT: Close-up or portrait shot of ${targetAudience} in quiet moment with product, showing personal connection or satisfaction. Focus on emotional connection and personal value."
      }
    };
  }
  
  // Apply the variation
  const variation = variations[agentInstance as keyof typeof variations] || variations[1];
  
  let modifiedPrompt = basePrompt;
  
  // Replace target audience with variation-specific person (keep original audience)
  modifiedPrompt = modifiedPrompt.replace(
    /Target audience: [^\n]+/g,
    `Target audience: ${variation.person}`
  );
  
  // Replace scene guidance with variation-specific setting and storytelling context
  const scenePattern = /• Pick a realistic environment that naturally fits[^•]+/gs;
  modifiedPrompt = modifiedPrompt.replace(
    scenePattern,
    `• Scene: ${variation.setting}\n• Story: ${variation.context}\n`
  );
  
  // Replace the entire interaction description with variation-specific storytelling focus
  const interactionPattern = /(• Place a [^•]+model using or interacting with the product in a way that spotlights[^•]+)/gs;
  modifiedPrompt = modifiedPrompt.replace(
    interactionPattern,
    `• ${variation.focus}\n`
  );
  
  console.log(`[Lifestyle Image] Applied variation ${agentInstance}: ${variation.person} in ${variation.setting} focusing on ${variation.focus}`);
  
  return modifiedPrompt;
}

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

      // Apply prompt variations based on agent instance if provided
      if (args.agentInstance && args.agentInstance >= 1 && args.agentInstance <= 4) {
        console.log("[Lifestyle Image] Applying prompt variations for agent instance", args.agentInstance);
        lifestyleImagePrompt = applyPromptVariations(lifestyleImagePrompt, args.agentInstance, productData, args.profileData);
      } else {
        console.log("[Lifestyle Image] No agent instance provided or invalid, using base prompt");
      }

      // If user provided specific instructions via chat, resolve conflicts first
      if (args.additionalContext && args.additionalContext.trim()) {
        console.log("[Lifestyle Image] Adding user-specific instructions:", args.additionalContext);
        console.log("[Lifestyle Image] Resolving prompt conflicts with user instructions...");
        
        // Apply smart conflict resolution that replaces variables intelligently
        lifestyleImagePrompt = resolvePromptConflicts(lifestyleImagePrompt, args.additionalContext);
        
        // Now add user instructions as primary directive
        lifestyleImagePrompt += `\n\n🎯 PRIMARY USER REQUEST: "${args.additionalContext}"\n`;
        lifestyleImagePrompt += `IMPORTANT: The user's request above is the PRIMARY instruction. Follow it precisely while maintaining lifestyle context and Amazon compliance.\n`;
        lifestyleImagePrompt += `If there are any conflicts between the user's request and other instructions, ALWAYS prioritize the user's request.`;
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