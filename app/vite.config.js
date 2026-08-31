import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'start-api-server',
      async configureServer(server) {
        try {
          const express = (await import('express')).default
          const cors = (await import('cors')).default
          const dotenv = await import('dotenv')
          dotenv.config()

          const { default: apiRoutes } = await import('./server/routes.js')

          const app = express()
          app.use(cors())
          app.use(express.json({ limit: '50mb' }))
          app.use(express.urlencoded({ extended: true, limit: '50mb' }))
          app.use(apiRoutes)

          server.middlewares.use('/api', app)
          console.log('[RE-ON API] Integrated backend API middleware attached at /api')
        } catch (err) {
          console.error('[RE-ON API] Failed to attach backend middleware:', err)
        }
      },
    },
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-clerk': ['@clerk/react'],
        },
      },
    },
  },
})
