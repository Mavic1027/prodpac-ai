import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Building2, Palette, Save, Sparkles } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { Handle, Position } from "./ReactFlowComponents";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

// Color palette presets
const COLOR_PRESETS = {
  "professional-blue": {
    name: "Professional Blue",
    colors: { primary: "#2563eb", secondary: "#1e40af", accent: "#3b82f6" }
  },
  "warm-earth": {
    name: "Warm Earth",
    colors: { primary: "#dc2626", secondary: "#b91c1c", accent: "#ef4444" }
  },
  "bold-modern": {
    name: "Bold Modern",
    colors: { primary: "#7c3aed", secondary: "#6d28d9", accent: "#8b5cf6" }
  }
} as const;

// Brand voice options
const BRAND_VOICE_OPTIONS = [
  { value: "professional-trustworthy", label: "Professional & Trustworthy" },
  { value: "friendly-approachable", label: "Friendly & Approachable" },
  { value: "bold-confident", label: "Bold & Confident" },
  { value: "luxury-premium", label: "Luxury & Premium" },
  { value: "fun-playful", label: "Fun & Playful" },
  { value: "technical-detailed", label: "Technical & Detailed" },
  { value: "minimalist-clean", label: "Minimalist & Clean" },
];

interface BrandKitNodeProps {
  id: string;
  data: {
    projectId: Id<"projects">;
    brandKitId?: Id<"canvasBrandKits">;
    brandName?: string;
    colorPalette?: {
      type: "preset" | "custom";
      preset?: "professional-blue" | "warm-earth" | "bold-modern";
      custom?: {
        primary: string;
        secondary: string;
        accent: string;
      };
    };
    brandVoice?: string;
  };
  selected?: boolean;
}

const brandKitConfig = {
  icon: Building2,
  label: "Brand Kit",
  description: "Define your brand identity",
  color: "red",
  gradient: "from-red-500/20 to-rose-500/20",
  iconColor: "text-red-500",
};

export const BrandKitNode = memo(({ id, data, selected }: BrandKitNodeProps) => {
  // State
  const [brandName, setBrandName] = useState(data.brandName || "");
  const [customColors, setCustomColors] = useState({
    primary: data.colorPalette?.custom?.primary || "#dc2626",
    secondary: data.colorPalette?.custom?.secondary || "#b91c1c",
    accent: data.colorPalette?.custom?.accent || "#ef4444",
  });
  const [brandVoice, setBrandVoice] = useState(data.brandVoice || "professional-trustworthy");
  const [selectedSavedKit, setSelectedSavedKit] = useState<string>("");
  
  // Queries
  const savedBrandKits = useQuery(api.brandKits.getUserBrandKits);
  const projectBrandKit = useQuery(api.brandKits.getProjectBrandKit, { projectId: data.projectId });
  
  // Mutations
  const createCanvasBrandKit = useMutation(api.brandKits.createCanvasBrandKit);
  const updateCanvasBrandKit = useMutation(api.brandKits.updateCanvasBrandKit);
  const createBrandKit = useMutation(api.brandKits.createBrandKit);
  
  // Auto-save functionality
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  // Mark as initialized after first render to prevent auto-save on load
  useEffect(() => {
    setHasInitialized(true);
  }, []);
  
  const handleSave = useCallback(async () => {
    if (!brandName.trim() || !hasInitialized) return;
    
    try {
      const colorPalette = {
        type: "custom" as const,
        custom: customColors,
      };
      
      if (data.brandKitId) {
        // Update existing
        await updateCanvasBrandKit({
          id: data.brandKitId,
          brandName: brandName.trim(),
          colorPalette,
          brandVoice,
        });
      } else {
        // Create new only if we don't already have one for this project
        const existing = await projectBrandKit;
        if (existing) {
          console.log("Brand kit already exists, skipping creation");
          return;
        }
        
        await createCanvasBrandKit({
          projectId: data.projectId,
          brandName: brandName.trim(),
          colorPalette,
          brandVoice,
          canvasPosition: { x: 0, y: 0 }, // Will be updated by canvas
        });
      }
    } catch (error) {
      console.error("Failed to save brand kit:", error);
      // Only show error if it's not the "already exists" error
      if (!(error instanceof Error) || !error.message?.includes("already exists")) {
        toast.error("Failed to save brand kit");
      }
    }
  }, [brandName, customColors, brandVoice, data.brandKitId, data.projectId, updateCanvasBrandKit, createCanvasBrandKit, hasInitialized, projectBrandKit]);
  
  // Debounced auto-save - only after initialization
  useEffect(() => {
    if (!hasInitialized) return;
    
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(() => {
      handleSave();
    }, 1000);
    
    setSaveTimeout(timeout);
    
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [brandName, customColors, brandVoice, handleSave, hasInitialized]);
  
  const handleLoadSavedKit = async (kitId: string) => {
    const kit = savedBrandKits?.find((k: any) => k._id === kitId);
    if (!kit) return;
    
    setBrandName(kit.name);
    if (kit.colorPalette.custom) {
      setCustomColors(kit.colorPalette.custom);
    }
    setBrandVoice(kit.brandVoice);
    setSelectedSavedKit("");
  };
  
  const handleSaveAsPreset = async () => {
    if (!brandName.trim()) {
      toast.error("Please enter a brand name first");
      return;
    }
    
    try {
      await createBrandKit({
        name: brandName.trim(),
        colorPalette: {
          type: "custom",
          custom: customColors,
        },
        brandVoice,
      });
      toast.success("Brand kit saved to presets!");
    } catch (error) {
      console.error("Failed to save brand kit preset:", error);
      toast.error("Failed to save brand kit preset");
    }
  };

  const Icon = brandKitConfig.icon;
  
  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className={`absolute -inset-1 bg-gradient-to-r ${brandKitConfig.gradient} rounded-2xl blur-lg animate-pulse`} />
      )}
      
      <Card className={`relative w-80 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        {/* Input handle on the left */}
        <Handle
          type="target"
          position={Position.Left}
          id="brandkit-input"
          className={`!w-3 !h-3 !bg-gradient-to-r ${brandKitConfig.gradient} !border-2 !border-background`}
          style={{ top: '50%' }}
        />
        
        {/* Output handle on the right */}
        <Handle
          type="source"
          position={Position.Right}
          id="brandkit-output"
          className={`!w-3 !h-3 !bg-gradient-to-r ${brandKitConfig.gradient} !border-2 !border-background`}
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${brandKitConfig.gradient} backdrop-blur-sm`}>
              <Icon className={`h-5 w-5 ${brandKitConfig.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{brandKitConfig.label}</h3>
              <p className="text-xs text-muted-foreground">{brandKitConfig.description}</p>
            </div>
          </div>
          <Sparkles className="h-4 w-4 text-muted-foreground/50" />
        </div>
        
        <div className="space-y-4">
          {/* Brand Name */}
          <div className="space-y-2">
            <Label htmlFor={`brand-name-${id}`} className="text-sm font-medium">
              Brand Name
            </Label>
            <Input
              id={`brand-name-${id}`}
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="Enter your brand name"
              className="text-sm"
            />
          </div>
          
          {/* Saved Brand Kits Dropdown */}
          {savedBrandKits && savedBrandKits.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Load Saved Brand Kit</Label>
              <Select value={selectedSavedKit} onValueChange={(value) => {
                setSelectedSavedKit(value);
                if (value) handleLoadSavedKit(value);
              }}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Choose a saved brand kit..." />
                </SelectTrigger>
                <SelectContent>
                  {savedBrandKits.map((kit: any) => (
                    <SelectItem key={kit._id} value={kit._id}>
                      {kit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Color Palette */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Brand Colors</Label>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Primary</Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full cursor-pointer shadow-sm border-2 border-white"
                      style={{ backgroundColor: customColors.primary }}
                      onClick={() => document.getElementById('primary-color-picker')?.click()}
                    />
                    <input
                      id="primary-color-picker"
                      type="color"
                      value={customColors.primary}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, primary: e.target.value }))}
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {customColors.primary.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Secondary</Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full cursor-pointer shadow-sm border-2 border-white"
                      style={{ backgroundColor: customColors.secondary }}
                      onClick={() => document.getElementById('secondary-color-picker')?.click()}
                    />
                    <input
                      id="secondary-color-picker"
                      type="color"
                      value={customColors.secondary}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, secondary: e.target.value }))}
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {customColors.secondary.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Accent</Label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div
                      className="w-8 h-8 rounded-full cursor-pointer shadow-sm border-2 border-white"
                      style={{ backgroundColor: customColors.accent }}
                      onClick={() => document.getElementById('accent-color-picker')?.click()}
                    />
                    <input
                      id="accent-color-picker"
                      type="color"
                      value={customColors.accent}
                      onChange={(e) => setCustomColors(prev => ({ ...prev, accent: e.target.value }))}
                      className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {customColors.accent.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Brand Voice */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Voice</Label>
            <Select value={brandVoice} onValueChange={setBrandVoice}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BRAND_VOICE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Save as Preset Button */}
          <Button
            size="sm"
            variant="default"
            onClick={handleSaveAsPreset}
            className={`w-full bg-gradient-to-r ${brandKitConfig.gradient} hover:opacity-90 transition-all text-foreground font-medium shadow-sm`}
            disabled={!brandName.trim()}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save as Preset
          </Button>
        </div>
      </Card>
    </div>
  );
});

BrandKitNode.displayName = "BrandKitNode"; 