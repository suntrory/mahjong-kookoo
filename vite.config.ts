import vinext from 'vinext'
import { defineConfig } from 'vite'

// vinext auto-detects ./app (App Router) and loads next.config.ts
export default defineConfig({
  plugins: [vinext()],
})
