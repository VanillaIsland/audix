import { supabase } from '@/lib/supabase';

/** Un fichier exploitable trouvé derrière un lien de transfert. */
export type GrabFile = {
  name: string;
  url: string;
  sizeBytes: number | null;
  mimeType: string | null;
  kind: 'audio' | 'video';
};

export type GrabResolution = {
  source: 'swisstransfer' | 'direct';
  files: GrabFile[];
};

/**
 * Transforme un lien de partage en liste de fichiers téléchargeables.
 * Passe par une Edge Function : le navigateur serait bloqué par CORS, et les
 * APIs de ces services bougent — les corriger côté serveur évite un rebuild.
 *
 * Ne renvoie que de l'audio et de la vidéo : tout autre format est écarté.
 */
export async function resolveGrabLink(url: string): Promise<GrabResolution> {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('Colle un lien à analyser.');
  if (!supabase) throw new Error('Supabase non configuré : le résolveur est indisponible.');

  const { data, error } = await supabase.functions.invoke('grab-resolve', { body: { url: trimmed } });

  // Une erreur applicative (422/400) arrive avec un corps JSON exploitable.
  if (data?.error) throw new Error(String(data.error));
  if (error) throw new Error(error.message ?? 'Résolution impossible.');
  if (!data?.files?.length) throw new Error('Aucun fichier audio ou vidéo derrière ce lien.');

  return data as GrabResolution;
}

export const formatSize = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes > 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} Go`;
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} Mo`;
  return `${Math.round(bytes / 1_000)} Ko`;
};
