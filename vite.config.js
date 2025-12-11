import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/3dbrodmannareas/' : '/',
  server: {
    allowedHosts: ['.ngrok-free.app', '.ngrok.io'],
  },
})

