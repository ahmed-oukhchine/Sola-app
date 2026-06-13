import { Router } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db.js'
import { generateToken, authMiddleware } from '../auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
    if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' })

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) return res.status(409).json({ error: 'Username already taken' })

    const hash = await bcrypt.hash(password, 10)
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash)
    const token = generateToken(result.lastInsertRowid)

    res.json({ token, user: { id: result.lastInsertRowid, username } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
    if (!user) return res.status(401).json({ error: 'Invalid username or password' })

    const match = await bcrypt.compare(password, user.password)
    if (!match) return res.status(401).json({ error: 'Invalid username or password' })

    const token = generateToken(user.id)
    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, username, points FROM users WHERE id = ?').get(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(user)
})

export default router
