"use client";

import React from "react"

import { useCallback, useState } from "react";
import { Upload, ImageIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageLoad: (imageData: ImageData, width: number, height: number, imageUrl: string, file: File) => void;
  currentImage: string | null;
  onClear: () => void;
}

export function ImageUpload({ onImageLoad, currentImage, onClear }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const processImage = useCallback((file: File) => {
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          onImageLoad(imageData, img.width, img.height, e.target?.result as string, file);
        }
        setIsLoading(false);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageLoad]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      processImage(file);
    }
  }, [processImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  }, [processImage]);

  if (currentImage) {
    return (
      <div className="relative rounded-lg border border-border overflow-hidden bg-card">
        <button
          onClick={onClear}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors"
          title="Удалить изображение"
        >
          <X className="h-4 w-4" />
        </button>
        <img 
          src={currentImage || "/placeholder.svg"} 
          alt="Загруженное СЭМ-изображение" 
          className="w-full h-auto max-h-[300px] object-contain"
        />
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 p-8 rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer",
        isDragging 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
        isLoading && "opacity-50 pointer-events-none"
      )}
    >
      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isLoading}
      />
      
      <div className={cn(
        "p-4 rounded-full transition-colors",
        isDragging ? "bg-primary/10" : "bg-muted"
      )}>
        {isLoading ? (
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : isDragging ? (
          <Upload className="h-8 w-8 text-primary" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isLoading ? "Загрузка..." : "Перетащите СЭМ-изображение сюда"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          или нажмите для выбора файла
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Поддерживаемые форматы: PNG, JPG, TIFF
        </p>
      </div>
    </div>
  );
}
