import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { BarChart3, Bot, Building2, Check, ChevronLeft, ChevronRight, Eye, FileText, GripVertical, Hash, ImageIcon, Layers, Map, Palette, Settings2, Share2, Sparkles, Upload, Video, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { toast } from "sonner";
import { PreviewModal } from "~/components/preview/PreviewModal";
import { Button } from "~/components/ui/button";
import { VideoProcessingHelp } from "~/components/VideoProcessingHelp";
import { extractAudioFromVideo } from "~/lib/ffmpeg-audio";
import { createRetryAction, handleVideoError } from "~/lib/video-error-handler";
import { extractVideoMetadata } from "~/lib/video-metadata";

import { compressAudioFile, isFileTooLarge, getFileSizeMB } from "~/lib/audio-compression";
import { AgentNode } from "./AgentNode";
import { ContentModal } from "./ContentModal";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { FloatingChat } from "./FloatingChat";
import { PromptModal } from "./PromptModal";
import type {
  Edge,
  Node,
  NodeTypes,
  OnConnect,
} from "./ReactFlowComponents";
import { ReactFlowWrapper } from "./ReactFlowWrapper";
import { ThumbnailUploadModal } from "./ThumbnailUploadModal";
import { ProductNode } from "./ProductNode";
import { VideoPlayerModal } from "./VideoPlayerModal";
import { ImageModal } from "./ImageModal";
import { BrandKitNode } from "./BrandKitNode";

const nodeTypes: NodeTypes = {
  video: ProductNode,
  agent: AgentNode,
  brandKit: BrandKitNode,
};

function CanvasContent({ projectId }: { projectId: Id<"projects"> }) {
  return (
    <ReactFlowWrapper>
      {({ ReactFlow, ReactFlowProvider, Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge }) => (
        <InnerCanvas 
          projectId={projectId}
          ReactFlow={ReactFlow}
          ReactFlowProvider={ReactFlowProvider}
          Background={Background}
          Controls={Controls}
          MiniMap={MiniMap}
          useNodesState={useNodesState}
          useEdgesState={useEdgesState}
          addEdge={addEdge}
        />
      )}
    </ReactFlowWrapper>
  );
}

function InnerCanvas({ 
  projectId,
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge
}: { 
  projectId: Id<"projects">;
  ReactFlow: any;
  ReactFlowProvider: any;
  Background: any;
  Controls: any;
  MiniMap: any;
  useNodesState: any;
  useEdgesState: any;
  addEdge: any;
}) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNodeForModal, setSelectedNodeForModal] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState<string>("");
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [hasInitializedViewport, setHasInitializedViewport] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [pendingThumbnailNode, setPendingThumbnailNode] = useState<string | null>(null);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; title: string; duration?: number; fileSize?: number } | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string; fileSize?: number } | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [enableEdgeAnimations, setEnableEdgeAnimations] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodesToDelete, setNodesToDelete] = useState<Node[]>([]);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<{ agentType: string; prompt: string } | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Get initial state from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("canvas-sidebar-collapsed");
      return saved === "true";
    }
    return false;
  });
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: "user" | "ai";
    content: string;
    timestamp: number;
    agentId?: string;
  }>>([]);
  const [isChatGenerating, setIsChatGenerating] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  
  // Use refs to access current values in callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  
  // Keep refs updated
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  
  // Save sidebar collapsed state
  useEffect(() => {
    localStorage.setItem("canvas-sidebar-collapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);
  
  // Convex queries
  const canvasState = useQuery(api.canvas.getState, { projectId });
  const projectProducts = useQuery(api.products.getByProject, { projectId });
  const projectAgents = useQuery(api.agents.getByProject, { projectId });
  const projectBrandKits = useQuery(api.brandKits.getProjectBrandKit, { projectId });
  const userProfile = useQuery(api.profiles.get);
  
  // Convex mutations
  const createProduct = useMutation(api.products.create);
  const updateProductMetadata = useMutation(api.products.updateMetadata);
  const updateProduct = useMutation(api.products.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const updateProductStorageId = useMutation(api.products.updateProductStorageId);
  const createAgent = useMutation(api.agents.create);
  const updateAgentDraft = useMutation(api.agents.updateDraft);
  const updateAgentConnections = useMutation(api.agents.updateConnections);
  const updateAgentPosition = useMutation(api.agents.updatePosition);
  const saveCanvasState = useMutation(api.canvas.saveState);
  const deleteProduct = useMutation(api.products.remove);
  const deleteAgent = useMutation(api.agents.remove);
  const createShareLink = useMutation(api.shares.createShareLink);
  const getShareLink = useQuery(api.shares.getShareLink, { projectId });
  const updateCanvasBrandKit = useMutation(api.brandKits.updateCanvasBrandKit);
  
  // Convex actions for AI
  const generateContent = useAction(api.aiHackathon.generateContentSimple);
  const generateHeroImage = useAction(api.heroImage.generateHeroImage);
  const refineContent = useAction(api.chat.refineContent);
  const refineHeroImage = useAction(api.heroImageRefine.refineHeroImage);

  // Handle content generation for an agent node
  const handleGenerate = useCallback(async (nodeId: string, thumbnailImages?: File[], additionalContext?: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode) {
      console.error("Agent node not found:", nodeId);
      return;
    }
    
    // For thumbnail agents without images, show the upload modal
    if (agentNode.data.type === "thumbnail" && !thumbnailImages) {
      console.log("[Canvas] Opening thumbnail upload modal for node:", nodeId);
      setPendingThumbnailNode(nodeId);
      setThumbnailModalOpen(true);
      return;
    }
    
    try {
      // Update status to generating in UI with initial progress
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  status: "generating",
                  generationProgress: {
                    stage: "Preparing...",
                    percent: 0
                  }
                } 
              }
            : node
        )
      );
      
      // Also update status in database if we have an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "generating",
        });
      }
      
      // Find connected video node
      const connectedVideoEdge = edgesRef.current.find((e: any) => e.target === nodeId && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodesRef.current.find((n: any) => n.id === connectedVideoEdge.source) : null;
      
      // Find connected brand kit node
      const connectedBrandKitEdge = edgesRef.current.find((e: any) => e.target === nodeId && e.source?.startsWith('brandkit'));
      const brandKitNode = connectedBrandKitEdge ? nodesRef.current.find((n: any) => n.id === connectedBrandKitEdge.source) : null;
      console.error("[Canvas] Brand kit connection check:", {
        nodeId,
        hasEdges: edgesRef.current.length,
        brandKitEdge: connectedBrandKitEdge,
        brandKitNode: brandKitNode?.id,
        brandKitData: brandKitNode?.data,
        projectBrandKits: projectBrandKits,
        allEdges: edgesRef.current.map((e: any) => ({ source: e.source, target: e.target }))
      });
      
      // Find other connected agent nodes
      const connectedAgentNodes = edgesRef.current
        .filter((e: any) => e.target === nodeId && e.source?.includes('agent'))
        .map((e: any) => nodesRef.current.find((n: any) => n.id === e.source))
        .filter(Boolean);
      
      // Update progress: Gathering context
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  generationProgress: {
                    stage: "Gathering context...",
                    percent: 20
                  }
                } 
              }
            : node
        )
      );

      // Prepare data for AI generation
      let productData: { 
        title?: string; 
        features?: string[];
        specifications?: any;
        keywords?: string[];
        asin?: string;
        // Enhanced Product Node metadata
        productName?: string;
        keyFeatures?: string;
        targetKeywords?: string;
        targetAudience?: string;
      } = {};
      if (videoNode && videoNode.data.productId) {
        // Fetch the product with metadata from database
        const product = projectProducts?.find((p: any) => p._id === videoNode.data.productId);
        productData = {
          title: videoNode.data.title as string,
          features: product?.features || [],
          specifications: product?.specifications,
          keywords: product?.keywords || [],
          asin: product?.asin,
          // Include enhanced Product Node metadata from the node data
          productName: videoNode.data.productName as string,
          keyFeatures: videoNode.data.keyFeatures as string,
          targetKeywords: videoNode.data.targetKeywords as string,
          targetAudience: videoNode.data.targetAudience as string,
        };
        
        console.log("[Canvas] Product data prepared:", {
          hasTitle: !!productData.title,
          hasProductName: !!productData.productName,
          hasKeyFeatures: !!productData.keyFeatures,
          hasTargetKeywords: !!productData.targetKeywords,
          hasTargetAudience: !!productData.targetAudience,
          hasDatabaseFeatures: !!product?.features?.length,
          productData: productData
        });
        
        // If no product features from either source, warn the user
        if (!product?.features?.length && !productData.keyFeatures) {
          toast.warning("Generating without product features - results may be less accurate");
        }
      }
      
      const connectedAgentOutputs = connectedAgentNodes.map((n: any) => ({
        type: n!.data.type as string,
        content: (n!.data.draft || "") as string,
      }));
      
      // Prepare brand kit data if connected - fetch from database instead of node data
      let brandKitData: any = null;
      
      // FIRST: Check if there's a brand kit connection via edges
      const hasBrandKitConnection = brandKitNode !== null;
      
      // SECOND: If no direct connection, check if brand kit exists in project and agent is connected to product
      const hasProductConnection = videoNode !== null;
      const projectHasBrandKit = projectBrandKits !== null && projectBrandKits !== undefined;
      
      console.log("[Canvas] Brand Kit connection analysis:", {
        hasBrandKitConnection,
        hasProductConnection, 
        projectHasBrandKit,
        brandKitNodeId: brandKitNode?.id,
        videoNodeId: videoNode?.id,
        agentNodeId: nodeId
      });
      
      // Use brand kit data if either:
      // 1. Brand kit is directly connected to agent, OR
      // 2. Agent is connected to product AND project has a brand kit (workflow: Product -> Agent, with Brand Kit in project)
      if ((hasBrandKitConnection || (hasProductConnection && projectHasBrandKit)) && projectBrandKits) {
        brandKitData = {
          brandName: projectBrandKits.brandName,
          colorPalette: projectBrandKits.colorPalette,
          brandVoice: projectBrandKits.brandVoice
        };
        console.log("[Canvas] Using Brand Kit data:", brandKitData);
      } else {
        console.log("[Canvas] No Brand Kit data available for this agent");
      }
      
      // Use real user profile data or fallback to defaults
      const profileData = userProfile ? {
        brandName: userProfile.brandName,
        productCategory: userProfile.productCategory,
        niche: userProfile.niche,
        tone: userProfile.tone || "Professional and engaging",
        targetAudience: userProfile.targetAudience || "General audience",
      } : {
        brandName: "My Brand",
        productCategory: "General Products",
        niche: "General",
        tone: "Professional and engaging",
        targetAudience: "General audience",
      };
      
      // Update progress: Analyzing content
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  generationProgress: {
                    stage: "Analyzing content...",
                    percent: 40
                  }
                } 
              }
            : node
        )
      );

              // Generate content based on agent type
        let result: string;
        let imageUrl: string | undefined;
        let imageStorageId: string | undefined;
        
        if (agentNode.data.type === "hero-image" && thumbnailImages) {
        // For hero-image agent, use uploaded images
        console.log("[Canvas] Starting hero image generation with uploaded images:", thumbnailImages.length);
        toast.info("Processing uploaded images for hero image generation...");
        
        // Convert uploaded images to data URLs
        console.log("[Canvas] Converting images to data URLs...");
        const frames = await Promise.all(
          thumbnailImages.map(async (file, index) => {
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file);
            });
            return {
              dataUrl,
              timestamp: index, // Use index as timestamp for uploaded images
            };
          })
        );
        console.log("[Canvas] Images converted to data URLs:", frames.length);
        
        // Update progress: Generating with AI
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === nodeId
              ? { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    generationProgress: {
                      stage: "Creating hero image design...",
                      percent: 60
                    }
                  } 
                }
              : node
          )
        );

        // Generate hero image with vision API
        console.log("[Canvas] Calling generateHeroImage action with:", {
          productId: videoNode?.data.productId,
          frameCount: frames.length,
          hasProductData: !!productData,
          hasFeatures: !!productData.features?.length,
          connectedAgentsCount: connectedAgentOutputs.length,
          hasProfile: !!profileData
        });
        
        const heroImageResult = await generateHeroImage({
          agentType: "hero-image",
          productId: videoNode?.data.productId as Id<"products"> | undefined,
          productImages: frames.map(f => ({
            dataUrl: f.dataUrl,
            timestamp: f.timestamp,
          })),
          productData,
          connectedAgentOutputs,
          profileData,
          additionalContext,
        });
        
        console.log("[Canvas] Hero image generation completed");
        console.log("[Canvas] Concept received:", heroImageResult.concept.substring(0, 100) + "...");
        console.log("[Canvas] Image URL received:", !!heroImageResult.imageUrl);
        
        result = heroImageResult.concept;
        imageUrl = heroImageResult.imageUrl;
        imageStorageId = heroImageResult.storageId;
        
        // Store the prompt for hero image too
        if (heroImageResult.prompt) {
          setNodes((nds: any) =>
            nds.map((node: any) =>
              node.id === nodeId
                ? { 
                    ...node, 
                    data: { 
                      ...node.data, 
                      lastPrompt: heroImageResult.prompt
                    } 
                  }
                : node
            )
          );
        }
        
        // If no image was generated due to safety issues, inform the user
        if (!imageUrl) {
          toast.warning("Hero image concept created, but image generation was blocked by safety filters. Try uploading different images or adjusting your requirements.");
        }
      } else {
        // Update progress based on agent type
        const progressMessages = {
          title: "Crafting compelling title...",
          "bullet-points": "Writing benefit-focused bullet points...",
          "lifestyle-image": "Creating lifestyle imagery..."
        };
        
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === nodeId
              ? { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    generationProgress: {
                      stage: progressMessages[agentNode.data.type as keyof typeof progressMessages] || "Generating content...",
                      percent: 60
                    }
                  } 
                }
              : node
          )
        );

        // Use regular content generation for other agent types
        console.log("[Canvas] Calling generateContent with brandKitData:", brandKitData);
        console.log("[Canvas] Brand kit debug info:", {
          foundBrandKitNode: !!brandKitNode,
          projectBrandKitsFromQuery: projectBrandKits,
          finalBrandKitData: brandKitData
        });
        
        // Prepare the generation parameters, only include brandKitData if it exists
        const generationParams: any = {
          agentType: agentNode.data.type as "title" | "bullet-points" | "hero-image" | "lifestyle-image" | "infographic",
          productId: videoNode?.data.productId as Id<"products"> | undefined,
          productData,
          connectedAgentOutputs,
          profileData,
        };
        
        // Only add brandKitData if it's not null/undefined
        if (brandKitData) {
          generationParams.brandKitData = brandKitData;
        }
        
        const generationResult = await generateContent(generationParams);
        result = generationResult.content;
        
        // Store the prompt for viewing later
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === nodeId
              ? { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    lastPrompt: generationResult.prompt
                  } 
                }
              : node
          )
        );
      }
      
      // Update progress: Finalizing
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  generationProgress: {
                    stage: "Finalizing...",
                    percent: 90
                  }
                } 
              }
            : node
        )
      );

      // Update node with generated content
      console.log("[Canvas] Updating node with generated content");
      if (agentNode.data.type === "hero-image") {
        console.log("[Canvas] Hero image URL to save:", imageUrl ? "Present" : "Missing");
      }
      
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: result,
                  imageUrl: imageUrl,
                  status: "ready",
                  generationProgress: undefined, // Clear progress when done
                },
              }
            : node
        )
      );
      
      // Save to database if the node has an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: result,
          status: "ready",
          imageUrl: imageUrl,
          imageStorageId: imageStorageId as Id<"_storage"> | undefined,
        });
      }
      
      if (agentNode.data.type === "hero-image" && imageUrl) {
        console.log("[Canvas] Hero image generation successful with image URL");
        toast.success("Hero image generated successfully! Click 'View' to see the image.");
      } else {
        toast.success(`${agentNode.data.type} generated successfully!`);
      }
    } catch (error: any) {
      console.error("[Canvas] Generation error:", error);
      console.error("[Canvas] Error details:", {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      toast.error(error.message || "Failed to generate content");
      
      // Update status to error
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === nodeId
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  status: "error",
                  generationProgress: undefined // Clear progress on error
                } 
              }
            : node
        )
      );
      
      // Update error status in database
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "error",
        });
      }
    }
  }, [generateContent, generateHeroImage, userProfile, setNodes, updateAgentDraft, projectProducts]);
  
  // Handle thumbnail image upload
  const handleThumbnailUpload = useCallback(async (images: File[]) => {
    if (!pendingThumbnailNode) return;
    
    console.log("[Canvas] Handling thumbnail upload for node:", pendingThumbnailNode);
    console.log("[Canvas] Number of images:", images.length);
    
    // Check if there's a recent regeneration request in chat for this node
    const recentMessages = chatMessages.filter(msg => 
      msg.agentId === pendingThumbnailNode && 
      Date.now() - msg.timestamp < 60000 // Within last minute
    );
    
    const regenerationMessage = recentMessages.find(msg => 
      msg.role === 'user' && msg.content.toLowerCase().includes('regenerate')
    );
    
    // Extract the user's requirements from the regeneration message
    let additionalContext = '';
    if (regenerationMessage) {
      // Remove the @mention and extract the actual requirements
      additionalContext = regenerationMessage.content
        .replace(/@\w+_AGENT/gi, '')
        .replace(/regenerate\s*/gi, '')
        .trim();
      console.log("[Canvas] Found regeneration context:", additionalContext);
    }
    
    // Close modal and reset state
    setThumbnailModalOpen(false);
    
    // Call handleGenerate with the uploaded images and context
    await handleGenerate(pendingThumbnailNode, images, additionalContext);
    
    // Reset pending node
    setPendingThumbnailNode(null);
  }, [pendingThumbnailNode, handleGenerate, chatMessages]);
  
  // Handle media click - detects if it's image or video
  const handleVideoClick = useCallback((mediaData: { url: string; title: string; duration?: number; fileSize?: number }) => {
    // Detect if it's a video or image
    const isVideo = mediaData.url && (
      mediaData.url.includes('.mp4') || 
      mediaData.url.includes('.mov') || 
      mediaData.url.includes('.avi') || 
      mediaData.url.includes('.webm') ||
      mediaData.url.includes('video/') ||
      mediaData.duration !== undefined
    );

    if (isVideo) {
      setSelectedVideo(mediaData);
      setVideoModalOpen(true);
    } else {
      setSelectedImage({
        url: mediaData.url,
        title: mediaData.title,
        fileSize: mediaData.fileSize
      });
      setImageModalOpen(true);
    }
  }, []);

  // Handle chat messages with @mentions
  const handleChatMessage = useCallback(async (message: string) => {
    // Extract @mention from message - handle various formats
    const mentionRegex = /@(\w+)[\s_]?(?:AGENT|Agent|agent)?/gi;
    const match = message.match(mentionRegex);
    
    if (!match) {
      // If no mention, just add the message to chat history
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      }]);
      
      // Add a general response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: "Please @mention a specific agent (e.g., @TITLE_AGENT) to get help with content generation or refinement.",
          timestamp: Date.now(),
        }]);
      }, 500);
      return;
    }
    
    // Find the agent node based on the mention
    const agentType = match[0]
      .replace(/@/gi, "")
      .replace(/[\s_]?(?:AGENT|Agent|agent)/gi, "")
      .toLowerCase()
      .trim();
    const agentNode = nodesRef.current.find((n: any) => n.type === "agent" && n.data.type === agentType);
    
    if (!agentNode || !agentNode.data.agentId) {
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
      }]);
      
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `No ${agentType} agent found in the canvas. Please add one first.`,
          timestamp: Date.now(),
        }]);
      }, 500);
      return;
    }
    
    // Check if agent has no content and user wants to generate
    if (!agentNode.data.draft && (message.toLowerCase().includes('generate') || message.toLowerCase().includes('create'))) {
      // Trigger generation instead of refinement
      await handleGenerate(agentNode.id);
      
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      return;
    }
    
    // Special handling for thumbnail regeneration
    if (agentNode.data.type === 'thumbnail' && message.toLowerCase().includes('regenerate')) {
      // Store the regeneration request
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      // Open thumbnail upload modal
      setPendingThumbnailNode(agentNode.id);
      setThumbnailModalOpen(true);
      
      // Add response
      setTimeout(() => {
        setChatMessages(prev => [...prev, {
          id: `ai-${Date.now()}`,
          role: "ai",
          content: `To regenerate the thumbnail, please upload new images in the modal that just opened. I'll use your feedback about making the face more shocked when generating the new thumbnail.`,
          timestamp: Date.now(),
          agentId: agentNode.id,
        }]);
      }, 500);
      
      return;
    }
    
    setIsChatGenerating(true);
    
    // Add user message immediately
    setChatMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: Date.now(),
      agentId: agentNode.id,
    }]);
    
    try {
      // Find connected video for context
      const connectedVideoEdge = edgesRef.current.find((e: any) => e.target === agentNode.id && e.source?.includes('video'));
      const videoNode = connectedVideoEdge ? nodesRef.current.find((n: any) => n.id === connectedVideoEdge.source) : null;
      
      let productData: { title?: string; features?: string[] } = {};
      if (videoNode && videoNode.data.productId) {
        const product = projectProducts?.find((p: any) => p._id === videoNode.data.productId);
        productData = {
          title: videoNode.data.title as string,
          features: product?.features || [],
        };
      }
      
      // Get relevant chat history for this agent
      const agentHistory = chatMessages.filter(msg => msg.agentId === agentNode.id);
      
      // Get connected agent outputs for context
      const connectedAgentOutputs: Array<{type: string, content: string}> = [];
      const connectedAgentEdges = edgesRef.current.filter((e: any) => e.target === agentNode.id && e.source?.includes('agent'));
      for (const edge of connectedAgentEdges) {
        const connectedAgent = nodesRef.current.find((n: any) => n.id === edge.source);
        if (connectedAgent && connectedAgent.data.draft) {
          connectedAgentOutputs.push({
            type: connectedAgent.data.type,
            content: connectedAgent.data.draft,
          });
        }
      }

      // Check if this is a regeneration request
      const cleanMessage = message.replace(mentionRegex, "").trim();
      const lowerMessage = cleanMessage.toLowerCase();
      
      // Check for various regeneration/modification keywords
      const regenerationKeywords = [
        'regenerate', 'generate again', 'create new', 'make new', 'redo', 
        'try again', 'give me another', 'different version', 'new version',
        'change', 'make', 'create', 'modify', 'update', 'edit'
      ];
      
      const isRegeneration = regenerationKeywords.some(keyword => lowerMessage.includes(keyword)) || 
                            (agentNode.data.draft && lowerMessage.includes('generate'));
      
      // If regenerating, prepend context to the user message
      const finalMessage = isRegeneration && agentNode.data.draft
        ? `REGENERATE the ${agentNode.data.type} with a COMPLETELY NEW version based on the user's instructions. Current version: "${agentNode.data.draft}". User requirements: ${cleanMessage}. Create something different that incorporates their feedback.`
        : cleanMessage;

      // Set node status to generating
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === agentNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: "generating",
                  generationProgress: {
                    stage: "Refining thumbnail...",
                    percent: 50
                  }
                },
              }
            : node
        )
      );
      
      // Update status in database if we have an agentId
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "generating",
        });
      }
      
      // Call appropriate refine action based on agent type
      let result: any;
      
      // For thumbnails with existing images, always use refinement (not just for regeneration)
      if (agentNode.data.type === "thumbnail" && agentNode.data.thumbnailUrl) {
        // Use thumbnail-specific refinement that can edit the existing image
        console.log("[Canvas] Using thumbnail refinement with existing image");
        console.log("[Canvas] Agent node data:", agentNode.data);
        console.log("[Canvas] Clean message:", cleanMessage);
        console.log("[Canvas] Is regeneration:", isRegeneration);
        
        // Update progress
        setNodes((nds: any) =>
          nds.map((node: any) =>
            node.id === agentNode.id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    generationProgress: {
                      stage: "Analyzing current thumbnail...",
                      percent: 30
                    }
                  },
                }
              : node
          )
        );
        
        result = await refineHeroImage({
          agentId: agentNode.data.agentId as Id<"agents">,
          currentImageUrl: agentNode.data.imageUrl,
          userMessage: cleanMessage, // Use clean message, not the REGENERATE prefix
          productId: videoNode?.data.productId as Id<"products"> | undefined,
          profileData: userProfile ? {
            brandName: userProfile.brandName,
            productCategory: userProfile.productCategory,
            niche: userProfile.niche,
            tone: userProfile.tone,
            targetAudience: userProfile.targetAudience,
          } : undefined,
        });
        
        // Create a response object matching refineContent format
        result = {
          response: result.concept,
          updatedContent: result.concept,
          imageUrl: result.imageUrl,
          storageId: result.storageId,
        };
      } else {
        // Use regular text refinement for other agent types
        result = await refineContent({
          agentId: agentNode.data.agentId as Id<"agents">,
          userMessage: finalMessage,
          currentDraft: agentNode.data.draft || "",
          agentType: agentNode.data.type as "title" | "description" | "thumbnail" | "tweets",
          chatHistory: agentHistory.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          productData,
          profileData: userProfile ? {
            brandName: userProfile.brandName,
            productCategory: userProfile.productCategory,
            niche: userProfile.niche,
            tone: userProfile.tone,
            targetAudience: userProfile.targetAudience,
          } : undefined,
        });
      }
      
      // Add AI response
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: result.response,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      // Update node with new draft and thumbnail URL if applicable
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === agentNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  draft: result?.updatedContent || result?.updatedDraft || node.data.draft,
                  status: "ready",
                  ...(result?.imageUrl && { thumbnailUrl: result.imageUrl }),
                },
              }
            : node
        )
      );
      
      // Save to database if it's a hero-image with a new image
      if (agentNode.data.type === "hero-image" && result?.imageUrl && agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: result?.updatedContent || result?.updatedDraft || agentNode.data.draft || "",
          status: "ready",
          imageUrl: result.imageUrl,
          imageStorageId: result?.storageId as Id<"_storage"> | undefined,
        });
      }
      
      // Add a helpful tip if this was their first generation
      if (!agentNode.data.draft && !isRegeneration) {
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            id: `tip-${Date.now()}`,
            role: "ai",
            content: `💡 Tip: You can regenerate this ${agentNode.data.type} anytime by mentioning @${agentNode.data.type.toUpperCase()}_AGENT and describing what changes you want. For example: "@${agentNode.data.type.toUpperCase()}_AGENT make it more casual" or "@${agentNode.data.type.toUpperCase()}_AGENT try again with a focus on benefits"`,
            timestamp: Date.now(),
            agentId: agentNode.id,
          }]);
        }, 1000);
      }
      
    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Reset node status on error
      setNodes((nds: any) =>
        nds.map((node: any) =>
          node.id === agentNode.id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: "error",
                  generationProgress: undefined
                },
              }
            : node
        )
      );
      
      // Update error status in database
      if (agentNode.data.agentId) {
        await updateAgentDraft({
          id: agentNode.data.agentId as Id<"agents">,
          draft: agentNode.data.draft || "",
          status: "error",
        });
      }
      
      // Add error message to chat
      setChatMessages(prev => [...prev, {
        id: `ai-error-${Date.now()}`,
        role: "ai",
        content: `❌ Sorry, I encountered an error: ${error.message || "Failed to process your request"}. Please try again or generate a new thumbnail if the issue persists.`,
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
      
      toast.error("Failed to process chat message");
      
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: Date.now(),
        agentId: agentNode.id,
      }]);
    } finally {
      setIsChatGenerating(false);
    }
  }, [chatMessages, projectProducts, userProfile, refineContent, setNodes]);

  // Handle chat button click - add @mention to input
  const handleChatButtonClick = useCallback((nodeId: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode || agentNode.type !== 'agent') return;
    
    const agentType = agentNode.data.type as string;
    const mention = `@${agentType.toUpperCase()}_AGENT `;
    
    // Add mention to chat input
    setChatInput(mention);
    // Clear it after a short delay to prevent continuous updates
    setTimeout(() => setChatInput(''), 100);
  }, []);

  // Handle regenerate button click - immediate regeneration
  const handleRegenerateClick = useCallback(async (nodeId: string) => {
    const agentNode = nodesRef.current.find((n: any) => n.id === nodeId);
    if (!agentNode || agentNode.type !== 'agent') return;
    
    const agentType = agentNode.data.type as string;
    
    // Special handling for thumbnail regeneration - needs new images
    if (agentType === 'thumbnail') {
      // Open thumbnail upload modal for new images
      setPendingThumbnailNode(nodeId);
      setThumbnailModalOpen(true);
      
      // Add a context message to the chat
      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: "ai",
        content: `Upload new images for thumbnail regeneration. The previous concept was: "${agentNode.data.draft?.slice(0, 200)}..."`,
        timestamp: Date.now(),
        agentId: nodeId,
      }]);
    } else {
      // For other agents, trigger immediate regeneration
      toast.info(`Regenerating ${agentType}...`);
      
      // Add a system message to chat history
      setChatMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        role: "ai",
        content: `🔄 Regenerating ${agentType} content...`,
        timestamp: Date.now(),
        agentId: nodeId,
      }]);
      
      try {
        // Call handleGenerate directly for immediate regeneration
        await handleGenerate(nodeId);
        
        // Add success message to chat
        setChatMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: "ai",
          content: `✨ Successfully regenerated ${agentType} content! The new version is ready.`,
          timestamp: Date.now(),
          agentId: nodeId,
        }]);
      } catch (error) {
        console.error("Regeneration failed:", error);
        toast.error(`Failed to regenerate ${agentType}`);
        
        // Add error message to chat
        setChatMessages(prev => [...prev, {
          id: `system-${Date.now()}`,
          role: "ai",
          content: `❌ Failed to regenerate ${agentType}. Please try again.`,
          timestamp: Date.now(),
          agentId: nodeId,
        }]);
      }
    }
  }, [handleGenerate]);

  // Generate content for all agent nodes (connect if needed)
  const handleGenerateAll = useCallback(async () => {
    // Find product node
    const productNode = nodes.find((node: any) => node.type === 'video');
    if (!productNode) {
      toast.error("Please add a product image first!");
      return;
    }
    
    // Find all agent nodes
    const agentNodes = nodes.filter((node: any) => node.type === 'agent');
    if (agentNodes.length === 0) {
      toast.error("No agent nodes found!");
      return;
    }
    
    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: agentNodes.length });
    
    // Ensure all agents are connected to product node
    agentNodes.forEach((agentNode: any) => {
      const existingEdge = edges.find((edge: any) => 
        edge.source === productNode.id && edge.target === agentNode.id
      );
      
      if (!existingEdge) {
        const newEdge: Edge = {
          id: `e${productNode.id}-${agentNode.id}`,
          source: productNode.id,
          target: agentNode.id,
          animated: enableEdgeAnimations && !isDragging,
        };
        setEdges((eds: any) => [...eds, newEdge]);
        
        // Update agent connections in database
        if (agentNode.data.agentId) {
          updateAgentConnections({
            id: agentNode.data.agentId as Id<"agents">,
            connections: [productNode.data.productId as string],
          }).catch((error: any) => {
            console.error("Failed to update agent connections:", error);
          });
        }
      }
    });
    
    // Generate content for each agent (skip thumbnail nodes)
    let processedCount = 0;
    for (let i = 0; i < agentNodes.length; i++) {
      const agentNode = agentNodes[i];
      
      if (agentNode.data.type === "thumbnail") {
        console.log("[Canvas] Skipping thumbnail node in Generate All:", agentNode.id);
        toast.info("Thumbnail generation requires manual image upload");
        continue;
      }
      
      processedCount++;
      setGenerationProgress({ current: processedCount, total: agentNodes.length });
      
      try {
        await handleGenerate(agentNode.id);
      } catch (error) {
        console.error(`Failed to generate content for ${agentNode.data.type}:`, error);
        toast.error(`Failed to generate ${agentNode.data.type}`);
      }
    }
    
    setIsGeneratingAll(false);
    setGenerationProgress({ current: 0, total: 0 });
    toast.success("All content generated successfully!");
  }, [nodes, edges, setEdges, handleGenerate, updateAgentConnections]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((n: any) => n.id === params.source);
      const targetNode = nodes.find((n: any) => n.id === params.target);
      
      // Allow connections: video->agent, agent->agent, video->brandKit
      if (!sourceNode || !targetNode) return;
      
      if (
        (sourceNode.type === 'video' && targetNode.type === 'agent') ||
        (sourceNode.type === 'agent' && targetNode.type === 'agent') ||
        (sourceNode.type === 'video' && targetNode.type === 'brandKit')
      ) {
        setEdges((eds: any) => addEdge(params, eds));
        
        // Update agent connections in database
        if (targetNode.data.agentId && sourceNode.data.videoId) {
          const currentConnections = targetNode.data.connections || [];
          const newConnections = [...currentConnections, sourceNode.data.videoId];
          
          updateAgentConnections({
            id: targetNode.data.agentId as Id<"agents">,
            connections: newConnections,
          }).catch((error: any) => {
            console.error("Failed to update agent connections:", error);
          });
          
          // Update node data
          setNodes((nds: any) =>
            nds.map((node: any) =>
              node.id === targetNode.id
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      connections: newConnections,
                    },
                  }
                : node
            )
          );
        }
      }
    },
    [nodes, setEdges, setNodes, updateAgentConnections]
  );
  
  // Perform the actual deletion
  const performDeletion = useCallback(
    async (nodes: Node[]) => {
      for (const node of nodes) {
        try {
          if (node.type === 'video' && node.data.productId) {
            // Delete product from database (this also deletes associated agents)
            await deleteProduct({ id: node.data.productId as Id<"products"> });
            toast.success("Product and associated content deleted");
            
          } else if (node.type === 'agent' && node.data.agentId) {
            // Delete agent from database
            await deleteAgent({ id: node.data.agentId as Id<"agents"> });
            toast.success("Agent deleted");
          }
        } catch (error) {
          console.error("Failed to delete node:", error);
          toast.error("Failed to delete node");
          
          // Re-add the node if deletion failed
          setNodes((nds: any) => [...nds, node]);
        }
      }
    },
    [deleteProduct, deleteAgent, setNodes]
  );
  
  // Handle share functionality
  const handleShare = useCallback(async () => {
    try {
      // Get current canvas state
      const canvasNodes = nodes.map((node: any) => {
        const cleanedData: any = {};
        
        // Only copy serializable properties
        for (const [key, value] of Object.entries(node.data)) {
          if (typeof value !== 'function' && key !== 'onGenerate' && key !== 'onRegenerate' && 
              key !== 'onChat' && key !== 'onView' && key !== 'onViewPrompt' && 
              key !== 'onRetryTranscription' && key !== 'onVideoClick') {
            cleanedData[key] = value;
          }
        }
        
        return {
          id: node.id,
          type: node.type,
          position: node.position,
          data: cleanedData
        };
      });

      const canvasEdges = edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      }));

      // Create share link
      const shareId = await createShareLink({
        projectId,
        canvasState: {
          nodes: canvasNodes,
          edges: canvasEdges,
          viewport: {
            x: 0,
            y: 0,
            zoom: 1,
          }
        }
      });

      // Build share URL
      const shareUrl = `${window.location.origin}/share/${shareId}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      toast.success("Share link copied to clipboard!");
      
      // Reset copied state after 3 seconds
      setTimeout(() => setCopiedShareLink(false), 3000);
    } catch (error) {
      console.error("Failed to create share link:", error);
      toast.error("Failed to create share link");
    }
  }, [createShareLink, projectId, nodes, edges]);
  
  // Handle node deletion
  const onNodesDelete = useCallback(
    (nodes: Node[]) => {
      console.log("🗑️ Nodes marked for deletion:", nodes);
      console.log("Node types:", nodes.map(n => n.type));
      
      // Check if any nodes have important data
      const hasVideo = nodes.some((n: any) => n.type === 'video');
      const hasAgent = nodes.some((n: any) => n.type === 'agent' && n.data.draft);
      
      if (hasVideo || hasAgent) {
        // Store nodes for deletion and show dialog
        setNodesToDelete(nodes);
        setDeleteDialogOpen(true);
        return false; // Prevent React Flow from deleting immediately
      } else {
        // For non-important nodes (like videoInfo), delete immediately
        performDeletion(nodes);
        return true;
      }
    },
    [performDeletion]
  );
  
  // Handle deletion confirmation
  const handleDeleteConfirm = useCallback(() => {
    performDeletion(nodesToDelete);
    // Remove nodes from React Flow
    setNodes((nds: any) => 
      nds.filter((node: any) => !nodesToDelete.some(n => n.id === node.id))
    );
    setDeleteDialogOpen(false);
    setNodesToDelete([]);
  }, [nodesToDelete, performDeletion, setNodes]);

  // Handle right-click context menu for node deletion
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    
    // Create a simple context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'fixed z-50 bg-background border border-border rounded-lg shadow-lg p-2 min-w-[120px]';
    contextMenu.style.left = `${event.clientX}px`;
    contextMenu.style.top = `${event.clientY}px`;
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded flex items-center gap-2';
    deleteButton.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
      Delete Node
    `;
    
    deleteButton.onclick = () => {
      setNodesToDelete([node]);
      setDeleteDialogOpen(true);
      document.body.removeChild(contextMenu);
    };
    
    contextMenu.appendChild(deleteButton);
    document.body.appendChild(contextMenu);
    
    // Remove context menu when clicking elsewhere
    const removeMenu = (e: MouseEvent) => {
      if (!contextMenu.contains(e.target as HTMLElement)) {
        // Check if the context menu is still in the DOM before removing
        if (contextMenu.parentNode) {
          document.body.removeChild(contextMenu);
        }
        document.removeEventListener('click', removeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', removeMenu);
    }, 100);
  }, []);

  // Find non-overlapping position for new nodes
  const findNonOverlappingPosition = useCallback((desiredPos: { x: number; y: number }, nodeType: string) => {
    const nodeWidth = nodeType === 'video' ? 200 : 150;
    const nodeHeight = nodeType === 'video' ? 120 : 50;
    const spacing = 20;
    
    // Check if position overlaps with any existing node
    const checkOverlap = (pos: { x: number; y: number }) => {
      return nodes.some((node: any) => {
        const existingWidth = node.type === 'video' ? 200 : 150;
        const existingHeight = node.type === 'video' ? 120 : 50;
        
        return (
          pos.x < node.position.x + existingWidth + spacing &&
          pos.x + nodeWidth + spacing > node.position.x &&
          pos.y < node.position.y + existingHeight + spacing &&
          pos.y + nodeHeight + spacing > node.position.y
        );
      });
    };
    
    // If no overlap, return desired position
    if (!checkOverlap(desiredPos)) {
      return desiredPos;
    }
    
    // Otherwise, find nearest free position using spiral search
    const step = 30;
    let distance = 1;
    
    while (distance < 10) {
      // Try positions in a spiral pattern
      const positions = [
        { x: desiredPos.x + step * distance, y: desiredPos.y },
        { x: desiredPos.x - step * distance, y: desiredPos.y },
        { x: desiredPos.x, y: desiredPos.y + step * distance },
        { x: desiredPos.x, y: desiredPos.y - step * distance },
        { x: desiredPos.x + step * distance, y: desiredPos.y + step * distance },
        { x: desiredPos.x - step * distance, y: desiredPos.y - step * distance },
        { x: desiredPos.x + step * distance, y: desiredPos.y - step * distance },
        { x: desiredPos.x - step * distance, y: desiredPos.y + step * distance },
      ];
      
      for (const pos of positions) {
        if (!checkOverlap(pos)) {
          return pos;
        }
      }
      
      distance++;
    }
    
    // If no free position found, offset significantly
    return {
      x: desiredPos.x + 200,
      y: desiredPos.y + 100
    };
  }, [nodes]);

  // Handle content update from modal
  const handleContentUpdate = async (nodeId: string, newContent: string) => {
    const node = nodes.find((n: any) => n.id === nodeId);
    if (!node) return;
    
    setNodes((nds: any) =>
      nds.map((node: any) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, draft: newContent } }
          : node
      )
    );
    
    // Save to database if it's an agent with an ID
    if (node.type === 'agent' && node.data.agentId) {
      try {
        await updateAgentDraft({
          id: node.data.agentId as Id<"agents">,
          draft: newContent,
          status: "ready",
        });
        toast.success("Content updated!");
      } catch (error) {
        console.error("Failed to update agent content:", error);
        toast.error("Failed to save content");
      }
    } else {
      toast.success("Content updated!");
    }
  };


  // Handle video file upload
  const handleVideoUpload = async (file: File, position: { x: number; y: number }, retryCount = 0) => {
    const MAX_RETRIES = 2;
    try {
      // Create a temporary node with loading state
      const tempNodeId = `video_temp_${Date.now()}`;
      const tempNode: Node = {
        id: tempNodeId,
        type: "video",
        position,
        data: {
          title: file.name.replace(/\.[^/.]+$/, ""),
          isUploading: true,
        },
      };
      setNodes((nds: any) => nds.concat(tempNode));

      // Validate file before upload
      const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB limit for product images
      
      if (file.size > MAX_FILE_SIZE) {
        // Remove the temporary node since upload won't proceed
        setNodes((nds: any) => nds.filter((n: any) => n.id !== tempNodeId));
        
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
        toast.error("Image file too large", {
          description: `Your image is ${fileSizeMB}MB but the maximum allowed size is 100MB. Please compress your image.`,
          duration: 8000,
        });
        
        // Throw error for proper error handling
        throw new Error(`File is too large (${fileSizeMB}MB). Maximum size is 100MB.`);
      }

      // Check image format (allow both video and image formats for flexibility)
      const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!supportedFormats.some(format => file.type === format || file.name.toLowerCase().includes(format.split('/')[1]))) {
        // Remove the temporary node since upload won't proceed
        setNodes((nds: any) => nds.filter((n: any) => n.id !== tempNodeId));
        
        toast.error("Unsupported file format", {
          description: "Please upload JPG, PNG, WebP, MP4, MOV, AVI, or WebM files.",
          duration: 6000,
        });
        
        throw new Error('Unsupported file format. Please upload supported image or video files.');
      }

      // Step 1: Create product record in database first
      console.log("Creating product record in database...");
      const product = await createProduct({
        projectId,
        title: file.name.replace(/\.[^/.]+$/, ""),
        canvasPosition: position,
      });
      
      console.log("Product created:", product);
      if (!product || !product._id) {
        throw new Error("Failed to create product record in database. Please try again.");
      }
      
      // Step 2: Upload to Convex storage
      console.log("Uploading to Convex storage...");
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      
      if (!uploadResult.ok) {
        throw new Error("Upload to Convex failed");
      }
      
      const { storageId } = await uploadResult.json();
      console.log("File uploaded to Convex storage:", storageId);
      
      // Step 3: Update product with storage ID (this also updates the imageUrl)
      await updateProductStorageId({
        productId: product._id,
        storageId,
      });
      
      // Step 4: Create a temporary blob URL to show image immediately
      const temporaryUrl = URL.createObjectURL(file);
      
      // Clean up the blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(temporaryUrl);
      }, 30000);
      
      // Step 5: Update node with real data
      setNodes((nds: any) => 
        nds.map((node: any) => 
          node.id === tempNodeId
            ? {
                ...node,
                id: `video_${product._id}`,
                data: {
                  ...node.data,
                  isUploading: false,
                  productId: product._id,
                  storageId: storageId,
                  imageUrl: temporaryUrl, // Use imageUrl for product images
                  videoUrl: temporaryUrl, // Keep for backward compatibility
                  title: product.title,
                  fileSize: file.size,
                  onImageClick: () => handleVideoClick({
                    url: temporaryUrl,
                    title: product.title || "Untitled Product",
                    duration: undefined,
                    fileSize: file.size,
                  }),
                  onVideoClick: () => handleVideoClick({
                    url: temporaryUrl,
                    title: product.title || "Untitled Product",
                    duration: undefined,
                    fileSize: file.size,
                  })
                },
              }
            : node
        )
      );
      
      toast.success("Product image uploaded successfully!", {
        description: `${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      });
      
      console.log("Product upload completed successfully");
      toast.success("Product image uploaded and ready for AI content generation!");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      console.error("Full error details:", error.stack);
      
      // Handle the error with our error handler
      const errorDetails = handleVideoError(error, 'Upload');
      
      // Remove the temporary node on error
      setNodes((nds: any) => nds.filter((node: any) => !node.id.startsWith('video_temp_')));
      
      // If recoverable and haven't exceeded retries, show retry option
      if (errorDetails.recoverable && retryCount < MAX_RETRIES) {
        const retryAction = createRetryAction(() => {
          handleVideoUpload(file, position, retryCount + 1);
        });
        
        toast.error(errorDetails.message, {
          description: errorDetails.details,
          duration: 8000,
          action: retryAction,
        });
      }
    }
  };

  // Retry transcription for a failed video
  // Create refs for viewport saving
  const viewportRef = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const viewportSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Handle viewport changes - debounced save
  const onViewportChange = useCallback((viewport: { x: number; y: number; zoom: number }) => {
    // Store the latest viewport
    viewportRef.current = viewport;
    
    // Clear existing timeout
    if (viewportSaveTimeoutRef.current) {
      clearTimeout(viewportSaveTimeoutRef.current);
    }
    
    // Set new timeout to save viewport
    if (projectId && hasInitializedViewport && hasLoadedFromDB) {
      viewportSaveTimeoutRef.current = setTimeout(() => {
        console.log("Saving viewport after change:", viewport);
        // Only update viewport in the canvas state
        const currentCanvasState = canvasState || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
        saveCanvasState({
          projectId,
          nodes: currentCanvasState.nodes,
          edges: currentCanvasState.edges,
          viewport: {
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          },
        }).catch((error) => {
          console.error("Failed to save viewport:", error);
        });
      }, 1000); // Save after 1 second of no viewport changes
    }
  }, [projectId, hasInitializedViewport, hasLoadedFromDB, canvasState, saveCanvasState]);

  const retryTranscription = async (productId: string) => {
    try {
      const product = nodes.find((n: any) => n.id === `video_${productId}`)?.data;
      const productRecord = projectProducts?.find(p => p._id === productId);
      
      if (!product && !productRecord) {
        toast.error("Cannot retry: Product data not found");
        return;
      }
      
      // Products don't need transcription, so this function is not applicable
      toast.info("Product images don't require transcription");
        return;
        } catch (error: any) {
      console.error("Retry operation error:", error);
      toast.error("Operation not supported for products");
    }
  };

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      
      // Handle video file drop
      if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        if (file.type.startsWith("video/")) {
          if (!reactFlowInstance) return;
          
          const desiredPosition = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          
          const position = findNonOverlappingPosition(desiredPosition, 'video');

          // Show file size info
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
          const MAX_FILE_SIZE = 25 * 1024 * 1024;
          
          if (file.size > MAX_FILE_SIZE) {
            toast.info(`Video is ${fileSizeMB}MB. Audio will be extracted for transcription (supports up to ~25 min videos).`);
          } else {
            toast.info(`Video is ${fileSizeMB}MB. Will transcribe directly.`);
          }

          // Upload video to Convex
          handleVideoUpload(file, position);
          return;
        }
      }

      // Handle node type drop
      if (!type || !reactFlowInstance) {
        return;
      }

      const desiredPosition = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const position = findNonOverlappingPosition(desiredPosition, type);

      // Handle brandKit nodes differently
      if (type === "brandKit") {
        // Check if brandKit already exists in this project
        const existingBrandKit = nodes.find((n: any) => n.type === 'brandKit');
        if (existingBrandKit) {
          toast.error("Only one Brand Kit per project allowed");
          return;
        }

        // Find the first product node to auto-connect to
        const productNode = nodes.find((n: any) => n.type === 'video' && n.data.productId);
        if (!productNode) {
          toast.error("Please add a product image first before adding Brand Kit");
          return;
        }

        const nodeId = `brandkit_${Date.now()}`;
        const newNode: Node = {
          id: nodeId,
          type: "brandKit",
          position,
          data: {
            projectId,
            brandName: "",
            colorPalette: {
              type: "preset" as const,
              preset: "professional-blue" as const,
            },
            brandVoice: "professional-trustworthy",
          },
        };

        setNodes((nds: any) => nds.concat(newNode));
        
        // Automatically create edge from product to brand kit
        const edgeId = `e${productNode.id}-${nodeId}`;
        const newEdge: Edge = {
          id: edgeId,
          source: productNode.id,
          target: nodeId,
          animated: enableEdgeAnimations && !isDragging,
        };
        setEdges((eds: any) => [...eds, newEdge]);
        
        toast.success("Brand Kit added and connected to product");
        return;
      }

      // Find the first product node to associate with this agent
      const productNode = nodes.find((n: any) => n.type === 'video' && n.data.productId);
      if (!productNode) {
        toast.error("Please add a product image first before adding agents");
        return;
      }

      // Create agent in database
      createAgent({
        productId: productNode.data.productId as Id<"products">,
        type: type as "title" | "bullet-points" | "hero-image" | "lifestyle-image" | "infographic",
        canvasPosition: position,
      }).then((agentId) => {
        const nodeId = `agent_${type}_${agentId}`;
        const newNode: Node = {
          id: nodeId,
          type: "agent",
          position,
          data: {
            agentId, // Store the database ID
            type,
            draft: "",
            status: "idle",
            connections: [],
            onGenerate: () => handleGenerate(nodeId),
            onChat: () => handleChatButtonClick(nodeId),
            onView: () => setSelectedNodeForModal(nodeId),
            onRegenerate: () => handleRegenerateClick(nodeId),
            onViewPrompt: () => {
              const node = nodesRef.current.find((n: any) => n.id === nodeId);
              if (node?.data?.lastPrompt) {
                setSelectedPrompt({ agentType: node.data.type, prompt: node.data.lastPrompt });
                setPromptModalOpen(true);
              }
            },
          },
        };

        setNodes((nds: any) => nds.concat(newNode));
        
        // Automatically create edge from product to agent
        const edgeId = `e${productNode.id}-${nodeId}`;
        const newEdge: Edge = {
          id: edgeId,
          source: productNode.id,
          target: nodeId,
          animated: enableEdgeAnimations && !isDragging,
        };
        setEdges((eds: any) => [...eds, newEdge]);
        
        // Update agent's connections in database
        updateAgentConnections({
          id: agentId,
          connections: [productNode.data.productId as string],
        }).catch((error) => {
          console.error("Failed to update agent connections:", error);
        });
        
        toast.success(`${type} agent added and connected to product`);
        
        // Products don't need transcription, so just show ready message
        toast.info("Ready to generate content - click Generate on the agent node");
      }).catch((error) => {
        console.error("Failed to create agent:", error);
        toast.error("Failed to create agent");
      });
    },
    [reactFlowInstance, setNodes, setEdges, handleVideoUpload, handleGenerate, nodes, createAgent, projectId, updateAgentConnections, handleChatButtonClick, handleRegenerateClick]
  );

  // Load existing products, agents, and brand kits from the project
  useEffect(() => {
    if (!hasLoadedFromDB && projectProducts !== undefined && projectAgents !== undefined && projectBrandKits !== undefined) {
      // Get saved canvas state for positions
      const savedNodes = canvasState?.nodes || [];
      
      const productNodes: Node[] = projectProducts.map((product) => {
        // Use saved position from canvas state if available, otherwise use database position
        const savedNode = savedNodes.find((n: any) => n.id === `video_${product._id}`);
        const position = savedNode?.position || product.canvasPosition;
        
        return {
          id: `video_${product._id}`,
          type: "video",
          position,
          data: {
            productId: product._id,
            title: product.title,
            imageUrl: product.productImages?.[0]?.url,
            videoUrl: product.productImages?.[0]?.url, // Keep for backward compatibility
            storageId: product.storageId,
            hasTranscription: false, // Products don't have transcription
            isTranscribing: false, // Products don't need transcription
            // Product info fields
            productName: product.productName,
            keyFeatures: product.keyFeatures,
            targetKeywords: product.targetKeywords,
            targetAudience: product.targetAudience,
            // brandVoice removed - now handled by Brand Kit
            onImageClick: () => handleVideoClick({
              url: product.productImages?.[0]?.url || '',
              title: product.title || "Untitled Product",
              duration: undefined,
              fileSize: undefined,
            }),
            onVideoClick: () => handleVideoClick({
              url: product.productImages?.[0]?.url || '',
              title: product.title || "Untitled Product",
              duration: undefined,
              fileSize: undefined,
            }),
          },
        };
      });

      const agentNodes: Node[] = projectAgents.map((agent) => ({
        id: `agent_${agent.type}_${agent._id}`,
        type: "agent",
        position: agent.canvasPosition,
        data: {
          agentId: agent._id, // Store the database ID
          type: agent.type,
          draft: agent.draft,
          thumbnailUrl: agent.imageUrl,
          status: agent.status,
          connections: agent.connections,
          onGenerate: () => handleGenerate(`agent_${agent.type}_${agent._id}`),
          onChat: () => handleChatButtonClick(`agent_${agent.type}_${agent._id}`),
          onView: () => setSelectedNodeForModal(`agent_${agent.type}_${agent._id}`),
          onRegenerate: () => handleRegenerateClick(`agent_${agent.type}_${agent._id}`),
          onViewPrompt: () => {
            const node = nodesRef.current.find((n: any) => n.id === `agent_${agent.type}_${agent._id}`);
            if (node?.data?.lastPrompt) {
              setSelectedPrompt({ agentType: node.data.type, prompt: node.data.lastPrompt });
              setPromptModalOpen(true);
            }
          },
        },
      }));

      // Create brand kit nodes if they exist
      const brandKitNodes: Node[] = projectBrandKits ? [{
        id: `brandkit_${projectBrandKits._id}`,
        type: "brandKit",
        position: (() => {
          // Use saved position from canvas state if available, otherwise use database position
          const savedNode = savedNodes.find((n: any) => n.id === `brandkit_${projectBrandKits._id}`);
          return savedNode?.position || projectBrandKits.canvasPosition;
        })(),
        data: {
          projectId,
          brandKitId: projectBrandKits._id,
          brandName: projectBrandKits.brandName,
          colorPalette: projectBrandKits.colorPalette,
          brandVoice: projectBrandKits.brandVoice,
        },
      }] : [];

      setNodes([...productNodes, ...agentNodes, ...brandKitNodes]);
      
      // Load chat history from agents
      const allMessages: typeof chatMessages = [];
      projectAgents.forEach((agent) => {
        if (agent.chatHistory && agent.chatHistory.length > 0) {
          const agentMessages = agent.chatHistory.map((msg, idx) => ({
            id: `msg-${agent._id}-${idx}`,
            role: msg.role,
            content: msg.message,
            timestamp: msg.timestamp,
            agentId: `agent_${agent.type}_${agent._id}`,
          }));
          allMessages.push(...agentMessages);
        }
      });
      // Sort messages by timestamp
      allMessages.sort((a: any, b: any) => a.timestamp - b.timestamp);
      setChatMessages(allMessages);
      
      // Reconstruct edges from canvas state if available, otherwise from agent connections
      let edges: Edge[] = [];
      
      if (canvasState?.edges && canvasState.edges.length > 0) {
        // Use saved canvas state edges (this preserves brand kit connections)
        console.log("[Canvas] Restoring edges from canvas state:", canvasState.edges.length);
        edges = canvasState.edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          animated: enableEdgeAnimations && !isDragging,
        }));
      } else {
        // Fallback: reconstruct edges based on agent connections (legacy)
        console.log("[Canvas] No canvas state edges, reconstructing from agent connections");
        projectAgents.forEach((agent) => {
          agent.connections.forEach((connectionId: string) => {
            // Find the source node by its data ID
            let sourceNodeId: string | null = null;
            
            // Check if it's a product ID
            const productNode = productNodes.find(pn => pn.data.productId === connectionId);
            if (productNode) {
              sourceNodeId = productNode.id;
            } else {
              // Check if it's an agent ID
              const agentNode = agentNodes.find(an => an.data.agentId === connectionId);
              if (agentNode) {
                sourceNodeId = agentNode.id;
              }
            }
            
            if (sourceNodeId) {
              edges.push({
                id: `e${sourceNodeId}-agent_${agent.type}_${agent._id}`,
                source: sourceNodeId,
                target: `agent_${agent.type}_${agent._id}`,
                animated: enableEdgeAnimations && !isDragging,
              });
            }
          });
        });
      }
      
      // ALWAYS ensure Brand Kit is connected to the first product (if both exist)
      if (brandKitNodes.length > 0 && productNodes.length > 0) {
        const brandKitNode = brandKitNodes[0];
        const productNode = productNodes[0];
        const brandKitConnectionId = `e${productNode.id}-${brandKitNode.id}`;
        
        // Check if Brand Kit connection already exists
        const brandKitConnectionExists = edges.some(edge => 
          edge.source === productNode.id && edge.target === brandKitNode.id
        );
        
        if (!brandKitConnectionExists) {
          console.log("[Canvas] Creating missing Brand Kit connection");
          edges.push({
            id: brandKitConnectionId,
            source: productNode.id,
            target: brandKitNode.id,
            animated: enableEdgeAnimations && !isDragging,
          });
        } else {
          console.log("[Canvas] Brand Kit connection already exists");
        }
      }
      
      setEdges(edges);
      setHasLoadedFromDB(true);
    }
  }, [projectProducts, projectAgents, projectBrandKits, canvasState, hasLoadedFromDB, setNodes, setEdges, handleGenerate, handleChatButtonClick]);
  
  // Load canvas viewport state - only run once when everything is ready
  useEffect(() => {
    if (!reactFlowInstance || !hasLoadedFromDB || hasInitializedViewport) return;
    
    // If we have a saved canvas state with viewport
    if (canvasState?.viewport) {
      const { x, y, zoom } = canvasState.viewport;
      // Apply saved viewport with minimal validation
      if (typeof x === 'number' && typeof y === 'number' && typeof zoom === 'number' && zoom > 0) {
        console.log("Restoring saved viewport:", { x, y, zoom });
        // Small delay to ensure React Flow is ready
        setTimeout(() => {
          reactFlowInstance.setViewport({ x, y, zoom });
          viewportRef.current = { x, y, zoom };
          setHasInitializedViewport(true);
        }, 50);
      } else {
        setHasInitializedViewport(true);
      }
    } else if (nodes.length > 0) {
      // Only fit view on first load when there's no saved state
      console.log("No saved viewport, fitting view to nodes");
      setTimeout(() => {
        reactFlowInstance.fitView({ 
          padding: 0.2, 
          maxZoom: 1.5,
          duration: 800 
        });
        setHasInitializedViewport(true);
      }, 100);
    } else {
      // No nodes and no saved state, just mark as initialized
      setHasInitializedViewport(true);
    }
  }, [canvasState?.viewport, reactFlowInstance, hasLoadedFromDB, hasInitializedViewport, nodes.length]);
  
  // Debug: Log when nodes change to see selection state
  useEffect(() => {
    const selectedNodes = nodes.filter((node: any) => node.selected);
    if (selectedNodes.length > 0) {
      console.log("📍 Selected nodes:", selectedNodes.map((n: any) => ({ id: n.id, type: n.type, selected: n.selected })));
    }
  }, [nodes]);

  // Products don't need transcription updates, so this can be simplified
  useEffect(() => {
    // Update nodes with current product data from database  
    if (projectProducts && projectProducts.length > 0) {
        setNodes((nds: any) =>
          nds.map((node: any) => {
            if (node.type === 'video') {
            const product = projectProducts.find((p: any) => `video_${p._id}` === node.id);
            // Get the main product image from productImages array
            const mainImage = product?.productImages?.find((img: any) => img.type === 'main');
            const imageUrl = mainImage?.url;
            
            if (product && imageUrl && imageUrl !== node.data.imageUrl) {
              // Update with real image URL from database
                  return {
                    ...node,
                    data: {
                      ...node.data,
                  imageUrl: imageUrl, // Use imageUrl for product images
                  videoUrl: imageUrl, // Keep for backward compatibility
                  onImageClick: () => handleVideoClick({
                    url: imageUrl,
                    title: product.title || "Untitled Product",
                    duration: undefined,
                    fileSize: undefined,
                  }),
                  onVideoClick: () => handleVideoClick({
                    url: imageUrl,
                    title: product.title || "Untitled Product",
                    duration: undefined,
                    fileSize: undefined,
                  }),
                },
              };
              }
            }
            return node;
          })
        );
      }
  }, [projectProducts, setNodes]);

  // Auto-save canvas state
  useEffect(() => {
    if (!projectId || !hasLoadedFromDB || !hasInitializedViewport) return;
    
    const saveTimeout = setTimeout(() => {
      // Use the viewport from ref or get current viewport
      const viewport = viewportRef.current || reactFlowInstance?.getViewport();
      
      // Basic viewport validation
      if (!viewport || typeof viewport.zoom !== 'number' || viewport.zoom <= 0) {
        console.warn("Invalid viewport, skipping save");
        return;
      }
      
      console.log("Saving canvas state with viewport:", viewport);
      
      // Filter out function properties from node data
      const serializableNodes = nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: Object.fromEntries(
          Object.entries(node.data).filter(([, value]) => {
            // Filter out functions and undefined values
            return typeof value !== 'function' && value !== undefined;
          })
        ),
      }));
      
      saveCanvasState({
        projectId,
        nodes: serializableNodes,
        edges: edges.map((edge: any) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle || undefined,
          targetHandle: edge.targetHandle || undefined,
        })),
        viewport: {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        },
      }).catch((error) => {
        console.error("Failed to save canvas state:", error);
      });
    }, 2000); // Save after 2 seconds of inactivity
    
    return () => clearTimeout(saveTimeout);
  }, [nodes, edges, reactFlowInstance, projectId, saveCanvasState, hasLoadedFromDB, hasInitializedViewport]);

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-var(--header-height))]">
        {/* Sidebar with draggable agent nodes */}
        <aside className={`${isSidebarCollapsed ? "w-20" : "w-72"} bg-gradient-to-b from-background via-background to-background/95 border-r border-border/50 transition-all duration-300 flex flex-col backdrop-blur-sm`}>
          <div className={`flex-1 ${isSidebarCollapsed ? "p-3" : "p-6"} overflow-y-auto`}>
            {/* Header */}
            <div className={`flex items-center ${isSidebarCollapsed ? "justify-center mb-6" : "justify-between mb-8"}`}>
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">AI Agents</h2>
                    <p className="text-xs text-muted-foreground">Drag to canvas</p>
                  </div>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`h-9 w-9 hover:bg-primary/10 ${isSidebarCollapsed ? "" : "ml-auto"}`}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Agents Section */}
            <div className="space-y-3">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Content Agents</span>
                </div>
              )}
              
              <DraggableNode 
                type="title" 
                label={isSidebarCollapsed ? "" : "Title Generator"} 
                description={isSidebarCollapsed ? "" : "Create compelling product titles"}
                icon={<Hash className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="blue"
              />
              <DraggableNode 
                type="bullet-points" 
                label={isSidebarCollapsed ? "" : "Description Writer"} 
                description={isSidebarCollapsed ? "" : "Write Amazon-optimized bullet points"}
                icon={<FileText className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="green"
              />
              <DraggableNode 
                type="hero-image" 
                label={isSidebarCollapsed ? "" : "Hero Image Designer"} 
                description={isSidebarCollapsed ? "" : "Design product hero images"}
                icon={<Palette className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="purple"
              />
              <DraggableNode 
                type="lifestyle-image" 
                label={isSidebarCollapsed ? "" : "Lifestyle Image Generator"} 
                description={isSidebarCollapsed ? "" : "Create lifestyle product shots"}
                icon={<Zap className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="yellow"
              />
              <DraggableNode 
                type="infographic" 
                label={isSidebarCollapsed ? "" : "Infographic Designer"} 
                description={isSidebarCollapsed ? "" : "Create product feature charts"}
                icon={<BarChart3 className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="orange"
              />
            </div>
            
            {/* Brand Section */}
            <div className="space-y-3 mt-6">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Brand Kit</span>
                </div>
              )}
              
              <DraggableNode 
                type="brandKit" 
                label={isSidebarCollapsed ? "" : "Brand Kit"} 
                description={isSidebarCollapsed ? "" : "Define your brand identity"}
                icon={<Building2 className="h-5 w-5" />}
                collapsed={isSidebarCollapsed}
                color="red"
              />
            </div>
            
            {!isSidebarCollapsed && (
              <div className="mt-8 space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-xl blur-xl" />
                  <div className="relative rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">Quick Start</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Drag a product image directly onto the canvas to begin
                    </p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Product Image
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {isSidebarCollapsed && (
              <div className="mt-8 space-y-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="icon"
                  variant="secondary"
                  className="w-full hover:bg-primary/10"
                  title="Upload Product Image"
                >
                  <Upload className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className={`${isSidebarCollapsed ? "p-3" : "p-6"} border-t border-border/50 space-y-3 bg-gradient-to-t from-background/80 to-background backdrop-blur-sm`}>
            <Button 
              onClick={handleGenerateAll} 
              disabled={isGeneratingAll}
              className={`w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 ${isSidebarCollapsed ? "" : "h-11"}`}
              size={isSidebarCollapsed ? "icon" : "default"}
              title={isSidebarCollapsed ? "Generate All Content" : undefined}
            >
              <Sparkles className={`${isSidebarCollapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} ${isGeneratingAll ? "animate-pulse" : ""}`} />
              {!isSidebarCollapsed && (isGeneratingAll 
                ? `Generating ${generationProgress.current}/${generationProgress.total}...`
                : "Generate All Content"
              )}
            </Button>
            
            <Button 
              onClick={() => setPreviewModalOpen(true)}
              className={`w-full ${isSidebarCollapsed ? "" : "h-11"}`}
              variant="secondary"
              size={isSidebarCollapsed ? "icon" : "default"}
              title={isSidebarCollapsed ? "Preview Content" : undefined}
            >
              <Eye className={isSidebarCollapsed ? "h-5 w-5" : "mr-2 h-5 w-5"} />
              {!isSidebarCollapsed && "Preview Content"}
            </Button>
            
            {!isSidebarCollapsed && (
              <div className="space-y-4 pt-2">
                <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Canvas Settings</span>
                  </div>
                  
                  <div className="space-y-3">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mini-map</span>
                      <button
                        onClick={() => setShowMiniMap(!showMiniMap)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${
                          showMiniMap ? 'bg-primary' : 'bg-muted'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                            showMiniMap ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    
                    {/* Share button */}
                    <div className="pt-3 border-t border-border/50">
                      <Button
                        onClick={handleShare}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-2"
                      >
                        {copiedShareLink ? (
                          <>
                            <Check className="h-4 w-4 text-green-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Share2 className="h-4 w-4" />
                            <span>Share Canvas</span>
                          </>
                        )}
                      </Button>
                      {getShareLink && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Share link already exists
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <VideoProcessingHelp />
              </div>
            )}
            
            {isSidebarCollapsed && (
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={() => setShowMiniMap(!showMiniMap)}
                  variant={showMiniMap ? "secondary" : "ghost"}
                  size="icon"
                  title="Toggle Mini-map"
                  className="w-full"
                >
                  <Map className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={() => setEnableEdgeAnimations(!enableEdgeAnimations)}
                  variant={enableEdgeAnimations ? "secondary" : "ghost"}
                  size="icon"
                  title="Toggle Animations"
                  className="w-full"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={handleShare}
                  variant="ghost"
                  size="icon"
                  title="Share Canvas"
                  className="w-full relative"
                >
                  {copiedShareLink ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Share2 className="h-5 w-5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges.map((edge: any) => ({
              ...edge,
              animated: enableEdgeAnimations && !isDragging,
              style: { 
                stroke: '#6366f1',
                strokeWidth: 2,
                strokeOpacity: 0.5
              },
              markerEnd: {
                type: 'arrowclosed',
                color: '#6366f1',
                width: 20,
                height: 20,
              }
            }))}
            onNodesChange={onNodesChange}
            onNodeDragStart={() => setIsDragging(true)}
            onNodeDragStop={async (_event: any, node: any) => {
              console.log("Node dragged:", node.id, "to position:", node.position);
              setIsDragging(false);
              
              // Update position in database
              if (node.type === 'video' && node.data.videoId) {
                try {
                  await updateProduct({
                    id: node.data.productId as Id<"products">,
                    canvasPosition: node.position,
                  });
                } catch (error) {
                  console.error("Failed to update video position:", error);
                }
              } else if (node.type === 'agent' && node.data.agentId) {
                try {
                  await updateAgentPosition({
                    id: node.data.agentId as Id<"agents">,
                    canvasPosition: node.position,
                  });
                } catch (error) {
                  console.error("Failed to update agent position:", error);
                }
              } else if (node.type === 'brandKit' && node.data.brandKitId) {
                try {
                  await updateCanvasBrandKit({
                    id: node.data.brandKitId as Id<"canvasBrandKits">,
                    canvasPosition: node.position,
                  });
                } catch (error) {
                  console.error("Failed to update brand kit position:", error);
                }
              }
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodesDelete={onNodesDelete}
            onNodeContextMenu={onNodeContextMenu}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onViewportChange={onViewportChange}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backspace", "Delete"]}
            selectionOnDrag={false}
            selectNodesOnDrag={false}
            fitView={false}
            minZoom={0.1}
            maxZoom={2}
            preventScrolling={false}
          >
            <Background 
              variant="dots" 
              gap={16} 
              size={1}
              color="#94a3b8"
              style={{ opacity: 0.4 }}
            />
            <Controls 
              className="!shadow-xl !border !border-border/50 !bg-background/95 !backdrop-blur-sm"
              showZoom={true}
              showFitView={true}
              showInteractive={true}
            />
            {showMiniMap && (
              <MiniMap 
                className="!shadow-xl !border !border-border/50 !bg-background/95 !backdrop-blur-sm"
                nodeColor={(node: any) => {
                  if (node.type === 'video') return '#3b82f6';
                  if (node.type === 'agent') {
                    const agentType = node.data?.type;
                    if (agentType === 'title') return '#3b82f6';
                    if (agentType === 'description') return '#10b981';
                    if (agentType === 'thumbnail') return '#a855f7';
                    if (agentType === 'tweets') return '#eab308';
                  }
                  return '#6b7280';
                }}
                nodeStrokeWidth={3}
                nodeStrokeColor="#000"
                pannable
                zoomable
              />
            )}
          </ReactFlow>
        </div>
        
        {/* Content Modal */}
        <ContentModal
          isOpen={!!selectedNodeForModal}
          onClose={() => setSelectedNodeForModal(null)}
          nodeData={selectedNodeForModal ? 
            nodes.find((n: any) => n.id === selectedNodeForModal)?.data as { type: string; draft: string; thumbnailUrl?: string; imageUrl?: string } | undefined || null 
            : null}
          onUpdate={(newContent) => {
            if (selectedNodeForModal) {
              handleContentUpdate(selectedNodeForModal, newContent);
            }
          }}
          productData={{
            title: nodes.find((n: any) => n.type === 'agent' && n.data.type === 'title')?.data.draft || '',
            bulletPoints: nodes.find((n: any) => n.type === 'agent' && n.data.type === 'description')?.data.draft || '',
            productImages: nodes.find((n: any) => n.type === 'product')?.data.images || [],
            heroImageUrl: nodes.find((n: any) => n.type === 'agent' && n.data.type === 'hero-image')?.data.imageUrl,
            lifestyleImageUrl: nodes.find((n: any) => n.type === 'agent' && n.data.type === 'lifestyle-image')?.data.imageUrl,
            infographicUrl: nodes.find((n: any) => n.type === 'agent' && n.data.type === 'infographic')?.data.imageUrl,
          }}
          brandData={{
            brandName: nodes.find((n: any) => n.type === 'brandKit')?.data.brandName || userProfile?.brandName || 'Your Brand',
          }}
        />
        
        {/* Thumbnail Upload Modal */}
        <ThumbnailUploadModal
          isOpen={thumbnailModalOpen}
          onClose={() => {
            setThumbnailModalOpen(false);
            setPendingThumbnailNode(null);
          }}
          onUpload={handleThumbnailUpload}
          isGenerating={false}
        />
        
        {/* Video Player Modal */}
        {selectedVideo && (
          <VideoPlayerModal
            isOpen={videoModalOpen}
            onClose={() => {
              setVideoModalOpen(false);
              setSelectedVideo(null);
            }}
            videoUrl={selectedVideo.url}
            title={selectedVideo.title}
            duration={selectedVideo.duration}
            fileSize={selectedVideo.fileSize}
          />
        )}
        
        {/* Image Modal */}
        {selectedImage && (
          <ImageModal
            isOpen={imageModalOpen}
            onClose={() => {
              setImageModalOpen(false);
              setSelectedImage(null);
            }}
            imageUrl={selectedImage.url}
            title={selectedImage.title}
            fileSize={selectedImage.fileSize}
          />
        )}
        
        {/* Prompt Modal */}
        {selectedPrompt && (
          <PromptModal
            open={promptModalOpen}
            onOpenChange={setPromptModalOpen}
            agentType={selectedPrompt.agentType}
            prompt={selectedPrompt.prompt}
          />
        )}
        
        {/* Floating Chat - Always Visible */}
        <FloatingChat
          agents={nodes
            .filter((n: any) => n.type === 'agent')
            .map((n: any) => ({
              id: n.id,
              type: n.data.type as string,
              draft: n.data.draft as string,
            }))}
          messages={chatMessages}
          onSendMessage={handleChatMessage}
          isGenerating={isChatGenerating}
          initialInputValue={chatInput}
        />
        
        {/* Hidden file input for video upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file && reactFlowInstance) {
              // Get the center of the current viewport
              const bounds = reactFlowWrapper.current?.getBoundingClientRect();
              if (bounds) {
                const centerX = bounds.width / 2;
                const centerY = bounds.height / 2;
                const position = reactFlowInstance.screenToFlowPosition({
                  x: centerX,
                  y: centerY,
                });
                await handleVideoUpload(file, position);
              }
            }
            // Reset the input
            e.target.value = '';
          }}
        />
        
        {/* Preview Modal */}
        <PreviewModal
          isOpen={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          title={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'title')?.data.draft || ''}
          bulletPoints={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'description')?.data.draft || ''}
          productImages={nodes.find((n: any) => n.type === 'product')?.data.images || []}
          heroImageUrl={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'hero-image')?.data.imageUrl}
          lifestyleImageUrl={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'lifestyle-image')?.data.imageUrl}
          infographicUrl={nodes.find((n: any) => n.type === 'agent' && n.data.type === 'infographic')?.data.imageUrl}
          brandName={nodes.find((n: any) => n.type === 'brandKit')?.data.brandName || userProfile?.brandName || 'Your Brand'}
        />
        
        {/* Delete Confirmation Dialog */}
        <DeleteConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Content?"
          description={
            nodesToDelete.some((n: any) => n.type === 'video')
              ? "This will permanently delete the video and all associated content. This action cannot be undone."
              : "This will permanently delete the selected content. This action cannot be undone."
          }
        />
        
      </div>
    </ReactFlowProvider>
  );
}

function DraggableNode({ 
  type, 
  label, 
  description,
  icon, 
  collapsed,
  color = "blue"
}: { 
  type: string; 
  label: string; 
  description?: string;
  icon?: React.ReactNode;
  collapsed?: boolean;
  color?: "blue" | "green" | "purple" | "yellow" | "orange" | "red";
}) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  const colorClasses = {
    blue: "from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border-blue-500/30 text-blue-500",
    green: "from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-green-500/30 text-green-500",
    purple: "from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border-purple-500/30 text-purple-500",
    yellow: "from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 border-yellow-500/30 text-yellow-500",
    orange: "from-orange-500/20 to-orange-600/20 hover:from-orange-500/30 hover:to-orange-600/30 border-orange-500/30 text-orange-500",
    red: "from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-red-500/30 text-red-500",
  };

  if (collapsed) {
    return (
      <div
        className={`cursor-move rounded-xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-3 transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center group`}
        onDragStart={onDragStart}
        draggable
        title={label}
        style={{ opacity: 1 }}
      >
        <div className="text-foreground">
          {icon}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`cursor-move rounded-xl bg-gradient-to-br ${colorClasses[color]} border backdrop-blur-sm p-4 transition-all hover:scale-[1.02] hover:shadow-lg group`}
      onDragStart={onDragStart}
      draggable
      style={{ opacity: 1 }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="text-foreground">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">{label}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function Canvas({ projectId }: { projectId: Id<"projects"> }) {
  return <CanvasContent projectId={projectId} />;
}

export default Canvas;