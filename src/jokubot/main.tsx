import { StrictMode } from "react";
import { createRoot, type Root as ReactRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "./App.js";
import { useLang } from "./prefs.js";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Missing #root");
}

// En développement, ce fichier peut être réexécuté après une modification :
// on réutilise la même racine React, sinon deux copies de l'application se
// disputent la page et les boutons cessent de répondre.
const root: ReactRoot = (import.meta.hot?.data.root as ReactRoot | undefined) ?? createRoot(container);
if (import.meta.hot) import.meta.hot.data.root = root;

/** Changer de langue reconstruit l'interface, pour que chaque texte soit retraduit. */
function Root() {
  const lang = useLang();
  return <App key={lang} />;
}

root.render(
  <StrictMode>
    <HashRouter>
      <Root />
    </HashRouter>
  </StrictMode>,
);
