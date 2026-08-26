/**
 * Détection automatique du tempo, sur les fichiers présents sur l'appareil.
 *
 * Le principe est celui des détecteurs classiques : on décode l'audio, on
 * construit une courbe d'énergie, on garde les montées d'énergie (les attaques)
 * puis on cherche par autocorrélation la période qui revient le plus souvent.
 * Rien ne sort du téléphone, tout est calculé sur place.
 */

const MIN_BPM = 60;
const MAX_BPM = 190;
/** Une fenêtre de 512 échantillons donne une résolution largement suffisante. */
const WINDOW = 512;
/** On analyse au plus 90 secondes : au-delà, le tempo ne change plus le résultat. */
const MAX_SECONDS = 90;

type Decoded = { channel: Float32Array; sampleRate: number };

/** Décode le fichier via react-native-audio-api, absent des builds sans le module natif. */
async function decode(uri: string): Promise<Decoded | null> {
  try {
    // Module natif : absent tant que `npm install` n'a pas été relancé.
    // @ts-ignore
    const mod: any = await import('react-native-audio-api');
    const AudioContextClass = mod.AudioContext ?? mod.default?.AudioContext;
    if (!AudioContextClass) return null;
    const context = new AudioContextClass();
    const buffer = await context.decodeAudioDataSource(uri);
    const channel: Float32Array = buffer.getChannelData(0);
    const sampleRate: number = buffer.sampleRate;
    if (context.close) await context.close();
    return { channel, sampleRate };
  } catch {
    return null;
  }
}

/** Courbe d'énergie par fenêtre, puis dérivée positive : les attaques ressortent. */
function onsetEnvelope(channel: Float32Array, sampleRate: number) {
  const limit = Math.min(channel.length, sampleRate * MAX_SECONDS);
  const count = Math.floor(limit / WINDOW);
  const energy = new Float32Array(count);
  for (let w = 0; w < count; w += 1) {
    let sum = 0;
    const start = w * WINDOW;
    for (let i = 0; i < WINDOW; i += 1) {
      const sample = channel[start + i];
      sum += sample * sample;
    }
    energy[w] = Math.sqrt(sum / WINDOW);
  }
  const onsets = new Float32Array(count);
  for (let w = 1; w < count; w += 1) {
    const rise = energy[w] - energy[w - 1];
    onsets[w] = rise > 0 ? rise : 0;
  }
  return onsets;
}

/** Autocorrélation sur la plage de tempos plausibles ; renvoie le meilleur BPM. */
function bestTempo(onsets: Float32Array, framesPerSecond: number): number | null {
  const minLag = Math.floor((framesPerSecond * 60) / MAX_BPM);
  const maxLag = Math.ceil((framesPerSecond * 60) / MIN_BPM);
  if (maxLag >= onsets.length || minLag < 1) return null;

  let bestLag = 0;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    for (let i = 0; i + lag < onsets.length; i += 1) score += onsets[i] * onsets[i + lag];
    // On normalise, sinon les petits décalages gagnent toujours.
    score /= onsets.length - lag;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag || bestScore <= 0) return null;

  let bpm = (framesPerSecond * 60) / bestLag;
  // Les détecteurs se trompent souvent d'une octave : on ramène dans 70-180.
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm);
}

/**
 * Renvoie le tempo estimé d'un fichier local, ou null si l'analyse n'est pas
 * possible (module natif absent, fichier distant, piste trop courte).
 */
export async function analyseBpm(uri: string): Promise<number | null> {
  if (!uri || !uri.startsWith('file:')) return null;
  const decoded = await decode(uri);
  if (!decoded) return null;
  const onsets = onsetEnvelope(decoded.channel, decoded.sampleRate);
  if (onsets.length < 64) return null;
  return bestTempo(onsets, decoded.sampleRate / WINDOW);
}

/** Vrai quand le module d'analyse est présent dans ce build. */
export async function bpmAnalysisAvailable(): Promise<boolean> {
  try {
    // @ts-ignore
    const mod: any = await import('react-native-audio-api');
    return Boolean(mod.AudioContext ?? mod.default?.AudioContext);
  } catch {
    return false;
  }
}
