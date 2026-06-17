import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
// iPhone-only installable PWA. Single source of truth is Firestore (read/written
// directly from the app). No backend here — see ARCHITECTURE.md.
//
// Deployed to GitHub Pages at https://<user>.github.io/keela/ — so the production
// build is served from the "/keela/" sub-path. Dev stays at "/".
// A short, human-readable build stamp surfaced in Settings so it's obvious
// whether an installed PWA has actually picked up a new deploy (the service
// worker can otherwise keep serving a stale cached build).
var BUILD_ID = new Date()
    .toISOString()
    .slice(0, 16)
    .replace('T', ' ');
export default defineConfig(function (_a) {
    var command = _a.command;
    return ({
        base: command === 'build' ? '/keela/' : '/',
        define: {
            __BUILD_ID__: JSON.stringify(BUILD_ID),
        },
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                manifest: {
                    name: 'Keela',
                    short_name: 'Keela',
                    description: 'The cloud home of Keela — the 70/30 pact.',
                    theme_color: '#FAF9F5',
                    background_color: '#FAF9F5',
                    display: 'standalone',
                    orientation: 'portrait',
                    icons: [
                        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                    ],
                },
            }),
        ],
    });
});
