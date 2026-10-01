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

## Tâche 3 — En-tête de page

- **Avatar rouge.** La section 2 limite le rouge à trois usages, mais la
  section 4 demande un avatar « cercle rouge avec initiales » : la section 4
  est suivie.
- **Langue.** Le sélecteur de langue quitte la barre du haut et passe dans le
  menu de l'avatar (Profil, Langue, Se déconnecter).
- **Profil.** L'entrée « Profil » mène à la page Réglages, qui contient le
  bloc Profil.
- **Bouton « Ouvrir l'assistant » sur mobile.** Il se réduit à l'icône du bot
  pour laisser la place au titre ; son libellé reste lu par les lecteurs
  d'écran.

## Tâche 4 — Accueil

- **« Aujourd'hui ».** L'API fournit les messages reçus sur les dernières
  24 heures, pas depuis minuit : c'est ce chiffre qui est affiché, avec la
  mention « Dernières 24 heures ».
- **Réponses envoyées.** Nombre de messages reçus sur 24 h pour lesquels
  Jokubot a répondu (issues « triggered » ou « verified »).
- **En attente.** Nombre de conversations non lues (voir Tâche 2).
- **Sections retirées.** L'ancien accueil affichait aussi la santé de la
  passerelle, la répartition des preuves, les vérifications récentes et les
  exceptions. Ces informations restent dans Avancé (Vérifier, Journal des
  messages reçus) ; l'accueil s'en tient au contenu demandé.
- **Premiers pas.** La carte de démarrage en 4 étapes de la version
  précédente n'est pas dans le cahier des charges : elle est retirée.
