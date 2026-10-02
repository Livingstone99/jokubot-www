import { Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth.js";
import { AppShell } from "./layout/AppShell.js";
import { ActivityFeedPage } from "./pages/ActivityFeed.js";
import { AutomationsPage } from "./pages/Automations.js";
import { ChannelsPage } from "./pages/Channels.js";
import { ConversationsPage } from "./pages/Conversations.js";
import { MorePage } from "./pages/More.js";
import { SettingsViewPage } from "./pages/SettingsView.js";
import { UsageViewPage } from "./pages/UsageView.js";
import { VerificationsPage } from "./pages/Verifications.js";
import { DevelopersPage } from "./pages/Developers.js";
import { LoginPage } from "./pages/Login.js";
import { OverviewPage } from "./pages/Overview.js";
import { PurposesPage } from "./pages/Purposes.js";
import { ReactionsPage } from "./pages/Reactions.js";
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
              <Route path="sessions" element={<ConversationsPage />} />
              <Route path="sessions/:channel/:sender" element={<ConversationsPage />} />
              <Route path="triggers" element={<AutomationsPage />} />
              <Route path="triggers/new" element={<AutomationsPage />} />
              <Route path="triggers/:id/edit" element={<AutomationsPage />} />
              <Route path="triggers/advanced" element={<TriggersPage />} />
              <Route path="reactions" element={<ReactionsPage />} />
              <Route path="setup" element={<SetupPage />} />
              <Route path="verify" element={<VerificationsPage />} />
              <Route path="verify/advanced" element={<VerifyPage />} />
              <Route path="purposes" element={<PurposesPage />} />
              <Route path="channels" element={<ChannelsPage />} />
              <Route path="activity" element={<ActivityFeedPage />} />
              <Route path="usage" element={<UsageViewPage />} />
              <Route path="usage/details" element={<UsagePage />} />
              <Route path="settings" element={<SettingsViewPage />} />
              <Route path="settings/advanced" element={<SettingsPage />} />
              <Route path="developers" element={<DevelopersPage />} />
              <Route path="more" element={<MorePage />} />
            </Route>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
