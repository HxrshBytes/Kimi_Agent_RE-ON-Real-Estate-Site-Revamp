import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import apiRoutes from './routes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Configure CORS for production (allow specific CLIENT_ORIGIN if set, else allow all)
const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*'
app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// API routes
app.use('/api', apiRoutes)

// Root & Health check routes for Render / Health monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime(), timestamp: new Date() })
})

app.get('/', (req, res) => {
  res.json({ message: 'RE-ON MongoDB API Server Running', status: 'OK' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[RE-ON Backend] API Server listening on port ${PORT}`)
})

export default app

