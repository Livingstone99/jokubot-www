import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import { App } from "./App.js";
import { useLang } from "./prefs.js";
import "./styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root");
}

/** Changer de langue reconstruit l'interface, pour que chaque texte soit retraduit. */
function Root() {
  const lang = useLang();
  return <App key={lang} />;
}

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <Root />
    </HashRouter>
  </StrictMode>,
);
