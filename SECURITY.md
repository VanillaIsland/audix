# Sécurité

Aucun secret Supabase ne doit se trouver dans le client. Seules l'URL publique et une clé `sb_publishable_...` sont acceptées.

Les tables exposées utilisent Row Level Security et isolent les données par `auth.uid()`.

Le mode Grab exige une attestation de droits, vérifie que le lien est en HTTP ou HTTPS et refuse tout ce qui n'est ni audio ni vidéo.

L'app n'inclut aucun contournement de DRM, de publicité ou de protection de plateforme.

## Audit des dépendances

Au 20 août 2026, `npm audit` ne signale aucune vulnérabilité critique. Il reste des alertes transitives hautes et modérées dans Expo et Metro, sur `image-size` et `uuid`. La correction automatique proposée rétrograde Expo 57 vers Expo 53 : elle ne doit pas être appliquée. Refais l'audit à chaque mise à jour d'Expo et avant toute soumission à l'App Store ou au Play Store.

Pour signaler un problème, passe par un canal privé. Ne publie jamais un master, une URL signée ou une clé dans une issue publique.
