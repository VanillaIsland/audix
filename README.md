# VOXA — Smart Audio Player

Voxa est un lecteur local-first pour catalogues audio/vidéo propriétaires. Le même projet Expo cible iOS, Android et une preview web.

## MVP 0.2

- lecture audio locale et audio-only depuis un fichier vidéo compatible ;
- lecture en arrière-plan et contrôles écran verrouillé sur les builds natifs ;
- import de MP3, WAV, FLAC, AAC, ALAC, OGG, OPUS, M4A, AIFF, MP4, MOV, WebM et MKV ;
- bibliothèque privée persistée sur l’appareil ;
- création de playlists personnelles avec nom, description, couleur, ajout/retrait de titres et suppression confirmée ;
- historique, favoris, téléchargements et recherche ;
- Grab de liens directs HTTP(S) avec détection de source, attestation de droits et routage vers une playlist ;
- références YouTube, Spotify et Facebook lisibles via les lecteurs officiels intégrés quand la plateforme l’autorise ;
- recherche par titre et artiste avec raccourcis vers les recherches officielles ; résultats YouTube intégrés avec une clé YouTube Data API ;
- schéma Supabase avec Row Level Security pour la future synchronisation privée ;
- preview web statique déployable sur Netlify.

## Limites volontaires

Voxa n’intègre aucun bloqueur publicitaire, contournement de DRM ou extracteur tiers pour YouTube, Spotify ou Facebook. Les liens de plateformes sont conservés comme références et lus avec leurs lecteurs officiels. Le téléchargement hors ligne est réservé aux masters directs autorisés importés dans les builds mobiles.

## Démarrer

Prérequis : Node.js 22.13+.

```bash
npm install
cp .env.example .env.local
npm run web
```

Variables publiques attendues :

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_YOUTUBE_API_KEY
```

La clé YouTube est optionnelle : sans elle, Voxa ouvre les pages de recherche officielles YouTube, Spotify et Facebook. Avec elle, la recherche YouTube affiche directement les résultats dans l’interface.

Ne jamais placer de clé `service_role` ou `sb_secret_...` dans l’application.

## Vérifier

```bash
npm run typecheck
npm run lint
npm run build:web
```

## Architecture cible

1. **PLAY** — player natif, queue, gapless, crossfade, vitesse et contrôles système.
2. **LIBRARY** — catalogue local-first, métadonnées, favoris, historique et smart playlists.
3. **WAVE** — waveform, marqueurs, silences, BPM et tonalité.
4. **TOOLS** — conversion et édition par lots dans un module natif/desktop dédié.
5. **AI** — transcription, tags et recherche naturelle sur traitements opt-in.

Netlify héberge uniquement la preview web. Les versions iOS/Android seront générées avec EAS Build puis distribuées via TestFlight et Google Play Internal Testing.

## Envoyer sur TestFlight

Prérequis : un compte Expo et une adhésion Apple Developer active. Depuis ce dossier :

```bash
npx eas-cli login
npx testflight
```

Le second script configure les certificats, crée un build iOS de production et l’envoie dans App Store Connect. Après le traitement Apple, ouvre **App Store Connect → Voxa → TestFlight**, complète les informations de test et ajoute les testeurs internes.

Pour séparer les étapes :

```bash
npm run build:ios:testflight
npm run submit:ios:testflight
```

Le bundle iOS réservé est `com.vanillaisland.voxa`. Un identifiant différent exige une modification de `app.json` avant le premier envoi.
