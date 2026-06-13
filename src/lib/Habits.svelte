<script>
  import { X, Play, Pause, Trophy, Clock, Check } from 'lucide-svelte'
  import { habits, addHabit, removeHabit, toggleHabitLog, isHabitDone, getHabitDayCount, isHabitComplete, logHabitMinutes, getHabitWeekMinutes, updateHabitTime } from './taskStore.svelte.js'

  let name = $state('')
  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let activeTimer = $state(null)
  let timerRemaining = $state(0)
  let timerInterval = $state(null)

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

  function getMonthGrid(habitId) {
    const cells = []
    const today = new Date()
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      cells.push({ date: key, done: isHabitDone(habitId, key), day: d.getDate() })
    }
    return cells
  }

  function toggleToday(habitId) {
    toggleHabitLog(habitId, todayStr)
  }

  function startTimer(habitId) {
    if (activeTimer) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    activeTimer = habitId
    timerRemaining = 300
    timerInterval = setInterval(() => {
      timerRemaining--
      if (timerRemaining <= 0) {
        clearInterval(timerInterval)
        timerInterval = null
        if (activeTimer) {
          logHabitMinutes(activeTimer, todayStr, 5)
          if (!isHabitDone(activeTimer, todayStr)) toggleHabitLog(activeTimer, todayStr)
        }
        activeTimer = null
      }
    }, 1000)
  }

  function cancelTimer() {
    if (timerInterval) clearInterval(timerInterval)
    timerInterval = null
    activeTimer = null
    timerRemaining = 0
  }

  function timerDisplay() {
    const m = Math.floor(timerRemaining / 60)
    const s = timerRemaining % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }


</script>

<div class="view-content">
  <h2 class="view-title">Habits</h2>
  <p class="view-sub">5 minutes a day. 41 days to build a habit. Don't break the chain.</p>

  <div class="habit-add">
    <input type="text" class="input" placeholder="New habit..." bind:value={name} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!name.trim()}>Add</button>
  </div>

  {#if habits.items.length === 0}
    <div class="empty">
      <p>No habits yet</p>
      <p class="empty-sub">Create a habit, set a time, and practice 5 minutes daily. Miss a day and your streak resets — don't break the chain!</p>
    </div>
  {:else}
    <div class="habit-list">
      {#each habits.items as h (h.id)}
        {@const dayCount = getHabitDayCount(h.id)}
        {@const pct = Math.min(100, dayCount / h.targetDays * 100)}
        {@const streak = getStreak(h.id)}
        {@const week = getWeekLogs(h.id)}
        {@const grid = getMonthGrid(h.id)}
        {@const weekMinutes = getHabitWeekMinutes(h.id)}
        {@const dayLabel = dayCount === 0 ? 'Start' : dayCount >= h.targetDays ? 'Done' : `Day ${dayCount}`}
        {@const complete = isHabitComplete(h.id)}
        {@const todayDone = isHabitDone(h.id, todayStr)}
        {@const timerOn = activeTimer === h.id}

        <div class="habit-card" class:done={complete}>
          {#if complete}
            <div class="habit-badge">
              <Trophy size={14} strokeWidth={1.5} />
              41 days complete!
            </div>
          {/if}

          <div class="habit-main">
            <div class="habit-ring-wrap">
              <svg class="habit-ring" viewBox="0 0 60 60">
                <circle cx="30" cy="30" r="26" fill="none" stroke="var(--border)" stroke-width="4" />
                <circle cx="30" cy="30" r="26" fill="none" stroke="var(--accent)" stroke-width="4"
                  stroke-dasharray="163.36" stroke-dashoffset={163.36 - 163.36 * pct / 100}
                  transform="rotate(-90 30 30)" stroke-linecap="round" class="habit-ring-fill"
                  class:roundDone={complete} />
              </svg>
              <span class="habit-ring-label">{dayLabel}</span>
            </div>

            <div class="habit-info">
              <div class="habit-header">
                <span class="habit-name">{h.name}</span>
                <button class="habit-del" onclick={() => { if (activeTimer === h.id) cancelTimer(); removeHabit(h.id) }} aria-label="Delete habit">
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
              <div class="habit-stats">
                <span class="habit-stat">🔥 {streak}d</span>
                <span class="habit-stat">{dayCount}/{h.targetDays}d</span>
              </div>
            </div>
          </div>

          {#if timerOn}
            <div class="habit-timer">
              <div class="timer-ring-wrap">
                <svg class="timer-ring" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="var(--border)" stroke-width="4" />
                  <circle cx="30" cy="30" r="26" fill="none" stroke="var(--accent)" stroke-width="4"
                    stroke-dasharray="163.36" stroke-dashoffset={163.36 - 163.36 * (1 - timerRemaining / 300)}
                    transform="rotate(-90 30 30)" stroke-linecap="round" style="transition: stroke-dashoffset 1s linear" />
                </svg>
                <span class="timer-digits">{timerDisplay()}</span>
              </div>
              <button class="timer-cancel" onclick={cancelTimer}>Cancel</button>
            </div>
          {:else}
            <div class="habit-week">
              {#each week as day}
                <button class="habit-day-btn" class:done={day.done} onclick={() => toggleHabitLog(h.id, day.date)} title={day.date}>
                  <span class="habit-day-name">{day.dayName}</span>
                  <span class="habit-day-ind">{day.done ? '✓' : '·'}</span>
                </button>
              {/each}
            </div>
            <div class="habit-footer">
              <button class="habit-action" class:checked={todayDone} onclick={() => toggleToday(h.id)} disabled={timerOn}>
                {#if todayDone}
                  <Check size={13} strokeWidth={1.5} />
                  Done
                {:else}
                  Mark done
                {/if}
              </button>
              <button class="habit-action timer" class:active={timerOn} onclick={() => startTimer(h.id)} disabled={todayDone || timerOn}>
                <Play size={13} strokeWidth={1.5} />
                5 min
              </button>
            </div>
            <div class="habit-time-row">
              <span class="habit-time-label">Practice at</span>
              <input type="time" class="habit-time-input" value={h.time || ''} oninput={(e) => updateHabitTime(h.id, e.target.value)} />
            </div>
          {/if}

          <div class="habit-heatmap">
            {#each grid as cell}
              <span class="heat-dot" class:filled={cell.done} title="{cell.date}: {cell.done ? 'done' : 'missed'}" />
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .habit-add { display: flex; gap: 10px; margin-bottom: 24px; }
  .habit-list { display: flex; flex-direction: column; gap: 16px; }
  .habit-card {
    background: var(--surface); border-radius: var(--radius-lg);
    border: 1px solid var(--border); padding: 20px;
    transition: all 0.25s var(--ease);
    backdrop-filter: blur(var(--glass-blur));
    position: relative; overflow: hidden;
  }
  .habit-card:hover { border-color: var(--accent-subtle); box-shadow: var(--shadow-md); }
  .habit-card.done { border-color: var(--complete); box-shadow: 0 0 30px rgba(138, 154, 122, 0.15); }
  .habit-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 12px; border-radius: 20px;
    background: var(--complete-bg); color: var(--complete);
    font-size: 11px; font-weight: 600; margin-bottom: 12px;
  }
  .habit-main { display: flex; gap: 16px; align-items: center; margin-bottom: 14px; }
  .habit-ring-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
  .habit-ring { width: 100%; height: 100%; }
  .habit-ring-fill { transition: stroke-dashoffset 0.5s var(--ease-out); }
  .habit-ring-fill.roundDone { stroke: var(--complete); }
  .habit-ring-label {
    position: absolute; inset: 0; display: flex;
    align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: var(--text);
  }
  .habit-info { flex: 1; min-width: 0; }
  .habit-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .habit-name { font-size: 17px; font-weight: 600; color: var(--text); }
  .habit-del {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); background: transparent;
    transition: all 0.15s var(--ease); flex-shrink: 0;
  }
  .habit-del:hover { background: var(--danger-bg); color: var(--danger); }
  .habit-stats { display: flex; gap: 12px; margin-top: 6px; }
  .habit-stat {
    font-size: 12px; color: var(--text-secondary); font-weight: 500;
    display: flex; align-items: center; gap: 3px;
  }
  .habit-week { display: flex; gap: 6px; margin-bottom: 12px; }
  .habit-day-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
    padding: 8px 4px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--bg);
    cursor: pointer; transition: all 0.15s var(--ease);
  }
  .habit-day-btn:hover { border-color: var(--accent); transform: translateY(-2px); }
  .habit-day-btn.done { background: var(--accent-subtle); border-color: var(--accent); box-shadow: 0 2px 12px rgba(var(--accent-rgb), 0.1); }
  .habit-day-name { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .habit-day-ind { font-size: 16px; font-weight: 700; color: var(--text-secondary); }
  .habit-day-btn.done .habit-day-ind { color: var(--accent); }
  .habit-footer { display: flex; gap: 8px; margin-bottom: 10px; }
  .habit-action {
    flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 500;
    cursor: pointer; border: 1px solid var(--border); background: var(--bg);
    color: var(--text-secondary); transition: all 0.2s var(--ease);
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }
  .habit-action:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .habit-action.checked { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .habit-action.timer.active { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
  .habit-action:disabled { opacity: 0.3; cursor: default; }
  .habit-time-row { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
  .habit-time-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .habit-time-input {
    padding: 4px 10px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); background: var(--bg);
    color: var(--text); font-size: 13px;
  }
  .habit-time-input:focus { border-color: var(--accent); outline: none; }
  .habit-heatmap { display: flex; gap: 3px; flex-wrap: wrap; }
  .heat-dot { width: 8px; height: 8px; border-radius: 2px; background: var(--border); transition: all 0.15s var(--ease); }
  .heat-dot.filled { background: var(--accent); }
  .habit-timer {
    display: flex; flex-direction: column; align-items: center; gap: 12px;
    padding: 20px; margin-bottom: 12px;
    background: var(--accent-subtle); border-radius: var(--radius-md);
    border: 1px solid var(--accent);
  }
  .timer-ring-wrap { position: relative; width: 72px; height: 72px; }
  .timer-ring { width: 100%; height: 100%; }
  .timer-digits {
    position: absolute; inset: 0; display: flex;
    align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .timer-cancel {
    padding: 6px 18px; border-radius: 20px; font-size: 12px; font-weight: 500;
    cursor: pointer; border: 1px solid var(--border); background: var(--bg);
    color: var(--text-secondary); transition: all 0.15s var(--ease);
  }
  .timer-cancel:hover { border-color: var(--danger); color: var(--danger); }
</style>
