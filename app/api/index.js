import express from 'express'
import cors from 'cors'
import apiRoutes from '../server/routes.js'

const app = express()

const allowedOrigins = process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*'
app.use(
  cors({
    origin: allowedOrigins === '*' ? '*' : allowedOrigins,
    credentials: true,
  })
)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api', apiRoutes)
app.use('/', apiRoutes)

export default app

