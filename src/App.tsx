import { LandingPage } from "./Landing.js";
import { LocaleProvider } from "./locale.js";
import { SiteMeta } from "./SiteMeta.js";
import { ThemeProvider } from "./theme.js";

export function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <SiteMeta />
        <LandingPage />
      </ThemeProvider>
    </LocaleProvider>
  );
}
