# Refonte noir et blanc de l'espace connecté

Branche `refonte-noir-blanc`. Les pages de connexion et d'inscription ne sont
pas modifiées.

## Organisation

| Écran affiché | Adresse | Fichier |
| --- | --- | --- |
| Tableau de bord | `#/overview` | `src/admin/pages/Overview.tsx` |
| Conversations | `#/sessions`, `#/sessions/:canal/:client` | `pages/Conversations.tsx` |
| Automatisations | `#/triggers`, `#/triggers/new`, `#/triggers/:id/edit` | `pages/Automations.tsx` |
| Vérifications | `#/verify` | `pages/Verifications.tsx` |
| Canaux | `#/channels` (nouvelle adresse) | `pages/Channels.tsx` |
| Activité | `#/activity` | `pages/ActivityFeed.tsx` |
| Utilisation | `#/usage` | `pages/UsageView.tsx` |
| Paramètres | `#/settings` | `pages/SettingsView.tsx` |
| Plus (mobile) | `#/more` | `pages/More.tsx` |

Outils conservés tels quels, au nouveau style : Assistant (`#/setup`),
Réponses automatiques (`#/reactions`), Finalités (`#/purposes`), Développeur
(`#/developers`). Les anciens écrans complets restent accessibles :
`#/triggers/advanced`, `#/verify/advanced`, `#/settings/advanced`,
`#/usage/details`.

- Cadre : `src/admin/layout/AppShell.tsx` (menu latéral, en-tête, cloche,
  menu du profil, tiroir et barre du bas sur téléphone).
- Composants : `src/admin/jk/ui.tsx` ; icônes au trait (style Lucide, sans
  emoji) : `src/admin/jk/icons.tsx`.
- Style : `src/admin/jk.css`, entièrement limité à `.jk` (l'espace connecté).
  Les anciennes pages reprises passent en noir et blanc par redéfinition de
  leurs variables de couleur à l'intérieur de `.jk`.

## Choix faits (à valider)

- **Code dans le tableau des vérifications.** L'API ne renvoie le code qu'au
  moment de sa création. La colonne affiche donc la référence de la
  vérification ; le code complet est montré dans la fenêtre « Code généré ».
- **Notifications.** L'API n'a pas de réglage de notifications : les choix
  sont enregistrés sur l'appareil. La cloche montre les 5 derniers événements.
- **Mot de passe.** Pas d'API pour le changer : la fenêtre l'indique.
- **Sessions actives.** Seul cet appareil est connu ; on peut s'y déconnecter.
- **Clé API.** Elle n'est visible qu'au moment où elle est régénérée (sécurité).
- **Mot de passe oublié, téléphone et confirmation du mot de passe à
  l'inscription.** Non ajoutés : la demande était de ne pas toucher au login.
- **Couleurs des canaux.** WhatsApp et Telegram sont représentés en noir et
  blanc, comme tout le reste.
- **Données.** Toujours la démonstration de `src/admin/preview.ts`
  (réinitialisée à chaque rechargement).

## Contrôles effectués

- 19 écrans × 10 largeurs (320, 375, 390, 414, 430, 768, 1024, 1280, 1440,
  1920 px) en clair, et 2 largeurs en sombre : aucun débordement horizontal.
- Aucune couleur vive dans l'espace connecté (contrôle automatique).
- Parcours testés : créer une automatisation, émettre un code, se déconnecter.
