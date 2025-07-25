// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: [
      'delivered-seasons-honolulu-captured.trycloudflare.com',
      // ...si antes tenías otros hosts, asegúrate de mantenerlos
    ],
  },
})
