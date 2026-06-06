<script>
  import { fly, slide } from 'svelte/transition'
  import { onMount } from 'svelte'
  import {
    store,
    addTask,
    toggleTask,
    removeTask,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    toggleExpand,
    loadPoints,
    savePoints,
    requestPermission,
    scheduleAll
  } from './lib/taskStore.svelte.js'

  let title = $state('')
  let startTime = $state('')
  let endTime = $state('')
  let showForm = $state(false)
  let now = $state(new Date())

  let showMorning = $state(false)
  let showEvening = $state(false)
  let ritualTitle = $state('')

  onMount(() => {
    applyTheme(theme)
    requestPermission()
    scheduleAll()
    const id = setInterval(() => now = new Date(), 30000)
    return () => clearInterval(id)

    checkRituals()
  })

  let todayStr = $derived(new Date().toISOString().split('T')[0])

  let todayTasks = $derived(
    store.tasks
      .filter(t => t.date === todayStr)
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

  let completedCount = $derived(todayTasks.filter(t => t.completed).length)

  function checkRituals() {
    const h = now.getHours()
    const mKey = `focus-morning:${todayStr}`
    const eKey = `focus-evening:${todayStr}`
    const morningDone = localStorage.getItem(mKey)
    const eveningDone = localStorage.getItem(eKey)

    if (h < 12 && !morningDone) {
      setTimeout(() => showMorning = true, 300)
    }
    if (h >= 18 && !eveningDone) {
      setTimeout(() => showEvening = true, 600)
    }
  }

  function completeMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'done')
    showMorning = false
  }

  function completeEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'done')
    showEvening = false
  }

  function handleRitualSubmit() {
    if (!ritualTitle.trim()) return
    addTask(ritualTitle.trim())
    ritualTitle = ''
  }

  function skipMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'skipped')
    showMorning = false
  }

  function skipEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'skipped')
    showEvening = false
  }

  function handleSubmit() {
    if (!title.trim()) return
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

  // --- Points ---
  let points = $state(loadPoints())

  function addPoints(amount) {
    points += amount
    savePoints(points)
  }

  // --- Timeline ---
  const START_H = 5
  const END_H = 23
  const HOUR_H = 64
  const TOTAL_H = (END_H - START_H) * HOUR_H
  const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)

  let timedTasks = $derived(
    todayTasks.filter(t => !t.unscheduled)
  )

  let unscheduledTasks = $derived(
    todayTasks.filter(t => t.unscheduled)
  )

  function taskTop(task) {
    const [sh, sm] = task.startTime.split(':').map(Number)
    const mins = sh * 60 + sm
    const startMins = START_H * 60
    return ((mins - startMins) / 60) * HOUR_H
  }

  function taskHeight(task) {
    const [sh, sm] = task.startTime.split(':').map(Number)
    const [eh, em] = task.endTime ? task.endTime.split(':').map(Number) : [sh + 1, sm]
    const duration = (eh * 60 + em) - (sh * 60 + sm)
    return Math.max((duration / 60) * HOUR_H, 36)
  }

  let nowLineTop = $derived.by(() => {
    const n = now.getHours() * 60 + now.getMinutes()
    const s = START_H * 60
    return ((n - s) / 60) * HOUR_H
  })

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

  // --- Subtasks ---
  let subtaskInputs = $state({})

  function handleSubtaskKey(e, taskId) {
    if (e.key !== 'Enter') return
    const val = subtaskInputs[taskId]
    if (!val || !val.trim()) return
    addSubtask(taskId, val.trim())
    subtaskInputs = { ...subtaskInputs, [taskId]: '' }
  }
</script>

<div class="app">
  <header class="header">
    <h1 class="logo">focus</h1>
    <div class="header-actions">
      <span class="points-badge">✦ {points}</span>
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
        <p class="time-optional">Leave times blank for unscheduled tasks</p>
        <div class="form-actions">
          <button type="button" class="btn btn-cancel" onclick={() => showForm = false}>Cancel</button>
          <button type="submit" class="btn btn-save" disabled={!title.trim()}>Save</button>
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
      {#if timedTasks.length > 0}
        <div class="timeline" style="height: {TOTAL_H}px">
          <div class="timeline-bg">
            {#each HOURS as h}
              <div class="tl-hour" style="top: {(h - START_H) * HOUR_H}px">
                <span class="tl-label">{h % 12 || 12}{h >= 12 ? 'p' : 'a'}</span>
              </div>
            {/each}
          </div>

          {#if nowLineTop >= 0 && nowLineTop <= TOTAL_H}
            <div class="now-line" style="top: {nowLineTop}px"></div>
          {/if}

          {#each timedTasks as task (task.id)}
            <div
              class="tl-task"
              class:completed={task.completed}
              class:expanded={task.expanded}
              style="top: {taskTop(task)}px; height: {taskHeight(task)}px"
              transition:fly={{ y: 8, duration: 200, opacity: 0 }}
            >
              <div class="tl-main" role="button" tabindex="0" onclick={() => toggleExpand(task.id)} onkeydown={(e) => { if (e.key === 'Enter') toggleExpand(task.id) }}>
                <button
                  class="tl-check"
                  class:checked={task.completed}
                  onclick={(e) => { e.stopPropagation(); toggleTask(task.id); if (!task.completed) addPoints(10) }}
                  aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
                >
                  {#if task.completed}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l3 3 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  {/if}
                </button>
                <div class="tl-body">
                  <span class="tl-title">{task.title}</span>
                  <span class="tl-time">{timeDisplay(task.startTime)} &rarr; {timeDisplay(task.endTime)}</span>
                </div>
                <button class="tl-del" onclick={(e) => { e.stopPropagation(); removeTask(task.id) }} aria-label="Delete">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
              {#if task.expanded}
                <div class="subtask-list" transition:slide={{ duration: 150 }}>
                  {#each task.subtasks as st}
                    <div class="subtask-item" class:st-done={st.completed}>
                      <button
                        class="st-check"
                        class:checked={st.completed}
                        onclick={(e) => { e.stopPropagation(); toggleSubtask(task.id, st.id); if (!st.completed) addPoints(3) }}
                      >
                        {#if st.completed}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        {/if}
                      </button>
                      <span class="st-title">{st.title}</span>
                      <button class="st-del" aria-label="Remove subtask" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id) }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  {/each}
                  <div class="st-add">
                    <input
                      type="text"
                      class="st-input"
                      placeholder="Add a step..."
                      bind:value={subtaskInputs[task.id]}
                      onkeydown={(e) => handleSubtaskKey(e, task.id)}
                    />
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else if todayTasks.length === 0}
        <div class="empty">
          <p>Nothing planned today</p>
          <p class="empty-sub">Tap "Add task" to get started</p>
        </div>
      {/if}

      {#if unscheduledTasks.length > 0}
        <div class="unscheduled">
          <div class="us-header">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 4v4M7 9.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            Unscheduled
          </div>
          {#each unscheduledTasks as task (task.id)}
            <div
              class="us-task"
              class:completed={task.completed}
              class:expanded={task.expanded}
              transition:fly={{ y: 6, duration: 180, opacity: 0 }}
            >
              <div class="us-main" role="button" tabindex="0" onclick={() => toggleExpand(task.id)} onkeydown={(e) => { if (e.key === 'Enter') toggleExpand(task.id) }}>
                <button
                  class="check"
                  class:checked={task.completed}
                  onclick={(e) => { e.stopPropagation(); toggleTask(task.id); if (!task.completed) addPoints(10) }}
                >
                  {#if task.completed}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6l3 3 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  {/if}
                </button>
                <div class="us-body">
                  <span class="us-title">{task.title}</span>
                </div>
                <button class="delete" onclick={(e) => { e.stopPropagation(); removeTask(task.id) }} aria-label="Delete">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
              {#if task.expanded}
                <div class="subtask-list" transition:slide={{ duration: 150 }}>
                  {#each task.subtasks as st}
                    <div class="subtask-item" class:st-done={st.completed}>
                      <button
                        class="st-check"
                        class:checked={st.completed}
                        onclick={(e) => { e.stopPropagation(); toggleSubtask(task.id, st.id); if (!st.completed) addPoints(3) }}
                      >
                        {#if st.completed}
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        {/if}
                      </button>
                      <span class="st-title">{st.title}</span>
                      <button class="st-del" aria-label="Remove subtask" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id) }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                      </button>
                    </div>
                  {/each}
                  <div class="st-add">
                    <input
                      type="text"
                      class="st-input"
                      placeholder="Add a step..."
                      bind:value={subtaskInputs[task.id]}
                      onkeydown={(e) => handleSubtaskKey(e, task.id)}
                    />
                  </div>
                </div>
              {/if}
            </div>
          {/each}
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
          <button class="timer-btn primary" onclick={startTimer} disabled={timerMinutes <= 0}>Start</button>
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

<!-- Morning Ritual -->
{#if showMorning}
  <div class="ritual-overlay" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
    <div class="ritual-card">
      <div class="ritual-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="8" fill="var(--accent)" opacity="0.15"/>
          <circle cx="16" cy="16" r="4" fill="var(--accent)"/>
          <path d="M16 2v3M16 27v3M2 16h3M27 16h3M5.6 5.6l2.1 2.1M24.3 24.3l2.1 2.1M5.6 26.4l2.1-2.1M24.3 7.7l2.1-2.1" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h2 class="ritual-title">Good morning</h2>
      <p class="ritual-sub">What are you focusing on today?</p>

      <div class="ritual-input-row">
        <input
          type="text"
          class="ritual-input"
          placeholder="Add a task..."
          bind:value={ritualTitle}
          onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }}
        />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      {#if todayTasks.length > 0}
        <div class="ritual-tasks">
          {#each todayTasks as t}
            <div class="ritual-task" class:rt-done={t.completed}>
              <span>{t.title}</span>
              {#if t.completed}
                <span class="rt-check">&#10003;</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="ritual-actions">
        <button class="ritual-btn primary" onclick={completeMorning}>Start the day</button>
        <button class="ritual-btn secondary" onclick={skipMorning}>Skip</button>
      </div>
    </div>
  </div>
{/if}

<!-- Evening Shutdown -->
{#if showEvening}
  <div class="ritual-overlay" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
    <div class="ritual-card">
      <div class="ritual-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" fill="var(--accent)" opacity="0.1"/>
          <path d="M24 16A8 8 0 1116 8a8 8 0 008 8z" fill="var(--accent)" opacity="0.2"/>
          <path d="M20 12l-6 6-3-3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h2 class="ritual-title">End of day</h2>
      <p class="ritual-sub">You completed <strong>{completedCount}</strong> of <strong>{todayTasks.length}</strong> tasks today</p>

      {#if todayTasks.length > 0}
        <div class="ritual-tasks">
          {#each todayTasks as t}
            <div class="ritual-task" class:rt-done={t.completed}>
              <span>{t.title}</span>
              {#if t.completed}
                <span class="rt-check">&#10003;</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="ritual-input-row">
        <input
          type="text"
          class="ritual-input"
          placeholder="Add a task for tomorrow..."
          bind:value={ritualTitle}
          onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }}
        />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>

      <div class="ritual-actions">
        <button class="ritual-btn primary" onclick={completeEvening}>Close the day</button>
        <button class="ritual-btn secondary" onclick={skipEvening}>Skip</button>
      </div>
    </div>
  </div>
{/if}

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
    gap: 10px;
  }

  .points-badge {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    background: var(--surface);
    padding: 2px 10px;
    border-radius: 12px;
    border: 1px solid var(--border);
    letter-spacing: 0.3px;
  }

  .date {
    font-size: 12px;
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

  .time-optional {
    font-size: 11px;
    color: var(--text-muted);
    margin: -8px 0 14px;
    text-align: center;
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

  /* --- Timeline --- */
  .timeline {
    position: relative;
    margin: 0 0 16px;
    border-radius: var(--radius);
    overflow: visible;
  }

  .timeline-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .tl-hour {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px solid var(--border);
    height: 0;
  }

  .tl-label {
    position: absolute;
    left: 0;
    top: -7px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    width: 40px;
    text-align: right;
    padding-right: 10px;
  }

  .tl-task {
    position: absolute;
    left: 48px;
    right: 0;
    background: var(--surface);
    border-radius: 8px;
    border: 1px solid var(--border);
    box-shadow: var(--shadow);
    transition: height 0.2s ease, opacity 0.2s;
    overflow: hidden;
  }

  .tl-task.completed {
    opacity: 0.4;
  }

  .tl-task::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent);
    border-radius: 3px 0 0 3px;
  }

  .tl-task.completed::before {
    background: var(--complete);
  }

  .tl-main {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px;
    cursor: pointer;
  }

  .tl-check {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 1px;
    transition: all 0.2s;
    background: transparent;
    padding: 0;
  }

  .tl-check.checked {
    background: var(--complete);
    border-color: var(--complete);
    color: #fff;
  }

  .tl-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .tl-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .tl-task.completed .tl-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .tl-time {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .tl-del {
    width: 22px;
    height: 22px;
    border-radius: 6px;
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

  .tl-del:hover {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .now-line {
    position: absolute;
    left: 48px;
    right: 0;
    height: 2px;
    background: var(--accent);
    z-index: 10;
    pointer-events: none;
  }

  .now-line::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -4px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
  }

  /* --- Unscheduled --- */
  .unscheduled {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    margin-top: 4px;
  }

  .us-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .us-task {
    background: var(--surface);
    border-radius: 8px;
    margin-bottom: 6px;
    border: 1px solid var(--border);
    transition: all 0.15s;
    overflow: hidden;
  }

  .us-task.completed {
    opacity: 0.45;
  }

  .us-main {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
  }

  .us-body {
    flex: 1;
    min-width: 0;
  }

  .us-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }

  .us-task.completed .us-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  /* --- Subtasks --- */
  .subtask-list {
    border-top: 1px solid var(--border);
    padding: 6px 10px 8px 14px;
    overflow: hidden;
  }

  .subtask-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
  }

  .subtask-item.st-done {
    opacity: 0.5;
  }

  .st-check {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    background: transparent;
    padding: 0;
    transition: all 0.15s;
  }

  .st-check.checked {
    background: var(--complete);
    border-color: var(--complete);
    color: #fff;
  }

  .st-title {
    font-size: 12px;
    color: var(--text-secondary);
    flex: 1;
    min-width: 0;
  }

  .subtask-item.st-done .st-title {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .st-del {
    width: 18px;
    height: 18px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    padding: 0;
    transition: all 0.1s;
  }

  .st-del:hover {
    background: var(--surface-hover);
    color: var(--text-secondary);
  }

  .st-add {
    padding: 4px 0 2px;
  }

  .st-input {
    width: 100%;
    padding: 6px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text);
    font-size: 12px;
  }

  .st-input::placeholder {
    color: var(--text-muted);
  }

  .st-input:focus {
    border-color: var(--accent);
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

  /* --- Ritual Modals --- */
  .ritual-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 100;
  }

  .ritual-card {
    background: var(--surface);
    border-radius: 16px;
    padding: 28px 24px 20px;
    width: 100%;
    max-width: 340px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
    text-align: center;
  }

  .ritual-icon {
    margin-bottom: 12px;
    display: flex;
    justify-content: center;
  }

  .ritual-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }

  .ritual-sub {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }

  .ritual-input-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .ritual-input {
    flex: 1;
    padding: 10px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    font-size: 14px;
  }

  .ritual-input:focus {
    border-color: var(--accent);
  }

  .ritual-add-btn {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .ritual-add-btn:hover {
    background: var(--accent-hover);
  }

  .ritual-add-btn:disabled {
    opacity: 0.4;
  }

  .ritual-tasks {
    text-align: left;
    margin-bottom: 16px;
  }

  .ritual-task {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text);
    border-radius: 6px;
    background: var(--bg);
    margin-bottom: 4px;
  }

  .ritual-task.rt-done {
    opacity: 0.5;
    text-decoration: line-through;
    color: var(--text-secondary);
  }

  .rt-check {
    color: var(--complete);
    font-size: 12px;
  }

  .ritual-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .ritual-btn {
    padding: 10px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }

  .ritual-btn.primary {
    background: var(--accent);
    color: #fff;
    border: 1px solid transparent;
  }

  .ritual-btn.primary:hover {
    background: var(--accent-hover);
  }

  .ritual-btn.secondary {
    background: transparent;
    color: var(--text-secondary);
    border: none;
    font-size: 13px;
  }

  .ritual-btn.secondary:hover {
    color: var(--text);
  }
</style>
