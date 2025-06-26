import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // Fixes Firebase Vite compatibility
    global: {},
    'process.env': process.env
  }
})