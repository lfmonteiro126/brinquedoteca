"use client";

import { useState, useRef, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
}

export function OptimizedImage({
  src,
  alt,
  width = 200,
  height = 200,
  className = "",
  fallbackClassName = "",
  priority = false,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    if (img.complete) {
      setLoaded(true);
    }
  }, []);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 ${fallbackClassName}`}
        style={{ width, height }}
      >
        <ImageOff className="h-8 w-8 text-slate-300 dark:text-slate-600" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {!loaded && (
        <div
          className="absolute inset-0 animate-pulse bg-slate-200 dark:bg-slate-700"
          style={{ width, height }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
      />
    </div>
  );
}
