import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth.js";
import { AppShell } from "./layout/AppShell.js";
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
              <Route path="sessions" element={<SessionsPage />} />
              <Route path="sessions/:channel/:sender" element={<SessionsPage />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="purposes" element={<PurposesPage />} />
              <Route path="setup" element={<SetupPage />} />
              <Route path="triggers" element={<TriggersPage />} />
              <Route path="reactions" element={<ReactionsPage />} />
              <Route path="activity" element={<ActivityPage />} />
              <Route path="usage" element={<UsagePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="developers" element={<DevelopersPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
