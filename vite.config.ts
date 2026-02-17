import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 200, // R288: warn at 200KB
    cssCodeSplit: true,         // R288: CSS code splitting (default but explicit)
    rollupOptions: {
      output: {
        manualChunks: {
          // R203: Split React into its own vendor chunk for better caching
          'vendor-react': ['react', 'react-dom'],
          // Separate the heavy game data from UI code
          'game-data': ['./src/data.ts', './src/narrative.ts', './src/rivals.ts'],
          'game-engine': ['./src/gameStore.ts', './src/unlocks.ts', './src/challenges.ts'],
        },
      },
    },
  },
})
