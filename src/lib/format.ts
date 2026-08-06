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

export function normalizeImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();

  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "";
  }

  const imgurShortMatch = trimmed.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/);
  if (imgurShortMatch) {
    return `https://i.imgur.com/${imgurShortMatch[1]}.jpg`;
  }

  const imgurDirectMatch = trimmed.match(/^https?:\/\/i\.imgur\.com\/.+/);
  if (imgurDirectMatch) {
    return trimmed;
  }

  const imgurAlbumMatch = trimmed.match(/^https?:\/\/imgur\.com\/a\//);
  if (imgurAlbumMatch) {
    return "";
  }

  return trimmed;
}
