import { v } from "convex/values";
import { action } from "./_generated/server";
import { editImage, imageUrlToBase64, resolveImageToBase64, base64ToBlob, getApiKey } from "./nanobananaPro";

/**
 * Edit an existing lifestyle image based on user instructions
 * This performs TRUE image editing - modifying the existing image, not generating a new one
 */
export const editLifestyleImage = action({
  args: {
    agentId: v.id("agents"),
    currentImageUrl: v.string(), // The current generated image to edit
    editInstruction: v.string(), // User's edit request (e.g., "change the woman to a grandmother")
    productImageUrl: v.optional(v.string()), // Optional: original product image for product fidelity
  },
  handler: async (ctx, args): Promise<{ 
    concept: string; 
    imageUrl: string; 
    storageId?: string;
  }> => {
    console.log("[Lifestyle Edit] Starting lifestyle image EDIT");
    console.log("[Lifestyle Edit] Edit instruction:", args.editInstruction);
    console.log("[Lifestyle Edit] Current image URL:", args.currentImageUrl);
    console.log("[Lifestyle Edit] Product image URL:", args.productImageUrl ? "Provided" : "Not provided");
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = getApiKey();

    try {
      // Convert the current generated image to base64
      console.log("[Lifestyle Edit] Converting current image to base64...");
      const currentImageBase64 = await imageUrlToBase64(args.currentImageUrl);
      console.log("[Lifestyle Edit] Current image converted, length:", currentImageBase64.length);

      // Optionally convert the product image for product fidelity
      let productImageBase64: string | undefined;
      if (args.productImageUrl) {
        console.log("[Lifestyle Edit] Converting product image to base64...");
        productImageBase64 = await resolveImageToBase64(args.productImageUrl);
        console.log("[Lifestyle Edit] Product image converted, length:", productImageBase64.length);
      }

      // Call the edit function with the current image and edit prompt
      console.log("[Lifestyle Edit] Sending edit request to Gemini...");
      const editResponse = await editImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        currentImageBase64,
        args.editInstruction,
        productImageBase64
      );

      if (!editResponse.success) {
        throw new Error(editResponse.error || "Failed to edit lifestyle image");
      }

      if (!editResponse.imageBase64) {
        throw new Error("No edited image returned from Gemini");
      }

      // Convert to blob and store
      const editedImageBlob = base64ToBlob(editResponse.imageBase64);
      console.log("[Lifestyle Edit] Edited image blob size:", editedImageBlob.size);

      const storageId = await ctx.storage.store(editedImageBlob);
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for edited image");
      }

      console.log("[Lifestyle Edit] Edit completed successfully");

      return {
        concept: `Edited lifestyle image: "${args.editInstruction}"`,
        imageUrl: finalUrl,
        storageId: storageId,
      };

    } catch (error) {
      console.error("[Lifestyle Edit] Error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("content_policy") || error.message.includes("safety")) {
          throw new Error("The edit request doesn't meet guidelines. Please try a different edit.");
        }
      }
      
      throw error;
    }
  },
});

/**
 * Edit an existing hero image based on user instructions
 */
export const editHeroImage = action({
  args: {
    agentId: v.id("agents"),
    currentImageUrl: v.string(),
    editInstruction: v.string(),
    productImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ 
    concept: string; 
    imageUrl: string; 
    storageId?: string;
  }> => {
    console.log("[Hero Edit] Starting hero image EDIT");
    console.log("[Hero Edit] Edit instruction:", args.editInstruction);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = getApiKey();

    try {
      // Convert the current generated image to base64
      const currentImageBase64 = await imageUrlToBase64(args.currentImageUrl);
      console.log("[Hero Edit] Current image converted, length:", currentImageBase64.length);

      // Optionally convert the product image for product fidelity
      let productImageBase64: string | undefined;
      if (args.productImageUrl) {
        productImageBase64 = await resolveImageToBase64(args.productImageUrl);
        console.log("[Hero Edit] Product image converted, length:", productImageBase64.length);
      }

      // Call the edit function
      const editResponse = await editImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        currentImageBase64,
        args.editInstruction,
        productImageBase64
      );

      if (!editResponse.success) {
        throw new Error(editResponse.error || "Failed to edit hero image");
      }

      if (!editResponse.imageBase64) {
        throw new Error("No edited image returned from Gemini");
      }

      // Store the edited image
      const editedImageBlob = base64ToBlob(editResponse.imageBase64);
      const storageId = await ctx.storage.store(editedImageBlob);
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for edited image");
      }

      console.log("[Hero Edit] Edit completed successfully");

      return {
        concept: `Edited hero image: "${args.editInstruction}"`,
        imageUrl: finalUrl,
        storageId: storageId,
      };

    } catch (error) {
      console.error("[Hero Edit] Error:", error);
      throw error;
    }
  },
});

/**
 * Edit an existing infographic based on user instructions
 */
export const editInfographic = action({
  args: {
    agentId: v.id("agents"),
    currentImageUrl: v.string(),
    editInstruction: v.string(),
    productImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ 
    concept: string; 
    imageUrl: string; 
    storageId?: string;
  }> => {
    console.log("[Infographic Edit] Starting infographic EDIT");
    console.log("[Infographic Edit] Edit instruction:", args.editInstruction);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");

    const apiKey = getApiKey();

    try {
      // Convert the current generated image to base64
      const currentImageBase64 = await imageUrlToBase64(args.currentImageUrl);
      console.log("[Infographic Edit] Current image converted, length:", currentImageBase64.length);

      // Optionally convert the product image for product fidelity
      let productImageBase64: string | undefined;
      if (args.productImageUrl) {
        productImageBase64 = await resolveImageToBase64(args.productImageUrl);
        console.log("[Infographic Edit] Product image converted, length:", productImageBase64.length);
      }

      // Call the edit function
      const editResponse = await editImage(
        { apiKey, resolution: "2K", aspectRatio: "1:1" },
        currentImageBase64,
        args.editInstruction,
        productImageBase64
      );

      if (!editResponse.success) {
        throw new Error(editResponse.error || "Failed to edit infographic");
      }

      if (!editResponse.imageBase64) {
        throw new Error("No edited image returned from Gemini");
      }

      // Store the edited image
      const editedImageBlob = base64ToBlob(editResponse.imageBase64);
      const storageId = await ctx.storage.store(editedImageBlob);
      const finalUrl = await ctx.storage.getUrl(storageId);
      if (!finalUrl) {
        throw new Error("Failed to get URL for edited image");
      }

      console.log("[Infographic Edit] Edit completed successfully");

      return {
        concept: `Edited infographic: "${args.editInstruction}"`,
        imageUrl: finalUrl,
        storageId: storageId,
      };

    } catch (error) {
      console.error("[Infographic Edit] Error:", error);
      throw error;
    }
  },
});
