import { Router } from 'express'
import db from '../db.js'
import { authMiddleware } from '../auth.js'

const router = Router()
router.use(authMiddleware)

function tasks(userId) {
  return db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at').all(userId).map(t => ({
    id: t.id, title: t.title, date: t.date,
    startTime: t.start_time, endTime: t.end_time,
    completed: !!t.completed, unscheduled: !!t.unscheduled,
    expanded: !!t.expanded, energy: t.energy, repeat: t.repeat,
    priority: t.priority, tags: JSON.parse(t.tags || '[]'),
    subtasks: JSON.parse(t.subtasks || '[]'),
    createdAt: t.created_at
  }))
}

function inboxItems(userId) {
  return db.prepare('SELECT * FROM inbox_items WHERE user_id = ? ORDER BY created_at').all(userId)
}

function somedayItems(userId) {
  return db.prepare('SELECT * FROM someday_items WHERE user_id = ? ORDER BY created_at').all(userId)
}

function routinesList(userId) {
  return db.prepare('SELECT * FROM routines WHERE user_id = ? ORDER BY created_at').all(userId).map(r => ({
    ...r, items: JSON.parse(r.items || '[]')
  }))
}

function lifeCoursesList(userId) {
  return db.prepare('SELECT * FROM life_courses WHERE user_id = ? ORDER BY created_at').all(userId)
}

function tagsList(userId) {
  return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY created_at').all(userId)
}

function habitsList(userId) {
  return db.prepare('SELECT * FROM habits WHERE user_id = ? ORDER BY created_at').all(userId)
}

function habitLogsList(userId) {
  return db.prepare('SELECT * FROM habit_logs WHERE user_id = ? ORDER BY created_at').all(userId)
}

function focusSessionsList(userId) {
  return db.prepare('SELECT * FROM focus_sessions WHERE user_id = ? ORDER BY created_at').all(userId)
}

function notesList(userId) {
  return db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY created_at').all(userId)
}

function templatesList(userId) {
  return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at').all(userId)
}

function goalsList(userId) {
  return db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at').all(userId).map(g => ({
    ...g, linkedTaskIds: JSON.parse(g.linked_task_ids || '[]')
  }))
}

router.get('/', (req, res) => {
  const user = db.prepare('SELECT points FROM users WHERE id = ?').get(req.userId)
  res.json({
    points: user?.points || 0,
    tasks: tasks(req.userId),
    inbox: { items: inboxItems(req.userId) },
    someday: { items: somedayItems(req.userId) },
    routines: { items: routinesList(req.userId) },
    lifeCourses: { items: lifeCoursesList(req.userId) },
    tags: { items: tagsList(req.userId) },
    habits: { items: habitsList(req.userId) },
    habitLogs: { items: habitLogsList(req.userId) },
    focusSessions: { items: focusSessionsList(req.userId) },
    notes: { items: notesList(req.userId) },
    templates: { items: templatesList(req.userId) },
    goals: { items: goalsList(req.userId) }
  })
})

router.put('/', (req, res) => {
  const data = req.body
  const ops = db.transaction(() => {
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM inbox_items WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM someday_items WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM routines WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM life_courses WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM tags WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM habit_logs WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM focus_sessions WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM notes WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM templates WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(req.userId)

    if (data.tasks) {
      const ins = db.prepare(`INSERT INTO tasks (id, user_id, title, date, start_time, end_time, completed, unscheduled, expanded, energy, repeat, priority, tags, subtasks, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      for (const t of data.tasks) {
        ins.run(t.id, req.userId, t.title, t.date, t.startTime || '', t.endTime || '', t.completed ? 1 : 0, t.unscheduled ? 1 : 0, t.expanded ? 1 : 0, t.energy || null, t.repeat || null, t.priority || null, JSON.stringify(t.tags || []), JSON.stringify(t.subtasks || []), t.createdAt)
      }
    }
    if (data.inbox?.items) {
      const ins = db.prepare('INSERT INTO inbox_items (id, user_id, title, created_at) VALUES (?, ?, ?, ?)')
      for (const item of data.inbox.items) ins.run(item.id, req.userId, item.title, item.createdAt)
    }
    if (data.someday?.items) {
      const ins = db.prepare('INSERT INTO someday_items (id, user_id, title, created_at) VALUES (?, ?, ?, ?)')
      for (const item of data.someday.items) ins.run(item.id, req.userId, item.title, item.createdAt)
    }
    if (data.routines?.items) {
      const ins = db.prepare('INSERT INTO routines (id, user_id, title, type, items, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const r of data.routines.items) ins.run(r.id, req.userId, r.title, r.type, JSON.stringify(r.items || []), r.createdAt)
    }
    if (data.lifeCourses?.items) {
      const ins = db.prepare('INSERT INTO life_courses (id, user_id, title, description, created_at) VALUES (?, ?, ?, ?, ?)')
      for (const item of data.lifeCourses.items) ins.run(item.id, req.userId, item.title, item.description || '', item.createdAt)
    }
    if (data.tags?.items) {
      const ins = db.prepare('INSERT INTO tags (id, user_id, name, color, created_at) VALUES (?, ?, ?, ?, ?)')
      for (const t of data.tags.items) ins.run(t.id, req.userId, t.name, t.color || '#6b6b6b', t.createdAt)
    }
    if (data.habits?.items) {
      const ins = db.prepare('INSERT INTO habits (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
      for (const h of data.habits.items) ins.run(h.id, req.userId, h.name, h.createdAt)
    }
    if (data.habitLogs?.items) {
      const ins = db.prepare('INSERT INTO habit_logs (id, user_id, habit_id, date, created_at) VALUES (?, ?, ?, ?, ?)')
      for (const l of data.habitLogs.items) ins.run(l.id, req.userId, l.habitId, l.date, l.createdAt)
    }
    if (data.focusSessions?.items) {
      const ins = db.prepare('INSERT INTO focus_sessions (id, user_id, date, minutes, type, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      for (const s of data.focusSessions.items) ins.run(s.id, req.userId, s.date, s.minutes, s.type || 'focus', s.createdAt)
    }
    if (data.notes?.items) {
      const ins = db.prepare('INSERT INTO notes (id, user_id, date, content, created_at) VALUES (?, ?, ?, ?, ?)')
      for (const n of data.notes.items) ins.run(n.id, req.userId, n.date, n.content || '', n.createdAt)
    }
    if (data.templates?.items) {
      const ins = db.prepare('INSERT INTO templates (id, user_id, data, created_at) VALUES (?, ?, ?, ?)')
      for (const t of data.templates.items) ins.run(t.id, req.userId, JSON.stringify(t), t.createdAt)
    }
    if (data.goals?.items) {
      const ins = db.prepare('INSERT INTO goals (id, user_id, title, description, target, period, linked_task_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      for (const g of data.goals.items) ins.run(g.id, req.userId, g.title, g.description || '', g.target || 0, g.period || 'weekly', JSON.stringify(g.linkedTaskIds || []), g.createdAt)
    }

    if (data.points !== undefined) {
      db.prepare('UPDATE users SET points = ? WHERE id = ?').run(data.points, req.userId)
    }
  })
  ops()
  res.json({ ok: true })
})

router.put('/points', (req, res) => {
  const { points } = req.body
  if (points === undefined) return res.status(400).json({ error: 'points required' })
  db.prepare('UPDATE users SET points = ? WHERE id = ?').run(points, req.userId)
  res.json({ ok: true })
})

router.delete('/', (req, res) => {
  const ops = db.transaction(() => {
    db.prepare('DELETE FROM tasks WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM inbox_items WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM someday_items WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM routines WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM life_courses WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM tags WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM habits WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM habit_logs WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM focus_sessions WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM notes WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM templates WHERE user_id = ?').run(req.userId)
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(req.userId)
    db.prepare('UPDATE users SET points = 0 WHERE id = ?').run(req.userId)
  })
  ops()
  res.json({ ok: true })
})

export default router
