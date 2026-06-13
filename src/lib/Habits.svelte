<script>
  import { habits, addHabit, removeHabit, toggleHabitLog, isHabitDone, habitLogs } from './taskStore.svelte.js'

  let name = $state('')
  let todayStr = $derived(new Date().toISOString().split('T')[0])

  function handleAdd() {
    if (!name.trim()) return
    addHabit(name.trim())
    name = ''
  }

  function getStreak(habitId) {
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 366; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      if (isHabitDone(habitId, key)) streak++
      else break
    }
    return streak
  }

  function getWeekLogs(habitId) {
    const days = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      days.push({ date: key, done: isHabitDone(habitId, key), dayName: d.toLocaleDateString('en-US', { weekday: 'short' }) })
    }
    return days
  }

  function todayCheck(habitId) {
    toggleHabitLog(habitId, todayStr)
  }
</script>

<div class="view-content">
  <h2 class="view-title">Habits</h2>
  <p class="view-sub">Build consistency with daily tracking</p>

  <div class="habit-add">
    <input type="text" class="input" placeholder="New habit..." bind:value={name} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!name.trim()}>Add</button>
  </div>

  {#if habits.items.length === 0}
    <div class="empty"><p>No habits yet</p></div>
  {:else}
    <div class="habit-list">
      {#each habits.items as h (h.id)}
        {@const streak = getStreak(h.id)}
        {@const week = getWeekLogs(h.id)}
        <div class="habit-card">
          <div class="habit-header">
            <span class="habit-name">{h.name}</span>
            <div class="habit-meta">
              <span class="habit-streak">🔥 {streak}</span>
              <button class="habit-del" onclick={() => removeHabit(h.id)} aria-label="Delete habit">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              </button>
            </div>
          </div>
          <div class="habit-week">
            {#each week as day}
              <button class="habit-day-btn" class:done={day.done} onclick={() => toggleHabitLog(h.id, day.date)} title={day.date}>
                <span class="habit-day-name">{day.dayName}</span>
                <span class="habit-day-ind">{day.done ? '✓' : '·'}</span>
              </button>
            {/each}
          </div>
          <button class="habit-today-btn" class:checked={isHabitDone(h.id, todayStr)} onclick={() => todayCheck(h.id)}>
            {isHabitDone(h.id, todayStr) ? 'Done today' : 'Mark done'}
          </button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .habit-add { display: flex; gap: 10px; margin-bottom: 20px; }
  .habit-list { display: flex; flex-direction: column; gap: 12px; }
  .habit-card { background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border); padding: 18px 20px; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .habit-card:hover { box-shadow: var(--shadow-sm); border-color: var(--accent-subtle); }
  .habit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .habit-name { font-size: 17px; font-weight: 600; color: var(--text); }
  .habit-meta { display: flex; align-items: center; gap: 10px; }
  .habit-streak { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .habit-del { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.15s var(--ease); }
  .habit-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .habit-week { display: flex; gap: 6px; margin-bottom: 12px; }
  .habit-day-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 6px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg); cursor: pointer; transition: all 0.15s var(--ease); }
  .habit-day-btn:hover { border-color: var(--accent); transform: translateY(-2px); }
  .habit-day-btn.done { background: var(--accent-subtle); border-color: var(--accent); box-shadow: 0 2px 12px rgba(212, 165, 116, 0.1); }
  .habit-day-name { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .habit-day-ind { font-size: 16px; font-weight: 700; color: var(--text-secondary); }
  .habit-day-btn.done .habit-day-ind { color: var(--accent); }
  .habit-today-btn { width: 100%; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--bg); color: var(--text-secondary); transition: all 0.15s var(--ease); }
  .habit-today-btn:hover { border-color: var(--accent); color: var(--text); }
  .habit-today-btn.checked { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
</style>
