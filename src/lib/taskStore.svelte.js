const STORAGE_KEY = 'focus-tasks'

function load() {
  try {
    const d = localStorage.getItem(STORAGE_KEY)
    return d ? JSON.parse(d) : []
  } catch {
    return []
  }
}

function save(t) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
  } catch {}
}

export const store = $state({ tasks: load() })

const POINTS_KEY = 'focus-points'

export function loadPoints() {
  try {
    return parseInt(localStorage.getItem(POINTS_KEY)) || 0
  } catch {
    return 0
  }
}

export function savePoints(p) {
  try {
    localStorage.setItem(POINTS_KEY, String(p))
  } catch {}
}

export function addTask(title, startTime = '', endTime = '') {
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
    createdAt: Date.now()
  }
  store.tasks.push(task)
  save(store.tasks)
  scheduleNotifications(task)
  return task
}

export function toggleTask(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.completed = !t.completed
    save(store.tasks)
  }
}

export function removeTask(id) {
  store.tasks = store.tasks.filter(t => t.id !== id)
  save(store.tasks)
}

export function toggleExpand(id) {
  const t = store.tasks.find(t => t.id === id)
  if (t) {
    t.expanded = !t.expanded
    save(store.tasks)
  }
}

export function addSubtask(taskId, title) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks.push({
      id: crypto.randomUUID(),
      title,
      completed: false
    })
    save(store.tasks)
  }
}

export function toggleSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    const s = t.subtasks.find(s => s.id === subtaskId)
    if (s) {
      s.completed = !s.completed
      save(store.tasks)
    }
  }
}

export function removeSubtask(taskId, subtaskId) {
  const t = store.tasks.find(t => t.id === taskId)
  if (t) {
    t.subtasks = t.subtasks.filter(s => s.id !== subtaskId)
    save(store.tasks)
  }
}

const scheduledTimeouts = new Map()

function scheduleNotifications(task) {
  const today = new Date().toISOString().split('T')[0]
  if (task.date !== today || task.completed) return

  const now = Date.now()
  const [sh, sm] = task.startTime.split(':').map(Number)
  const [eh, em] = task.endTime.split(':').map(Number)

  const start = new Date()
  start.setHours(sh, sm, 0, 0)
  const end = new Date()
  end.setHours(eh, em, 0, 0)

  const startDelay = start.getTime() - now
  if (startDelay > 0) {
    const id = setTimeout(() => {
      notify(`Time to start: ${task.title}`)
    }, startDelay)
    scheduledTimeouts.set(task.id + '-start', id)
  }

  const endDelay = end.getTime() - now
  if (endDelay > 0) {
    const id = setTimeout(() => {
      notify(`Time's up: ${task.title}`)
    }, endDelay)
    scheduledTimeouts.set(task.id + '-end', id)
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
  for (const [key, id] of scheduledTimeouts) {
    clearTimeout(id)
  }
  scheduledTimeouts.clear()
  for (const t of store.tasks) {
    scheduleNotifications(t)
  }
}
