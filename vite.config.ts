import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate the heavy game data from UI code
          'game-data': ['./src/data.ts', './src/narrative.ts', './src/rivals.ts'],
          'game-engine': ['./src/gameStore.ts', './src/unlocks.ts', './src/challenges.ts'],
        },
      },
    },
  },
})
