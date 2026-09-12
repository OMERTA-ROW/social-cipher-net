import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, X } from "lucide-react";
import { toast } from "sonner";

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video';
}

interface MediaUploadProps {
  onFilesChange: (files: MediaFile[]) => void;
  maxFiles?: number;
}

const MediaUpload = ({ onFilesChange, maxFiles = 10 }: MediaUploadProps) => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList | null, type: 'image' | 'video') => {
    if (!files) return;

    const newFiles: MediaFile[] = [];
    const allowedTypes = type === 'image' 
      ? ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/ogg'];

    Array.from(files).forEach((file) => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        return;
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error(`File too large: ${file.name} (max 50MB)`);
        return;
      }

      const preview = URL.createObjectURL(file);
      newFiles.push({ file, preview, type });
    });

    const updatedFiles = [...mediaFiles, ...newFiles].slice(0, maxFiles);
    setMediaFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = mediaFiles.filter((_, i) => i !== index);
    setMediaFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'image')}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files, 'video')}
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => imageInputRef.current?.click()}
          disabled={mediaFiles.length >= maxFiles}
        >
          <ImageIcon className="w-4 h-4 mr-2" />
          Add Photos
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => videoInputRef.current?.click()}
          disabled={mediaFiles.length >= maxFiles}
        >
          <Video className="w-4 h-4 mr-2" />
          Add Videos
        </Button>
      </div>

      {mediaFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {mediaFiles.map((media, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-secondary/60 flex items-center justify-center">
              {media.type === 'image' ? (
                <img 
                  src={media.preview} 
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <video 
                  src={media.preview}
                  className="w-full h-full object-contain"
                />
              )}
              <button
                onClick={() => removeFile(idx)}
                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
