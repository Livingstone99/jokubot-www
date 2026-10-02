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

## Tâche 5 — Messages

- **Envoi à la main : non disponible.** L'API actuelle permet de lire les
  conversations (`conversations`, `conversation`) mais n'a aucun appel pour
  envoyer un message. La zone « Écrire une réponse » et le bouton « Envoyer »
  sont affichés mais désactivés, avec une phrase qui l'explique. Le toast
  « Message envoyé » et l'erreur « Le message n'est pas parti… » seront
  branchés quand l'API proposera l'envoi. **À valider.**
- **Archivage.** Mémorisé sur l'appareil, comme l'état « lu ». Une
  conversation archivée revient si un nouveau message arrive. Un toast propose
  « Annuler » juste après l'archivage.
- **Marquer comme lu.** Ouvrir une conversation la marque comme lue ; un
  bouton permet aussi de le faire, et « Tout marquer comme lu » dans la liste.
- **Laisser l'assistant répondre.** Ouvre l'assistant des réponses
  automatiques (`#/automations/assistant`), qui crée une réponse automatique
  à partir d'une description.
- **Statut dans l'en-tête de conversation.** C'est l'état de connexion du
  canal (Connecté / Non connecté).

## Tâche 6 — Réponses automatiques

- **Organisation en onglets.** La page regroupe : « Règles » (nouvelle liste
  et formulaire en 3 étapes), « Assistant » (assistant existant),
  « Réponses intelligentes » (anciennes Réactions : formules, requêtes HTTP,
  agent IA) et « Éditeur complet » (ancien éditeur de déclencheurs, pour les
  options avancées : listes blanches/noires, webhook, code de vérification,
  ordre des règles). Rien n'est perdu.
- **Options non prises en charge par l'API.** « Premier message d'un client »,
  « En dehors des heures de travail », « Répondre par une image » et « Menu à
  boutons » n'existent pas côté serveur. Elles sont affichées, désactivées,
  avec la mention « Bientôt disponible ». **À valider.**
- **Options ajoutées.** « Le message est exactement un mot » et « N'importe
  quel message » correspondent à ce que l'API sait déjà faire.
- **Modifier.** Une règle « simple » (mot-clé ou tout message, réponse par
  texte) s'ouvre dans le formulaire en 3 étapes ; les autres s'ouvrent dans
  l'Éditeur complet.
- **Dupliquer.** La copie est créée coupée, pour ne pas répondre deux fois.
- **Nom de la règle.** Proposé automatiquement (« Mot-clé « horaires » ») si
  le champ reste vide.
- **Vocabulaire.** « Quand… / Alors… » est utilisé dans les nouveaux écrans,
  les descriptions et le menu. Les écrans existants repris tels quels
  (Éditeur complet, Réponses intelligentes) gardent encore une partie de
  l'ancien vocabulaire. **À reprendre si besoin.**

## Tâche 7 — Mes canaux

- **Association WhatsApp (QR code).** L'écran d'association existant
  (`ChannelConnectCard`), qui était sur l'ancien accueil, s'affiche maintenant
  en haut de « Mes canaux » dès qu'une association est en cours. Tous les
  liens « terminer sur l'accueil » mènent désormais à « Mes canaux ».
- **Envoyer un test.** L'API ne sait pas envoyer de message de test. Le bouton
  explique comment s'envoyer « test » depuis son téléphone et propose
  d'ouvrir Messages pour voir le message arriver. **À valider.**
- **Déconnecter.** Bouton rouge ; une boîte de confirmation affiche « Jokubot
  ne répondra plus sur ce canal. Continuer ? », puis un toast confirme.
- **Instructions en 3 étapes.** Réécrites pour WhatsApp et Telegram quand le
  canal n'est pas connecté.
- **Paramètres avancés.** Bloc replié contenant la passerelle entrante
  (adresse à copier, état), l'URL du webhook de complétion (avec envoi de
  test) et l'historique des livraisons.
- **Outil.** `scripts/i18n-add.py` ajoute ou met à jour des textes dans
  `src/admin/i18n.ts` à partir d'un fichier JSON.

## Tâche 8 — Utilisation

- **Source des chiffres.** Le graphique, la répartition et l'export CSV
  s'appuient sur le journal des messages reçus (`api.inbound`). Sa durée
  dépend de la durée de conservation choisie dans Réglages (90 jours par
  défaut).
- **Graphique sur 24 h.** Une barre par heure ; sur 7 et 30 jours, une barre
  par jour. Les valeurs sont aussi lues par les lecteurs d'écran.
- **Forfait.** La jauge utilise les crédits du mois (inclus / consommés) ;
  elle passe en rouge au-delà de 90 %. Sans forfait, une phrase l'indique.
- **Export CSV.** Généré dans le navigateur (séparateur « ; », encodage
  UTF-8 avec BOM pour Excel) : date, canal, expéditeur, résultat, réponse
  automatique.
- **Détail des crédits par tâche.** L'ancienne page Utilisation reste
  disponible dans un bloc repliable en bas de page.
