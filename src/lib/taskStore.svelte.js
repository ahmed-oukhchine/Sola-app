import Dexie from 'dexie'

const db = new Dexie('FocusApp')
db.version(1).stores({
  data: 'key'
})

export const store = $state({ tasks: [] })
export const inbox = $state({ items: [] })
export const someday = $state({ items: [] })
export const routines = $state({ items: [] })
export const lifeCourses = $state({ items: [] })
export const tags = $state({ items: [] })
export const habits = $state({ items: [] })
export const habitLogs = $state({ items: [] })
export const focusSessions = $state({ items: [] })
export const notes = $state({ items: [] })
export const templates = $state({ items: [] })
export const goals = $state({ items: [] })

let _points = 0

const DATA_SOURCES = {
  tasks: () => store.tasks,
  inbox: () => inbox.items,
  someday: () => someday.items,
  routines: () => routines.items,
  lifeCourses: () => lifeCourses.items,
  tags: () => tags.items,
  habits: () => habits.items,
  habitLogs: () => habitLogs.items,
  focusSessions: () => focusSessions.items,
  notes: () => notes.items,
  templates: () => templates.items,
  goals: () => goals.items
}

const KEYS = {
  tasks: 'focus-tasks',
  inbox: 'focus-inbox',
  someday: 'focus-someday',
  routines: 'focus-routines',
  lifeCourses: 'focus-life-courses',
  points: 'focus-points',
  tags: 'focus-tags',
  habits: 'focus-habits',
  habitLogs: 'focus-habit-logs',
  focusSessions: 'focus-focus-sessions',
  notes: 'focus-notes',
  templates: 'focus-templates',
  goals: 'focus-goals'
}

function setSource(key, data) {
  if (key === 'tasks') { store.tasks = data; return }
  const obj = { inbox, someday, routines, lifeCourses, tags, habits, habitLogs, focusSessions, notes, templates, goals }[key]
  if (obj) obj.items = data?.items || []
}

async function persist() {
  const records = []
  for (const [key] of Object.entries(KEYS)) {
    if (key === 'points') continue
    const fn = DATA_SOURCES[key]
    records.push({ key, value: fn ? fn() : [] })
  }
  records.push({ key: 'points', value: _points })
  try { await db.data.bulkPut(records) } catch {}
}

export async function loadAll() {
  try {
    const records = await db.data.toArray()
    for (const { key, value } of records) {
      if (key === 'points') { _points = value; continue }
      if (key === 'tasks') { store.tasks = value; continue }
      setSource(key, { items: value })
    }
  } catch {}
  scheduleAll()
  generateRecurringTasks()
}

// --- Tasks ---

export function addTask(title, startTime = '', endTime = '', energy = null, repeat = null, priority = null, date = null, tagsList = [], estimatedMinutes = null) {
  if (!date && !startTime) {
    const parsed = parseTaskFromString(title)
    if (parsed.date || parsed.startTime) {
      date = parsed.date
      startTime = parsed.startTime || ''
      title = parsed.title
    }
  }
  if (!estimatedMinutes && startTime && endTime) {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    estimatedMinutes = (eh * 60 + em) - (sh * 60 + sm)
  }
  const maxOrder = store.tasks.reduce((m, t) => Math.max(m, t.order || 0), 0)
  const task = {
    id: crypto.randomUUID(),
    title,
    date: date || new Date().toISOString().split('T')[0],
    startTime,
    endTime,
    completed: false,
    unscheduled: !startTime,
    subtasks: [],
    expanded: false,
    energy,
    repeat,
    priority,
    tags: tagsList,
    estimatedMinutes,
    order: maxOrder + 1,
    createdAt: Date.now()
  }
  store.tasks.push(task)
  scheduleNotifications(task)
  persist()
  return task
}

export function toggleTask(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) { t.completed = !t.completed; persist() }
}

export function updateTask(id, fields) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    if (fields.title !== undefined) t.title = fields.title
    if (fields.startTime !== undefined) t.startTime = fields.startTime
    if (fields.endTime !== undefined) t.endTime = fields.endTime
    if (fields.energy !== undefined) t.energy = fields.energy
    if (fields.priority !== undefined) t.priority = fields.priority
    if (fields.tags !== undefined) t.tags = fields.tags
    if (fields.date !== undefined) t.date = fields.date
    t.unscheduled = !t.startTime
    persist()
  }
}

export function removeTask(id) {
  store.tasks = store.tasks.filter(t => t.id !== id)
  persist()
}

export function toggleExpand(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) { t.expanded = !t.expanded; persist() }
}

export function addSubtask(taskId, title) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks.push({ id: crypto.randomUUID(), title, completed: false })
    persist()
  }
}

export function toggleSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    const s = t.subtasks.find(s => s.id === subtaskId)
    if (s) { s.completed = !s.completed; persist() }
  }
}

export function removeSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks = t.subtasks.filter(s => s.id !== subtaskId)
    persist()
  }
}

// --- Reorder ---

export function reorderTask(id, newOrder) {
  const t = store.tasks.find(t => t.id === id)
  if (t) { t.order = newOrder; persist() }
}

export function getTaskOrder(task) {
  return task.order || 0
}

// --- Full-text Search ---

export function searchAll(query) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase().trim()
  const results = []

  for (const t of store.tasks) {
    if (t.title.toLowerCase().includes(q)) {
      results.push({ type: 'task', id: t.id, title: t.title, subtitle: `${t.date}${t.completed ? ' ✓' : ''}` })
    } else {
      const match = t.subtasks.find(s => s.title.toLowerCase().includes(q))
      if (match) results.push({ type: 'task', id: t.id, title: match.title, subtitle: `subtask of "${t.title}"` })
    }
  }
  for (const i of inbox.items) {
    if (i.title.toLowerCase().includes(q)) results.push({ type: 'inbox', id: i.id, title: i.title, subtitle: 'Inbox' })
  }
  for (const s of someday.items) {
    if (s.title.toLowerCase().includes(q)) results.push({ type: 'someday', id: s.id, title: s.title, subtitle: 'Someday' })
  }
  for (const n of notes.items) {
    if (n.content && n.content.toLowerCase().includes(q)) {
      const preview = n.content.substring(0, 80)
      results.push({ type: 'note', id: n.id, title: `Note ${n.date}`, subtitle: preview })
    }
  }
  for (const g of goals.items) {
    if (g.title.toLowerCase().includes(q)) results.push({ type: 'goal', id: g.id, title: g.title, subtitle: 'Goal' })
  }
  for (const h of habits.items) {
    if (h.name.toLowerCase().includes(q)) results.push({ type: 'habit', id: h.id, title: h.name, subtitle: 'Habit' })
  }

  return results.slice(0, 30)
}

// --- Natural Language Date Parsing ---

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const SHORT = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

export function parseNaturalDate(text) {
  if (!text) return null
  const lower = text.toLowerCase()

  const dateMatch = lower.match(/\b(today|tonight)\b/)
  if (dateMatch) return new Date().toISOString().split('T')[0]

  const tomorrowMatch = lower.match(/\b(tomorrow)\b/)
  if (tomorrowMatch) {
    const d = new Date(); d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }

  const inMatch = lower.match(/\bin\s+(\d+)\s+(day|days|hour|hours)\b/)
  if (inMatch) {
    const n = parseInt(inMatch[1])
    const unit = inMatch[2]
    const d = new Date()
    if (unit.startsWith('day')) d.setDate(d.getDate() + n)
    else d.setHours(d.getHours() + n)
    return d.toISOString().split('T')[0]
  }

  const nextMatch = lower.match(/\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)\b/)
  if (nextMatch) {
    const day = nextMatch[1]
    if (day === 'week') {
      const d = new Date(); d.setDate(d.getDate() + (8 - d.getDay()))
      return d.toISOString().split('T')[0]
    }
    if (day === 'month') {
      const d = new Date(); d.setMonth(d.getMonth() + 1)
      return d.toISOString().split('T')[0]
    }
    const target = DAYS.indexOf(day)
    const d = new Date()
    const current = d.getDay()
    let diff = target - current
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  const dayMatch = lower.match(/\b(on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)
  if (dayMatch) {
    const target = DAYS.indexOf(dayMatch[2])
    const d = new Date()
    const current = d.getDay()
    let diff = target - current
    if (diff <= 0) diff += 7
    d.setDate(d.getDate() + diff)
    return d.toISOString().split('T')[0]
  }

  return null
}

export function extractTime(text) {
  const m = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)\b/i)
  if (m) {
    let h = parseInt(m[1])
    const min = parseInt(m[2]) || 0
    const suffix = m[3][0].toLowerCase()
    if (suffix === 'p' && h < 12) h += 12
    if (suffix === 'a' && h === 12) h = 0
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  return null
}

export function parseTaskFromString(text) {
  const date = parseNaturalDate(text)
  const time = extractTime(text)
  let title = text
  if (time) {
    title = title.replace(/\d{1,2}(?::\d{2})?\s*(am|pm|a\.m\.|p\.m\.)/i, '').trim()
  }
  const dateStr = date || new Date().toISOString().split('T')[0]
  return { title: title.replace(/\b(tomorrow|today|tonight|in\s+\d+\s+(day|days|hour|hours)|next\s+\w+)/gi, '').replace(/\s+/g, ' ').trim() || text, date: dateStr, startTime: time || '', endTime: '' }
}

// --- Inbox ---

export function addToInbox(title) {
  inbox.items.push({ id: crypto.randomUUID(), title, createdAt: Date.now() })
  persist()
}

export function removeFromInbox(id) {
  inbox.items = inbox.items.filter(i => i.id !== id)
  persist()
}

export function moveInboxToToday(id) {
  const item = inbox.items.find(i => i.id === id)
  if (item) {
    addTask(item.title, '', '', null, null, null, new Date().toISOString().split('T')[0], [])
    removeFromInbox(id)
  }
}

// --- Someday ---

export function addToSomeday(title) {
  someday.items.push({ id: crypto.randomUUID(), title, createdAt: Date.now() })
  persist()
}

export function removeFromSomeday(id) {
  someday.items = someday.items.filter(i => i.id !== id)
  persist()
}

export function moveSomedayToToday(id) {
  const item = someday.items.find(i => i.id === id)
  if (item) {
    addTask(item.title)
    removeFromSomeday(id)
  }
}

// --- Routines ---

export function addRoutine(title, type) {
  routines.items.push({ id: crypto.randomUUID(), title, type, items: [], createdAt: Date.now() })
  persist()
}

export function removeRoutine(id) {
  routines.items = routines.items.filter(r => r.id !== id)
  persist()
}

export function addRoutineItem(routineId, title) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    r.items.push({ id: crypto.randomUUID(), title, completed: false })
    persist()
  }
}

export function toggleRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    const item = r.items.find(i => i.id === itemId)
    if (item) { item.completed = !item.completed; persist() }
  }
}

export function removeRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    r.items = r.items.filter(i => i.id !== itemId)
    persist()
  }
}

// --- Life Courses ---

export function addLifeCourse(title, description = '') {
  lifeCourses.items.push({ id: crypto.randomUUID(), title, description, createdAt: Date.now() })
  persist()
}

export function updateLifeCourse(id, fields) {
  const item = lifeCourses.items.find(i => i.id === id)
  if (item) { Object.assign(item, fields); persist() }
}

export function removeLifeCourse(id) {
  lifeCourses.items = lifeCourses.items.filter(i => i.id !== id)
  persist()
}

// --- Tags ---

export function addTag(name, color = '#6b6b6b') {
  if (tags.items.some(t => t.name.toLowerCase() === name.toLowerCase())) return
  tags.items.push({ id: crypto.randomUUID(), name, color, createdAt: Date.now() })
  persist()
}

export function removeTag(id) {
  tags.items = tags.items.filter(t => t.id !== id)
  persist()
}

export function updateTagColor(id, color) {
  const t = tags.items.find(t => t.id === id)
  if (t) { t.color = color; persist() }
}

// --- Habits ---

export function addHabit(name) {
  if (habits.items.some(h => h.name.toLowerCase() === name.toLowerCase())) return
  habits.items.push({ id: crypto.randomUUID(), name, createdAt: Date.now() })
  persist()
}

export function removeHabit(id) {
  habits.items = habits.items.filter(h => h.id !== id)
  persist()
}

export function toggleHabitLog(habitId, date) {
  const existing = habitLogs.items.find(l => l.habitId === habitId && l.date === date)
  if (existing) {
    habitLogs.items = habitLogs.items.filter(l => l.id !== existing.id)
  } else {
    habitLogs.items.push({ id: crypto.randomUUID(), habitId, date, createdAt: Date.now() })
  }
  persist()
}

export function isHabitDone(habitId, date) {
  return habitLogs.items.some(l => l.habitId === habitId && l.date === date)
}

// --- Focus Sessions ---

export function logFocusSession(minutes, type = 'focus') {
  focusSessions.items.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString().split('T')[0],
    minutes,
    type,
    createdAt: Date.now()
  })
  persist()
}

// --- Notes ---

export function getNote(date) {
  return notes.items.find(n => n.date === date)
}

export function saveNote(date, content) {
  const existing = notes.items.find(n => n.date === date)
  if (existing) {
    existing.content = content
  } else {
    notes.items.push({ id: crypto.randomUUID(), date, content })
  }
  persist()
}

// --- Templates ---

export function addTemplate(data) {
  templates.items.push({ id: crypto.randomUUID(), ...data, createdAt: Date.now() })
  persist()
}

export function removeTemplate(id) {
  templates.items = templates.items.filter(t => t.id !== id)
  persist()
}

// --- Goals ---

export function addGoal(title, description = '', target = 0, period = 'weekly') {
  goals.items.push({
    id: crypto.randomUUID(),
    title,
    description,
    target,
    period,
    linkedTaskIds: [],
    createdAt: Date.now()
  })
  persist()
}

export function updateGoal(id, fields) {
  const g = goals.items.find(g => g.id === id)
  if (g) { Object.assign(g, fields); persist() }
}

export function removeGoal(id) {
  goals.items = goals.items.filter(g => g.id !== id)
  persist()
}

export function linkTaskToGoal(goalId, taskId) {
  const g = goals.items.find(g => g.id === goalId)
  if (g && !g.linkedTaskIds.includes(taskId)) {
    g.linkedTaskIds.push(taskId)
    persist()
  }
}

export function unlinkTaskFromGoal(goalId, taskId) {
  const g = goals.items.find(g => g.id === goalId)
  if (g) {
    g.linkedTaskIds = g.linkedTaskIds.filter(id => id !== taskId)
    persist()
  }
}

export function getGoalProgress(goal) {
  if (!goal.linkedTaskIds.length) return 0
  const linked = store.tasks.filter(t => goal.linkedTaskIds.includes(t.id))
  const completed = linked.filter(t => t.completed).length
  return goal.target > 0 ? Math.min(1, completed / goal.target) : linked.length ? completed / linked.length : 0
}

// --- Points ---

export function loadPoints() { return _points }

export function savePoints(p) {
  _points = p
  db.data.put({ key: 'points', value: p })
}

// --- Streak ---

export function computeStreak() {
  const dates = new Set()
  for (const t of store.tasks) {
    if (t.completed) dates.add(t.date)
  }
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 366; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (dates.has(key)) streak++
    else break
  }
  return streak
}

// --- Notifications ---

const scheduledTimeouts = new Map()

function scheduleNotifications(task) {
  const today = new Date().toISOString().split('T')[0]
  if (task.date !== today || task.completed || !task.startTime) return
  const now = Date.now()
  const [sh, sm] = task.startTime.split(':').map(Number)
  const [eh, em] = task.endTime ? task.endTime.split(':').map(Number) : [sh + 1, sm]
  const start = new Date(); start.setHours(sh, sm, 0, 0)
  const end = new Date(); end.setHours(eh, em, 0, 0)
  const sd = start.getTime() - now
  if (sd > 0) {
    scheduledTimeouts.set(task.id + '-s', setTimeout(() => notify(`Time to start: ${task.title}`), sd))
  }
  const ed = end.getTime() - now
  if (ed > 0) {
    scheduledTimeouts.set(task.id + '-e', setTimeout(() => notify(`Time's up: ${task.title}`), ed))
  }
}

function notify(msg) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Focus', { body: msg })
  }
}

export function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function scheduleAll() {
  for (const [, id] of scheduledTimeouts) { clearTimeout(id) }
  scheduledTimeouts.clear()
  for (const t of store.tasks) { scheduleNotifications(t) }
}

// --- Recurring Tasks ---

export function generateRecurringTasks() {
  const today = new Date().toISOString().split('T')[0]
  const dayOfWeek = new Date().getDay()
  const recurring = store.tasks.filter(t => t.repeat && !t.completed)
  for (const t of recurring) {
    const shouldCreate = t.repeat === 'daily' ||
      (t.repeat === 'weekday' && dayOfWeek > 0 && dayOfWeek < 6) ||
      (t.repeat === 'weekly' && new Date(t.date).getDay() === dayOfWeek)
    if (shouldCreate && !store.tasks.some(x => x.title === t.title && x.date === today)) {
      const task = { ...t, id: crypto.randomUUID(), date: today, completed: false, subtasks: [], expanded: false, createdAt: Date.now() }
      store.tasks.push(task)
      scheduleNotifications(task)
      persist()
    }
  }
}

// --- Export / Import ---

export async function exportData() {
  const records = await db.data.toArray()
  const data = {}
  for (const { key, value } of records) {
    data[key] = value
  }
  return JSON.stringify(data, null, 2)
}

export async function importData(json) {
  const d = JSON.parse(json)
  const records = []
  for (const [key, value] of Object.entries(d)) {
    records.push({ key, value })
  }
  await db.data.bulkPut(records)
  for (const { key, value } of records) {
    if (key === 'points') { _points = value; continue }
    if (key === 'tasks') { store.tasks = value; continue }
    setSource(key, { items: value })
  }
}
