import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Avoid Windows file-lock issues in node_modules/.vite by using a custom cache dir
  cacheDir: '.vite-cache',
})
