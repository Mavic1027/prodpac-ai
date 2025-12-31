/**
 * Thumbnail Generator using Gemini 3 Pro Image (Nano Banana Pro)
 * Client-side utility for generating YouTube thumbnails
 * 
 * Model: gemini-3-pro-image-preview
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */

// Official Google Gemini API endpoint
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

interface ThumbnailGeneratorOptions {
  images: File[];
  prompt: string;
  apiKey: string;
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
}

/**
 * Convert a File to base64 string
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix if present
      const base64Index = result.indexOf(",");
      if (base64Index !== -1) {
        resolve(result.substring(base64Index + 1));
      } else {
        resolve(result);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function generateThumbnailWithGPTImage({
  images,
  prompt,
  apiKey,
}: ThumbnailGeneratorOptions): Promise<{ imageUrl: string; base64?: string }> {
  
  // Convert first image to base64 for Gemini
  const referenceImageBase64 = await fileToBase64(images[0]);
  console.log("[Thumbnail Generator] Reference image base64 length:", referenceImageBase64.length);

  // Build request parts
  const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
    { text: prompt },
    {
      inline_data: {
        mime_type: images[0].type || "image/png",
        data: referenceImageBase64,
      },
    },
  ];

  // Build request body according to Gemini API spec
  const requestBody = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: "16:9", // YouTube thumbnail aspect ratio
        imageSize: "2K",
      },
    },
  };

  console.log("[Thumbnail Generator] Generating thumbnail with gemini-3-pro-image-preview...");
  
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
    console.error("[Thumbnail Generator] API error:", response.status, errorText);
    
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gemini API key is invalid. Please check your API key.");
    } else if (response.status === 429) {
      throw new Error("Too many requests. Please wait a moment and try again.");
    } else {
      throw new Error(`Gemini API error (${response.status}): ${errorText}`);
    }
  }

  const data: GeminiResponse = await response.json();
  console.log("[Thumbnail Generator] Response received");

  // Parse the response
  const candidate = data.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error("Unexpected response format from Gemini API");
  }

  let base64: string | undefined;

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      base64 = part.inlineData.data;
      break;
    }
  }

  if (!base64) {
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Image generation was blocked due to safety filters. Please try a different prompt.");
    }
    throw new Error("No image data returned from Gemini API");
  }

  // Convert base64 to data URL
  const imageUrl = `data:image/png;base64,${base64}`;

  return { imageUrl, base64 };
}

// Helper function to convert multiple images into a composite prompt
export function createCompositePrompt(
  basePrompt: string,
  videoTitle?: string,
  channelStyle?: {
    channelName: string;
    niche: string;
    contentType: string;
    tone?: string;
  }
): string {
  let compositePrompt = basePrompt;

  if (videoTitle) {
    compositePrompt = `${compositePrompt}\n\nVideo Title: "${videoTitle}"`;
  }

  if (channelStyle) {
    compositePrompt = `${compositePrompt}\n\nChannel Style: ${channelStyle.channelName} (${channelStyle.niche})`;
    compositePrompt = `${compositePrompt}\nContent Type: ${channelStyle.contentType}`;
    if (channelStyle.tone) {
      compositePrompt = `${compositePrompt}\nTone: ${channelStyle.tone}`;
    }
  }

  // Add YouTube thumbnail requirements
  compositePrompt = `${compositePrompt}\n\nCreate a photorealistic YouTube thumbnail with:
- Bold, readable text overlay
- High contrast and vibrant colors
- Professional quality
- Eye-catching composition
- 16:9 aspect ratio optimized for YouTube`;

  return compositePrompt;
}
