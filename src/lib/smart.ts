import type { AudixPlaylist, AudixTrack, SmartRule } from '@/types/media';

/** Un titre entre dans une playlist intelligente s'il remplit tous les criteres. */
export function matchesRule(track: AudixTrack, rule: SmartRule): boolean {
  const genre = (track.genre ?? '').toLowerCase();
  const artist = (track.artist ?? '').toLowerCase();
  if (rule.genre && !genre.includes(rule.genre.toLowerCase())) return false;
  if (rule.artist && !artist.includes(rule.artist.toLowerCase())) return false;
  if (rule.yearFrom !== undefined && (track.year ?? 0) < rule.yearFrom) return false;
  if (rule.yearTo !== undefined && (track.year ?? 9999) > rule.yearTo) return false;
  if (rule.bpmFrom !== undefined && (track.bpm ?? 0) < rule.bpmFrom) return false;
  if (rule.bpmTo !== undefined && (track.bpm ?? 999) > rule.bpmTo) return false;
  if (rule.favoriteOnly && !track.favorite) return false;
  if (rule.offlineOnly && !track.downloaded) return false;
  return true;
}

/** Titres d'une playlist : ses regles si elle est intelligente, sa liste sinon. */
export function resolvePlaylistTracks(playlist: AudixPlaylist, tracks: AudixTrack[]): AudixTrack[] {
  if (playlist.smart) return tracks.filter((track) => matchesRule(track, playlist.smart as SmartRule));
  return playlist.trackIds
    .map((id) => tracks.find((track) => track.id === id))
    .filter((track): track is AudixTrack => Boolean(track));
}

/** Proximite entre deux titres : plus c'est haut, plus l'enchainement est naturel. */
function affinity(a: AudixTrack, b: AudixTrack): number {
  let score = 0;
  if (a.genre && b.genre && a.genre.toLowerCase() === b.genre.toLowerCase()) score += 40;
  if (a.artist && b.artist && a.artist.toLowerCase() === b.artist.toLowerCase()) score += 25;
  if (a.bpm && b.bpm) {
    const gap = Math.abs(a.bpm - b.bpm);
    if (gap <= 3) score += 30;
    else if (gap <= 8) score += 18;
    else if (gap <= 15) score += 8;
  }
  if (a.year && b.year && Math.abs(a.year - b.year) <= 2) score += 5;
  return score;
}

/**
 * Mode DJ : au lieu d'un aleatoire pur, on part du titre en cours et on
 * enchaine a chaque fois le titre restant le plus proche, par genre puis par
 * artiste puis par BPM. Les egalites gardent l'ordre de la liste.
 */
export function djOrder(tracks: AudixTrack[], start: AudixTrack | null): AudixTrack[] {
  const pool = start ? tracks.filter((track) => track.id !== start.id) : [...tracks];
  const ordered: AudixTrack[] = start ? [start] : [];
  let reference = start ?? pool.shift() ?? null;
  if (reference && !ordered.length) ordered.push(reference);

  while (pool.length && reference) {
    let bestIndex = 0;
    let bestScore = -1;
    pool.forEach((candidate, position) => {
      const score = affinity(reference as AudixTrack, candidate);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = position;
      }
    });
    const [chosen] = pool.splice(bestIndex, 1);
    ordered.push(chosen);
    reference = chosen;
  }
  return ordered;
}
