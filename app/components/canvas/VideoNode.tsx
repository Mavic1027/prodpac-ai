import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { ImageIcon, Loader2, Sparkles, HardDrive } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export interface ProductImageNodeData {
  title?: string;
  imageUrl?: string;
  videoUrl?: string; // Keep for backward compatibility
  fileId?: string;
  storageId?: string;
  fileSize?: number; // in bytes
  isUploading?: boolean;
  onImageClick?: () => void;
  onVideoClick?: () => void; // Keep for backward compatibility
}

export const VideoNode = memo(({ data, selected }: NodeProps) => {
  const imageData = data as ProductImageNodeData;
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Determine if this is an image or video
  const mediaUrl = imageData.imageUrl || imageData.videoUrl;
  const isVideo = mediaUrl && (
    mediaUrl.includes('.mp4') || 
    mediaUrl.includes('.mov') || 
    mediaUrl.includes('.avi') || 
    mediaUrl.includes('.webm') ||
    mediaUrl.includes('video/')
  );
  
  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm">
              <ImageIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Product Image</h3>
              <p className="text-xs text-muted-foreground">Input media</p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground/50" />
        </div>
      
      {imageData.isUploading ? (
        <div className="mb-3 aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="relative h-10 w-10 text-primary animate-spin mx-auto mb-3" />
            </div>
            <p className="text-sm font-medium">Uploading image...</p>
            <p className="text-xs text-muted-foreground mt-1">Please wait</p>
          </div>
        </div>
      ) : mediaUrl ? (
        <div 
          className="relative mb-3 rounded-xl overflow-hidden cursor-pointer group/image shadow-lg"
          style={{ aspectRatio: '16/9' }}
          onClick={() => {
            if (imageData.onImageClick) {
              imageData.onImageClick();
            } else if (imageData.onVideoClick) {
              imageData.onVideoClick();
            }
          }}
        >
          {isVideo ? (
            // For video files, show video with controls
            <video
              src={mediaUrl}
              className="w-full h-full object-cover"
              controls
              preload="metadata"
            />
          ) : (
            // For image files, show full image preview that fills the entire area
            <img 
              src={mediaUrl} 
              alt={imageData.title || "Product image"} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          )}
          
          {/* Hover overlay for images */}
          {!isVideo && (
            <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/image:opacity-100">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 text-sm font-medium">
                Click to view full size
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 aspect-video bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl flex items-center justify-center border border-dashed border-muted-foreground/20">
          <div className="text-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No image loaded</p>
          </div>
        </div>
      )}
      
      <Handle
        type="source"
        position={Position.Right}
        id="product-output"
        className="!w-3 !h-3 !bg-gradient-to-r !from-blue-500 !to-cyan-500 !border-2 !border-background"
        style={{ top: '50%' }}
      />
    </Card>
    </div>
  );
});

VideoNode.displayName = "ProductImageNode";