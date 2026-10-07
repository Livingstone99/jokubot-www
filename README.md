# jokubot-www — site vitrine JokuBot

Page d'accueil publique de JokuBot : [github.com/Livingstone99/jokubot-www](https://github.com/Livingstone99/jokubot-www), publiée sur GitHub Pages à https://livingstone99.github.io/jokubot-www/.

Ce dépôt contient deux surfaces, sans API ni base de données :

- la **page marketing** (`index.html`). Les boutons « Commencer maintenant », « Acheter » et « Accéder à la plateforme » envoient vers `<VITE_APP_ORIGIN>/login`.
- l'**espace commerçant** (`admin.html`) : connexions des messageries, discussion avec JokuBot, services et compte. Il tourne sur des données de démonstration, la **Boutique Awa**, gardées dans le navigateur. Rien n'appelle encore l'application JokuBot.

Ouvrir l'espace en local : http://127.0.0.1:5174/admin.html. Sur GitHub Pages : `admin.html`. La navigation est dans le fragment (`#/`, `#/conversations`, `#/moteurs`, `#/compte`).

Les fichiers de l'espace sont dans `src/jokubot/`, son style dans `src/jokubot/styles.css`. La page marketing a son propre style, dans `src/styles.css`. Le détail de l'espace est plus bas, section « Espace commerçant (`admin.html`) ».

## Démarrer en local

```bash
cp .env.example .env
npm install
npm run dev
```

Le site tourne sur http://127.0.0.1:5174 (port fixe, défini dans `vite.config.ts`). Chaque modification de fichier se recharge automatiquement dans le navigateur.

Par défaut les boutons pointent vers `https://jokubot.com`. Pour les faire pointer vers l'application lancée en local, mettre dans `.env` :

```
VITE_APP_ORIGIN=http://127.0.0.1:5173
```

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Serveur de développement avec rechargement à chaud |
| `npm run typecheck` | Vérifie les types TypeScript sans rien générer |
| `npm run build` | Vérifie les types puis génère le site statique dans `dist/` |
| `npm run preview` | Sert le contenu de `dist/` pour tester le build final |

## Stack

- **React 19** pour l'interface. La page marketing n'a pas de routeur. L'espace business utilise React Router en fragment d'URL, pour fonctionner sur GitHub Pages.
- **react-router-dom** pour l'espace business seulement.
- **Vite** pour le serveur de développement et le build.
- **TypeScript** en mode strict.
- **CSS pur**, sans framework (pas de Tailwind). `src/styles.css` pour la page marketing, `src/admin/styles.css` pour l'espace business.

## Comment la page est construite

```
index.html            balises SEO / réseaux sociaux de base, point d'entrée
└─ src/main.tsx       monte React dans <div id="root"> et charge styles.css
   └─ src/App.tsx     empile les « fournisseurs » globaux :
      ├─ LocaleProvider   langue (fr / en)
      ├─ ThemeProvider    thème (clair / sombre)
      ├─ SiteMeta         met à jour <title> et les balises meta selon la langue
      └─ LandingPage      toute la page (src/Landing.tsx)
```

### Les fichiers de `src/`

| Fichier | Rôle |
| --- | --- |
| `Landing.tsx` | La page entière : en-tête, sections, pied de page, et les icônes SVG en bas du fichier |
| `i18n.ts` | Tous les textes du site, en français (`fr`) et en anglais (`en`) |
| `locale.tsx` | Contexte React de la langue, hook `useT()` et menu de choix de langue |
| `theme.tsx` | Contexte React du thème et bouton clair / sombre |
| `SiteMeta.tsx` | Traduit le titre de l'onglet et les balises Open Graph / Twitter |
| `config.ts` | `appHref()` pour les liens vers l'application, `siteHref()` pour les fichiers de `public/` |
| `styles.css` | Couleurs (tokens), mise en page et styles de toutes les sections |
| `brand/Logo.tsx` | Logo (`JokubotMark`) et nom (`JokubotWordmark`) |
| `KeyedVideo.tsx` | Composant qui efface le fond noir d'une vidéo. Il n'est plus utilisé par la page |

### Les sections de la page

Dans l'ordre de `Landing.tsx`. L'identifiant sert d'ancre pour le menu (`#tarifs`, etc.).

| Ancre | Contenu | Clés de texte |
| --- | --- | --- |
| (hero) | Titre, bouton « Commencer maintenant », vidéo du robot | `hero.*` |
| `#pourquoi` | Pourquoi JokuBot (fond noir) | `why.*` |
| `#fonctionnalites` | Les six fonctionnalités | `features.*` |
| `#contenu` | Notes vocales, images, vidéos (fond noir) | `content.*` |
| `#reseaux` | Réseaux sociaux | `social.*` |
| `#paiement` | Paiement Nafolo en 3 étapes (fond noir) | `payment.*` |
| `#tarifs` | Formules d'abonnement | `pricing.*` |
| `#contact` | Maquette du tableau de bord et accès à la plateforme | `platform.*` |

### Langues

Aucun texte n'est écrit en dur dans `Landing.tsx`. Chaque texte est une clé, lue avec `t("clé")` :

```tsx
const t = useT();
<h2>{t("pricing.title")}</h2>
```

Les valeurs sont dans `src/i18n.ts`, une fois dans l'objet `fr` et une fois dans l'objet `en`. L'objet `en` est typé à partir de `fr` : si une clé manque en anglais, `npm run typecheck` échoue. Le français est la langue par défaut. Le choix du visiteur est gardé dans le navigateur (`localStorage`, clé `mvs.locale`).

### Thème clair / sombre

Toutes les couleurs sont des variables CSS définies en haut de `styles.css`, une fois pour `[data-theme="light"]` et une fois pour `[data-theme="dark"]`. Le bouton de thème change l'attribut `data-theme` sur `<html>`. Au premier passage, le site suit le réglage du système. Ensuite, le choix est gardé dans le navigateur (clé `mvs.theme`).

Les sections à fond noir utilisent la classe `land-invert` et les variables `--invert-*`. Elles s'inversent en thème sombre, et passent donc en clair. Le pied de page (`.land-foot`) fixe ses propres couleurs et reste noir dans les deux thèmes.

### Animations

- Les éléments avec la classe `reveal` ou `reveal-text` apparaissent en fondu quand ils entrent à l'écran. Un `IntersectionObserver`, au début de `LandingPage`, ajoute la classe `is-visible`.
- Le fond du hero est une vidéo de réseau (`public/hero-bg.mp4`) répétée en mosaïque.
- Si le visiteur a demandé moins d'animations dans son système (`prefers-reduced-motion`), les fondus et effets de survol sont coupés et tout est affiché directement. Les vidéos, elles, continuent de tourner.

### Fichiers statiques (`public/`)

Copiés tels quels dans le build : vidéos (`agent.mp4`, `hero-bg.mp4`), images du robot, favicons, `og.png` (aperçu lors d'un partage de lien) et `site.webmanifest`. Dans le code, on y accède avec `siteHref("/fichier")`, pour que le chemin reste correct sous GitHub Pages.

## Modifications courantes

- **Changer un texte** : modifier la clé dans `src/i18n.ts`, en français **et** en anglais.
- **Ajouter un texte** : ajouter la clé dans `fr` puis dans `en`, et l'utiliser avec `t("ma.cle")` dans `Landing.tsx`.
- **Changer une couleur** : modifier la variable dans le bloc clair **et** dans le bloc sombre, en haut de `styles.css`.
- **Changer un lien vers l'application** : utiliser `appHref("/chemin")`, jamais une URL en dur.
- **Remplacer la vidéo du robot** : remplacer `public/agent.mp4` en gardant le même nom.

## Déploiement

Le workflow `.github/workflows/pages.yml` s'exécute à chaque push sur `main`. Il installe les dépendances, lance `npm run build` et publie `dist/` sur GitHub Pages.

Deux variables du dépôt GitHub (Settings → Variables) règlent le build :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `VITE_BASE` | `/jokubot-www/` | Chemin où le site est servi. Mettre `/` pour un domaine personnalisé à la racine |
| `VITE_APP_ORIGIN` | `https://jokubot.com` | Adresse de l'application (login, docs, espace client) |

## Règles de design

- Noir et blanc strict : pas de couleur d'accent.
- Deux polices seulement : Plus Jakarta Sans (texte) et IBM Plex Mono (petits libellés). Ne pas en ajouter.
- Pas de texte marketing de remplissage.

## Espace commerçant (`admin.html`)

Logiciel du commerçant : il connecte ses messageries et JokuBot répond à ses clients. Pensé d'abord pour le téléphone (375 px), en français, pour l'Afrique de l'Ouest (FCFA, indicatif +225 par défaut). Noir et blanc ; le rouge ne sert qu'aux non-lus et aux actions dangereuses.

### Écrans

| Écran | Adresse | Contenu |
| --- | --- | --- |
| Connexions | `#/` | WhatsApp, Telegram, puis Facebook, Instagram, X et TikTok (par PostFast) : état, compte relié, bouton de connexion |
| Connexion d'un réseau | `#/connecter/whatsapp`, `telegram`, `facebook`, `instagram`, `x`, `tiktok` |
| Espace d'un réseau social | `#/reseaux/x`, `instagram`, `facebook`, `tiktok` | Compte, nouvelle publication, publications, déconnexion | Parcours étape par étape dans une fenêtre au-dessus de Connexions (plein écran sur téléphone). Toute la carte l'ouvre ; Échap, × ou « Annuler » la ferment |
| Conversations | `#/conversations` | Discussion avec JokuBot pour lui apprendre l'activité |
| Services | `#/moteurs` | Interrupteur « Réponses automatiques » et les 6 services |
| Espace d'un service | `#/moteurs/:id` | Ouvre le réglage si le service n'est pas encore réglé |
| Réglage d'un service | `#/moteurs/:id/reglages` | Parcours étape par étape, dans une fenêtre au-dessus de l'espace du service (ou de la liste s'il n'est pas encore réglé). Horaires choisis par créneaux tout prêts ou listes d'heures |
| Compte | `#/compte` | Profil, réseaux connectés, installation de l'application, déconnexion |

Ordinateur (≥ 1024 px) : menu latéral. En dessous : barre du haut et barre de 4 onglets en bas. Un lien vers la page déjà ouverte recharge la vue.

En haut à droite (et dans la barre du haut sur téléphone, et sur l'écran de connexion) : le menu de langue (« FR ⌄ », Français ou English, avec drapeaux) et le bouton clair / sombre. Les deux choix sont gardés dans le navigateur (clés `jokubot.lang` et `jokubot.theme`). Sans choix enregistré, le thème suit celui du système.

### Langues et thème

- **Traduction** : tout texte visible passe par `t("texte en français")` (`src/jokubot/prefs.ts`). Le français sert de clé ; la version anglaise est dans `src/jokubot/i18n-en.ts`. Un texte sans traduction s'affiche en français. Les valeurs variables s'écrivent `{nom}` : `t("Connecter {reseau}", { reseau: "WhatsApp" })`. Pour du gras dans une phrase traduite : `<Rich text="Touchez **Paramètres**." />`.
- Les champs de formulaire, les parcours, les titres de section, les messages vides, les notifications et les erreurs de l'API traduisent eux-mêmes leurs textes : il suffit d'ajouter l'entrée anglaise dans `i18n-en.ts`.
- Changer de langue reconstruit l'interface. Les données saisies (noms, descriptions, ventes) ne sont pas traduites.
- **Thème** : les couleurs sont des variables en haut de `styles.css`, redéfinies sous `:root[data-theme="dark"]`. Les panneaux toujours sombres (menu, cartes Services, notifications) utilisent `--panel` ; le texte posé sur un fond `--ink` utilise `--on-ink`.

### Réseaux sociaux (PostFast) — frontend seulement

X (Twitter), Instagram, Facebook et TikTok ont leur section sur la page Connexions : logo, nom, statut (« Connecté » / « Non connecté ») et bouton « Connecter » ou « Gérer ».

- **Connecter** ouvre la fenêtre de connexion, en étapes : type de compte (cartes), autorisation (en démonstration, le compte se connecte seul après 4 s), rythme de publication, heure en créneaux (8 h, 12 h, 18 h, 20 h) et sujets, puis « Terminé ». Ces choix s'affichent dans l'espace du réseau.
- **Un clic sur la carte** (ou « Gérer ») ouvre l'espace du réseau, `#/reseaux/:id` : compte connecté (abonnés, publications), créer une publication (texte avec limite de caractères propre au réseau, image ou vidéo, moment choisi en créneaux : maintenant, aujourd'hui 18 h, demain 12 h ou 18 h, autre date), liste des publications, déconnexion. Une barre en haut passe d'un réseau à l'autre.
- Règles par réseau (`src/jokubot/social.tsx`) : X 280 caractères ; Instagram demande une image ou une vidéo ; TikTok demande une vidéo.

**Pour cette version, aucune connexion réelle** : comptes, abonnés et publications sont des données fictives (`mockPosts`, `MOCK_FOLLOWERS`). Facebook et Instagram sont connectés à la création du compte, X et TikTok ne le sont pas. Brancher l'API PostFast se fera dans `api.ts` (`socialStart`, `socialStatus`, `socialPublish`), sans toucher aux écrans.

### Organisation du code (`src/jokubot/`)

| Fichier | Rôle |
| --- | --- |
| `db.ts` | Types, données de démonstration (`seed`), état gardé dans `localStorage` (clé `jokubot.demo.v1`), calcul des totaux |
| `api.ts` | **Seul point de contact avec les données.** Chaque fonction imite un appel serveur (délai, `ApiError` en français avec le champ concerné). Pour brancher le vrai backend, on remplace le corps de ces fonctions par des `fetch` |
| `bot.ts` | Règles de démonstration de JokuBot : ce qu'il retient, les ventes dictées (« j'ai vendu X à 12 000 »), « combien j'ai vendu ? » |
| `poster.ts` | Affiche SVG noir et blanc générée depuis la description, légende avec hashtags, téléchargement en PNG |
| `catalog.ts` | Liste des messageries et des moteurs, avec leurs textes |
| `wizard/Wizard.tsx` | Moteur commun des parcours : étapes, validation, focus sur la première erreur, écran « Terminé ». Affiché dans une fenêtre par `wizard/FlowModal.tsx` (connexions et réglages des services) |
| `wizard/fields.tsx` | Les champs : texte, e-mail, téléphone avec indicatif, secret, zone de texte, liste, cartes radio, cartes à cocher, code à 5 cases, plage horaire |
| `flows/channels.tsx` | Parcours WhatsApp et Telegram (numéro, liaison, terminé) et connexion des réseaux sociaux (autorisation, terminé) |
| `social.tsx` | Réseaux sociaux : logos, règles de publication, données fictives |
| `pages/Network.tsx` | Espace d'un réseau social |
| `flows/engines.tsx` | Parcours de réglage des 6 moteurs |
| `pages/` | Un fichier par écran ; `pages/spaces/` pour l'espace de chaque moteur |
| `ui.tsx` | Icônes, interrupteur, onglets, notifications, confirmation, `AppLink`, `usePolling` |
| `Shell.tsx` | Menu latéral noir, barre du bas |

Un parcours se décrit en données (`FlowDef`) : une liste d'étapes avec leurs champs, des conditions d'affichage (`when`), une action d'envoi (`onSubmit`) et l'écran final. Voir `flows/engines.tsx` pour des exemples.

### Démonstration

- À la création du compte : WhatsApp connecté (+225 07 08 45 12 30), service client actif pour la Boutique Awa, 2 informations connues, 5 ventes dont un paiement Nafolo à vérifier.
- WhatsApp se relie seul au bout de 9 s. Le code Telegram est `12345` ; un numéro qui finit par 0 demande en plus le mot de passe Telegram.
- Pour repartir de zéro : vider le stockage du site dans le navigateur, ou se déconnecter puis créer un compte avec une autre adresse.

### Règles de l'espace

- Bouton principal noir, boutons secondaires à contour, hauteur 48 px (44 px minimum partout).
- Champs en 16 px, pour éviter le zoom sur iPhone. Chaque champ a son libellé visible ; les erreurs disent quoi faire.
- Focus clavier visible. Interrupteurs en `role="switch"`, onglets en `role="tablist"`, menu actif en `aria-current="page"`.
- Aucune page ne défile horizontalement de 375 à 1440 px. Les tableaux défilent dans leur propre conteneur.
- Animations coupées si le système demande moins de mouvement.

L'ancien espace (`src/admin/`) n'est plus chargé par `admin.html`. Il reste dans le dépôt pour référence et peut être supprimé.
