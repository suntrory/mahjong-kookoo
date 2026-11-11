import { nitro } from 'nitro/vite'
import vinext from 'vinext'
import { defineConfig } from 'vite'

// Nitro packages the server for hosted platforms (Vercel sets VERCEL=1 in its
// builds; NITRO_PRESET forces it locally). Without it the build stays a plain
// Vinext standalone Node server in dist/standalone, which is what Docker runs.
const useNitro = Boolean(process.env.VERCEL || process.env.NITRO_PRESET)

// vinext auto-detects ./app (App Router) and loads next.config.ts
export default defineConfig({
  plugins: [vinext(), ...(useNitro ? [nitro()] : [])],
})
