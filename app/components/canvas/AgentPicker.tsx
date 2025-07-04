import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { 
  FileText, 
  Image, 
  Zap, 
  BarChart3,
  Hash,
  Video
} from "lucide-react";

interface AgentPickerProps {
  onSelectAgent: (agentType: "title" | "bullet-points" | "hero-image" | "lifestyle-image" | "infographic") => void;
  position: { x: number; y: number };
  onClose: () => void;
}

const agentOptions = [
  {
    type: "title",
    label: "Title",
    icon: Hash,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100",
    iconColor: "text-blue-600"
  },
  {
    type: "bullet-points", 
    label: "Description",
    icon: FileText,
    color: "from-green-500 to-green-600", 
    bgColor: "bg-green-50 hover:bg-green-100",
    iconColor: "text-green-600"
  },
  {
    type: "hero-image",
    label: "Hero Image", 
    icon: Image,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100", 
    iconColor: "text-purple-600"
  },
  {
    type: "infographic",
    label: "Infographic",
    icon: BarChart3,
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100",
    iconColor: "text-orange-600"
  },
  {
    type: "lifestyle-image",
    label: "Lifestyle",
    icon: Zap,
    color: "from-yellow-500 to-yellow-600", 
    bgColor: "bg-yellow-50 hover:bg-yellow-100",
    iconColor: "text-yellow-600"
  },
  {
    type: "video-generator",
    label: "Video",
    icon: Video,
    color: "from-cyan-500 to-cyan-600",
    bgColor: "bg-cyan-50 hover:bg-cyan-100", 
    iconColor: "text-cyan-600"
  }
];

export function AgentPicker({ onSelectAgent, position, onClose }: AgentPickerProps) {
  const handleAgentSelect = (agentType: string) => {
    if (agentType === "video-generator") {
      // Not implemented yet - show a message
      return;
    }
    // Type-safe cast since we know these are the only valid agent types
    onSelectAgent(agentType as "title" | "bullet-points" | "hero-image" | "lifestyle-image" | "infographic");
    onClose();
  };

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: position.x - 144, // Center the 288px wide card
        top: position.y - 180,  // Position above the drop point
      }}
    >
      <Card className="w-72 p-5 border-muted/50 shadow-xl bg-gradient-to-b from-background to-background/90 backdrop-blur-sm">
        <div className="text-center mb-5">
          <h3 className="font-semibold text-foreground text-sm">CONTENT AGENTS</h3>
          <p className="text-xs text-muted-foreground mt-1">Choose an agent to add</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {agentOptions.map((agent) => {
            const Icon = agent.icon;
            return (
              <Button
                key={agent.type}
                variant="ghost"
                size="sm"
                className={`h-16 flex flex-col items-center justify-center gap-1.5 ${agent.bgColor} border border-border/50 transition-all duration-200 hover:scale-105 ${agent.type === "video-generator" ? "opacity-50 cursor-not-allowed" : ""} px-2 py-2`}
                onClick={() => handleAgentSelect(agent.type)}
                disabled={agent.type === "video-generator"}
              >
                <Icon className={`h-4 w-4 ${agent.iconColor} flex-shrink-0`} />
                <span className="text-xs font-medium text-center leading-snug break-words hyphens-auto px-1">
                  {agent.label}
                </span>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground px-4 py-1"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
} 