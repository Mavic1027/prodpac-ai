/**
 * Optimized Prompt Builder for Gemini 3 Pro Image (gemini-3-pro-image-preview)
 * 
 * FULLY DYNAMIC - All outputs are driven by user inputs:
 * - Product name, category, features from Product Node
 * - Target audience from Product Node
 * - Brand colors and voice from Brand Kit
 * 
 * NO hardcoded assumptions about backgrounds, avatars, or scenarios.
 * https://ai.google.dev/gemini-api/docs/image-generation
 */

export interface ProductData {
  title?: string;
  productName?: string;
  keyFeatures?: string;
  features?: string[];
  targetKeywords?: string;
  targetAudience?: string;
  customTargetAudience?: string;
  productCategory?: string;
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
}

export interface ProfileData {
  brandName: string;
  productCategory: string;
  niche: string;
  tone?: string;
  targetAudience?: string;
}

export interface BrandKitData {
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

/**
 * Get brand colors from brand kit data
 */
function getBrandColors(brandKitData?: BrandKitData | null): { primary: string; secondary: string; accent: string } | null {
  if (!brandKitData) return null;
  
  if (brandKitData.colorPalette.type === "custom" && brandKitData.colorPalette.custom) {
    return brandKitData.colorPalette.custom;
  }
  
  const presetColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    "Professional Blue": { primary: "#2563eb", secondary: "#1e40af", accent: "#60a5fa" },
    "Warm Earth": { primary: "#92400e", secondary: "#78350f", accent: "#f59e0b" },
    "Bold Modern": { primary: "#1f2937", secondary: "#111827", accent: "#6366f1" },
    "Fresh Green": { primary: "#059669", secondary: "#047857", accent: "#34d399" },
    "Elegant Purple": { primary: "#7c3aed", secondary: "#6d28d9", accent: "#a78bfa" },
    "Coral Sunset": { primary: "#f43f5e", secondary: "#e11d48", accent: "#fda4af" },
  };
  
  if (brandKitData.colorPalette.preset && presetColors[brandKitData.colorPalette.preset]) {
    return presetColors[brandKitData.colorPalette.preset];
  }
  
  return null;
}

/**
 * Build optimized Hero Image prompt for Gemini 3 Pro
 * Fully dynamic based on user inputs
 */
export function buildHeroImagePrompt(
  productData: ProductData,
  profileData?: ProfileData,
  brandKitData?: BrandKitData | null,
  agentInstance: number = 1
): string {
  const productName = productData.productName || productData.title || "the product";
  const productCategory = productData.productCategory || profileData?.productCategory || "";
  
  // Camera angle variations - these are technical photography choices, not assumptions about the product
  const angleVariations: Record<number, string> = {
    1: "three-quarter front view at a 45 degree angle",
    2: "side profile view",
    3: "straight-on front view",
    4: "slightly elevated overhead perspective"
  };
  const cameraAngle = angleVariations[agentInstance] || angleVariations[1];

  let prompt = `Create a professional Amazon product hero image.

PRODUCT: ${productName}${productCategory ? ` (${productCategory})` : ""}

REQUIREMENTS:
- Pure white background (RGB 255, 255, 255)
- Product fills 85-90% of the frame, perfectly centered
- ${cameraAngle}
- The product must look EXACTLY like the reference image - preserve all colors, textures, shapes, and details perfectly
- Professional studio lighting: bright, even, diffused with soft natural shadow beneath product
- Ultra-sharp focus on entire product, all edges crisp
- Photorealistic quality, professional product photography
- Square 1:1 format

DO NOT include:
- Text, watermarks, or logos
- Props, people, or additional objects
- Colored backgrounds or gradients
- Any alterations to the product appearance`;

  return prompt;
}

/**
 * Build optimized Lifestyle Image prompt for Gemini 3 Pro
 * Uses IMAGE EDITING mode - the attached image IS the product
 * Following Google's documentation pattern: short, direct prompts with clear image reference
 * https://ai.google.dev/gemini-api/docs/image-generation
 */
export function buildLifestyleImagePrompt(
  productData: ProductData,
  profileData?: ProfileData,
  brandKitData?: BrandKitData | null,
  agentInstance: number = 1
): string {
  const productName = productData.productName || productData.title || "product";
  const targetAudience = productData.customTargetAudience || productData.targetAudience || profileData?.targetAudience || "";
  const productCategory = productData.productCategory || profileData?.productCategory || "";

  // Get scene variation for this instance
  const scene = getLifestyleScene(agentInstance, targetAudience, productCategory);
  
  console.log(`[PromptBuilder] Lifestyle Image - Instance: ${agentInstance}, Scene: ${scene.type}`);

  // SHORT, DIRECT prompt following Google's documentation pattern
  // Key: Reference "this product" to link to the attached image
  const prompt = `Create an Amazon lifestyle photo of THIS EXACT PRODUCT being used in real life.

The product in this image is a ${productName}${productCategory ? ` (${productCategory})` : ""}.

SCENE: ${scene.description}

RULES:
- The product must look IDENTICAL to the image I provided - same exact shape, colors, size, and all details
- Show ${scene.person} naturally using or holding this product
- Setting: ${scene.setting}
- Professional photography, natural lighting, photorealistic
- Square format, no text or watermarks

Keep this product exactly as shown. Do not redesign it.`;

  return prompt;
}

/**
 * Get a specific scene based on instance number - 4 truly different scenarios
 */
function getLifestyleScene(
  instance: number,
  targetAudience: string,
  productCategory: string
): {
  type: string;
  description: string;
  person: string;
  setting: string;
} {
  // Determine WHO should be in the photo based on target audience
  const person = getPersonForAudience(targetAudience);
  
  // Determine WHERE based on product category
  const settings = getSettingsForCategory(productCategory);
  
  // 4 distinctly different scene types
  const scenes: Record<number, { type: string; description: string; setting: string }> = {
    1: {
      type: "active-use",
      description: `Show ${person} actively using this product for its main purpose. Action shot with clear product visibility.`,
      setting: settings.primary
    },
    2: {
      type: "social",
      description: `Show ${person} with family or friends, using this product together. Warm, connected moment.`,
      setting: settings.social
    },
    3: {
      type: "outdoor",
      description: `Show ${person} using this product outdoors. Active lifestyle, natural environment.`,
      setting: settings.outdoor
    },
    4: {
      type: "relaxed",
      description: `Show ${person} in a calm moment with this product. Personal, intimate scene.`,
      setting: settings.relaxed
    }
  };
  
  const selectedScene = scenes[instance] || scenes[1];
  
  return {
    ...selectedScene,
    person
  };
}

/**
 * Determine the right person description based on target audience
 */
function getPersonForAudience(targetAudience: string): string {
  const audience = targetAudience.toLowerCase();
  
  if (audience.includes("kid") || audience.includes("child")) {
    return "a happy child (8-12 years old)";
  }
  if (audience.includes("parent") || audience.includes("mom") || audience.includes("dad")) {
    return "a parent in their 30s-40s";
  }
  if (audience.includes("senior") || audience.includes("elderly") || audience.includes("grandpa") || audience.includes("grandma")) {
    return "an active senior adult (60s-70s)";
  }
  if (audience.includes("teen")) {
    return "a teenager (15-18 years old)";
  }
  if (audience.includes("fitness") || audience.includes("athlete")) {
    return "a fit adult in athletic wear";
  }
  if (audience.includes("professional") || audience.includes("business")) {
    return "a professional adult in smart casual attire";
  }
  if (audience.includes("golf")) {
    return "a golfer in classic golf attire";
  }
  
  // Default: use the target audience directly if provided
  if (targetAudience && targetAudience.length > 2) {
    return `a ${targetAudience}`;
  }
  
  return "an adult";
}

/**
 * Get appropriate settings based on product category
 */
function getSettingsForCategory(category: string): {
  primary: string;
  social: string;
  outdoor: string;
  relaxed: string;
} {
  const cat = category.toLowerCase();
  
  if (cat.includes("kitchen") || cat.includes("cooking")) {
    return {
      primary: "modern kitchen",
      social: "dining room with family",
      outdoor: "backyard BBQ or picnic",
      relaxed: "cozy breakfast nook"
    };
  }
  if (cat.includes("lawn") || cat.includes("garden") || cat.includes("outdoor")) {
    return {
      primary: "well-maintained backyard",
      social: "backyard with family",
      outdoor: "sunny garden or lawn",
      relaxed: "patio overlooking garden"
    };
  }
  if (cat.includes("toy") || cat.includes("kid") || cat.includes("game")) {
    return {
      primary: "bright playroom",
      social: "living room with family",
      outdoor: "backyard or playground",
      relaxed: "cozy reading corner"
    };
  }
  if (cat.includes("sport") || cat.includes("fitness")) {
    return {
      primary: "gym or home workout area",
      social: "fitness class or with workout partner",
      outdoor: "running trail or park",
      relaxed: "post-workout stretching area"
    };
  }
  if (cat.includes("office") || cat.includes("work")) {
    return {
      primary: "home office",
      social: "meeting room",
      outdoor: "cafe with laptop",
      relaxed: "comfortable study"
    };
  }
  
  // Default settings
  return {
    primary: "appropriate indoor setting",
    social: "living room with others",
    outdoor: "outdoor environment",
    relaxed: "comfortable home setting"
  };
}

/**
 * Build optimized Infographic prompt for Gemini 3 Pro
 * FULLY DYNAMIC - all content derived from user inputs
 */
export function buildInfographicPrompt(
  productData: ProductData,
  profileData?: ProfileData,
  brandKitData?: BrandKitData | null,
  templateId: string = "main_benefit",
  usingHeroImageBase: boolean = false
): string {
  const productName = productData.productName || productData.title || "the product";
  const keyFeatures = productData.keyFeatures || productData.features?.join(", ") || "";
  const featuresList = keyFeatures.split(/[\n•;,]+/).map(f => f.trim()).filter(f => f.length > 0);
  const topFeature = featuresList[0] || "";
  const targetAudience = productData.customTargetAudience || productData.targetAudience || profileData?.targetAudience || "";
  const productCategory = productData.productCategory || profileData?.productCategory || "";
  const dimensions = productData.specifications?.dimensions || "";
  const materials = productData.specifications?.materials?.join(", ") || "";
  const brandColors = getBrandColors(brandKitData);
  const brandName = brandKitData?.brandName || profileData?.brandName || "";
  
  // Color instruction if brand colors available
  const colorInstruction = brandColors 
    ? `Use these brand colors for text and design elements: Primary ${brandColors.primary}, Accent ${brandColors.accent}.`
    : "";

  // Build product context section
  let productContext = `PRODUCT: ${productName}`;
  if (productCategory) productContext += `\nCATEGORY: ${productCategory}`;
  if (targetAudience) productContext += `\nTARGET AUDIENCE: ${targetAudience}`;
  if (keyFeatures) productContext += `\nKEY FEATURES: ${keyFeatures}`;
  if (brandName) productContext += `\nBRAND: ${brandName}`;

  // Base requirements for all infographics
  const baseRequirements = `
CRITICAL REQUIREMENTS:
- The product must look EXACTLY like the reference image - same colors, shape, and all details
- All text must be crisp, legible, and readable on mobile devices
- Professional graphic design quality
- Square 1:1 format
- No watermarks or stock photo aesthetics
${colorInstruction}

All headlines, callouts, and text should be derived from the product information above - do not invent features or benefits not mentioned.`;

  // Template-specific prompts - all driven by user data
  switch (templateId) {
    case "main_benefit":
      return `Create a professional Amazon infographic for this product.

${productContext}

TEMPLATE: Main Benefit Highlight

LAYOUT:
- Product takes up 60% of the image, positioned center-left
- ${usingHeroImageBase ? "Keep the clean white background" : "Add a subtle background appropriate for this product category"}

TEXT OVERLAYS (derive from the features above):
${topFeature ? `- A bold headline about "${topFeature}"` : "- A bold headline about the product's #1 benefit from the features listed"}
- A supporting line expanding on that benefit
- A call-to-action phrase relevant to this product

DESIGN ELEMENTS:
- Add a callout pointing to the relevant feature area on the product
- Include an icon that represents the main benefit
${baseRequirements}`;

    case "feature_callouts":
      return `Create a professional Amazon infographic with feature callouts.

${productContext}

TEMPLATE: Feature Callouts (3-5 features)

LAYOUT:
- Product centered, taking up 50% of the image
- Callout boxes arranged around the product

FEATURES TO HIGHLIGHT:
${featuresList.length > 0 
  ? featuresList.slice(0, 5).map((f, i) => `${i + 1}. ${f}`).join('\n')
  : "- Use the key features from the product information above"}

DESIGN:
- Each callout box has a short label and a relevant icon
- Clean lines connect each callout to the relevant part of the product
- A headline summarizing the product's value
${baseRequirements}`;

    case "size_chart":
      return `Create a professional Amazon size/dimensions infographic.

${productContext}
${dimensions ? `DIMENSIONS: ${dimensions}` : ""}

TEMPLATE: Size / Dimensions Chart

LAYOUT:
- Product positioned to clearly show all measurable dimensions
- Clean background for clarity

DIMENSION DISPLAY:
- Professional dimension lines with arrows on both ends
${dimensions ? `- Show these measurements: ${dimensions}` : "- Show the product's height, width, and depth/length"}
- Display in both inches and centimeters
- Each dimension clearly labeled

Optional: Include a scale reference appropriate for this product type.
${baseRequirements}`;

    case "whats_included":
      return `Create a professional "What's Included" Amazon infographic.

${productContext}

TEMPLATE: What's Included / Package Contents

LAYOUT:
- Flat-lay or organized grid showing all included items
- Main product prominent, any accessories arranged around it

DESIGN:
- Each item clearly labeled with name and quantity
- Optional numbered callouts
- A headline like "Everything You Get" or "Complete Package"
- Clean, organized appearance

Base the included items on what would logically come with this ${productCategory || "type of"} product.
${baseRequirements}`;

    case "comparison":
      return `Create a professional comparison infographic.

${productContext}

TEMPLATE: Comparison (Us vs. Alternatives)

LAYOUT:
- Side-by-side comparison format
- This product on the RIGHT (winning side) using the reference image
- Generic alternative representation on the LEFT

COMPARISON POINTS:
${featuresList.length > 0 
  ? `Compare based on these features:\n${featuresList.slice(0, 5).map(f => `- ${f}`).join('\n')}`
  : "- Compare based on the key features listed above"}

DESIGN:
- Use green checkmarks ✓ for this product's advantages
- Use red X marks ✗ for alternative shortcomings
- 3-5 comparison rows based on the actual features

${brandName ? `HEADLINE: "Why Choose ${brandName}?"` : `HEADLINE: Create a compelling comparison headline`}
${baseRequirements}`;

    case "materials":
      return `Create a professional materials/ingredients infographic.

${productContext}
${materials ? `MATERIALS: ${materials}` : ""}

TEMPLATE: Materials / Ingredients Breakdown

LAYOUT:
- Product as the main visual
- Callouts pointing to different material areas

MATERIALS TO HIGHLIGHT:
${materials ? materials : (keyFeatures ? `Derive materials from: ${keyFeatures}` : "Show the key materials/components of this product")}

DESIGN:
- Each material paired with its benefit
- Optional: magnified detail circles showing material textures
- Icons representing each material type
- Headline about quality materials
${baseRequirements}`;

    case "use_cases":
      return `Create a professional use cases infographic.

${productContext}

TEMPLATE: Use Cases / Scenarios Grid

LAYOUT:
- 2x2 grid or multi-panel layout
- Product shown in different usage scenarios

SCENARIOS:
Determine 3-4 realistic use cases based on:
- The product category: ${productCategory || "this product type"}
- The target audience: ${targetAudience || "the intended users"}
- The key features: ${keyFeatures || "what this product does"}

Each panel should have:
- Product visible in that scenario
- Short label describing the use case

All scenarios must be appropriate for THIS specific product - do not use generic scenarios.
${baseRequirements}`;

    case "before_after":
      return `Create a professional before/after infographic.

${productContext}

TEMPLATE: Before / After Transformation

LAYOUT:
- Side-by-side or top-bottom split
- BEFORE: Problem state that this product solves
- AFTER: Solution achieved with this product

The before/after should be relevant to what this ${productCategory || ""} product actually does based on its features: ${keyFeatures || "the product benefits"}

DESIGN:
- Clear "BEFORE" and "AFTER" labels
- Visual flow between the two sides
- Product featured prominently in the "AFTER" section
- Brief text describing the transformation
${baseRequirements}`;

    case "tech_exploded":
      return `Create a professional exploded/cutaway view infographic.

${productContext}

TEMPLATE: Technical Exploded View

LAYOUT:
- Technical exploded view showing internal components
- Components slightly separated to show how they fit together

DESIGN:
- Label 3-5 key components based on the product's features: ${keyFeatures || "the main components"}
- Clean connector lines from labels to components
- Each label includes component name and its benefit
- Technical illustration style appropriate for this product type

HEADLINE: Create a headline about the engineering/quality
${baseRequirements}`;

    case "compatibility":
      return `Create a professional compatibility guide infographic.

${productContext}

TEMPLATE: Compatibility Guide

LAYOUT:
- Product in the center
- Compatible items/devices arranged around it

DESIGN:
- Show items that would logically be compatible with this ${productCategory || ""} product
- Green checkmarks next to each compatible item
- Clear labels for each compatible device/category

Determine compatible items based on:
- Product category: ${productCategory || "this product type"}
- Key features: ${keyFeatures || "what this product does"}

HEADLINE: Create a compatibility headline
${baseRequirements}`;

    default:
      return `Create a professional Amazon infographic.

${productContext}

Create an infographic that highlights the key benefits of this product for ${targetAudience || "the target customer"}.

- Product should take up 60% of the image
- Add compelling text overlays based on the features listed above
- All content should be derived from the product information provided
${baseRequirements}`;
  }
}

/**
 * Build optimized Hero Image Refinement prompt for Gemini 3 Pro
 */
export function buildRefinementPrompt(
  userFeedback: string,
  productData: ProductData,
  profileData?: ProfileData
): string {
  const productName = productData.productName || productData.title || "the product";
  const productCategory = productData.productCategory || profileData?.productCategory || "";

  return `Refine this Amazon hero image based on the following feedback:

USER REQUEST: "${userFeedback}"

PRODUCT: ${productName}${productCategory ? ` (${productCategory})` : ""}

REQUIREMENTS:
- Apply ONLY the changes requested above
- Keep everything else the same
- Maintain pure white background
- Product fills 85-90% of frame
- Professional studio lighting
- Sharp focus on all product edges
- The product must still look exactly like the original - only modify what was requested

DO NOT add text, watermarks, props, or colored backgrounds.`;
}
