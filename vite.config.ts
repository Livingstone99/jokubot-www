import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE || "/",
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve("index.html"),
        admin: resolve("admin.html"),
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    // PostFast n'accepte pas les appels directs d'une page web (CORS) : en local,
    // le serveur relaie /postfast vers son API. La clé reste celle que
    // l'utilisateur colle dans l'écran de connexion.
    proxy: {
      "/postfast": {
        target: "https://api.postfa.st",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/postfast/, ""),
      },
      // Actualités : les flux RSS des médias n'acceptent pas non plus les appels
      // directs d'une page web. En local, le serveur les relaie ; en ligne, il
      // faudra que le serveur JokuBot s'en charge.
      ...Object.fromEntries(
        Object.entries({
          rfi: "https://www.rfi.fr",
          f24: "https://www.france24.com",
          lemonde: "https://www.lemonde.fr",
          bbc: "https://feeds.bbci.co.uk",
          ja: "https://www.jeuneafrique.com",
        }).map(([name, target]) => [
          `/news/${name}`,
          {
            target,
            changeOrigin: true,
            followRedirects: true,
            headers: { "User-Agent": "Mozilla/5.0 (JokuBot)" },
            rewrite: (path: string) => path.replace(new RegExp(`^/news/${name}`), ""),
          },
        ]),
      ),
    },
  },
});
