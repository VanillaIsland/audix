import type { MediaOrigin } from '@/types/media';

export type PlatformProfile = {
  key: 'youtube' | 'spotify' | 'facebook';
  label: string;
  origin: MediaOrigin;
  color: string;
};

export const PLATFORM_PROFILES: PlatformProfile[] = [
  { key: 'youtube', label: 'YouTube', origin: 'youtube-export', color: '#FF3156' },
  { key: 'spotify', label: 'Spotify', origin: 'spotify-catalog', color: '#38E881' },
  { key: 'facebook', label: 'Facebook', origin: 'facebook-export', color: '#3887FF' },
];

export function platformFromUrl(url: string): PlatformProfile | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return PLATFORM_PROFILES[0];
    if (host === 'spotify.com' || host.endsWith('.spotify.com')) return PLATFORM_PROFILES[1];
    if (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch') return PLATFORM_PROFILES[2];
    return null;
  } catch {
    return null;
  }
}

function youtubeId(url: URL) {
  if (url.hostname === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0];
  if (url.pathname === '/watch') return url.searchParams.get('v');
  const parts = url.pathname.split('/').filter(Boolean);
  if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1];
  return null;
}

export function embedUrlFor(source: string) {
  const profile = platformFromUrl(source);
  if (!profile) return null;
  const parsed = new URL(source);
  if (profile.key === 'youtube') {
    const id = youtubeId(parsed);
    return id ? `https://www.youtube.com/embed/${encodeURIComponent(id)}?playsinline=1&rel=0` : null;
  }
  if (profile.key === 'spotify') {
    const parts = parsed.pathname.split('/').filter(Boolean);
    const typeIndex = parts[0] === 'intl-fr' || parts[0]?.startsWith('intl-') ? 1 : 0;
    const type = parts[typeIndex];
    const id = parts[typeIndex + 1]?.split('?')[0];
    return type && id ? `https://open.spotify.com/embed/${encodeURIComponent(type)}/${encodeURIComponent(id)}?utm_source=generator&theme=0` : null;
  }
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(source)}&show_text=false`;
}

export function searchUrlFor(platform: PlatformProfile['key'], query: string) {
  const encoded = encodeURIComponent(query.trim());
  if (platform === 'youtube') return `https://www.youtube.com/results?search_query=${encoded}`;
  if (platform === 'spotify') return `https://open.spotify.com/search/${encoded}`;
  return `https://www.facebook.com/search/videos?q=${encoded}`;
}
