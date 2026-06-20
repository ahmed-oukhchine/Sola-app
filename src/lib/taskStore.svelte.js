import * as chrono from 'chrono-node'

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

function persist() {
  for (const [key] of Object.entries(KEYS)) {
    if (key === 'points') continue
    const fn = DATA_SOURCES[key]
    try { localStorage.setItem(KEYS[key], JSON.stringify(fn ? fn() : [])) } catch {}
  }
  try { localStorage.setItem(KEYS.points, String(_points)) } catch {}
}

export function loadAll() {
  try {
    for (const [key, lsKey] of Object.entries(KEYS)) {
      const raw = localStorage.getItem(lsKey)
      if (!raw) continue
      if (key === 'points') { _points = Number(raw); continue }
      const value = JSON.parse(raw)
      if (key === 'tasks') { store.tasks = value; continue }
      setSource(key, { items: value })
    }
  } catch {}
  scheduleAll()
  generateRecurringTasks()
  rolloverIncompleteTasks()
}

// --- Tasks ---

export function addTask(title, startTime = '', endTime = '', energy = null, repeat = null, priority = null, date = null, tagsList = [], estimatedMinutes = null, subtasks = []) {
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
    subtasks: subtasks.map(s => ({ id: crypto.randomUUID(), title: s.title, completed: false })),
    expanded: false,
    energy,
    repeat,
    priority,
    tags: tagsList,
    estimatedMinutes,
    order: maxOrder + 1,
    highlight: false,
    rolloverCount: 0,
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

export function setHighlight(taskId, dateStr) {
  const todayTasks = store.tasks.filter(t => t.date === dateStr)
  for (const t of todayTasks) {
    t.highlight = t.id === taskId
  }
  persist()
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

// --- Fuzzy Search ---

function fuzzyScore(query, text) {
  const q = query.toLowerCase(), t = text.toLowerCase()
  let qi = 0, score = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 10 + (qi === 0 || ti === 0 ? 5 : 0)
      if (ti > 0 && t[ti - 1] === ' ') score += 5
      qi++
    }
  }
  if (qi < q.length) return 0
  if (t === q) return 999
  if (t.startsWith(q)) return 500 + score
  return score
}

export function searchAll(query) {
  if (!query || !query.trim()) return []
  const q = query.toLowerCase().trim()
  const scored = []

  for (const t of store.tasks) {
    let score = fuzzyScore(q, t.title)
    if (score) {
      scored.push({ score, type: 'task', id: t.id, title: t.title, subtitle: `${t.date}${t.completed ? ' +' : ''}` })
    } else {
      for (const s of t.subtasks) {
        const ss = fuzzyScore(q, s.title)
        if (ss) { scored.push({ score: ss - 1, type: 'task', id: t.id, title: s.title, subtitle: `subtask of "${t.title}"` }) }
      }
    }
  }
  for (const i of inbox.items) {
    const s = fuzzyScore(q, i.title)
    if (s) scored.push({ score: s - 2, type: 'inbox', id: i.id, title: i.title, subtitle: 'Inbox' })
  }
  for (const s of someday.items) {
    const sc = fuzzyScore(q, s.title)
    if (sc) scored.push({ score: sc - 3, type: 'someday', id: s.id, title: s.title, subtitle: 'Someday' })
  }
  for (const n of notes.items) {
    if (n.content) {
      const sc = fuzzyScore(q, n.content)
      if (sc) scored.push({ score: sc - 4, type: 'note', id: n.id, title: `Note ${n.date}`, subtitle: n.content.substring(0, 80) })
    }
  }
  for (const g of goals.items) {
    const sc = fuzzyScore(q, g.title)
    if (sc) scored.push({ score: sc - 5, type: 'goal', id: g.id, title: g.title, subtitle: 'Goal' })
  }
  for (const h of habits.items) {
    const sc = fuzzyScore(q, h.name)
    if (sc) scored.push({ score: sc - 6, type: 'habit', id: h.id, title: h.name, subtitle: 'Habit' })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 30)
}

// --- Natural Language Date Parsing (chrono-node) ---

export function parseNaturalDate(text) {
  if (!text) return null
  const r = chrono.parseDate(text, { instant: new Date(), forwardDate: true })
  if (r) return r.toISOString().split('T')[0]
  return null
}

export function parseTime(text) {
  if (!text) return null
  const r = chrono.parse(text, { instant: new Date(), forwardDate: true })
  for (const ref of r) {
    if (ref.start && ref.start.isCertain('hour')) {
      const d = ref.start.date()
      const h = d.getHours(), m = d.getMinutes()
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
  }
  return null
}

export function parseTaskFromString(text) {
  const r = chrono.parse(text, { instant: new Date(), forwardDate: true })
  let date = new Date().toISOString().split('T')[0]
  let time = ''
  let replaceRanges = []

  for (const ref of r) {
    const start = ref.start.date()
    if (ref.start.isCertain('day')) {
      date = start.toISOString().split('T')[0]
    }
    if (ref.start.isCertain('hour')) {
      const h = start.getHours(), m = start.getMinutes()
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }
    replaceRanges.push([ref.index, ref.index + ref.text.length])
  }

  let title = text
  for (const [from, to] of replaceRanges.reverse()) {
    title = title.slice(0, from) + title.slice(to)
  }
  title = title.replace(/\s+/g, ' ').trim() || text

  return { title, date, startTime: time, endTime: '' }
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
  habits.items.push({ id: crypto.randomUUID(), name, createdAt: Date.now(), targetDays: 41, timeTarget: 5, time: '' })
  persist()
}

export function removeHabit(id) {
  habits.items = habits.items.filter(h => h.id !== id)
  persist()
}

export function updateHabitTime(id, time) {
  const h = habits.items.find(h => h.id === id)
  if (h) { h.time = time; persist() }
}

export function toggleHabitLog(habitId, date) {
  const existing = habitLogs.items.find(l => l.habitId === habitId && l.date === date)
  if (existing) {
    habitLogs.items = habitLogs.items.filter(l => l.id !== existing.id)
  } else {
    habitLogs.items.push({ id: crypto.randomUUID(), habitId, date, createdAt: Date.now(), minutes: 0 })
  }
  persist()
}

export function isHabitDone(habitId, date) {
  return habitLogs.items.some(l => l.habitId === habitId && l.date === date)
}

export function logHabitMinutes(habitId, date, minutes) {
  let log = habitLogs.items.find(l => l.habitId === habitId && l.date === date)
  if (log) {
    log.minutes = (log.minutes || 0) + minutes
  } else {
    habitLogs.items.push({ id: crypto.randomUUID(), habitId, date, createdAt: Date.now(), minutes })
  }
  persist()
}

export function getHabitDayCount(habitId) {
  const logs = habitLogs.items.filter(l => l.habitId === habitId).map(l => l.date)
  const done = new Set(logs)
  const today = new Date()
  let streak = 0
  for (let i = 0; i < 366; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (done.has(key)) streak++
    else break
  }
  return streak
}

export function isHabitComplete(habitId) {
  const h = habits.items.find(h => h.id === habitId)
  if (!h) return false
  return getHabitDayCount(habitId) >= h.targetDays
}

export function getHabitWeekMinutes(habitId) {
  let total = 0
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    const log = habitLogs.items.find(l => l.habitId === habitId && l.date === key)
    if (log) total += log.minutes || 0
  }
  return total
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
  try { localStorage.setItem(KEYS.points, String(p)) } catch {}
}

export function getLevel(points) {
  return Math.max(1, Math.floor(Math.sqrt(points / 100)) + 1)
}

export function getXpForNextLevel(level) {
  return level <= 0 ? 0 : Math.pow(level, 2) * 100
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
  if (localStorage.getItem('focus-ntfy-enabled') !== 'true') return
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
  if (localStorage.getItem('focus-ntfy-enabled') !== 'true') return
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Sola', { body: msg })
  }
}

export function requestPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'default') Notification.requestPermission()
    else if (Notification.permission === 'denied') {
      console.warn('Notifications are blocked. Enable them in browser settings.')
    }
  }
}

export function scheduleAll() {
  for (const [, id] of scheduledTimeouts) { clearTimeout(id) }
  scheduledTimeouts.clear()
  for (const t of store.tasks) { scheduleNotifications(t) }
}

// --- Recurring Tasks ---

export function getTodayAvailableMinutes() {
  const shutdown = localStorage.getItem('focus-shutdown-time')
  if (!shutdown) return 600
  const [h, m] = shutdown.split(':').map(Number)
  const now = new Date()
  return Math.max(0, (h * 60 + m) - (now.getHours() * 60 + now.getMinutes()))
}

export function rolloverIncompleteTasks() {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const stale = store.tasks.filter(t => !t.completed && t.date !== today && t.date <= yesterday && !t.repeat)
  for (const t of stale) {
    t.date = today
    t.rolloverCount = (t.rolloverCount || 0) + 1
  }
  if (stale.length) persist()
  return stale
}

// --- Momentum Score ---

export function computeMomentum() {
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

  const todayTasks = store.tasks.filter(t => t.date === today)
  const completed = todayTasks.filter(t => t.completed).length
  const total = todayTasks.length
  const ratio = total > 0 ? completed / total : 0

  const yesterdayTasks = store.tasks.filter(t => t.date === yesterday)
  const yCompleted = yesterdayTasks.filter(t => t.completed).length
  const yTotal = yesterdayTasks.length
  const yRatio = yTotal > 0 ? yCompleted / yTotal : 0

  const priorityDone = todayTasks.some(t => t.highlight && t.completed) ? 1 : 0
  const recovery = (yRatio < 0.3 && ratio > 0.6) ? 1 : (yRatio < 0.3 ? 0.3 : 0.7)

  const score = Math.round((ratio * 40) + (priorityDone * 30) + (recovery * 30))
  return Math.min(100, Math.max(0, score))
}

export function getRolloverCount() {
  const today = new Date().toISOString().split('T')[0]
  return store.tasks.filter(t => t.date === today && t.rolloverCount > 0).length
}

export function getRecentAverageCompletion(days = 7) {
  let total = 0, count = 0
  for (let i = 1; i <= days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    const dayTasks = store.tasks.filter(t => t.date === d)
    if (dayTasks.length > 0) {
      total += dayTasks.filter(t => t.completed).length
      count++
    }
  }
  return count > 0 ? Math.round(total / count) : 0
}

export function generateWeeklyLetter() {
  const today = new Date()
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7)
  const weekKey = weekAgo.toISOString().split('T')[0]

  const weekTasks = store.tasks.filter(t => t.date >= weekKey)
  const completed = weekTasks.filter(t => t.completed)
  const total = weekTasks.length
  const rate = total > 0 ? Math.round(completed.length / total * 100) : 0

  const byDate = {}
  for (const t of completed) {
    byDate[t.date] = (byDate[t.date] || 0) + 1
  }
  let bestDay = '', bestCount = 0
  for (const [d, c] of Object.entries(byDate)) {
    if (c > bestCount) { bestCount = c; bestDay = d }
  }

  const bestLabel = bestDay ? new Date(bestDay).toLocaleDateString('en-US', { weekday: 'long' }) : '—'
  const focusMin = focusSessions.items.filter(s => s.date >= weekKey).reduce((sum, s) => sum + s.minutes, 0)
  const streak = computeStreak()
  const rollovers = store.tasks.filter(t => t.rolloverCount > 0 && t.date >= weekKey).length
  const momentum = computeMomentum()

  const parts = [`This week, you completed ${completed.length} of ${total} tasks (${rate}%).`]
  if (bestDay) parts.push(`Your most productive day was ${bestLabel} with ${bestCount} tasks done.`)
  if (focusMin > 0) parts.push(`You logged ${Math.round(focusMin / 60)}h ${focusMin % 60}m in focused work.`)
  if (streak > 0) parts.push(`Your streak is ${streak} day${streak > 1 ? 's' : ''}.`)
  if (rollovers > 0) parts.push(`${rollovers} task${rollovers > 1 ? 's' : ''} rolled over this week — consider scaling back your daily load.`)
  if (momentum < 30) parts.push(`This week was tough. Rest up — next week is a fresh start.`)
  else if (momentum > 70) parts.push(`Strong momentum heading into next week. Keep it up.`)

  const longestRollover = store.tasks.filter(t => t.rolloverCount > 1).sort((a, b) => (b.rolloverCount || 0) - (a.rolloverCount || 0))[0]
  if (longestRollover) {
    parts.push(`"${longestRollover.title}" has rolled over ${longestRollover.rolloverCount} times. Consider dropping or breaking it down.`)
  }

  return parts.join(' ')
}

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

export function exportData() {
  const data = {}
  for (const [key, lsKey] of Object.entries(KEYS)) {
    const raw = localStorage.getItem(lsKey)
    if (raw) data[key] = key === 'points' ? Number(raw) : JSON.parse(raw)
  }
  return JSON.stringify(data, null, 2)
}

export function importData(json) {
  const d = JSON.parse(json)
  for (const [key, value] of Object.entries(d)) {
    const lsKey = KEYS[key]
    if (!lsKey) continue
    localStorage.setItem(lsKey, key === 'points' ? String(value) : JSON.stringify(value))
    if (key === 'points') { _points = Number(value); continue }
    if (key === 'tasks') { store.tasks = value; continue }
    setSource(key, { items: value })
  }
}
