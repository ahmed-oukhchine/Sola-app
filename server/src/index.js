import express from 'express'
import cors from 'cors'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.use('/api', authRoutes)
app.use('/api/data', dataRoutes)

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Focus API server running on http://localhost:${PORT}`)
})
