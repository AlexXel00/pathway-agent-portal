import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// base: './' so the built app works from any GitHub Pages path
// (username.github.io/ or username.github.io/repo-name/) without extra config
export default defineConfig({
  base: './',
  plugins: [react()],
})
