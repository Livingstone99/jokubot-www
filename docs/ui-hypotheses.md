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

## Tâche 2 — Navigation

- **Messages non lus.** L'API ne fournit pas d'état « lu ». Une conversation
  est « non lue » si son dernier message est plus récent que la dernière fois
  qu'elle a été ouverte sur cet appareil (mémorisé dans le navigateur). Au
  premier passage, tout ce qui a plus de 24 h est considéré comme lu.
- **Clés API et Développeurs.** Ces deux entrées du cahier des charges mènent
  à la même page existante : elles sont fusionnées en « Clés API et
  développeurs ».
- **Journal des messages reçus.** L'ancienne page Activité (journal technique
  des messages entrants) n'est plus dans le menu principal ; elle reste
  accessible sous « Avancé » à l'adresse `#/journal`. L'ancienne adresse
  `#/activity` redirige vers Messages, comme demandé.
- **Repli manuel du menu.** Le bouton qui repliait le menu sur ordinateur est
  retiré : la largeur dépend maintenant uniquement de l'écran (260 px, 72 px,
  ou barre du bas).
- **Adresses.** Nouvelles adresses : `#/messages`, `#/automations`,
  `#/channels`, `#/more`. Anciennes adresses redirigées : `#/sessions` et
  `#/activity` vers `#/messages` ; `#/setup`, `#/triggers` et `#/reactions`
  vers les onglets de `#/automations`.
