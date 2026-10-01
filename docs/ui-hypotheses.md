# Refonte de l'interface : hypothèses prises

Ce fichier liste les choix faits quand le cahier des charges ne précisait pas
un point, ou quand l'existant ne permettait pas de le suivre à la lettre.

## Général

- **Maquette `jokubot.html` absente.** Le fichier n'a pas été trouvé dans le
  dépôt ni sur le poste. La refonte suit le texte du cahier des charges.
- **Périmètre.** La refonte porte sur l'espace connecté (`admin.html`,
  dossier `src/admin`). La page vitrine (`index.html`) n'est pas modifiée.
- **Données.** L'espace fonctionne sur la copie de démonstration
  (`src/admin/preview.ts`, commerce « Maison Kofi »). Les appels d'API sont
  ceux de `src/admin/api.ts`, inchangés.

## Tâche 1 — Base du design

- **Rouge en mode sombre.** `#D7192D` sur fond `#0A0A0A` donne un contraste de
  3,7:1, sous le seuil AA pour du texte. En sombre, `--rd` vaut `#FF5A6A`
  (texte rouge lisible). Les boutons « danger » gardent un fond `#D7192D` avec
  texte blanc dans les deux thèmes.
- **Bouton principal.** Noir en clair, blanc (texte noir) en sombre, pour
  garder le même contraste.
- **Thème « Automatique ».** Ajouté au thème existant : sans choix enregistré,
  l'espace suit `prefers-color-scheme`.
