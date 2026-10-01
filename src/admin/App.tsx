import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth.js";
import { AppShell } from "./layout/AppShell.js";
import { MorePage } from "./layout/Navigation.js";
import { ActivityPage } from "./pages/Activity.js";
import { DevelopersPage } from "./pages/Developers.js";
import { LoginPage } from "./pages/Login.js";
import { OverviewPage } from "./pages/Overview.js";
import { PurposesPage } from "./pages/Purposes.js";
import { ReactionsPage } from "./pages/Reactions.js";
import { SessionsPage } from "./pages/Sessions.js";
import { SettingsPage } from "./pages/Settings.js";
import { SetupPage } from "./pages/Setup.js";
import { SignupPage } from "./pages/Signup.js";
import { TriggersPage } from "./pages/Triggers.js";
import { UsagePage } from "./pages/Usage.js";
import { VerifyPage } from "./pages/Verify.js";
import { LocaleProvider, useT } from "./locale.js";
import { ThemeProvider } from "./theme.js";

/** Redirige en gardant les paramètres d'adresse (:channel, :sender) et la requête (?new=1). */
function Redirect({ to }: { to: string }) {
  const params = useParams();
  const { search } = useLocation();
  const path = to.replace(/:([a-z]+)/gi, (_, name: string) => encodeURIComponent(params[name] ?? ""));
  return <Navigate to={`${path}${search}`} replace />;
}

function Boot() {
  const t = useT();
  return <div className="boot">{t("common.loading")}</div>;
}

function Guard({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) {
    return <Boot />;
  }
  if (!me) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Guest({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  if (loading) {
    return <Boot />;
  }
  if (me) {
    return <Navigate to="/overview" replace />;
  }
  return children;
}

export function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <Guest>
                  <LoginPage />
                </Guest>
              }
            />
            <Route
              path="/signup"
              element={
                <Guest>
                  <SignupPage />
                </Guest>
              }
            />
            <Route
              element={
                <Guard>
                  <AppShell />
                </Guard>
              }
            >
              <Route path="overview" element={<OverviewPage />} />
              <Route path="messages" element={<SessionsPage />} />
              <Route path="messages/:channel/:sender" element={<SessionsPage />} />
              <Route path="automations" element={<TriggersPage />} />
              <Route path="automations/editor" element={<TriggersPage />} />
              <Route path="automations/assistant" element={<SetupPage />} />
              <Route path="automations/reactions" element={<ReactionsPage />} />
              <Route path="channels" element={<SettingsPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="more" element={<MorePage />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="purposes" element={<PurposesPage />} />
              <Route path="developers" element={<DevelopersPage />} />
              <Route path="journal" element={<ActivityPage />} />
              {/* Anciennes adresses : redirigées vers la nouvelle organisation. */}
              <Route path="sessions" element={<Redirect to="/messages" />} />
              <Route path="sessions/:channel/:sender" element={<Redirect to="/messages/:channel/:sender" />} />
              <Route path="activity" element={<Redirect to="/messages" />} />
              <Route path="setup" element={<Redirect to="/automations/assistant" />} />
              <Route path="triggers" element={<Redirect to="/automations/editor" />} />
              <Route path="reactions" element={<Redirect to="/automations/reactions" />} />
            </Route>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
