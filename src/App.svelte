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

  let dayStr = $derived(
    new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  )

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
</script>

<div class="app">
  <header class="header">
    <h1 class="logo">focus</h1>
    <span class="date">{dayStr}</span>
  </header>

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
    padding: 20px 20px 12px;
    flex-shrink: 0;
  }

  .logo {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: var(--text);
  }

  .date {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px 16px;
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
</style>
