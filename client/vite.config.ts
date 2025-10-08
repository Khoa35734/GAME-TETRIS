import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use a fresh cache directory to avoid EPERM unlink issues on Windows
  cacheDir: '.vite-cache-dev',
  optimizeDeps: {
    force: true,
  },
})
