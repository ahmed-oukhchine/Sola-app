<script>
  import { fly, slide } from 'svelte/transition'
  import { onMount } from 'svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import {
    store, addTask, toggleTask, removeTask, updateEnergy,
    addSubtask, toggleSubtask, removeSubtask, toggleExpand,
    inbox, addToInbox, removeFromInbox, moveInboxToToday,
    someday, addToSomeday, removeFromSomeday, moveSomedayToToday,
    routines, addRoutine, removeRoutine,
    addRoutineItem, toggleRoutineItem, removeRoutineItem,
    loadPoints, savePoints, computeStreak,
    requestPermission, scheduleAll
  } from './lib/taskStore.svelte.js'

  let activeView = $state('today')
  let sidebarOpen = $state(false)
  let now = $state(new Date())
  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let nextAction = $state(false)
  let showMorning = $state(false)
  let showEvening = $state(false)
  let ritualTitle = $state('')

  // Theme
  let theme = $state(localStorage.getItem('focus-theme') || 'system')
  const THEME_ICONS = {
    system: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" fill="currentColor"/></svg>`,
    light: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    dark: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M15 11.2A7 7 0 016.8 3 7 7 0 1015 11.2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`
  }

  function cycleTheme() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    theme = next
    localStorage.setItem('focus-theme', next)
    const root = document.documentElement
    if (next === 'dark') root.setAttribute('data-theme', 'dark')
    else if (next === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
  }

  function addPoints(amt) {
    points += amt
    savePoints(points)
  }

  function checkRituals() {
    const h = now.getHours()
    const mKey = `focus-morning:${todayStr}`
    const eKey = `focus-evening:${todayStr}`
    if (h < 12 && !localStorage.getItem(mKey)) {
      setTimeout(() => showMorning = true, 300)
    }
    if (h >= 18 && !localStorage.getItem(eKey)) {
      setTimeout(() => showEvening = true, 600)
    }
  }

  function completeMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'done')
    showMorning = false
  }

  function skipMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'skipped')
    showMorning = false
  }

  function completeEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'done')
    showEvening = false
  }

  function skipEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'skipped')
    showEvening = false
  }

  function handleRitualSubmit() {
    if (!ritualTitle.trim()) return
    addTask(ritualTitle.trim())
    ritualTitle = ''
  }

  onMount(() => {
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else if (theme === 'light') root.setAttribute('data-theme', 'light')
    requestPermission()
    scheduleAll()
    checkRituals()
    setInterval(() => {
      now = new Date()
      streak = computeStreak()
    }, 30000)
  })

  // --- Today View ---
  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let todayTasks = $derived(
    store.tasks.filter(t => t.date === todayStr).sort((a, b) => a.startTime.localeCompare(b.startTime))
  )
  let currentTask = $derived(todayTasks.find(t => {
    if (t.completed) return false
    const [sh, sm] = t.startTime.split(':').map(Number)
    const [eh, em] = t.endTime ? t.endTime.split(':').map(Number) : [0, 0]
    const n = now.getHours() * 60 + now.getMinutes()
    return !t.unscheduled && n >= sh * 60 + sm && n < eh * 60 + em
  }))
  let nextTask = $derived(todayTasks.find(t => {
    if (t.completed || t === currentTask) return false
    const [sh, sm] = t.startTime.split(':').map(Number)
    const n = now.getHours() * 60 + now.getMinutes()
    return !t.unscheduled && sh * 60 + sm > n
  }))
  let dayStr = $derived(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  let timedTasks = $derived(todayTasks.filter(t => !t.unscheduled))
  let unscheduledTasks = $derived(todayTasks.filter(t => t.unscheduled))
  let actionTask = $derived(currentTask || nextTask || todayTasks.find(t => !t.completed))
  let completedCount = $derived(todayTasks.filter(t => t.completed).length)

  // Timeline
  const START_H = 5, END_H = 23, HOUR_H = 64
  const TOTAL_H = (END_H - START_H) * HOUR_H
  const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i)
  function taskTop(t) {
    const [sh, sm] = t.startTime.split(':').map(Number)
    return ((sh * 60 + sm - START_H * 60) / 60) * HOUR_H
  }
  function taskHeight(t) {
    const [sh, sm] = t.startTime.split(':').map(Number)
    const [eh, em] = t.endTime ? t.endTime.split(':').map(Number) : [sh + 1, sm]
    return Math.max(((eh * 60 + em - sh * 60 - sm) / 60) * HOUR_H, 36)
  }
  let nowLineTop = $derived(((now.getHours() * 60 + now.getMinutes() - START_H * 60) / 60) * HOUR_H)

  // Form
  let title = $state(''), startTime = $state(''), endTime = $state(''), taskEnergy = $state(null), showForm = $state(false)
  function openForm() {
    showForm = true; taskEnergy = null
    const h = now.getHours(), m = now.getMinutes()
    const r = Math.ceil(m / 15) * 15
    startTime = `${String(r >= 60 ? h + 1 : h).padStart(2, '0')}:${String(r >= 60 ? 0 : r).padStart(2, '0')}`
    const eh = r + 30 >= 60 ? (r >= 60 ? h + 1 : h) + 1 : (r >= 60 ? h + 1 : h)
    endTime = `${String(eh).padStart(2, '0')}:${String(r + 30 >= 60 ? r + 30 - 60 : r + 30).padStart(2, '0')}`
  }
  function handleSubmit() {
    if (!title.trim()) return
    addTask(title.trim(), startTime, endTime, taskEnergy)
    title = ''; startTime = ''; endTime = ''; taskEnergy = null; showForm = false
  }
  function timeDisplay(t) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`
  }

  // Inbox
  let inboxTitle = $state('')
  function handleInboxAdd() {
    if (!inboxTitle.trim()) return
    addToInbox(inboxTitle.trim())
    inboxTitle = ''
  }

  // Someday
  let somedayTitle = $state('')
  function handleSomedayAdd() {
    if (!somedayTitle.trim()) return
    addToSomeday(somedayTitle.trim())
    somedayTitle = ''
  }

  // Routines
  let routineTitle = $state(''), routineType = $state('morning'), routineItemInput = $state({})
  function handleRoutineAdd() {
    if (!routineTitle.trim()) return
    addRoutine(routineTitle.trim(), routineType)
    routineTitle = ''
  }
  function handleRoutineItemKey(e, rid) {
    if (e.key !== 'Enter') return
    const val = routineItemInput[rid]
    if (!val || !val.trim()) return
    addRoutineItem(rid, val.trim())
    routineItemInput = { ...routineItemInput, [rid]: '' }
  }

  // Timer
  const PRESETS = [5, 15, 25, 45]
  let timerMinutes = $state(25), timerRemaining = $state(25 * 60)
  let timerRunning = $state(false), timerPaused = $state(false), timerStart = $state(0)
  let timerPauseRemaining = $state(0), tickInterval = $state(null), doTick = $state(false), prevSecond = $state(-1)
  let timerDisplay = $derived.by(() => {
    const m = Math.floor(timerRemaining / 60), s = Math.floor(timerRemaining % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })
  let timerStatus = $derived(
    !timerRunning && timerRemaining === timerMinutes * 60 ? 'ready' :
    timerRunning ? 'running' : timerPaused ? 'paused' : timerRemaining <= 0 ? 'done' : 'ready'
  )
  function setPreset(m) { if (!timerRunning && !timerPaused) { timerMinutes = m; timerRemaining = m * 60 } }
  function timerTick() {
    if (!timerRunning) return
    const elapsed = (Date.now() - timerStart) / 1000
    const remaining = Math.max(0, timerPauseRemaining - elapsed)
    timerRemaining = remaining
    const cs = Math.floor(remaining)
    if (cs !== prevSecond) { prevSecond = cs; doTick = true; setTimeout(() => doTick = false, 200) }
    if (remaining <= 0) {
      clearInterval(tickInterval); tickInterval = null; timerRunning = false
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Focus', { body: 'Session complete!' })
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
    }
  }
  function startTimerv() { if (timerRemaining <= 0) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function pauseTimer() { if (!timerRunning) return; timerRunning = false; timerPaused = true; clearInterval(tickInterval); tickInterval = null }
  function resumeTimer() { if (!timerPaused) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function resetTimer() { timerRunning = false; timerPaused = false; clearInterval(tickInterval); tickInterval = null; timerRemaining = timerMinutes * 60 }
  $effect(() => () => { if (tickInterval) clearInterval(tickInterval) })

  // Subtask inputs
  let subtaskInputs = $state({})
  function handleSubtaskKey(e, tid) {
    if (e.key !== 'Enter') return
    const val = subtaskInputs[tid]
    if (!val || !val.trim()) return
    addSubtask(tid, val.trim())
    subtaskInputs = { ...subtaskInputs, [tid]: '' }
  }
</script>

<Sidebar
  open={sidebarOpen}
  {activeView}
  {streak}
  {points}
  {theme}
  onNavigate={(v) => activeView = v}
  onClose={() => sidebarOpen = false}
  onThemeCycle={cycleTheme}
/>

<div class="app">
  <header class="header">
    <button class="hamburger" onclick={() => sidebarOpen = true} aria-label="Menu">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <h1 class="logo">focus</h1>
    <div class="header-actions">
      <span class="points-badge">✦ {points}</span>
      <span class="date">{dayStr}</span>
    </div>
  </header>

  {#if activeView === 'today'}
    <div class="view-toolbar">
      <button class="view-btn" class:active={!nextAction} onclick={() => nextAction = false}>All</button>
      <button class="view-btn" class:active={nextAction} onclick={() => nextAction = true}>Next action</button>
    </div>

    {#if nextAction && actionTask}
      <div class="next-action-card">
        <div class="na-label">Next action</div>
        <div class="na-title">{actionTask.title}</div>
        <div class="na-time">{actionTask.startTime ? `${timeDisplay(actionTask.startTime)} → ${timeDisplay(actionTask.endTime)}` : 'Unscheduled'}</div>
        <button class="na-btn" onclick={() => { const nwas = actionTask.completed; toggleTask(actionTask.id); if (!nwas) addPoints(10) }}>
          {actionTask.completed ? 'Undo' : 'Complete'}
        </button>
      </div>
    {:else}
      <div class="status">
        {#if currentTask}
          <span class="status-dot live"></span><span>Now: <strong>{currentTask.title}</strong> · ends {timeDisplay(currentTask.endTime)}</span>
        {:else if nextTask}
          <span class="status-dot"></span><span>Next: <strong>{nextTask.title}</strong> at {timeDisplay(nextTask.startTime)}</span>
        {:else if todayTasks.filter(t => t.completed).length > 0}
          <span class="status-dot done"></span><span>All done for today</span>
        {:else}
          <span class="status-dot"></span><span>No tasks yet</span>
        {/if}
      </div>

      {#if showForm}
        <form class="form" transition:slide={{ duration: 200 }} onsubmit={handleSubmit}>
          <input type="text" class="input title-input" placeholder="What do you want to do?" bind:value={title} />
          <div class="time-row">
            <div class="time-field"><label class="time-label" for="st">Start</label><input id="st" type="time" class="input" bind:value={startTime} /></div>
            <span class="time-arrow">→</span>
            <div class="time-field"><label class="time-label" for="et">End</label><input id="et" type="time" class="input" bind:value={endTime} /></div>
          </div>
          <p class="time-optional">Leave times blank for unscheduled</p>
          <div class="energy-row">
            <span class="energy-label">Energy</span>
            <button type="button" class="energy-btn" class:selected={taskEnergy === 'low'} onclick={() => taskEnergy = taskEnergy === 'low' ? null : 'low'}>Low</button>
            <button type="button" class="energy-btn" class:selected={taskEnergy === 'medium'} onclick={() => taskEnergy = taskEnergy === 'medium' ? null : 'medium'}>Med</button>
            <button type="button" class="energy-btn" class:selected={taskEnergy === 'high'} onclick={() => taskEnergy = taskEnergy === 'high' ? null : 'high'}>High</button>
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-cancel" onclick={() => showForm = false}>Cancel</button>
            <button type="submit" class="btn btn-save" disabled={!title.trim()}>Save</button>
          </div>
        </form>
      {:else}
        <button class="add-trigger" onclick={openForm}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          Add task
        </button>
      {/if}

      <main class="task-list">
        {#if timedTasks.length > 0}
          <div class="timeline" style="height: {TOTAL_H}px">
            <div class="timeline-bg">
              {#each HOURS as h}
                <div class="tl-hour" style="top: {(h - START_H) * HOUR_H}px"><span class="tl-label">{h % 12 || 12}{h >= 12 ? 'p' : 'a'}</span></div>
              {/each}
            </div>
            {#if nowLineTop >= 0 && nowLineTop <= TOTAL_H}
              <div class="now-line" style="top: {nowLineTop}px"></div>
            {/if}
            {#each timedTasks as task (task.id)}
              <div class="tl-task" class:completed={task.completed} class:expanded={task.expanded} style="top: {taskTop(task)}px; height: {taskHeight(task)}px" transition:fly={{ y: 8, duration: 200, opacity: 0 }}>
                <div class="tl-main" role="button" tabindex="0" onclick={() => toggleExpand(task.id)} onkeydown={(e) => { if (e.key === 'Enter') toggleExpand(task.id) }}>
                  <button class="tl-check" class:checked={task.completed} onclick={(e) => { e.stopPropagation(); const was = task.completed; toggleTask(task.id); if (!was) { addPoints(10); streak = computeStreak() } }}>
                    {#if task.completed}<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l3 3 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
                  </button>
                  <div class="tl-body">
                    <span class="tl-title">{task.title}</span>
                    <span class="tl-time">{timeDisplay(task.startTime)} → {timeDisplay(task.endTime)}</span>
                  </div>
                  {#if task.energy}
                    <span class="tl-energy" class:en-low={task.energy === 'low'} class:en-med={task.energy === 'medium'} class:en-high={task.energy === 'high'}>{task.energy}</span>
                  {/if}
                  <button class="tl-del" aria-label="Delete" onclick={(e) => { e.stopPropagation(); removeTask(task.id) }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
                {#if task.expanded}
                  <div class="subtask-list" transition:slide={{ duration: 150 }}>
                    {#each task.subtasks as st}
                      <div class="subtask-item" class:st-done={st.completed}>
                        <button class="st-check" class:checked={st.completed} onclick={(e) => { e.stopPropagation(); const swas = st.completed; toggleSubtask(task.id, st.id); if (!swas) addPoints(3) }}>
                          {#if st.completed}<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
                        </button>
                        <span class="st-title">{st.title}</span>
                        <button class="st-del" aria-label="Remove" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id) }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </button>
                      </div>
                    {/each}
                    <div class="st-add">
                      <input type="text" class="st-input" placeholder="Add a step..." bind:value={subtaskInputs[task.id]} onkeydown={(e) => handleSubtaskKey(e, task.id)} />
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {:else if todayTasks.length === 0}
          <div class="empty"><p>Nothing planned today</p><p class="empty-sub">Tap "Add task" to get started</p></div>
        {/if}
        {#if unscheduledTasks.length > 0}
          <div class="unscheduled">
            <div class="us-header">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 4v4M7 9.5v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
              Unscheduled
            </div>
            {#each unscheduledTasks as task (task.id)}
              <div class="us-task" class:completed={task.completed} class:expanded={task.expanded} transition:fly={{ y: 6, duration: 180, opacity: 0 }}>
                <div class="us-main" role="button" tabindex="0" onclick={() => toggleExpand(task.id)} onkeydown={(e) => { if (e.key === 'Enter') toggleExpand(task.id) }}>
                  <button class="check" class:checked={task.completed} onclick={(e) => { e.stopPropagation(); const was = task.completed; toggleTask(task.id); if (!was) { addPoints(10); streak = computeStreak() } }}>
                    {#if task.completed}<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l3 3 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
                  </button>
                  <div class="us-body"><span class="us-title">{task.title}</span></div>
                  {#if task.energy}
                    <span class="tl-energy" class:en-low={task.energy === 'low'} class:en-med={task.energy === 'medium'} class:en-high={task.energy === 'high'}>{task.energy}</span>
                  {/if}
                  <button class="delete" aria-label="Delete" onclick={(e) => { e.stopPropagation(); removeTask(task.id) }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
                {#if task.expanded}
                  <div class="subtask-list" transition:slide={{ duration: 150 }}>
                    {#each task.subtasks as st}
                      <div class="subtask-item" class:st-done={st.completed}>
                        <button class="st-check" class:checked={st.completed} onclick={(e) => { e.stopPropagation(); const swas = st.completed; toggleSubtask(task.id, st.id); if (!swas) addPoints(3) }}>
                          {#if st.completed}<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
                        </button>
                        <span class="st-title">{st.title}</span>
                        <button class="st-del" aria-label="Remove" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id) }}>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                        </button>
                      </div>
                    {/each}
                    <div class="st-add">
                      <input type="text" class="st-input" placeholder="Add a step..." bind:value={subtaskInputs[task.id]} onkeydown={(e) => handleSubtaskKey(e, task.id)} />
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </main>
    {/if}

  {:else if activeView === 'inbox'}
    <main class="view-content">
      <h2 class="view-title">Inbox</h2>
      <p class="view-sub">Dump everything on your mind. Process later.</p>
      <div class="inbox-add">
        <input type="text" class="input" placeholder="Anything on your mind?" bind:value={inboxTitle} onkeydown={(e) => { if (e.key === 'Enter') handleInboxAdd() }} />
        <button class="inbox-add-btn" onclick={handleInboxAdd} disabled={!inboxTitle.trim()}>Add</button>
      </div>
      {#if inbox.items.length === 0}
        <div class="empty"><p>Your inbox is empty</p></div>
      {:else}
        <div class="inbox-list">
          {#each [...inbox.items].reverse() as item (item.id)}
            <div class="inbox-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
              <span class="inbox-text">{item.title}</span>
              <div class="inbox-actions">
                <button class="inbox-action" onclick={() => moveInboxToToday(item.id)} title="Move to today">Today</button>
                <button class="inbox-action del" onclick={() => removeFromInbox(item.id)} title="Delete">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </main>

  {:else if activeView === 'focus'}
    <main class="focus-view">
      <div class="timer-digits-wrapper">
        <div class="timer-digits" class:tick={doTick}>{timerDisplay}</div>
      </div>
      <div class="timer-status-text">
        {timerStatus === 'ready' ? 'Ready to focus' : timerStatus === 'running' ? 'Focusing...' : timerStatus === 'paused' ? 'Paused' : 'Session complete!'}
      </div>
      <div class="presets">
        {#each PRESETS as m}
          <button class="preset-btn" class:active={timerMinutes === m && timerStatus === 'ready'} onclick={() => setPreset(m)} disabled={timerRunning || timerPaused}>{m}m</button>
        {/each}
      </div>
      <div class="timer-controls">
        {#if timerStatus === 'ready'}
          <button class="timer-btn primary" onclick={startTimerv} disabled={timerMinutes <= 0}>Start</button>
        {:else if timerStatus === 'running'}
          <button class="timer-btn" onclick={pauseTimer}><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="3" height="12" rx="1" fill="currentColor"/><rect x="8" y="1" width="3" height="12" rx="1" fill="currentColor"/></svg> Pause</button>
          <button class="timer-btn secondary" onclick={resetTimer}>Stop</button>
        {:else if timerStatus === 'paused'}
          <button class="timer-btn primary" onclick={resumeTimer}>Resume</button>
          <button class="timer-btn secondary" onclick={resetTimer}>Reset</button>
        {:else}
          <button class="timer-btn primary" onclick={resetTimer}>New session</button>
        {/if}
      </div>
      <button class="just5" onclick={() => { setPreset(5); startTimerv() }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 3.5V7l2 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        Just 5 minutes
      </button>
    </main>

  {:else if activeView === 'routines'}
    <main class="view-content">
      <h2 class="view-title">Routines</h2>
      <p class="view-sub">Morning and evening checklists</p>
      <div class="routine-add-row">
        <input type="text" class="input" placeholder="Routine name..." bind:value={routineTitle} />
        <select class="routine-select" bind:value={routineType}>
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
        </select>
        <button class="inbox-add-btn" onclick={handleRoutineAdd} disabled={!routineTitle.trim()}>Add</button>
      </div>
      {#if routines.items.length === 0}
        <div class="empty"><p>No routines yet</p></div>
      {:else}
        {#each ['morning', 'evening'] as type}
          {@const filtered = routines.items.filter(r => r.type === type)}
          {#if filtered.length > 0}
            <h3 class="routine-type-heading">{type === 'morning' ? '☀️ Morning' : '🌙 Evening'}</h3>
            {#each filtered as routine (routine.id)}
              <div class="routine-card">
                <div class="routine-header">
                  <span class="routine-title">{routine.title}</span>
                  <button class="routine-del" aria-label="Delete routine" onclick={() => removeRoutine(routine.id)}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
                <div class="routine-items">
                  {#each routine.items as item}
                    <div class="routine-item">
                      <button class="rg-check" class:checked={item.completed} onclick={() => toggleRoutineItem(routine.id, item.id)}>
                        {#if item.completed}<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>{/if}
                      </button>
                      <span class="rg-title" class:rg-done={item.completed}>{item.title}</span>
                      <button class="rg-del" aria-label="Remove" onclick={() => removeRoutineItem(routine.id, item.id)}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                      </button>
                    </div>
                  {/each}
                  <div class="rg-add">
                    <input type="text" class="rg-input" placeholder="Add item..." bind:value={routineItemInput[routine.id]} onkeydown={(e) => handleRoutineItemKey(e, routine.id)} />
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        {/each}
      {/if}
    </main>

  {:else if activeView === 'someday'}
    <main class="view-content">
      <h2 class="view-title">Someday</h2>
      <p class="view-sub">Ideas and things you might want to do</p>
      <div class="inbox-add">
        <input type="text" class="input" placeholder="An idea..." bind:value={somedayTitle} onkeydown={(e) => { if (e.key === 'Enter') handleSomedayAdd() }} />
        <button class="inbox-add-btn" onclick={handleSomedayAdd} disabled={!somedayTitle.trim()}>Add</button>
      </div>
      {#if someday.items.length === 0}
        <div class="empty"><p>Your someday list is empty</p></div>
      {:else}
        <div class="inbox-list">
          {#each [...someday.items].reverse() as item (item.id)}
            <div class="inbox-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
              <span class="inbox-text">{item.title}</span>
              <div class="inbox-actions">
                <button class="inbox-action" onclick={() => moveSomedayToToday(item.id)} title="Move to today">Today</button>
                <button class="inbox-action del" onclick={() => removeFromSomeday(item.id)} title="Delete">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
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
        <input type="text" class="ritual-input" placeholder="Add a task..." bind:value={ritualTitle} onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }} />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button>
      </div>
      {#if todayTasks.length > 0}
        <div class="ritual-tasks">
          {#each todayTasks as t}
            <div class="ritual-task" class:rt-done={t.completed}><span>{t.title}</span>{#if t.completed}<span class="rt-check">&#10003;</span>{/if}</div>
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
            <div class="ritual-task" class:rt-done={t.completed}><span>{t.title}</span>{#if t.completed}<span class="rt-check">&#10003;</span>{/if}</div>
          {/each}
        </div>
      {/if}
      <div class="ritual-input-row">
        <input type="text" class="ritual-input" placeholder="Add a task for tomorrow..." bind:value={ritualTitle} onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }} />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
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
  .app { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .header { display: flex; align-items: center; gap: 10px; padding: 16px 20px 8px; flex-shrink: 0; }
  .hamburger { width: 34px; height: 34px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: transparent; padding: 0; transition: all 0.12s; flex-shrink: 0; }
  .hamburger:hover { background: var(--surface-hover); color: var(--text); }
  .logo { font-size: 20px; font-weight: 600; letter-spacing: -0.3px; color: var(--text); flex: 1; }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .points-badge { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--surface); padding: 2px 10px; border-radius: 12px; border: 1px solid var(--border); }
  .date { font-size: 12px; color: var(--text-secondary); font-weight: 500; }

  .view-toolbar { display: flex; gap: 4px; padding: 0 20px 10px; flex-shrink: 0; }
  .view-btn { padding: 6px 14px; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; background: transparent; transition: all 0.12s; }
  .view-btn:hover { background: var(--surface-hover); color: var(--text); }
  .view-btn.active { background: var(--surface); color: var(--text); box-shadow: var(--shadow); }

  .next-action-card { margin: 0 20px 16px; padding: 20px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow); flex-shrink: 0; }
  .na-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .na-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .na-time { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
  .na-btn { padding: 8px 24px; border-radius: 8px; font-size: 14px; font-weight: 500; background: var(--accent); color: #fff; cursor: pointer; transition: background 0.12s; }
  .na-btn:hover { background: var(--accent-hover); }

  .status { display: flex; align-items: center; gap: 8px; padding: 0 20px 10px; font-size: 13px; color: var(--text-secondary); flex-shrink: 0; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); flex-shrink: 0; }
  .status-dot.live { background: var(--accent); box-shadow: 0 0 0 3px rgba(107, 107, 107, 0.2); }
  .status-dot.done { background: var(--complete); }

  .add-trigger { display: flex; align-items: center; gap: 8px; padding: 10px 20px; margin: 0 20px 10px; border: 1px dashed var(--border); border-radius: var(--radius); color: var(--text-secondary); cursor: pointer; font-size: 14px; transition: all 0.15s; flex-shrink: 0; }
  .add-trigger:hover { border-color: var(--accent); color: var(--text); background: var(--surface-hover); }
  .form { padding: 0 20px 10px; flex-shrink: 0; overflow: hidden; }
  .input { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; transition: border-color 0.15s; }
  .input:focus { border-color: var(--accent); }
  .title-input { font-size: 15px; margin-bottom: 10px; }
  .time-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .time-field { flex: 1; }
  .time-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .time-arrow { color: var(--text-muted); font-size: 16px; margin-top: 14px; }
  .time-optional { font-size: 11px; color: var(--text-muted); margin: -6px 0 10px; text-align: center; }
  input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }

  .energy-row { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
  .energy-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; margin-right: 4px; }
  .energy-btn { padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.12s; }
  .energy-btn:hover { border-color: var(--accent); }
  .energy-btn.selected { background: var(--accent); color: #fff; border-color: var(--accent); }

  .form-actions { display: flex; gap: 8px; }
  .btn { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .btn-cancel { background: var(--surface); border: 1px solid var(--border); color: var(--text-secondary); }
  .btn-cancel:hover { background: var(--surface-hover); }
  .btn-save { background: var(--accent); color: #fff; border: 1px solid transparent; }
  .btn-save:hover { background: var(--accent-hover); }
  .btn-save:disabled { opacity: 0.4; cursor: default; }

  .task-list { flex: 1; overflow-y: auto; padding: 0 20px 20px; -webkit-overflow-scrolling: touch; }
  .check { width: 24px; height: 24px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s; background: transparent; padding: 0; }
  .check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .delete { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); flex-shrink: 0; background: transparent; padding: 0; transition: all 0.15s; }
  .delete:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .empty { text-align: center; padding: 40px 20px; color: var(--text-secondary); font-size: 14px; }
  .empty-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

  .timeline { position: relative; margin: 0 0 14px; border-radius: var(--radius); overflow: visible; }
  .timeline-bg { position: absolute; inset: 0; pointer-events: none; }
  .tl-hour { position: absolute; left: 0; right: 0; border-top: 1px solid var(--border); height: 0; }
  .tl-label { position: absolute; left: 0; top: -7px; font-size: 11px; font-weight: 500; color: var(--text-muted); width: 40px; text-align: right; padding-right: 10px; }
  .tl-task { position: absolute; left: 48px; right: 0; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); box-shadow: var(--shadow); transition: height 0.2s, opacity 0.2s; overflow: hidden; }
  .tl-task.completed { opacity: 0.4; }
  .tl-task::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--accent); border-radius: 3px 0 0 3px; }
  .tl-task.completed::before { background: var(--complete); }
  .tl-main { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; cursor: pointer; }
  .tl-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; margin-top: 1px; transition: all 0.2s; background: transparent; padding: 0; }
  .tl-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .tl-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .tl-title { font-size: 13px; font-weight: 500; color: var(--text); line-height: 1.3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-task.completed .tl-title, .us-task.completed .us-title { text-decoration: line-through; color: var(--text-secondary); }
  .tl-time { font-size: 10px; color: var(--text-muted); font-weight: 500; }
  .tl-energy { font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 4px; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.3px; }
  .tl-energy.en-low { background: rgba(100, 100, 200, 0.15); color: #7788cc; }
  .tl-energy.en-med { background: rgba(150, 130, 80, 0.15); color: #b0a070; }
  .tl-energy.en-high { background: rgba(130, 180, 100, 0.15); color: #80a060; }
  .tl-del { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); flex-shrink: 0; background: transparent; padding: 0; transition: all 0.15s; }
  .tl-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .now-line { position: absolute; left: 48px; right: 0; height: 2px; background: var(--accent); z-index: 10; pointer-events: none; }
  .now-line::before { content: ''; position: absolute; left: -6px; top: -4px; width: 10px; height: 10px; border-radius: 50%; background: var(--accent); }

  .unscheduled { border-top: 1px solid var(--border); padding-top: 10px; margin-top: 4px; }
  .us-header { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .us-task { background: var(--surface); border-radius: 8px; margin-bottom: 6px; border: 1px solid var(--border); transition: all 0.15s; overflow: hidden; }
  .us-task.completed { opacity: 0.45; }
  .us-main { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; }
  .us-body { flex: 1; min-width: 0; }
  .us-title { font-size: 14px; font-weight: 500; color: var(--text); }

  .subtask-list { border-top: 1px solid var(--border); padding: 6px 10px 8px 14px; overflow: hidden; }
  .subtask-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .subtask-item.st-done { opacity: 0.5; }
  .st-check { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; background: transparent; padding: 0; transition: all 0.15s; }
  .st-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .st-title { font-size: 12px; color: var(--text-secondary); flex: 1; min-width: 0; }
  .subtask-item.st-done .st-title { text-decoration: line-through; color: var(--text-muted); }
  .st-del { width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; transition: all 0.1s; }
  .st-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .st-add { padding: 4px 0 2px; }
  .st-input { width: 100%; padding: 6px 8px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 12px; }
  .st-input::placeholder { color: var(--text-muted); }
  .st-input:focus { border-color: var(--accent); }

  .view-content { flex: 1; overflow-y: auto; padding: 0 20px 20px; -webkit-overflow-scrolling: touch; }
  .view-title { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 2px; }
  .view-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }

  .inbox-add { display: flex; gap: 8px; margin-bottom: 14px; }
  .inbox-add-btn { padding: 10px 16px; border-radius: 10px; font-size: 14px; font-weight: 500; background: var(--accent); color: #fff; cursor: pointer; transition: background 0.12s; flex-shrink: 0; }
  .inbox-add-btn:hover { background: var(--accent-hover); }
  .inbox-add-btn:disabled { opacity: 0.4; }
  .inbox-list { display: flex; flex-direction: column; gap: 6px; }
  .inbox-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); }
  .inbox-text { flex: 1; font-size: 14px; color: var(--text); }
  .inbox-actions { display: flex; gap: 6px; }
  .inbox-action { padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background: var(--bg); color: var(--text-secondary); cursor: pointer; border: 1px solid var(--border); transition: all 0.12s; }
  .inbox-action:hover { border-color: var(--accent); color: var(--text); }
  .inbox-action.del { padding: 4px 8px; display: flex; align-items: center; }
  .inbox-action.del:hover { border-color: #b06060; color: #b06060; }

  .focus-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; gap: 16px; }
  .timer-digits-wrapper { display: flex; align-items: center; justify-content: center; padding: 20px 0; }
  .timer-digits { font-size: 5rem; font-weight: 700; letter-spacing: 4px; color: var(--text); line-height: 1; font-variant-numeric: tabular-nums; transition: transform 0.15s; user-select: none; }
  .timer-digits.tick { animation: timerPulse 0.2s ease; }
  @keyframes timerPulse { 0% { transform: scale(1); } 40% { transform: scale(1.06); } 100% { transform: scale(1); } }
  .timer-status-text { font-size: 14px; color: var(--text-secondary); font-weight: 500; height: 20px; }
  .presets { display: flex; gap: 8px; }
  .preset-btn { padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; }
  .preset-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--text); }
  .preset-btn.active { background: var(--accent); color: #fff; border-color: var(--accent); }
  .preset-btn:disabled { opacity: 0.3; cursor: default; }
  .timer-controls { display: flex; gap: 8px; }
  .timer-btn { padding: 10px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 6px; }
  .timer-btn.primary { background: var(--accent); color: #fff; border: 1px solid transparent; }
  .timer-btn.primary:hover { background: var(--accent-hover); }
  .timer-btn.primary:disabled { opacity: 0.4; cursor: default; }
  .timer-btn.secondary { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
  .timer-btn.secondary:hover { background: var(--surface-hover); color: var(--text); }
  .just5 { display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 8px 18px; border-radius: 8px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: transparent; border: 1px dashed var(--border); cursor: pointer; transition: all 0.15s; }
  .just5:hover { border-color: var(--accent); color: var(--text); }

  .routine-add-row { display: flex; gap: 8px; margin-bottom: 16px; }
  .routine-select { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; }
  .routine-type-heading { font-size: 14px; font-weight: 600; color: var(--text); margin: 12px 0 8px; }
  .routine-card { background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); margin-bottom: 10px; padding: 12px 14px; }
  .routine-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .routine-title { font-size: 14px; font-weight: 600; color: var(--text); }
  .routine-del { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; }
  .routine-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .routine-items { display: flex; flex-direction: column; gap: 4px; }
  .routine-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .rg-check { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; padding: 0; transition: all 0.15s; flex-shrink: 0; }
  .rg-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .rg-title { font-size: 13px; color: var(--text); flex: 1; }
  .rg-title.rg-done { text-decoration: line-through; color: var(--text-muted); }
  .rg-del { width: 20px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; }
  .rg-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .rg-add { padding: 4px 0; }
  .rg-input { width: 100%; padding: 6px 10px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-size: 12px; }
  .rg-input::placeholder { color: var(--text-muted); }
  .rg-input:focus { border-color: var(--accent); }

  .ritual-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 100; }
  .ritual-card { background: var(--surface); border-radius: 16px; padding: 28px 24px 20px; width: 100%; max-width: 340px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); text-align: center; }
  .ritual-icon { margin-bottom: 12px; display: flex; justify-content: center; }
  .ritual-title { font-size: 20px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .ritual-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
  .ritual-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
  .ritual-input { flex: 1; padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; }
  .ritual-input:focus { border-color: var(--accent); }
  .ritual-add-btn { width: 40px; height: 40px; border-radius: 10px; background: var(--accent); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.15s; }
  .ritual-add-btn:hover { background: var(--accent-hover); }
  .ritual-add-btn:disabled { opacity: 0.4; }
  .ritual-tasks { text-align: left; margin-bottom: 16px; }
  .ritual-task { display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; font-size: 13px; color: var(--text); border-radius: 6px; background: var(--bg); margin-bottom: 4px; }
  .ritual-task.rt-done { opacity: 0.5; text-decoration: line-through; color: var(--text-secondary); }
  .rt-check { color: var(--complete); font-size: 12px; }
  .ritual-actions { display: flex; flex-direction: column; gap: 6px; }
  .ritual-btn { padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s; }
  .ritual-btn.primary { background: var(--accent); color: #fff; border: 1px solid transparent; }
  .ritual-btn.primary:hover { background: var(--accent-hover); }
  .ritual-btn.secondary { background: transparent; color: var(--text-secondary); border: none; font-size: 13px; }
  .ritual-btn.secondary:hover { color: var(--text); }
</style>
