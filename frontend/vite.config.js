import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

process.env.VITE_APP_VERSION = process.env.VITE_APP_VERSION || `v${pkg.version} Beta`

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    vue()
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:7777',
      '/socket.io': {
        target: 'ws://localhost:7777',
        ws: true,
      },
    },
  },
})
