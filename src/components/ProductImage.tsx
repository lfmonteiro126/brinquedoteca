"use client";

import { useState } from "react";
import { Package } from "lucide-react";
import { normalizeImageUrl } from "@/lib/format";

interface ProductImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  iconClassName?: string;
}

/**
 * Exibe a imagem do produto com fallback quando a URL falha ou é inválida.
 * Usa referrerPolicy=no-referrer para evitar bloqueio de hotlink em CDNs.
 */
export function ProductImage({
  src,
  alt,
  className = "h-44 w-full object-cover",
  fallbackClassName = "flex h-44 w-full items-center justify-center bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-800/10",
  iconClassName = "h-12 w-12 text-violet-300 dark:text-violet-600",
}: ProductImageProps) {
  const normalized = src ? normalizeImageUrl(src) : "";
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = Boolean(normalized) && failedSrc === normalized;

  if (!normalized || failed) {
    return (
      <div className={fallbackClassName}>
        <Package className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={normalized}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading="lazy"
      decoding="async"
      onError={() => setFailedSrc(normalized)}
    />
  );
}
