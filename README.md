# Audix, lecteur audio privé

Audix est un lecteur pensé pour les catalogues audio et vidéo dont tu es propriétaire. Tout est stocké d'abord sur l'appareil. Le même projet Expo produit l'app iOS, l'app Android et une preview web.

## Ce que fait la version 0.2

Audix lit les fichiers audio locaux et sort le son d'un fichier vidéo compatible. La lecture continue en arrière-plan et les contrôles restent disponibles sur l'écran verrouillé des versions natives.

L'import accepte le MP3, le WAV, le FLAC, l'AAC, l'ALAC, l'OGG, l'OPUS, le M4A, l'AIFF, le MP4, le MOV, le WebM et le MKV.

La bibliothèque reste privée et persiste sur l'appareil. Tu peux créer des playlists avec un nom, une description et une couleur, y ajouter ou retirer des titres, et supprimer une playlist après confirmation. L'historique, les favoris, les téléchargements et la recherche sont là.

Le mode Grab analyse un lien direct ou un lien de transfert, détecte la source, demande une attestation de droits et route le résultat vers la bibliothèque ou vers une playlist.

Les références YouTube, Spotify et Facebook sont lisibles dans les lecteurs officiels intégrés quand la plateforme l'autorise. La recherche par titre et artiste affiche les résultats YouTube directement dans l'app lorsqu'une clé YouTube Data API est configurée.

Côté serveur, un schéma Supabase protégé par Row Level Security prépare la synchronisation privée des métadonnées. La preview web se déploie sur Netlify.

## Ce qu'Audix ne fait pas

Audix n'intègre aucun bloqueur de publicité, aucun contournement de DRM et aucun extracteur tiers pour YouTube, Spotify ou Facebook. Les liens de plateformes sont conservés comme références et lus avec les lecteurs officiels. Le hors-ligne est réservé aux masters directs que tu es autorisé à importer.

## Démarrer

Il faut Node.js 22.13 ou plus récent.

```bash
npm install
cp .env.example .env.local
npm run web
```

Les variables publiques attendues sont les suivantes.

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
EXPO_PUBLIC_YOUTUBE_API_KEY
```

La clé YouTube est facultative. Sans elle, Audix ouvre les pages de recherche officielles de YouTube, Spotify et Facebook. Avec elle, les résultats s'affichent dans l'interface.

Ne place jamais une clé `service_role` ou `sb_secret_...` dans l'application.

## Vérifier

```bash
npm run typecheck
npm run lint
npm run build:web
```

## Architecture cible

1. Lecture : player natif, file d'attente, gapless, fondu enchaîné, vitesse variable et contrôles système.
2. Bibliothèque : catalogue local, métadonnées, favoris, historique et playlists intelligentes.
3. Waveform : forme d'onde, marqueurs, silences, BPM et tonalité.
4. Outils : conversion et édition par lots dans un module natif dédié.
5. IA : transcription, tags et recherche en langage naturel, sur traitements activés par l'utilisateur.

Netlify n'héberge que la preview web. Les versions iOS et Android sont générées avec EAS Build, puis distribuées via TestFlight et Google Play Internal Testing.

## Envoyer sur TestFlight

Il faut un compte Expo et une adhésion Apple Developer active. Depuis ce dossier :

```bash
npx eas-cli login
npx testflight
```

Le second script configure les certificats, crée un build iOS de production et l'envoie dans App Store Connect. Une fois le traitement Apple terminé, ouvre App Store Connect, section Audix puis TestFlight, complète les informations de test et ajoute les testeurs internes.

Pour séparer les deux étapes :

```bash
npm run build:ios:testflight
npm run submit:ios:testflight
```

L'identifiant de bundle iOS réservé est `com.vanillaisland.audix`. Un identifiant différent demande une modification d'app.json avant le premier envoi.
