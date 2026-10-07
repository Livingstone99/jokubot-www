import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

import { engine } from "./catalog.js";
import { useDb } from "./db.js";
import { engineFlow } from "./flows/engines.js";
import { AccountPage } from "./pages/Account.js";
import { ConnectionsPage } from "./pages/Connections.js";
import { ConversationsPage } from "./pages/Conversations.js";
import { EngineSpacePage } from "./pages/EngineSpace.js";
import { EnginesPage } from "./pages/Engines.js";
import { NetworkPage } from "./pages/Network.js";
import { WelcomePage } from "./pages/Welcome.js";
import { Shell } from "./Shell.js";
import { ConfirmProvider, ToastProvider } from "./ui.js";
import { FlowModal } from "./wizard/FlowModal.js";

/** Réglages d'un moteur : une fenêtre au-dessus de son espace (ou de la liste s'il n'est pas encore réglé). */
function EngineSettingsRoute() {
  const { id = "" } = useParams();
  const db = useDb();
  const navigate = useNavigate();
  const info = engine(id);
  // Le parcours est figé à l'ouverture, avec les valeurs déjà enregistrées.
  const [flow] = useState(() => (info ? engineFlow(info.id, db) : null));
  if (!info || !flow) return <Navigate to="/moteurs" replace />;
  const configured = Boolean(db.engines[info.id]);
  return (
    <>
      {configured ? <EngineSpacePage /> : <EnginesPage />}
      <FlowModal flow={flow} onClose={() => navigate(configured ? `/moteurs/${info.id}` : "/moteurs")} />
    </>
  );
}

export function App() {
  const db = useDb();

  return (
    <ToastProvider>
      <ConfirmProvider>
        {db.loggedIn && db.account ? (
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<ConnectionsPage />} />
              <Route path="connecter/:network" element={<ConnectionsPage />} />
              <Route path="reseaux/:id" element={<NetworkPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="moteurs" element={<EnginesPage />} />
              <Route path="moteurs/:id" element={<EngineSpacePage />} />
              <Route path="moteurs/:id/reglages" element={<EngineSettingsRoute key="reglages" />} />
              <Route path="compte" element={<AccountPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        ) : (
          <WelcomePage />
        )}
      </ConfirmProvider>
    </ToastProvider>
  );
}
