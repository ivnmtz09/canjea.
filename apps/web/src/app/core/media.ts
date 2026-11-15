/** Resuelve rutas de medios. API y web comparten origen (proxy en dev, static en prod). */
export function mediaUrl(url: string | null | undefined, fallbackSeed = 'canjea'): string {
  if (!url) return `/api/media/art/${encodeURIComponent(fallbackSeed)}.svg`;
  if (url.startsWith('/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  return `/${url}`;
}
