import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import {
  getAllTasks, createTask, updateTaskById, deleteTaskById,
  toggleTaskCompletion, toggleTaskExpand,
  addSubtask, toggleSubtask, deleteSubtaskById,
  getInboxItems, addInboxItem, deleteInboxItem,
  getSomedayItems, addSomedayItem, deleteSomedayItem,
  getRoutinesWithItems, createRoutine, deleteRoutineById,
  addRoutineItem, toggleRoutineItem, deleteRoutineItemById,
  getPoints, setPoints,
  clearAllTasks, clearAllInbox, clearAllSomeday, clearAllRoutines,
  getLifeCourseItems, addLifeCourseItem, deleteLifeCourseItem, clearAllLifeCourses,
  createUser, findUserByUsername, findUserById
} from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'focus-app-secret-change-in-production'
const app = express()
app.use(cors())
app.use(express.json())

// --- Auth ---

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    req.userId = payload.id
    next()
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const existing = findUserByUsername(username)
  if (existing) return res.status(409).json({ error: 'Username taken' })
  const hashed = await bcrypt.hash(password, 10)
  const user = createUser(username, hashed)
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, username: user.username } })
})

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })
  const user = findUserByUsername(username)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, username: user.username } })
})

app.get('/api/me', authMiddleware, (req, res) => {
  const user = findUserById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json({ id: user.id, username: user.username })
})

// --- Protected CRUD ---

app.get('/api/tasks', authMiddleware, (req, res) => res.json(getAllTasks()))
app.post('/api/tasks', authMiddleware, (req, res) => res.json(createTask(req.body)))
app.put('/api/tasks/:id', authMiddleware, (req, res) => res.json(updateTaskById(req.params.id, req.body)))
app.delete('/api/tasks/:id', authMiddleware, (req, res) => res.json(deleteTaskById(req.params.id)))
app.put('/api/tasks/:id/toggle', authMiddleware, (req, res) => res.json(toggleTaskCompletion(req.params.id)))
app.put('/api/tasks/:id/expand', authMiddleware, (req, res) => res.json(toggleTaskExpand(req.params.id)))
app.delete('/api/tasks', authMiddleware, (req, res) => res.json(clearAllTasks()))

app.post('/api/tasks/:id/subtasks', authMiddleware, (req, res) => res.json(addSubtask(req.params.id, req.body.title, req.body.id)))
app.put('/api/subtasks/:id/toggle', authMiddleware, (req, res) => res.json(toggleSubtask(req.params.id)))
app.delete('/api/subtasks/:id', authMiddleware, (req, res) => res.json(deleteSubtaskById(req.params.id)))

app.get('/api/inbox', authMiddleware, (req, res) => res.json(getInboxItems()))
app.post('/api/inbox', authMiddleware, (req, res) => res.json(addInboxItem(req.body.title, req.body.id)))
app.delete('/api/inbox/:id', authMiddleware, (req, res) => res.json(deleteInboxItem(req.params.id)))
app.delete('/api/inbox', authMiddleware, (req, res) => res.json(clearAllInbox()))

app.get('/api/someday', authMiddleware, (req, res) => res.json(getSomedayItems()))
app.post('/api/someday', authMiddleware, (req, res) => res.json(addSomedayItem(req.body.title, req.body.id)))
app.delete('/api/someday/:id', authMiddleware, (req, res) => res.json(deleteSomedayItem(req.params.id)))
app.delete('/api/someday', authMiddleware, (req, res) => res.json(clearAllSomeday()))

app.get('/api/routines', authMiddleware, (req, res) => res.json(getRoutinesWithItems()))
app.post('/api/routines', authMiddleware, (req, res) => res.json(createRoutine(req.body.title, req.body.type, req.body.id)))
app.delete('/api/routines/:id', authMiddleware, (req, res) => res.json(deleteRoutineById(req.params.id)))
app.post('/api/routines/:id/items', authMiddleware, (req, res) => res.json(addRoutineItem(req.params.id, req.body.title, req.body.id)))
app.put('/api/routine-items/:id/toggle', authMiddleware, (req, res) => res.json(toggleRoutineItem(req.params.id)))
app.delete('/api/routine-items/:id', authMiddleware, (req, res) => res.json(deleteRoutineItemById(req.params.id)))
app.delete('/api/routines', authMiddleware, (req, res) => res.json(clearAllRoutines()))

app.get('/api/life-courses', authMiddleware, (req, res) => res.json(getLifeCourseItems()))
app.post('/api/life-courses', authMiddleware, (req, res) => res.json(addLifeCourseItem(req.body.title, req.body.id)))
app.delete('/api/life-courses/:id', authMiddleware, (req, res) => res.json(deleteLifeCourseItem(req.params.id)))

app.get('/api/points', authMiddleware, (req, res) => res.json(getPoints()))
app.put('/api/points', authMiddleware, (req, res) => res.json(setPoints(req.body.points)))

const PORT = parseInt(process.env.PORT) || 3001
app.listen(PORT, () => console.log(`API server on http://localhost:${PORT}`))
