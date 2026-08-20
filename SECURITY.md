# Sécurité

- Aucun secret Supabase ne doit être placé dans le client. Seules l’URL publique et une clé `sb_publishable_...` sont acceptées.
- Les tables exposées utilisent Row Level Security et isolent les données par `auth.uid()`.
- Le mode Grab exige une attestation de droits, vérifie HTTP(S) et refuse les types non audio/vidéo.
- Aucun contournement de DRM, publicité ou protection de plateforme n’est inclus.

## Audit des dépendances

Au 20 août 2026, `npm audit` ne signale aucune vulnérabilité critique. Des alertes transitives hautes/modérées restent présentes dans Expo/Metro (`image-size`, `uuid`). La correction automatique proposée rétrograde Expo 57 vers Expo 53 et ne doit pas être appliquée. Refaire l’audit à chaque mise à jour Expo et avant toute soumission App Store/Play Store.

Pour signaler un problème, utiliser un canal privé et ne jamais publier de master, URL signée ou clé dans une issue publique.
