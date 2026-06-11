import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "CapCom",
        short_name: "CapCom",
        description: "Operational event management for teams.",
        start_url: "/events",
        scope: "/",
        display: "standalone",
        background_color: "#faf9f8",
        theme_color: "#be1717",
        orientation: "portrait-primary",
        icons: [
          {
            src: "/icon-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-384x384.png",
            sizes: "384x384",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => (
              request.mode === "navigate" && url.origin === globalThis.location.origin
            ),
            handler: "NetworkFirst",
            options: {
              cacheName: "capcom-v2-navigation",
              plugins: [
                {
                  handlerDidError: () => globalThis.caches.match("/index.html"),
                },
              ],
            },
          },
        ],
      },
    }),
  ],
});
