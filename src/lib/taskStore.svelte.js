function loadFrom(key, fallback) {
  try {
    const d = localStorage.getItem(key)
    return d ? JSON.parse(d) : fallback
  } catch {
    return fallback
  }
}

function saveTo(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {}
}

// --- Tasks ---
const TASKS_KEY = 'focus-tasks'

export const store = $state({ tasks: loadFrom(TASKS_KEY, []) })

function saveTasks() {
  saveTo(TASKS_KEY, store.tasks)
}

export function addTask(title, startTime = '', endTime = '', energy = null) {
  const task = {
    id: crypto.randomUUID(),
    title,
    date: new Date().toISOString().split('T')[0],
    startTime,
    endTime,
    completed: false,
    unscheduled: !startTime,
    subtasks: [],
    expanded: false,
    energy,
    createdAt: Date.now()
  }
  store.tasks.push(task)
  saveTasks()
  scheduleNotifications(task)
  return task
}

export function toggleTask(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.completed = !t.completed
    saveTasks()
  }
}

export function updateEnergy(id, energy) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.energy = energy
    saveTasks()
  }
}

export function removeTask(id) {
  store.tasks = store.tasks.filter(t => t.id !== id)
  saveTasks()
}

export function toggleExpand(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.expanded = !t.expanded
    saveTasks()
  }
}

export function addSubtask(taskId, title) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks.push({ id: crypto.randomUUID(), title, completed: false })
    saveTasks()
  }
}

export function toggleSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    const s = t.subtasks.find(s => s.id === subtaskId)
    if (s) { s.completed = !s.completed; saveTasks() }
  }
}

export function removeSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks = t.subtasks.filter(s => s.id !== subtaskId)
    saveTasks()
  }
}

// --- Inbox ---
const INBOX_KEY = 'focus-inbox'
export const inbox = $state({ items: loadFrom(INBOX_KEY, []) })

export function addToInbox(title) {
  inbox.items.push({ id: crypto.randomUUID(), title, createdAt: Date.now() })
  saveTo(INBOX_KEY, inbox.items)
}

export function removeFromInbox(id) {
  inbox.items = inbox.items.filter(i => i.id !== id)
  saveTo(INBOX_KEY, inbox.items)
}

export function moveInboxToToday(id) {
  const item = inbox.items.find(i => i.id === id)
  if (item) {
    addTask(item.title)
    removeFromInbox(id)
  }
}

// --- Someday ---
const SOMEDAY_KEY = 'focus-someday'
export const someday = $state({ items: loadFrom(SOMEDAY_KEY, []) })

export function addToSomeday(title) {
  someday.items.push({ id: crypto.randomUUID(), title, createdAt: Date.now() })
  saveTo(SOMEDAY_KEY, someday.items)
}

export function removeFromSomeday(id) {
  someday.items = someday.items.filter(i => i.id !== id)
  saveTo(SOMEDAY_KEY, someday.items)
}

export function moveSomedayToToday(id) {
  const item = someday.items.find(i => i.id === id)
  if (item) {
    addTask(item.title)
    removeFromSomeday(id)
  }
}

// --- Routines ---
const ROUTINES_KEY = 'focus-routines'
export const routines = $state({ items: loadFrom(ROUTINES_KEY, []) })

export function addRoutine(title, type) {
  routines.items.push({
    id: crypto.randomUUID(),
    title,
    type,
    items: [
      { id: crypto.randomUUID(), title: '', completed: false }
    ],
    createdAt: Date.now()
  })
  saveTo(ROUTINES_KEY, routines.items)
}

export function removeRoutine(id) {
  routines.items = routines.items.filter(r => r.id !== id)
  saveTo(ROUTINES_KEY, routines.items)
}

export function addRoutineItem(routineId, title) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    r.items.push({ id: crypto.randomUUID(), title, completed: false })
    saveTo(ROUTINES_KEY, routines.items)
  }
}

export function toggleRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    const item = r.items.find(i => i.id === itemId)
    if (item) {
      item.completed = !item.completed
      saveTo(ROUTINES_KEY, routines.items)
    }
  }
}

export function removeRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    r.items = r.items.filter(i => i.id !== itemId)
    saveTo(ROUTINES_KEY, routines.items)
  }
}

// --- Points ---
const POINTS_KEY = 'focus-points'
export function loadPoints() { return parseInt(loadFrom(POINTS_KEY, '0')) || 0 }
export function savePoints(p) { saveTo(POINTS_KEY, String(p)) }

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
  for (const [key, id] of scheduledTimeouts) { clearTimeout(id) }
  scheduledTimeouts.clear()
  for (const t of store.tasks) { scheduleNotifications(t) }
}
