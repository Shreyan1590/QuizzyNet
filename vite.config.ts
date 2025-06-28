import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      external: [
        // Add any other dependencies you want to externalize here
      ]
    }
  },
  optimizeDeps: {
    include: ['lucide-react', 'react-hot-toast']
  }
})