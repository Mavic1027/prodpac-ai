import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Copy, Check, Eye, Edit3, Youtube, Twitter, Sparkles, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { Card } from "~/components/ui/card";
import { AmazonListingPreview } from "~/components/preview/AmazonListingPreview";
import { cn } from "~/lib/utils";

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodeData: {
    type: string;
    draft: string;
    thumbnailUrl?: string;
    imageUrl?: string;
  } | null;
  onUpdate?: (newContent: string) => void;
  productData?: {
    title?: string;
    bulletPoints?: string;
    productImages?: string[];
    heroImageUrl?: string;
    lifestyleImageUrl?: string;
    infographicUrl?: string;
  };
  brandData?: {
    brandName?: string;
  };
}

export function ContentModal({ isOpen, onClose, nodeData, onUpdate, productData, brandData }: ContentModalProps) {
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [showPreview, setShowPreview] = useState(false);

  // Clean content helper function
  const cleanContentForEditing = (draft: string, type: string): string => {
    if (!draft) return '';
    
    // For bullet-points type, remove ** markdown symbols 
    if (type === 'bullet-points') {
      return draft.replace(/\*\*/g, '');
    }
    
    // For title type, remove common markdown patterns
    if (type === 'title') {
      let cleaned = draft.replace(/^\*\*Title:\s*/i, '');
      cleaned = cleaned.replace(/\*\*/g, '');
      // Remove quotes if they wrap the entire title
      cleaned = cleaned.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
      }
      return cleaned.trim();
    }
    
    return draft;
  };

  // Update content when nodeData changes
  React.useEffect(() => {
    if (nodeData) {
      const cleanedContent = cleanContentForEditing(nodeData.draft || "", nodeData.type);
      setContent(cleanedContent);
    }
  }, [nodeData]);

  const handleCopy = async () => {
    // For image types, copy the image URL instead of text content
    if (nodeData?.type === "hero-image" && (nodeData.imageUrl || nodeData.thumbnailUrl)) {
      await navigator.clipboard.writeText(nodeData.imageUrl || nodeData.thumbnailUrl || "");
      setCopied(true);
      toast.success("Image URL copied to clipboard!");
    } else {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard!");
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(content);
    }
    onClose();
  };

  if (!nodeData) return null;

  const titles = {
    title: "Product Title",
    description: "Bullet Points",
    "bullet-points": "Bullet Points",
    "hero-image": "Hero Image",
    "lifestyle-image": "Lifestyle Image",
    infographic: "Infographic",
  };

  const icons = {
    title: <FileText className="h-5 w-5" />,
    description: <FileText className="h-5 w-5" />,
    "bullet-points": <FileText className="h-5 w-5" />,
    "hero-image": <Image className="h-5 w-5" />,
    "lifestyle-image": <Image className="h-5 w-5" />,
    infographic: <Image className="h-5 w-5" />,
  };

  const showTabs = nodeData.type === "title" || nodeData.type === "description" || nodeData.type === "bullet-points";

  // Show preview modal for hero images
  if (showPreview && nodeData.type === "hero-image") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="!max-w-[56vw] !w-[56vw] min-w-[800px] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Amazon Preview</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    See how your hero image looks in an Amazon listing
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Back to Image
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
            <AmazonListingPreview
              title={productData?.title || "Product Title"}
              bulletPoints={productData?.bulletPoints || ""}
              productImages={productData?.productImages || []}
              heroImageUrl={nodeData.imageUrl || nodeData.thumbnailUrl}
              lifestyleImageUrl={productData?.lifestyleImageUrl}
              infographicUrl={productData?.infographicUrl}
              brandName={brandData?.brandName || "Your Brand"}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-h-[90vh] overflow-hidden p-0",
        // Much wider modal for preview tab to give Amazon listing more space
        showTabs && activeTab === "preview" ? "!max-w-[56vw] !w-[56vw] min-w-[800px]" : "max-w-4xl"
      )}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                nodeData.type === "title" ? "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" :
                (nodeData.type === "description" || nodeData.type === "bullet-points") ? "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
                (nodeData.type === "hero-image" || nodeData.type === "thumbnail") ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" :
                "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
              )}>
                {icons[nodeData.type as keyof typeof icons]}
              </div>
              <div>
                <DialogTitle className="text-xl">{titles[nodeData.type as keyof typeof titles]}</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {nodeData.type === "hero-image" || nodeData.type === "lifestyle-image" || nodeData.type === "infographic"
                    ? "AI-generated image for your Amazon listing"
                    : "View, edit, and preview your AI-generated content"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {nodeData.type === "hero-image" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {nodeData.type === "hero-image" ? "Copy URL" : "Copy"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          {showTabs ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="h-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-fit grid-cols-2">
                  <TabsTrigger value="edit" className="gap-2">
                    <Edit3 className="h-4 w-4" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                <TabsContent value="edit" className="p-6 pt-4 m-0">
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className={cn(
                      "font-mono text-sm resize-none",
                      nodeData.type === "tweets" ? "min-h-[400px]" : "min-h-[300px]"
                    )}
                    placeholder="No content generated yet..."
                  />
                </TabsContent>
                
                <TabsContent value="preview" className="pt-2 m-0">
                  <div className="px-0">
                    <AmazonListingPreview
                      title={nodeData.type === "title" ? content : (productData?.title || "Product Title")}
                      bulletPoints={(nodeData.type === "description" || nodeData.type === "bullet-points") ? content : (productData?.bulletPoints || "")}
                      productImages={productData?.productImages || []}
                      heroImageUrl={productData?.heroImageUrl}
                      lifestyleImageUrl={productData?.lifestyleImageUrl}
                      infographicUrl={productData?.infographicUrl}
                      brandName={brandData?.brandName || "Your Brand"}
                    />
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          ) : (
            // For non-tab types (hero-image, lifestyle-image, infographic), show the image directly
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {(nodeData.type === "hero-image" || nodeData.type === "lifestyle-image" || nodeData.type === "infographic") && (nodeData.thumbnailUrl || nodeData.imageUrl) && (
                <Card className="relative overflow-hidden bg-gradient-to-br from-background to-muted/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                  <div className="relative p-6">
                    <div className="aspect-square relative rounded-lg overflow-hidden shadow-2xl">
                      <img 
                        src={nodeData.thumbnailUrl || nodeData.imageUrl} 
                        alt={`Generated ${nodeData.type.replace('-', ' ')}`} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4" />
                      <span>AI-generated {nodeData.type.replace('-', ' ')} for Amazon</span>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Only show content editing for text-based nodes */}
              {!(nodeData.type === "hero-image" || nodeData.type === "lifestyle-image" || nodeData.type === "infographic") && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="font-mono text-sm resize-none min-h-[300px]"
                    placeholder="No content generated yet..."
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {showTabs && (
          <div className="px-6 pb-6 border-t bg-muted/10">
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}