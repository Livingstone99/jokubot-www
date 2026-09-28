# jokubot-www — site vitrine JokuBot

Page d'accueil publique de JokuBot : [github.com/Livingstone99/jokubot-www](https://github.com/Livingstone99/jokubot-www), publiée sur GitHub Pages à https://livingstone99.github.io/jokubot-www/.

Ce dépôt ne contient **que la page marketing**. Il n'y a ni API, ni base de données, ni logique métier. La connexion, l'inscription, la documentation et l'espace client vivent dans l'application JokuBot, sur une autre origine (`VITE_APP_ORIGIN`). Tous les boutons « Commencer maintenant », « Acheter » et « Accéder à la plateforme » envoient vers `<VITE_APP_ORIGIN>/login`.

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

- **React 19** pour l'interface, sans routeur : le site est une seule page.
- **Vite** pour le serveur de développement et le build.
- **TypeScript** en mode strict.
- **CSS pur** dans un seul fichier, sans framework (pas de Tailwind).

Aucune autre dépendance.

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
