const BASE = '/api'

export const store = $state({ tasks: [] })
export const inbox = $state({ items: [] })
export const someday = $state({ items: [] })
export const routines = $state({ items: [] })
export const lifeCourses = $state({ items: [] })
export const auth = $state({ user: null, token: null, loading: true })

let _points = 0

function getToken() {
  return auth.token || localStorage.getItem('focus-token')
}

function setToken(token) {
  auth.token = token
  if (token) localStorage.setItem('focus-token', token)
  else localStorage.removeItem('focus-token')
}

function api(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(`${BASE}${path}`, { headers, ...options }).then(async r => {
    if (r.status === 401) {
      setToken(null)
      auth.user = null
      throw new Error('Unauthorized')
    }
    const text = await r.text()
    if (!text) throw new Error(`Empty response from ${path} — is the API server running?`)
    try { return JSON.parse(text) } catch {
      throw new Error(`Invalid JSON from ${path}: ${text.slice(0, 100)}`)
    }
  })
}

// --- Auth ---

export async function checkAuth() {
  const token = localStorage.getItem('focus-token')
  if (!token) { auth.loading = false; return }
  try {
    const user = await api('/me')
    if (user && user.id) {
      auth.user = user
      setToken(token)
    } else {
      setToken(null)
    }
  } catch { setToken(null) }
  auth.loading = false
}

export async function login(username, password) {
  const res = await api('/login', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (res.error) throw new Error(res.error)
  setToken(res.token)
  auth.user = res.user
  return res.user
}

export async function register(username, password) {
  const res = await api('/register', { method: 'POST', body: JSON.stringify({ username, password }) })
  if (res.error) throw new Error(res.error)
  setToken(res.token)
  auth.user = res.user
  return res.user
}

export function logout() {
  setToken(null)
  auth.user = null
  store.tasks = []
  inbox.items = []
  someday.items = []
  routines.items = []
  lifeCourses.items = []
  _points = 0
}

export async function loadAll() {
  try {
    const [tasks, inboxItems, somedayItems, routinesItems, courses, points] = await Promise.all([
      api('/tasks'),
      api('/inbox'),
      api('/someday'),
      api('/routines'),
      api('/life-courses'),
      api('/points')
    ])
    store.tasks = tasks
    inbox.items = inboxItems
    someday.items = somedayItems
    routines.items = routinesItems
    lifeCourses.items = courses
    _points = points.points
    scheduleAll()
    generateRecurringTasks()
  } catch (e) {
    if (e.message !== 'Unauthorized') console.error('Failed to load data', e)
  }
}

// --- Tasks ---

export function addTask(title, startTime = '', endTime = '', energy = null, repeat = null) {
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
    repeat,
    createdAt: Date.now()
  }
  store.tasks.push(task)
  scheduleNotifications(task)
  api('/tasks', { method: 'POST', body: JSON.stringify(task) }).catch(() => {})
  return task
}

export function toggleTask(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.completed = !t.completed
    api(`/tasks/${id}/toggle`, { method: 'PUT' }).catch(() => {})
  }
}

export function updateTask(id, fields) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    if (fields.title !== undefined) t.title = fields.title
    if (fields.startTime !== undefined) t.startTime = fields.startTime
    if (fields.endTime !== undefined) t.endTime = fields.endTime
    if (fields.energy !== undefined) t.energy = fields.energy
    t.unscheduled = !t.startTime
    api(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(fields) }).catch(() => {})
  }
}

export function updateEnergy(id, energy) {
  updateTask(id, { energy })
}

export function removeTask(id) {
  store.tasks = store.tasks.filter(t => t.id !== id)
  api(`/tasks/${id}`, { method: 'DELETE' }).catch(() => {})
}

export function toggleExpand(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.expanded = !t.expanded
    api(`/tasks/${id}/expand`, { method: 'PUT' }).catch(() => {})
  }
}

export function addSubtask(taskId, title) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    const subtask = { id: crypto.randomUUID(), title, completed: false }
    t.subtasks.push(subtask)
    api(`/tasks/${taskId}/subtasks`, { method: 'POST', body: JSON.stringify({ title, id: subtask.id }) }).catch(() => {})
  }
}

export function toggleSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    const s = t.subtasks.find(s => s.id === subtaskId)
    if (s) {
      s.completed = !s.completed
      api(`/subtasks/${subtaskId}/toggle`, { method: 'PUT' }).catch(() => {})
    }
  }
}

export function removeSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks = t.subtasks.filter(s => s.id !== subtaskId)
    api(`/subtasks/${subtaskId}`, { method: 'DELETE' }).catch(() => {})
  }
}

// --- Inbox ---

export function addToInbox(title) {
  const item = { id: crypto.randomUUID(), title, createdAt: Date.now() }
  inbox.items.push(item)
  api('/inbox', { method: 'POST', body: JSON.stringify({ title, id: item.id }) }).catch(() => {})
}

export function removeFromInbox(id) {
  inbox.items = inbox.items.filter(i => i.id !== id)
  api(`/inbox/${id}`, { method: 'DELETE' }).catch(() => {})
}

export function moveInboxToToday(id) {
  const item = inbox.items.find(i => i.id === id)
  if (item) {
    addTask(item.title)
    removeFromInbox(id)
  }
}

// --- Someday ---

export function addToSomeday(title) {
  const item = { id: crypto.randomUUID(), title, createdAt: Date.now() }
  someday.items.push(item)
  api('/someday', { method: 'POST', body: JSON.stringify({ title, id: item.id }) }).catch(() => {})
}

export function removeFromSomeday(id) {
  someday.items = someday.items.filter(i => i.id !== id)
  api(`/someday/${id}`, { method: 'DELETE' }).catch(() => {})
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
  const routine = {
    id: crypto.randomUUID(),
    title,
    type,
    items: [{ id: crypto.randomUUID(), title: '', completed: false }],
    createdAt: Date.now()
  }
  routines.items.push(routine)
  api('/routines', { method: 'POST', body: JSON.stringify({ title, type, id: routine.id }) }).catch(() => {})
}

export function removeRoutine(id) {
  routines.items = routines.items.filter(r => r.id !== id)
  api(`/routines/${id}`, { method: 'DELETE' }).catch(() => {})
}

export function addRoutineItem(routineId, title) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    const item = { id: crypto.randomUUID(), title, completed: false }
    r.items.push(item)
    api(`/routines/${routineId}/items`, { method: 'POST', body: JSON.stringify({ title, id: item.id }) }).catch(() => {})
  }
}

export function toggleRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    const item = r.items.find(i => i.id === itemId)
    if (item) {
      item.completed = !item.completed
      api(`/routine-items/${itemId}/toggle`, { method: 'PUT' }).catch(() => {})
    }
  }
}

export function removeRoutineItem(routineId, itemId) {
  const r = routines.items.find(r => r.id === routineId)
  if (r) {
    r.items = r.items.filter(i => i.id !== itemId)
    api(`/routine-items/${itemId}`, { method: 'DELETE' }).catch(() => {})
  }
}

// --- Life Courses ---

export function addLifeCourse(title) {
  const item = { id: crypto.randomUUID(), title, createdAt: Date.now() }
  lifeCourses.items.push(item)
  api('/life-courses', { method: 'POST', body: JSON.stringify({ title, id: item.id }) }).catch(() => {})
}

export function removeLifeCourse(id) {
  lifeCourses.items = lifeCourses.items.filter(i => i.id !== id)
  api(`/life-courses/${id}`, { method: 'DELETE' }).catch(() => {})
}

// --- Points ---

export function loadPoints() { return _points }

export function savePoints(p) {
  _points = p
  api('/points', { method: 'PUT', body: JSON.stringify({ points: p }) }).catch(() => {})
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
      api('/tasks', { method: 'POST', body: JSON.stringify(task) }).catch(() => {})
    }
  }
}

// --- Export / Import ---

export function exportData() {
  return api('/tasks').then(tasks => {
    return api('/inbox').then(inboxItems => {
      return api('/someday').then(somedayItems => {
        return api('/routines').then(routinesItems => {
          return api('/life-courses').then(courses => {
            return api('/points').then(p => {
              return JSON.stringify({
                tasks, inbox: inboxItems, someday: somedayItems, routines: routinesItems, lifeCourses: courses, points: p.points
              }, null, 2)
            })
          })
        })
      })
    })
  })
}

export async function importData(json) {
  const d = JSON.parse(json)
  await Promise.all([
    api('/tasks', { method: 'DELETE' }),
    api('/inbox', { method: 'DELETE' }),
    api('/someday', { method: 'DELETE' }),
    api('/routines', { method: 'DELETE' }),
    api('/life-courses', { method: 'DELETE' })
  ])
  const promises = []
  if (d.tasks) {
    store.tasks = d.tasks
    for (const t of d.tasks) {
      promises.push(api('/tasks', { method: 'POST', body: JSON.stringify(t) }).then(created => {
        if (t.subtasks) {
          for (const s of t.subtasks) {
            promises.push(api(`/tasks/${created.id}/subtasks`, { method: 'POST', body: JSON.stringify(s) }))
          }
        }
      }))
    }
  }
  if (d.inbox) {
    inbox.items = d.inbox
    for (const i of d.inbox) promises.push(api('/inbox', { method: 'POST', body: JSON.stringify(i) }))
  }
  if (d.someday) {
    someday.items = d.someday
    for (const i of d.someday) promises.push(api('/someday', { method: 'POST', body: JSON.stringify(i) }))
  }
  if (d.routines) {
    routines.items = d.routines
    for (const r of d.routines) {
      promises.push(api('/routines', { method: 'POST', body: JSON.stringify({ title: r.title, type: r.type, id: r.id }) }).then(created => {
        if (r.items) {
          for (const item of r.items) {
            promises.push(api(`/routines/${created.id}/items`, { method: 'POST', body: JSON.stringify(item) }))
          }
        }
      }))
    }
  }
  if (d.lifeCourses) {
    lifeCourses.items = d.lifeCourses
    for (const c of d.lifeCourses) promises.push(api('/life-courses', { method: 'POST', body: JSON.stringify(c) }))
  }
  if (d.points != null) savePoints(d.points)
  await Promise.all(promises)
}
