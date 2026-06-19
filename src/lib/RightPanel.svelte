<script>
  import { Star, Flame, Sparkles, Circle, Plus, Crosshair, ListTodo, Timer } from 'lucide-svelte'
  import { addTask } from './taskStore.svelte.js'

  let { activeView, points, streak, now, todayTasks = [], completedCount, onNavigate, onStartFocus, onOpenDopamine } = $props()

  let newTask = $state('')

  function handleQuickAdd() {
    if (!newTask.trim()) return
    addTask(newTask.trim())
    newTask = ''
  }

  let totalToday = $derived(todayTasks.length)
  let progress = $derived(totalToday > 0 ? completedCount / totalToday : 0)
  let upcoming = $derived(todayTasks.filter(t => !t.completed).slice(0, 5))

  let dayName = $derived(now.toLocaleDateString('en-US', { weekday: 'long' }))
  let monthDay = $derived(now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }))
</script>

<div class="right-panel">
  <div class="rp-header">
    <h2 class="rp-day">{dayName}</h2>
    <span class="rp-date">{monthDay}</span>
  </div>

  <div class="rp-section">
    <div class="rp-section-title">
      <ListTodo size={14} strokeWidth={1.5} />
      Today's progress
    </div>
    <div class="rp-progress-bar">
      <div class="rp-progress-fill" style="width:{Math.round(progress * 100)}%"></div>
    </div>
    <div class="rp-progress-label">
      {completedCount} / {totalToday} tasks
    </div>
  </div>

  <div class="rp-section">
    <div class="rp-section-title">
      <Timer size={14} strokeWidth={1.5} />
      Quick add
    </div>
    <div class="rp-quick-add">
      <input
        type="text"
        class="rp-input"
        placeholder="Add a task..."
        bind:value={newTask}
        onkeydown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
      />
      <button class="rp-add-btn" onclick={handleQuickAdd} disabled={!newTask.trim()}>
        <Plus size={16} strokeWidth={1.5} />
      </button>
    </div>
  </div>

  {#if upcoming.length > 0}
    <div class="rp-section">
      <div class="rp-section-title">
        <Circle size={14} strokeWidth={1.5} />
        Upcoming
      </div>
      <div class="rp-task-list">
        {#each upcoming as task, i}
          <button class="rp-task" onclick={() => onNavigate('today')}>
            <span class="rp-task-num">{i + 1}</span>
            <span class="rp-task-text">{task.title}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <div class="rp-actions">
    <button class="rp-action-btn" onclick={() => onStartFocus(null)}>
      <Crosshair size={16} strokeWidth={1.5} />
      Focus
    </button>
    <button class="rp-action-btn accent" onclick={onOpenDopamine}>
      <Sparkles size={16} strokeWidth={1.5} />
      Boost
    </button>
  </div>

  <div class="rp-footer">
    <span class="rp-stat"><Star size={13} strokeWidth={1.5} /> {points} pts</span>
    <span class="rp-stat"><Flame size={13} strokeWidth={1.5} /> {streak} day streak</span>
  </div>
</div>

<style>
  .right-panel {
    width: 260px;
    min-width: 260px;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-left: 0.5px solid var(--border);
    padding: 0 12px;
    gap: 4px;
    height: 100vh;
    overflow-y: auto;
  }
  .rp-header {
    padding: 20px 12px 8px;
    padding-top: calc(20px + env(safe-area-inset-top, 0px));
    flex-shrink: 0;
  }
  .rp-day {
    font-size: 22px;
    font-weight: 650;
    letter-spacing: -0.5px;
    color: var(--text);
    line-height: 1.2;
  }
  .rp-date {
    font-size: 13px;
    color: var(--text-muted);
    font-weight: 400;
  }
  .rp-section {
    padding: 0 4px;
    margin-bottom: 4px;
  }
  .rp-section-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 8px 6px;
  }
  .rp-progress-bar {
    height: 4px;
    background: var(--surface);
    border-radius: 2px;
    overflow: hidden;
    margin: 0 8px;
  }
  .rp-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.3s var(--ease);
  }
  .rp-progress-label {
    font-size: 11px;
    color: var(--text-muted);
    padding: 4px 8px 0;
    font-weight: 500;
  }
  .rp-quick-add {
    display: flex;
    gap: 6px;
    padding: 0 8px;
  }
  .rp-input {
    flex: 1;
    padding: 8px 12px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    outline: none;
    font-family: inherit;
  }
  .rp-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(var(--accent-rgb), 0.15);
  }
  .rp-input::placeholder { color: var(--text-muted); }
  .rp-add-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: #fff;
    border: none;
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.15s var(--ease);
  }
  .rp-add-btn:hover { opacity: 0.85; filter: brightness(1.1); }
  .rp-add-btn:disabled { opacity: 0.3; cursor: default; }
  .rp-task-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 8px;
  }
  .rp-task {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    border: none;
    text-align: left;
    width: 100%;
    transition: background 0.12s var(--ease);
  }
  .rp-task:hover { background: var(--surface-hover); }
  .rp-task-num {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    width: 16px;
    flex-shrink: 0;
  }
  .rp-task-text {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rp-actions {
    display: flex;
    gap: 6px;
    padding: 8px;
    margin-top: auto;
  }
  .rp-action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    background: var(--surface);
    color: var(--text-secondary);
    border: none;
    cursor: pointer;
    transition: all 0.15s var(--ease);
  }
  .rp-action-btn:hover { background: var(--surface-hover); color: var(--text); }
  .rp-action-btn.accent { background: var(--accent-subtle); color: var(--accent); }
  .rp-action-btn.accent:hover { background: rgba(var(--accent-rgb), 0.2); }
  .rp-footer {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 8px 8px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid var(--border);
    margin-top: 4px;
  }
  .rp-stat {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 4px;
  }
</style>
