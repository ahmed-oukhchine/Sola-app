import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'

const db = new Database('focus.db')
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT DEFAULT '',
    endTime TEXT DEFAULT '',
    completed INTEGER DEFAULT 0,
    unscheduled INTEGER DEFAULT 1,
    expanded INTEGER DEFAULT 0,
    energy TEXT,
    repeat TEXT,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subtasks (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (taskId) REFERENCES tasks(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inbox (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS someday (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routines (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS routine_items (
    id TEXT PRIMARY KEY,
    routineId TEXT NOT NULL,
    title TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY (routineId) REFERENCES routines(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  );
`)

const insertTask = db.prepare(`INSERT INTO tasks (id, title, date, startTime, endTime, completed, unscheduled, energy, repeat, createdAt) VALUES (@id, @title, @date, @startTime, @endTime, @completed, @unscheduled, @energy, @repeat, @createdAt)`)
const updateTask = db.prepare(`UPDATE tasks SET title=@title, startTime=@startTime, endTime=@endTime, completed=@completed, unscheduled=@unscheduled, expanded=@expanded, energy=@energy, repeat=@repeat WHERE id=@id`)
const deleteTask = db.prepare(`DELETE FROM tasks WHERE id=?`)
const getTasks = db.prepare(`SELECT * FROM tasks ORDER BY date, startTime`)
const getTask = db.prepare(`SELECT * FROM tasks WHERE id=?`)

const insertSubtask = db.prepare(`INSERT INTO subtasks (id, taskId, title, completed) VALUES (@id, @taskId, @title, @completed)`)
const updateSubtask = db.prepare(`UPDATE subtasks SET completed=@completed WHERE id=@id`)
const deleteSubtask = db.prepare(`DELETE FROM subtasks WHERE id=?`)
const getSubtasks = db.prepare(`SELECT * FROM subtasks WHERE taskId=?`)

const insertInbox = db.prepare(`INSERT INTO inbox (id, title, createdAt) VALUES (@id, @title, @createdAt)`)
const deleteInbox = db.prepare(`DELETE FROM inbox WHERE id=?`)
const getInbox = db.prepare(`SELECT * FROM inbox ORDER BY createdAt`)

const insertSomeday = db.prepare(`INSERT INTO someday (id, title, createdAt) VALUES (@id, @title, @createdAt)`)
const deleteSomeday = db.prepare(`DELETE FROM someday WHERE id=?`)
const getSomeday = db.prepare(`SELECT * FROM someday ORDER BY createdAt`)

const insertRoutine = db.prepare(`INSERT INTO routines (id, title, type, createdAt) VALUES (@id, @title, @type, @createdAt)`)
const deleteRoutine = db.prepare(`DELETE FROM routines WHERE id=?`)
const getRoutines = db.prepare(`SELECT * FROM routines ORDER BY createdAt`)
const insertRoutineItem = db.prepare(`INSERT INTO routine_items (id, routineId, title, completed) VALUES (@id, @routineId, @title, @completed)`)
const updateRoutineItem = db.prepare(`UPDATE routine_items SET completed=@completed WHERE id=@id`)
const deleteRoutineItem = db.prepare(`DELETE FROM routine_items WHERE id=?`)
const getRoutineItems = db.prepare(`SELECT * FROM routine_items WHERE routineId=?`)

const clearTasks = db.prepare(`DELETE FROM tasks`)
const clearInbox = db.prepare(`DELETE FROM inbox`)
const clearSomeday = db.prepare(`DELETE FROM someday`)
const clearRoutines = db.prepare(`DELETE FROM routines`)

const insertUser = db.prepare(`INSERT INTO users (id, username, password, createdAt) VALUES (@id, @username, @password, @createdAt)`)
const getUserByUsername = db.prepare(`SELECT * FROM users WHERE username=?`)
const getUserById = db.prepare(`SELECT * FROM users WHERE id=?`)

const getSetting = db.prepare(`SELECT value FROM settings WHERE key=?`)
const setSetting = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`)

function rowToTask(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    completed: !!row.completed,
    unscheduled: !!row.unscheduled,
    expanded: !!row.expanded,
    energy: row.energy,
    repeat: row.repeat,
    createdAt: row.createdAt
  }
}

function rowToSubtask(row) {
  return row ? { id: row.id, taskId: row.taskId, title: row.title, completed: !!row.completed } : null
}

export function getAllTasks() {
  const rows = getTasks.all()
  return rows.map(row => {
    const task = rowToTask(row)
    task.subtasks = getSubtasks.all(row.id).map(rowToSubtask)
    return task
  })
}

export function createTask({ id, title, date, startTime = '', endTime = '', energy = null, repeat = null }) {
  const taskId = id || randomUUID()
  const unscheduled = !startTime ? 1 : 0
  const createdAt = Date.now()
  insertTask.run({ id: taskId, title, date: date || new Date().toISOString().split('T')[0], startTime, endTime, completed: 0, unscheduled, energy, repeat, createdAt })
  return { ...getTask.get(taskId), subtasks: [] }
}

export function updateTaskById(id, fields) {
  const existing = getTask.get(id)
  if (!existing) return null
  const completed = fields.completed !== undefined ? (fields.completed ? 1 : 0) : existing.completed
  const expanded = fields.expanded !== undefined ? (fields.expanded ? 1 : 0) : existing.expanded
  const unscheduled = fields.startTime !== undefined ? (!fields.startTime ? 1 : 0) : existing.unscheduled
  updateTask.run({
    id,
    title: fields.title ?? existing.title,
    startTime: fields.startTime ?? existing.startTime,
    endTime: fields.endTime ?? existing.endTime,
    completed,
    unscheduled,
    expanded,
    energy: fields.energy !== undefined ? fields.energy : existing.energy,
    repeat: fields.repeat !== undefined ? fields.repeat : existing.repeat
  })
  const updated = getTask.get(id)
  const subtasks = getSubtasks.all(id).map(rowToSubtask)
  return { ...updated, subtasks, completed: !!updated.completed, unscheduled: !!updated.unscheduled, expanded: !!updated.expanded }
}

export function deleteTaskById(id) {
  deleteTask.run(id)
  return { success: true }
}

export function toggleTaskCompletion(id) {
  const t = getTask.get(id)
  if (!t) return null
  const newVal = t.completed ? 0 : 1
  updateTask.run({ ...t, completed: newVal })
  return { ...getTask.get(id), completed: !!newVal }
}

export function toggleTaskExpand(id) {
  const t = getTask.get(id)
  if (!t) return null
  const newVal = t.expanded ? 0 : 1
  updateTask.run({ ...t, expanded: newVal })
  return { ...getTask.get(id), expanded: !!newVal }
}

export function addSubtask(taskId, title, id) {
  const subtaskId = id || randomUUID()
  insertSubtask.run({ id: subtaskId, taskId, title, completed: 0 })
  return { id: subtaskId, taskId, title, completed: false }
}

export function toggleSubtask(id) {
  const s = db.prepare(`SELECT * FROM subtasks WHERE id=?`).get(id)
  if (!s) return null
  const newVal = s.completed ? 0 : 1
  updateSubtask.run({ id, completed: newVal })
  return { ...s, completed: !!newVal }
}

export function deleteSubtaskById(id) {
  deleteSubtask.run(id)
  return { success: true }
}

export function getInboxItems() {
  return getInbox.all()
}

export function addInboxItem(title, id) {
  const itemId = id || randomUUID()
  insertInbox.run({ id: itemId, title, createdAt: Date.now() })
  return { id: itemId, title, createdAt: Date.now() }
}

export function deleteInboxItem(id) {
  deleteInbox.run(id)
  return { success: true }
}

export function getSomedayItems() {
  return getSomeday.all()
}

export function addSomedayItem(title, id) {
  const itemId = id || randomUUID()
  insertSomeday.run({ id: itemId, title, createdAt: Date.now() })
  return { id: itemId, title, createdAt: Date.now() }
}

export function deleteSomedayItem(id) {
  deleteSomeday.run(id)
  return { success: true }
}

export function getRoutinesWithItems() {
  const routines = getRoutines.all()
  return routines.map(r => ({
    ...r,
    items: getRoutineItems.all(r.id).map(i => ({ ...i, completed: !!i.completed }))
  }))
}

export function createRoutine(title, type, id) {
  const routineId = id || randomUUID()
  insertRoutine.run({ id: routineId, title, type, createdAt: Date.now() })
  return { id: routineId, title, type, createdAt: Date.now(), items: [] }
}

export function deleteRoutineById(id) {
  deleteRoutine.run(id)
  return { success: true }
}

export function addRoutineItem(routineId, title, id) {
  const itemId = id || randomUUID()
  insertRoutineItem.run({ id: itemId, routineId, title, completed: 0 })
  return { id: itemId, routineId, title, completed: false }
}

export function toggleRoutineItem(id) {
  const s = db.prepare(`SELECT * FROM routine_items WHERE id=?`).get(id)
  if (!s) return null
  const newVal = s.completed ? 0 : 1
  updateRoutineItem.run({ id, completed: newVal })
  return { ...s, completed: !!newVal }
}

export function deleteRoutineItemById(id) {
  deleteRoutineItem.run(id)
  return { success: true }
}

export function getPoints() {
  const row = getSetting.get('points')
  return { points: parseInt(row?.value) || 0 }
}

export function setPoints(value) {
  setSetting.run('points', String(value))
  return { points: value }
}

export function clearAllTasks() { clearTasks.run(); return { success: true } }
export function clearAllInbox() { clearInbox.run(); return { success: true } }
export function clearAllSomeday() { clearSomeday.run(); return { success: true } }
export function clearAllRoutines() { clearRoutines.run(); return { success: true } }

export function createUser(username, hashedPassword) {
  const id = randomUUID()
  insertUser.run({ id, username, password: hashedPassword, createdAt: Date.now() })
  return { id, username, createdAt: Date.now() }
}

export function findUserByUsername(username) {
  return getUserByUsername.get(username) || null
}

export function findUserById(id) {
  return getUserById.get(id) || null
}
