/**
 * Gemini 3 Pro Image Generation API (Nano Banana Pro)
 * Official Google Gemini API for image generation
 * 
 * Model: gemini-3-pro-image-preview
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */

export interface GeminiImageConfig {
  apiKey: string;
  resolution?: "1K" | "2K" | "4K";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2" | "4:5" | "5:4" | "21:9";
}

export interface GeminiImageRequest {
  prompt: string;
  referenceImages?: string[]; // Base64 encoded images
  resolution?: "1K" | "2K" | "4K";
  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "2:3" | "3:2" | "4:5" | "5:4" | "21:9";
}

export interface GeminiImageResponse {
  success: boolean;
  imageBase64?: string;
  text?: string;
  error?: string;
}

// Official Google Gemini API endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

/**
 * Generate an image using Gemini 3 Pro Image (Nano Banana Pro)
 * @param config API configuration
 * @param request Image generation request
 * @returns Generated image as base64
 */
export async function generateImage(
  config: GeminiImageConfig,
  request: GeminiImageRequest
): Promise<GeminiImageResponse> {
  const { apiKey, resolution = "2K", aspectRatio = "1:1" } = config;
  const { prompt, referenceImages } = request;

  console.log("[Gemini Image] Starting image generation with gemini-3-pro-image-preview");
  console.log("[Gemini Image] Prompt length:", prompt.length);
  console.log("[Gemini Image] Reference images:", referenceImages?.length || 0);
  console.log("[Gemini Image] Resolution:", request.resolution || resolution);
  console.log("[Gemini Image] Aspect ratio:", request.aspectRatio || aspectRatio);

  try {
    // Build the parts array for the request
    // For IMAGE EDITING: image FIRST, then prompt - so model sees what to edit before instructions
    // For TEXT-TO-IMAGE: just prompt
    // https://ai.google.dev/gemini-api/docs/image-generation
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    
    // For image editing: Add reference images FIRST so model knows what to work with
    if (referenceImages && referenceImages.length > 0) {
      for (const imageBase64 of referenceImages) {
        parts.push({
          inline_data: {
            mime_type: "image/png",
            data: imageBase64,
          },
        });
      }
      console.log("[Gemini Image] Added", referenceImages.length, "reference image(s) FIRST (image editing mode)");
    }
    
    // Add the text prompt AFTER the image(s)
    parts.push({ text: prompt });

    // Build the request body according to Gemini API spec
    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: request.aspectRatio || aspectRatio,
          imageSize: request.resolution || resolution,
        },
      },
    };

    console.log("[Gemini Image] Sending request to Gemini API...");
    
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini Image] API error:", response.status, errorText);
      
      // Parse common error types
      if (response.status === 401 || response.status === 403) {
        throw new Error("Gemini API key is invalid or unauthorized. Please check your GEMINI_API_KEY.");
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      } else if (response.status === 400) {
        // Try to parse the error for more specific message
        try {
          const errorJson = JSON.parse(errorText);
          const errorMessage = errorJson.error?.message || errorText;
          throw new Error(`Invalid request: ${errorMessage}`);
        } catch {
          throw new Error(`Invalid request: ${errorText}`);
        }
      } else {
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("[Gemini Image] Response received successfully");

    // Parse the response according to Gemini API format
    // Response structure: { candidates: [{ content: { parts: [{ text?, inlineData? }] } }] }
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.error("[Gemini Image] Unexpected response format:", JSON.stringify(data).substring(0, 500));
      throw new Error("Unexpected response format from Gemini API");
    }

    let imageBase64: string | undefined;
    let text: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.text) {
        text = part.text;
        console.log("[Gemini Image] Got text response:", text?.substring(0, 100) + "...");
      } else if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        console.log("[Gemini Image] Got image response, base64 length:", imageBase64?.length || 0);
      }
    }

    if (!imageBase64) {
      // Check if there's an error or safety block
      if (candidate.finishReason === "SAFETY") {
        throw new Error("Image generation was blocked due to safety filters. Please try a different prompt or image.");
      }
      throw new Error("No image data returned from Gemini API. The model may have returned only text.");
    }

    return {
      success: true,
      imageBase64,
      text,
    };

  } catch (error) {
    console.error("[Gemini Image] Error:", error);
    
    if (error instanceof Error) {
      // Check for content policy errors
      if (error.message.includes("safety") || error.message.includes("SAFETY") || error.message.includes("blocked")) {
        return {
          success: false,
          error: "The image content doesn't meet generation guidelines. Please try with different images or adjust your requirements.",
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "An unexpected error occurred during image generation.",
    };
  }
}

/**
 * Edit an existing image using Gemini 3 Pro Image
 * This sends the current image + edit prompt for true image modification
 * Optionally includes a product reference image for product fidelity
 * 
 * @param config API configuration
 * @param currentImageBase64 The current generated image to edit
 * @param editPrompt The user's edit instruction
 * @param productImageBase64 Optional - original product image for product fidelity
 * @returns Edited image as base64
 */
export async function editImage(
  config: GeminiImageConfig,
  currentImageBase64: string,
  editPrompt: string,
  productImageBase64?: string
): Promise<GeminiImageResponse> {
  const { apiKey, resolution = "2K", aspectRatio = "1:1" } = config;

  console.log("[Gemini Edit] Starting image EDIT with gemini-3-pro-image-preview");
  console.log("[Gemini Edit] Edit prompt:", editPrompt);
  console.log("[Gemini Edit] Current image base64 length:", currentImageBase64.length);
  console.log("[Gemini Edit] Product reference image:", productImageBase64 ? "Yes" : "No");

  try {
    // Build the parts array - IMAGE(s) FIRST, then edit prompt
    // This follows Google's image editing pattern
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
    
    // 1. Add the current generated image (the one to edit) FIRST
    parts.push({
      inline_data: {
        mime_type: "image/png",
        data: currentImageBase64,
      },
    });
    console.log("[Gemini Edit] Added current image to edit");
    
    // 2. Optionally add the product image for product fidelity
    if (productImageBase64) {
      parts.push({
        inline_data: {
          mime_type: "image/png",
          data: productImageBase64,
        },
      });
      console.log("[Gemini Edit] Added product reference image for fidelity");
    }
    
    // 3. Add the edit prompt LAST
    // Make the prompt explicit about editing, not regenerating
    const fullPrompt = `EDIT THIS IMAGE based on my instructions. Keep everything else exactly the same.

INSTRUCTION: ${editPrompt}

IMPORTANT RULES:
- Only change what I specifically asked for
- Keep the scene, lighting, composition, and all other elements identical
- Keep the product looking exactly as it appears in the image
- This is an EDIT, not a regeneration - preserve as much as possible`;
    
    parts.push({ text: fullPrompt });
    console.log("[Gemini Edit] Added edit prompt");

    // Build the request body
    const requestBody = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio,
          imageSize: resolution,
        },
      },
    };

    console.log("[Gemini Edit] Sending edit request to Gemini API...");
    
    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Gemini Edit] API error:", response.status, errorText);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error("Gemini API key is invalid or unauthorized.");
      } else if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment and try again.");
      } else if (response.status === 400) {
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(`Invalid request: ${errorJson.error?.message || errorText}`);
        } catch {
          throw new Error(`Invalid request: ${errorText}`);
        }
      } else {
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();
    console.log("[Gemini Edit] Response received successfully");

    // Parse the response
    const candidate = data.candidates?.[0];
    if (!candidate?.content?.parts) {
      console.error("[Gemini Edit] Unexpected response format:", JSON.stringify(data).substring(0, 500));
      throw new Error("Unexpected response format from Gemini API");
    }

    let imageBase64: string | undefined;
    let text: string | undefined;

    for (const part of candidate.content.parts) {
      if (part.text) {
        text = part.text;
        console.log("[Gemini Edit] Got text response:", text?.substring(0, 100) + "...");
      } else if (part.inlineData) {
        imageBase64 = part.inlineData.data;
        console.log("[Gemini Edit] Got edited image, base64 length:", imageBase64?.length || 0);
      }
    }

    if (!imageBase64) {
      if (candidate.finishReason === "SAFETY") {
        throw new Error("Image editing was blocked due to safety filters. Please try a different edit.");
      }
      throw new Error("No image data returned from Gemini API.");
    }

    return {
      success: true,
      imageBase64,
      text,
    };

  } catch (error) {
    console.error("[Gemini Edit] Error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("safety") || error.message.includes("SAFETY") || error.message.includes("blocked")) {
        return {
          success: false,
          error: "The edit request doesn't meet generation guidelines. Please try a different edit.",
        };
      }
      
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: "An unexpected error occurred during image editing.",
    };
  }
}

/**
 * Convert a data URL (base64) to a clean base64 string for the API
 */
export function dataUrlToBase64(dataUrl: string): string {
  // Remove the data URL prefix if present
  if (dataUrl.startsWith("data:")) {
    const base64Index = dataUrl.indexOf(",");
    if (base64Index !== -1) {
      return dataUrl.substring(base64Index + 1);
    }
  }
  return dataUrl;
}

/**
 * Convert an image URL to base64 by fetching and encoding it
 */
export async function imageUrlToBase64(imageUrl: string): Promise<string> {
  console.log("[Gemini Image] Converting image URL to base64...");
  
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.status}`);
  }
  
  const blob = await response.blob();
  
  // Convert blob to base64 using array buffer
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  
  console.log("[Gemini Image] Converted image to base64, length:", base64.length);
  return base64;
}

/**
 * Smart helper that handles both URLs and data URLs
 * This fixes the bug where Convex storage URLs were being passed directly as base64
 */
export async function resolveImageToBase64(imageInput: string): Promise<string> {
  console.log("[Gemini Image] Resolving image input to base64...");
  console.log("[Gemini Image] Input type:", 
    imageInput.startsWith("http") ? "URL" : 
    imageInput.startsWith("data:") ? "Data URL" : "Raw base64"
  );
  console.log("[Gemini Image] Input length:", imageInput.length);
  
  // If it's a URL (http/https), fetch and convert
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    console.log("[Gemini Image] Fetching image from URL...");
    return await imageUrlToBase64(imageInput);
  }
  
  // If it's a data URL, extract base64
  if (imageInput.startsWith("data:")) {
    console.log("[Gemini Image] Extracting base64 from data URL...");
    return dataUrlToBase64(imageInput);
  }
  
  // Already base64
  console.log("[Gemini Image] Input appears to be raw base64");
  return imageInput;
}

/**
 * Convert base64 image to a Blob for storage
 */
export function base64ToBlob(base64: string, mimeType: string = "image/png"): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Get the Gemini API key from environment
 */
export function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key not configured. Please add GEMINI_API_KEY to your Convex environment variables."
    );
  }
  return apiKey;
}
