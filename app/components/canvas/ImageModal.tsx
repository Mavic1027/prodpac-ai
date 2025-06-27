import { Dialog, DialogContent } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { X, Download, Maximize2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title: string;
  fileSize?: number;
}

export function ImageModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  title,
  fileSize
}: ImageModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  // Handle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const dialogElement = containerRef.current?.closest('[role="dialog"]');
        if (dialogElement) {
          await dialogElement.requestFullscreen();
          setIsFullscreen(true);
        }
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  // Handle download
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = title || 'product-image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-6xl p-0 overflow-hidden bg-white rounded-xl"
        ref={containerRef}
      >
        <div className="relative w-full h-full">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-white/95 to-transparent">
            <div className="flex items-start justify-between">
              <div className="flex-1 mr-4">
                <h2 className="text-gray-900 font-semibold text-lg truncate">
                  {title || "Product Image"}
                </h2>
                {fileSize && (
                  <div className="flex items-center gap-3 text-gray-600 text-sm mt-1">
                    <span>{formatFileSize(fileSize)}</span>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-700 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Image */}
          <div className="relative flex items-center justify-center bg-white" style={{ minHeight: "400px", maxHeight: "85vh" }}>
            <img
              src={imageUrl}
              alt={title || "Product image"}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "85vh" }}
            />
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-white/95 to-transparent">
            <div className="flex items-center justify-end gap-2">
              {/* Download */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>

              {/* Fullscreen */}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 