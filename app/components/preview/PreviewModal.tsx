import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { AmazonListingPreview } from "./AmazonListingPreview";
import { Package, Copy, Download, Eye, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "~/lib/utils";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  bulletPoints?: string;
  productImages?: string[];
  heroImageUrl?: string;
  lifestyleImageUrl?: string;
  infographicUrl?: string;
  brandName?: string;
}

export function PreviewModal({
  isOpen,
  onClose,
  title = "",
  bulletPoints = "",
  productImages = [],
  heroImageUrl,
  lifestyleImageUrl,
  infographicUrl,
  brandName
}: PreviewModalProps) {
  const [copiedListing, setCopiedListing] = useState(false);

  const handleCopyListing = () => {
    const content = `Title: ${title}\n\nBullet Points:\n${bulletPoints}`;
    navigator.clipboard.writeText(content);
    setCopiedListing(true);
    toast.success("Amazon listing content copied to clipboard!");
    setTimeout(() => setCopiedListing(false), 2000);
  };
  
  const handleExportListing = () => {
    const content = `# Amazon Product Listing\n\n## Title\n${title}\n\n## Bullet Points\n${bulletPoints}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amazon-listing.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Amazon listing exported!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[1200px] lg:w-[1200px] xl:w-[1200px] sm:max-w-[95vw] overflow-hidden p-0">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-gradient-to-tr from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl" />
        </div>
        
        {/* Header */}
        <div className="px-6 pt-4 pb-2 bg-background/50 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Amazon Listing Preview</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCopyListing}
                className={cn(
                  "gap-2 transition-all",
                  copiedListing && "bg-green-500/10 text-green-600 border-green-500/20"
                )}
              >
                {copiedListing ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Content
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportListing}
                className="gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">AI-generated listing content</span>
          </div>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(100vh-100px)]">
          <div className="p-6">
            {/* Preview container with background */}
            <div className="relative rounded-xl bg-gradient-to-br from-background to-muted/30 p-6 shadow-inner">
              <div className="absolute inset-0 bg-grid-white/5 rounded-xl pointer-events-none" />
              <div className="relative">
                <AmazonListingPreview
                  title={title}
                  bulletPoints={bulletPoints}
                  productImages={productImages}
                  heroImageUrl={heroImageUrl}
                  lifestyleImageUrl={lifestyleImageUrl}
                  infographicUrl={infographicUrl}
                  brandName={brandName}
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}