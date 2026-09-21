export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

/**
 * Normaliza URLs de imagem para exibição/persistência.
 * Aceita http(s), data:image (upload) e URLs sem protocolo.
 */
export function normalizeImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Uploads compactados em base64 devem ser preservados
  if (trimmed.startsWith("data:image/")) {
    return trimmed;
  }

  let candidate = trimmed;

  // Protocolo relativo: //cdn.example.com/img.jpg
  if (candidate.startsWith("//")) {
    candidate = `https:${candidate}`;
  }

  // URL sem protocolo: i.imgur.com/abc.jpg ou cdn.site.com/foto.png
  if (!/^https?:\/\//i.test(candidate)) {
    if (/^(www\.)?[\w-]+(\.[\w-]+)+([/:?].*)?$/i.test(candidate)) {
      candidate = `https://${candidate}`;
    } else {
      return "";
    }
  }

  const imgurShortMatch = candidate.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)(\.[a-zA-Z]+)?$/i);
  if (imgurShortMatch) {
    const ext = imgurShortMatch[2] || ".jpg";
    return `https://i.imgur.com/${imgurShortMatch[1]}${ext}`;
  }

  // Álbum do Imgur não é uma imagem direta
  if (/^https?:\/\/(?:www\.)?imgur\.com\/(a|gallery)\//i.test(candidate)) {
    return "";
  }

  return candidate;
}
