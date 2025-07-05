import { memo, useState, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "./ReactFlowComponents";
import { 
  FileText, 
  Image, 
  Twitter, 
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Hash,
  Palette,
  Zap,
  Bot,
  Brain,
  BarChart3,
  Settings,
  Plus,
  Minus
} from "lucide-react";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export interface AgentNodeData {
  type: "title" | "bullet-points" | "hero-image" | "lifestyle-image" | "infographic";
  draft: string;
  thumbnailUrl?: string;
  imageUrl?: string; // For hero-image and lifestyle-image agents
  status: "idle" | "generating" | "ready" | "error";
  connections: string[];
  generationProgress?: {
    stage: string;
    percent: number;
  };
  lastPrompt?: string;
}

const agentConfig = {
  title: {
    icon: Hash,
    label: "Title Generator",
    description: "Compelling product titles",
    color: "blue",
    gradient: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-500",
  },
  "bullet-points": {
    icon: FileText,
    label: "Description Writer",
    description: "Amazon-optimized bullet points",
    color: "green",
    gradient: "from-green-500/20 to-emerald-500/20",
    iconColor: "text-green-500",
  },
  "hero-image": {
    icon: Palette,
    label: "Hero Image Designer",
    description: "Product hero images",
    color: "purple",
    gradient: "from-purple-500/20 to-pink-500/20",
    iconColor: "text-purple-500",
  },
  "lifestyle-image": {
    icon: Zap,
    label: "Lifestyle Image Generator",
    description: "Lifestyle product shots",
    color: "yellow",
    gradient: "from-yellow-500/20 to-orange-500/20",
    iconColor: "text-yellow-500",
  },
  infographic: {
    icon: BarChart3,
    label: "Infographic Designer",
    description: "Product feature charts",
    color: "orange",
    gradient: "from-orange-500/20 to-red-500/20",
    iconColor: "text-orange-500",
  },
};

interface ExtendedNodeProps {
  data: AgentNodeData & {
    onGenerate?: (imageCount?: number) => void;
    onChat?: () => void;
    onView?: () => void;
    onRegenerate?: () => void;
    onViewPrompt?: () => void;
  };
  selected?: boolean;
  id: string;
}

// Helper function to clean up draft text
const cleanDraftText = (draft: string, type: string): string => {
  if (!draft) return '';
  
  // For title type, remove common markdown patterns
  if (type === 'title') {
    // Remove **Title: prefix and trailing **
    let cleaned = draft.replace(/^\*\*Title:\s*/i, '');
    cleaned = cleaned.replace(/\*\*/g, '');
    // Remove quotes if they wrap the entire title
    cleaned = cleaned.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.trim();
  }
  
  // For bullet-points type, remove ** markdown symbols but keep structure
  if (type === 'bullet-points') {
    // Remove all ** symbols while preserving the rest of the formatting
    let cleaned = draft.replace(/\*\*/g, '');
    return cleaned.trim();
  }
  
  return draft;
};

export const AgentNode = memo(({ data, selected, id }: ExtendedNodeProps) => {
  const config = agentConfig[data.type];
  const Icon = config.icon;
  
  // Multi-output control for visual agents (hero-image, lifestyle-image, infographic)
  const isVisualAgent = data.type === "hero-image" || data.type === "lifestyle-image" || data.type === "infographic";
  const [imageCount, setImageCount] = useState(1);
  const [showImageCountPopup, setShowImageCountPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  
  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setShowImageCountPopup(false);
      }
    };
    
    if (showImageCountPopup) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showImageCountPopup]);

  const statusIcons = {
    idle: null,
    generating: <Loader2 className="h-4 w-4 animate-spin" />,
    ready: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
  };

  const statusColors = {
    idle: "secondary",
    generating: "default",
    ready: "default", // Changed from "success" since that variant doesn't exist
    error: "destructive",
  } as const;

  return (
    <div className={`relative group ${selected ? "scale-105" : ""} transition-transform duration-200`}>
      {/* Glow effect when selected */}
      {selected && (
        <div className={`absolute -inset-1 bg-gradient-to-r ${config.gradient} rounded-2xl blur-lg animate-pulse`} />
      )}
      
      <Card className={`relative w-72 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl ${selected ? "border-primary/50" : ""}`}>
        <Handle
          type="target"
          position={Position.Left}
          id="agent-input"
          className={`!w-3 !h-3 !bg-gradient-to-r ${config.gradient} !border-2 !border-background`}
          style={{ top: '50%' }}
        />
        
        <Handle
          type="source"
          position={Position.Right}
          id="agent-output"
          className={`!w-3 !h-3 !bg-gradient-to-r ${config.gradient} !border-2 !border-background`}
          style={{ top: '50%' }}
        />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${config.gradient} backdrop-blur-sm`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{config.label}</h3>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {data.status !== "idle" && (
              <div className="flex items-center gap-1.5">
                {statusIcons[data.status]}
                <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            )}
            {data.lastPrompt && data.status === "ready" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 hover:bg-primary/10"
                onClick={data.onViewPrompt}
                title="View generation prompt"
              >
                <Brain className="h-4 w-4 text-primary" />
              </Button>
            )}
          </div>
        </div>
      
      {/* Show progress when generating */}
      {data.status === "generating" && data.generationProgress && (
        <div className="mb-4">
          <div className="rounded-lg bg-primary/10 p-4 border border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur animate-pulse" />
                <Loader2 className="relative h-5 w-5 animate-spin text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{data.generationProgress.stage}</p>
                <p className="text-xs text-muted-foreground">Generating amazing content...</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${data.generationProgress.percent}%` }}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Regular content display */}
      {data.status !== "generating" && ((data.type === "hero-image" || data.type === "lifestyle-image" || data.type === "infographic") && (data.thumbnailUrl || data.imageUrl) ? (
        <div className="mb-4 cursor-pointer group/content" onClick={data.onView}>
          <div className="aspect-[4/5] relative rounded-xl overflow-hidden bg-black shadow-lg transition-all duration-300 hover:shadow-xl">
            <img 
              src={data.thumbnailUrl || data.imageUrl} 
              alt="Generated image" 
              className="w-full h-full object-cover transition-transform duration-300 group-hover/content:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover/content:opacity-100 transition-opacity" />
          </div>
        </div>
      ) : data.draft ? (
        <div className="mb-4 cursor-pointer group/content" onClick={data.onView}>
          <div className="rounded-lg bg-muted/50 p-4 border border-border/50 transition-all duration-200 hover:bg-muted/70 hover:border-border">
            {data.type === 'bullet-points' ? (
              // Special scrollable view for bullet points - show all content
              <div className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {cleanDraftText(data.draft, data.type)}
                </div>
              </div>
            ) : data.type === 'title' ? (
              // Full content for titles (no line clamp)
              <p className="text-sm text-foreground/80 leading-relaxed">
                {cleanDraftText(data.draft, data.type)}
              </p>
            ) : (
              // Line clamp for other content types
              <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                {cleanDraftText(data.draft, data.type)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4">
          <div className="rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 p-8 border border-dashed border-muted-foreground/20">
            <div className="text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No content generated yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Click Generate to create content
              </p>
            </div>
          </div>
        </div>
      ))}
      

      
      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
          onClick={data.onChat}
          disabled={data.status === "generating"}
        >
          <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
          Chat
        </Button>
        {data.status === "ready" && data.draft ? (
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all"
            onClick={data.onRegenerate}
            disabled={false}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Regenerate
          </Button>
        ) : (
          <div className="flex-1 relative">
            {isVisualAgent && data.status === "idle" ? (
              <div className="flex w-full">
                <Button 
                  size="sm" 
                  variant="default" 
                  className={`flex-1 bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all text-foreground font-medium shadow-sm rounded-r-none border-r border-white/20`}
                  onClick={() => data.onGenerate?.(isVisualAgent ? imageCount : undefined)}
                  disabled={false}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generate
                </Button>
                <button
                  className={`px-2 bg-gradient-to-r ${config.gradient} hover:bg-white/10 transition-all text-foreground shadow-sm rounded-l-none border-l border-white/20 flex items-center justify-center group`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowImageCountPopup(!showImageCountPopup);
                  }}
                  disabled={false}
                  title="Set number of images"
                >
                  <Settings className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                </button>
              </div>
            ) : (
              <Button 
                size="sm" 
                variant="default" 
                className={`w-full bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all text-foreground font-medium shadow-sm`}
                onClick={() => data.onGenerate?.(undefined)}
                disabled={data.status === "generating"}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Generate
              </Button>
            )}
            
            {/* Image count popup */}
            {showImageCountPopup && (
              <div 
                ref={popupRef}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-background border border-border rounded-lg shadow-xl p-4 z-50 min-w-[140px]"
              >
                <div className="text-center">
                  <div className="text-sm font-medium text-foreground mb-3">Images</div>
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-primary/10 rounded-full"
                      onClick={() => setImageCount(Math.max(1, imageCount - 1))}
                      disabled={imageCount <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="text-lg font-semibold min-w-[24px] text-center">{imageCount}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-primary/10 rounded-full"
                      onClick={() => setImageCount(Math.min(4, imageCount + 1))}
                      disabled={imageCount >= 4}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        id="agent-output"
        className={`!w-3 !h-3 !bg-gradient-to-r ${config.gradient} !border-2 !border-background`}
        style={{ top: '50%' }}
      />
    </Card>
    </div>
  );
});

AgentNode.displayName = "AgentNode";