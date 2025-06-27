import { memo, useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { ImageIcon, Loader2, Sparkles, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export interface ProductNodeData {
  title?: string;
  imageUrl?: string;
  videoUrl?: string; // Keep for backward compatibility
  fileId?: string;
  storageId?: string;
  fileSize?: number; // in bytes
  isUploading?: boolean;
  onImageClick?: () => void;
  onVideoClick?: () => void; // Keep for backward compatibility
  productId?: Id<"products">;
  // Product info fields
  productName?: string;
  keyFeatures?: string;
  targetKeywords?: string;
  targetAudience?: string;
  customTargetAudience?: string;
  productCategory?: string;
}

const TARGET_AUDIENCES = [
  "Busy Professionals",
  "Parents & Families",
  "Fitness Enthusiasts", 
  "Tech Enthusiasts",
  "Home & Garden Lovers",
  "Students",
  "General Consumers",
  "Custom"
];

const BRAND_VOICES = [
  "Professional & Trustworthy",
  "Friendly & Approachable", 
  "Bold & Confident",
  "Luxury & Premium",
  "Fun & Playful",
  "Technical & Detailed",
  "Minimalist & Clean"
];

export const ProductNode = memo(({ data, selected }: NodeProps) => {
  const productData = data as ProductNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [formData, setFormData] = useState({
    productName: productData.productName || "",
    keyFeatures: productData.keyFeatures || "",
    targetKeywords: productData.targetKeywords || "",
    targetAudience: productData.targetAudience || "",
    customTargetAudience: productData.customTargetAudience || "",
    productCategory: productData.productCategory || "",
  });
  
  const updateProductInfo = useMutation(api.products.updateProductInfo);
  
  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Determine if this is an image or video
  const mediaUrl = productData.imageUrl || productData.videoUrl;
  const isVideo = mediaUrl && (
    mediaUrl.includes('.mp4') || 
    mediaUrl.includes('.mov') || 
    mediaUrl.includes('.avi') || 
    mediaUrl.includes('.webm') ||
    mediaUrl.includes('video/')
  );

  // Auto-save form data with debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to save after 1 second of no changes
    saveTimeoutRef.current = setTimeout(async () => {
      if (productData.productId) {
        try {
          await updateProductInfo({
            productId: productData.productId,
            [field]: value,
          });
        } catch (error) {
          console.error("Failed to save product info:", error);
          toast.error("Failed to save changes");
        }
      }
    }, 1000);
  };

  // Check if form has any data
  const hasProductInfo = formData.productName || formData.keyFeatures || formData.targetKeywords || formData.targetAudience || formData.customTargetAudience || formData.productCategory;
  
  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl blur-lg animate-pulse" />
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""} ${isExpanded ? "pb-6" : ""}`}>
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
      
        {productData.isUploading ? (
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
              if (productData.onImageClick) {
                productData.onImageClick();
              } else if (productData.onVideoClick) {
                productData.onVideoClick();
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
                alt={productData.title || "Product image"} 
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

        {/* Product Info Section */}
        <div className="space-y-3">
          {/* Always visible: Product Name */}
          <div>
            <Input
              placeholder="Product name..."
              value={formData.productName}
              onChange={(e) => handleFormChange('productName', e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Expand/Collapse Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between text-xs"
          >
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              {hasProductInfo ? "Product Details" : "Add Product Details"}
            </div>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* Expandable Form */}
          {isExpanded && (
            <div className="space-y-4 pt-2 border-t border-border/50">
              {/* Key Features */}
              <div className="space-y-2">
                <Label htmlFor="keyFeatures" className="text-xs font-medium">Key Features</Label>
                <Textarea
                  id="keyFeatures"
                  placeholder="• Feature 1&#10;• Feature 2&#10;• Feature 3"
                  value={formData.keyFeatures}
                  onChange={(e) => handleFormChange('keyFeatures', e.target.value)}
                  className="text-xs resize-none"
                  rows={3}
                />
              </div>

              {/* Target Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords" className="text-xs font-medium">Target Keywords</Label>
                <Input
                  id="keywords"
                  placeholder="keyword1, keyword2, keyword3"
                  value={formData.targetKeywords}
                  onChange={(e) => handleFormChange('targetKeywords', e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience" className="text-xs font-medium">Target Audience</Label>
                <Select value={formData.targetAudience} onValueChange={(value) => handleFormChange('targetAudience', value)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select audience..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_AUDIENCES.map((audience) => (
                      <SelectItem key={audience} value={audience} className="text-xs">
                        {audience}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Custom Target Audience Input */}
                {formData.targetAudience === "Custom" && (
                  <Input
                    placeholder="Enter custom target audience..."
                    value={formData.customTargetAudience}
                    onChange={(e) => handleFormChange('customTargetAudience', e.target.value)}
                    className="text-xs mt-2"
                  />
                )}
              </div>

              {/* Product Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-medium">Product Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Electronics, Home & Garden, Sports..."
                  value={formData.productCategory}
                  onChange={(e) => handleFormChange('productCategory', e.target.value)}
                  className="text-xs"
                />
              </div>


            </div>
          )}
        </div>
      
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

ProductNode.displayName = "ProductNode"; 