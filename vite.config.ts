import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: path.join(root, 'src/playground'),
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: path.join(root, 'dist-playground'),
    emptyOutDir: true,
  },
})
