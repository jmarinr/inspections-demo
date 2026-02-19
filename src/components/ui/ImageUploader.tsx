import React, { useState, useRef, useCallback } from 'react';
import { Upload, Camera, Check, X, RotateCcw } from 'lucide-react';
import { compressImage, fileToBase64 } from '../../lib/imageUtils';
import { Button } from './Button';

interface ImageUploaderProps {
  onImageCapture: (imageData: string) => void;
  label?: string;
  description?: string;
  acceptTypes?: string;
  maxSizeMB?: number;
  showPreview?: boolean;
  previewImage?: string | null;
  className?: string;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageCapture,
  label = 'Subir imagen',
  description = 'Haz clic para subir o usar cámara',
  acceptTypes = 'image/jpeg,image/png,image/webp',
  maxSizeMB = 1,
  showPreview = true,
  previewImage = null,
  className = '',
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(previewImage);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido');
      return;
    }

    setIsProcessing(true);
    try {
      // Compress the image
      const compressedFile = await compressImage(file, { maxSizeMB });
      const base64 = await fileToBase64(compressedFile);
      
      setCurrentImage(base64);
      onImageCapture(base64);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  }, [maxSizeMB, onImageCapture]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('No se pudo acceder a la cámara');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    setCurrentImage(imageData);
    onImageCapture(imageData);
    stopCamera();
  };

  const clearImage = () => {
    setCurrentImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Camera view
  if (showCamera) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${className}`}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full aspect-[4/3] object-cover bg-black"
        />
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
          <Button
            variant="secondary"
            onClick={stopCamera}
            leftIcon={<X className="w-5 h-5" />}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={capturePhoto}
            leftIcon={<Camera className="w-5 h-5" />}
          >
            Capturar
          </Button>
        </div>
      </div>
    );
  }

  // Preview view with image
  if (showPreview && currentImage) {
    return (
      <div className={`relative rounded-xl overflow-hidden ${className}`}>
        <img
          src={currentImage}
          alt="Preview"
          className="w-full aspect-[4/3] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={clearImage}
            className="p-2 bg-dark-800/80 rounded-full hover:bg-dark-700 transition-colors"
            disabled={disabled}
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="p-1.5 bg-emerald-500 rounded-full">
            <Check className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-white font-medium">Imagen cargada</span>
        </div>
      </div>
    );
  }

  // Upload zone
  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || isProcessing}
      />
      <div
        onClick={() => !disabled && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 
          cursor-pointer transition-all aspect-[4/3]
          ${isDragging ? 'border-primary-500 bg-primary-500/10' : 'border-dark-500 hover:border-primary-500 hover:bg-dark-800/30'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isProcessing ? 'animate-pulse' : ''}
        `}
      >
        <div className="p-4 bg-dark-700/50 rounded-full">
          <Upload className="w-8 h-8 text-dark-400" />
        </div>
        <div className="text-center">
          <p className="font-medium text-dark-200">{label}</p>
          <p className="text-sm text-dark-400">{description}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={disabled || isProcessing}
          >
            <Upload className="w-4 h-4" />
            Subir
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              startCamera();
            }}
            disabled={disabled || isProcessing}
          >
            <Camera className="w-4 h-4" />
            Cámara
          </Button>
        </div>
      </div>
    </div>
  );
};
