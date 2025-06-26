import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        '@mui/x-date-pickers',
        '@mui/x-date-pickers/DateTimePicker',
        '@mui/x-date-pickers/LocalizationProvider',
        '@mui/x-date-pickers/AdapterDateFns',
        '@mui/material',
        '@emotion/react',
        '@emotion/styled'
      ]
    }
  },
  optimizeDeps: {
    include: [
      '@mui/x-date-pickers',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'date-fns'
    ]
  }
})