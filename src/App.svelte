<script>
  import { fly, slide } from 'svelte/transition'
  import { onMount } from 'svelte'
  import {
    store,
    addTask,
    toggleTask,
    removeTask,
    requestPermission,
    scheduleAll
  } from './lib/taskStore.svelte.js'

  let title = $state('')
  let startTime = $state('')
  let endTime = $state('')
  let showForm = $state(false)
  let now = $state(new Date())

  onMount(() => {
    applyTheme(theme)
    requestPermission()
    scheduleAll()
    const id = setInterval(() => now = new Date(), 30000)
    return () => clearInterval(id)
  })

  let todayTasks = $derived(
    store.tasks
      .filter(t => t.date === new Date().toISOString().split('T')[0])
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  )

  let currentTask = $derived(
    todayTasks.find(t => {
      if (t.completed) return false
      const [sh, sm] = t.startTime.split(':').map(Number)
      const [eh, em] = t.endTime.split(':').map(Number)
      const n = now.getHours() * 60 + now.getMinutes()
      const s = sh * 60 + sm
      const e = eh * 60 + em
      return n >= s && n < e
    })
  )

  let nextTask = $derived(
    todayTasks.find(t => {
      if (t.completed || t === currentTask) return false
      const [sh, sm] = t.startTime.split(':').map(Number)
      const n = now.getHours() * 60 + now.getMinutes()
      const s = sh * 60 + sm
      return s > n
    })
  )

  let dayStr = $derived(
    new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  )

  function handleSubmit() {
    if (!title.trim() || !startTime || !endTime) return
    addTask(title.trim(), startTime, endTime)
    title = ''
    startTime = ''
    endTime = ''
    showForm = false
  }

  function timeDisplay(t) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${String(m).padStart(2, '0')}${ampm}`
  }

  function setDefaultTimes() {
    const h = now.getHours()
    const m = now.getMinutes()
    const rounded = Math.ceil(m / 15) * 15
    const adjustedH = rounded >= 60 ? h + 1 : h
    const adjustedM = rounded >= 60 ? 0 : rounded
    startTime = `${String(adjustedH).padStart(2, '0')}:${String(adjustedM).padStart(2, '0')}`
    const endH = adjustedM + 30 >= 60 ? adjustedH + 1 : adjustedH
    const endM = adjustedM + 30 >= 60 ? adjustedM + 30 - 60 : adjustedM + 30
    endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  function openForm() {
    showForm = true
    setDefaultTimes()
  }

  // --- Theme ---
  let theme = $state(localStorage.getItem('focus-theme') || 'system')

  const THEME_ICONS = {
    system: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" fill="currentColor"/></svg>`,
    light: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    dark: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 11.2A7 7 0 016.8 3 7 7 0 1015 11.2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`
  }

  function cycleTheme() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
  }

  function setTheme(t) {
    theme = t
    localStorage.setItem('focus-theme', t)
    applyTheme(t)
  }

  function applyTheme(t) {
    const root = document.documentElement
    if (t === 'dark') root.setAttribute('data-theme', 'dark')
    else if (t === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
  }

  // --- Timer ---
  let activeTab = $state('tasks')

  const PRESETS = [5, 15, 25, 45]
  let timerMinutes = $state(25)
  let timerRemaining = $state(25 * 60)
  let timerRunning = $state(false)
  let timerStart = $state(0)
  let timerPaused = $state(false)
  let timerPauseRemaining = $state(0)
  let tickInterval = $state(null)
  let doTick = $state(false)
  let prevSecond = $state(-1)

  let timerDisplay = $derived.by(() => {
    const m = Math.floor(timerRemaining / 60)
    const s = Math.floor(timerRemaining % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  let timerStatus = $derived.by(() => {
    if (!timerRunning && timerRemaining === timerMinutes * 60) return 'ready'
    if (timerRunning) return 'running'
    if (timerPaused) return 'paused'
    if (timerRemaining <= 0) return 'done'
    return 'ready'
  })

  function setPreset(mins) {
    if (timerRunning || timerPaused) return
    timerMinutes = mins
    timerRemaining = mins * 60
  }

  function startTimer() {
    if (timerRemaining <= 0) return
    timerRunning = true
    timerPaused = false
    timerStart = Date.now()
    timerPauseRemaining = timerRemaining

    tickInterval = setInterval(() => {
      if (!timerRunning) return
      const elapsed = (Date.now() - timerStart) / 1000
      const remaining = Math.max(0, timerPauseRemaining - elapsed)
      timerRemaining = remaining

      const cs = Math.floor(remaining)
      if (cs !== prevSecond) {
        prevSecond = cs
        doTick = true
        setTimeout(() => doTick = false, 200)
      }

      if (remaining <= 0) {
        clearInterval(tickInterval)
        tickInterval = null
        timerRunning = false
        onTimerComplete()
      }
    }, 50)
  }

  function pauseTimer() {
    if (!timerRunning) return
    timerRunning = false
    timerPaused = true
    clearInterval(tickInterval)
    tickInterval = null
  }

  function resumeTimer() {
    if (!timerPaused) return
    timerRunning = true
    timerPaused = false
    timerStart = Date.now()
    timerPauseRemaining = timerRemaining

    tickInterval = setInterval(() => {
      if (!timerRunning) return
      const elapsed = (Date.now() - timerStart) / 1000
      const remaining = Math.max(0, timerPauseRemaining - elapsed)
      timerRemaining = remaining

      const cs = Math.floor(remaining)
      if (cs !== prevSecond) {
        prevSecond = cs
        doTick = true
        setTimeout(() => doTick = false, 200)
      }

      if (remaining <= 0) {
        clearInterval(tickInterval)
        tickInterval = null
        timerRunning = false
        onTimerComplete()
      }
    }, 50)
  }

  function resetTimer() {
    timerRunning = false
    timerPaused = false
    clearInterval(tickInterval)
    tickInterval = null
    timerRemaining = timerMinutes * 60
  }

  function onTimerComplete() {
    timerRemaining = 0
    notify('Focus session complete!')
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400])
    }
  }

  $effect(() => {
    return () => {
      if (tickInterval) clearInterval(tickInterval)
    }
  })

  function notify(msg) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Focus', { body: msg })
    }
  }
</script>

<div class="app">
  <header class="header">
    <h1 class="logo">focus</h1>
    <div class="header-actions">
      <span class="date">{dayStr}</span>
      <button class="theme-btn" onclick={cycleTheme} aria-label="Toggle theme" title={theme}>
        {@html THEME_ICONS[theme]}
      </button>
    </div>
  </header>

  <nav class="tabs">
    <button
      class="tab"
      class:active={activeTab === 'tasks'}
      onclick={() => activeTab = 'tasks'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Tasks
    </button>
    <button
      class="tab"
      class:active={activeTab === 'focus'}
      onclick={() => activeTab = 'focus'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
        <circle cx="8" cy="8" r="2" fill="currentColor"/>
      </svg>
      Focus
    </button>
  </nav>

  {#if activeTab === 'tasks'}
    <div class="status">
      {#if currentTask}
        <span class="status-dot live"></span>
        <span>Now: <strong>{currentTask.title}</strong> &middot; ends {timeDisplay(currentTask.endTime)}</span>
      {:else if nextTask}
        <span class="status-dot"></span>
        <span>Next: <strong>{nextTask.title}</strong> at {timeDisplay(nextTask.startTime)}</span>
      {:else if todayTasks.length > 0}
        <span class="status-dot done"></span>
        <span>All done for today</span>
      {:else}
        <span class="status-dot"></span>
        <span>No tasks yet</span>
      {/if}
    </div>

    {#if showForm}
      <form class="form" transition:slide={{ duration: 200 }} onsubmit={handleSubmit}>
        <input
          type="text"
          class="input title-input"
          placeholder="What do you want to do?"
          bind:value={title}
        />
        <div class="time-row">
          <div class="time-field">
            <label class="time-label" for="start-time">Start</label>
            <input id="start-time" type="time" class="input" bind:value={startTime} />
          </div>
          <span class="time-arrow">&rarr;</span>
          <div class="time-field">
            <label class="time-label" for="end-time">End</label>
            <input id="end-time" type="time" class="input" bind:value={endTime} />
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-cancel" onclick={() => showForm = false}>Cancel</button>
          <button type="submit" class="btn btn-save" disabled={!title.trim() || !startTime || !endTime}>Save</button>
        </div>
      </form>
    {:else}
      <button class="add-trigger" onclick={openForm}>
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        Add task
      </button>
    {/if}

    <main class="task-list">
      {#each todayTasks as task (task.id)}
        <div
          class="task-card"
          class:completed={task.completed}
          transition:fly={{ y: 8, duration: 200, opacity: 0 }}
        >
          <button
            class="check"
            class:checked={task.completed}
            onclick={() => toggleTask(task.id)}
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {#if task.completed}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 7l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            {/if}
          </button>
          <div class="card-body">
            <span class="card-title">{task.title}</span>
            <span class="card-time">{timeDisplay(task.startTime)} &rarr; {timeDisplay(task.endTime)}</span>
          </div>
          <button class="delete" onclick={() => removeTask(task.id)} aria-label="Delete task">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      {/each}

      {#if todayTasks.length === 0}
        <div class="empty">
          <p>Nothing planned today</p>
          <p class="empty-sub">Tap "Add task" to get started</p>
        </div>
      {/if}
    </main>
  {:else}
    <main class="focus-view">
      <div class="timer-digits-wrapper">
        <div class="timer-digits" class:tick={doTick}>
          {timerDisplay}
        </div>
      </div>

      <div class="timer-status-text">
        {#if timerStatus === 'ready'}
          <span>Ready to focus</span>
        {:else if timerStatus === 'running'}
          <span>Focusing...</span>
        {:else if timerStatus === 'paused'}
          <span>Paused</span>
        {:else if timerStatus === 'done'}
          <span>Session complete!</span>
        {/if}
      </div>

      <div class="presets">
        {#each PRESETS as m}
          <button
            class="preset-btn"
            class:active={timerMinutes === m && timerStatus === 'ready'}
            onclick={() => setPreset(m)}
            disabled={timerRunning || timerPaused}
          >{m}m</button>
        {/each}
      </div>

      <div class="timer-controls">
        {#if timerStatus === 'ready'}
          <button class="timer-btn primary" onclick={startTimer} disabled={timerMinutes <= 0}>
            Start
          </button>
        {:else if timerStatus === 'running'}
          <button class="timer-btn" onclick={pauseTimer}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="1" width="3" height="12" rx="1" fill="currentColor"/>
              <rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/>
            </svg>
            Pause
          </button>
          <button class="timer-btn secondary" onclick={resetTimer}>Stop</button>
        {:else if timerStatus === 'paused'}
          <button class="timer-btn primary" onclick={resumeTimer}>Resume</button>
          <button class="timer-btn secondary" onclick={resetTimer}>Reset</button>
        {:else if timerStatus === 'done'}
          <button class="timer-btn primary" onclick={resetTimer}>New session</button>
        {/if}
      </div>
    </main>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 20px 10px;
    flex-shrink: 0;
  }

  .logo {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: var(--text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .date {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .theme-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    background: transparent;
    padding: 0;
    transition: all 0.15s;
  }

  .theme-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .tabs {
    display: flex;
    gap: 4px;
    padding: 0 20px 12px;
    flex-shrink: 0;
  }

  .tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.15s;
    background: transparent;
  }

  .tab:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .tab.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border);
    flex-shrink: 0;
  }

  .status-dot.live {
    background: var(--accent);
    box-shadow: 0 0 0 3px rgba(107, 107, 107, 0.2);
  }

  .status-dot.done {
    background: var(--complete);
  }

  .add-trigger {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    margin: 0 20px 12px;
    border: 1px dashed var(--border);
    border-radius: var(--radius);
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 14px;
    transition: all 0.15s;
    flex-shrink: 0;
  }

  .add-trigger:hover {
    border-color: var(--accent);
    color: var(--text);
    background: var(--surface-hover);
  }

  .form {
    padding: 0 20px 12px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .input {
    width: 100%;
    padding: 12px 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 15px;
    transition: border-color 0.15s;
  }

  .input:focus {
    border-color: var(--accent);
  }

  .title-input {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .time-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .time-field {
    flex: 1;
  }

  .time-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }

  .time-arrow {
    color: var(--text-muted);
    font-size: 16px;
    margin-top: 14px;
  }

  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.5);
  }

  .form-actions {
    display: flex;
    gap: 8px;
  }

  .btn {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-cancel {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text-secondary);
  }

  .btn-cancel:hover {
    background: var(--surface-hover);
  }

  .btn-save {
    background: var(--accent);
    color: #fff;
    border: 1px solid transparent;
  }

  .btn-save:hover {
    background: var(--accent-hover);
  }

  .btn-save:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .task-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 20px 20px;
    -webkit-overflow-scrolling: touch;
  }

  .task-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--surface);
    border-radius: var(--radius);
    margin-bottom: 8px;
    box-shadow: var(--shadow);
    transition: all 0.2s;
    border: 1px solid var(--border);
  }

  .task-card.completed {
    opacity: 0.5;
  }

  .check {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s;
    background: transparent;
    padding: 0;
  }

  .check.checked {
    background: var(--complete);
    border-color: var(--complete);
    color: #fff;
  }

  .card-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .card-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.3;
  }

  .task-card.completed .card-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .card-time {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .delete {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    flex-shrink: 0;
    background: transparent;
    padding: 0;
    transition: all 0.15s;
  }

  .delete:hover {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .empty {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
    font-size: 15px;
  }

  .empty-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 4px;
  }

  /* --- Focus Timer --- */
  .focus-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    gap: 16px;
  }

  .timer-digits-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 0;
  }

  .timer-digits {
    font-size: 5rem;
    font-weight: 700;
    letter-spacing: 4px;
    color: var(--text);
    line-height: 1;
    font-variant-numeric: tabular-nums;
    transition: transform 0.15s ease;
    user-select: none;
  }

  .timer-digits.tick {
    animation: timerPulse 0.2s ease;
  }

  @keyframes timerPulse {
    0% { transform: scale(1); }
    40% { transform: scale(1.06); }
    100% { transform: scale(1); }
  }

  .timer-status-text {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
    height: 20px;
  }

  .presets {
    display: flex;
    gap: 8px;
  }

  .preset-btn {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--surface);
    border: 1px solid var(--border);
    cursor: pointer;
    transition: all 0.15s;
  }

  .preset-btn:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--text);
  }

  .preset-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .preset-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  .timer-controls {
    display: flex;
    gap: 8px;
  }

  .timer-btn {
    padding: 10px 24px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .timer-btn.primary {
    background: var(--accent);
    color: #fff;
    border: 1px solid transparent;
  }

  .timer-btn.primary:hover {
    background: var(--accent-hover);
  }

  .timer-btn.primary:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .timer-btn.secondary {
    background: var(--surface);
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .timer-btn.secondary:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
</style>
