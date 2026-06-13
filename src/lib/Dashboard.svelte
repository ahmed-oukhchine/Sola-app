<script>
  import { CalendarDays, Inbox, Crosshair, TrendingUp } from 'lucide-svelte'
  import { store, addTask, loadPoints, computeStreak } from './taskStore.svelte.js'

  let { onNavigate } = $props()

  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let title = $state('')

  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let todayTasks = $derived(store.tasks.filter(t => t.date === todayStr))
  let completedCount = $derived(todayTasks.filter(t => t.completed).length)
  let totalCount = $derived(todayTasks.length)
  let completionRate = $derived(totalCount ? Math.round(completedCount / totalCount * 100) : 0)
  let recentCompletions = $derived(store.tasks.filter(t => t.completed).reverse().slice(0, 5))

  function handleSubmit() {
    if (!title.trim()) return
    addTask(title.trim())
    title = ''
  }

  let now = $state(new Date())
  let currentTask = $derived(todayTasks.find(t => {
    if (t.completed) return false
    if (!t.startTime || t.unscheduled) return false
    const [sh, sm] = t.startTime.split(':').map(Number)
    const [eh, em] = t.endTime ? t.endTime.split(':').map(Number) : [0, 0]
    const n = now.getHours() * 60 + now.getMinutes()
    return n >= sh * 60 + sm && n < eh * 60 + em
  }))

  $effect(() => {
    const iv = setInterval(() => { now = new Date(); points = loadPoints(); streak = computeStreak() }, 30000)
    return () => clearInterval(iv)
  })
</script>

<div class="view-content">
  <h2 class="view-title">Dashboard</h2>
  <p class="view-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

  <div class="stats-grid" style="margin-bottom:16px">
    <div class="stat-card"><span class="stat-num">✦{points}</span><span class="stat-label">Points</span></div>
    <div class="stat-card"><span class="stat-num">🔥{streak}</span><span class="stat-label">Day streak</span></div>
    <div class="stat-card"><span class="stat-num">{completedCount}/{totalCount}</span><span class="stat-label">Today</span></div>
    <div class="stat-card"><span class="stat-num">{completionRate}%</span><span class="stat-label">Rate</span></div>
  </div>

  {#if currentTask}
    <div class="db-card db-current">
      <span class="db-label">Now</span>
      <span class="db-value">{currentTask.title}</span>
    </div>
  {/if}

  <div class="db-quick-add">
    <input type="text" class="input" placeholder="Quick add a task..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleSubmit() }} />
    <button class="inbox-add-btn" onclick={handleSubmit} disabled={!title.trim()}>Add</button>
  </div>

  <div class="db-actions">
    <button class="db-action-btn" onclick={() => onNavigate('today')}>
      <CalendarDays size={16} strokeWidth={1.5} />
      Today
    </button>
    <button class="db-action-btn" onclick={() => onNavigate('inbox')}>
      <Inbox size={16} strokeWidth={1.5} />
      Inbox
    </button>
    <button class="db-action-btn" onclick={() => onNavigate('focus')}>
      <Crosshair size={16} strokeWidth={1.5} />
      Focus
    </button>
    <button class="db-action-btn" onclick={() => onNavigate('stats')}>
      <TrendingUp size={16} strokeWidth={1.5} />
      Stats
    </button>
  </div>

  <h3 class="db-section-title">Recent</h3>
  {#if recentCompletions.length === 0}
    <div class="empty"><p>No completions yet</p></div>
  {:else}
    <div class="inbox-list">
      {#each recentCompletions as t (t.id)}
        <div class="inbox-item">
          <span class="inbox-text">&#10003; {t.title}</span>
          <span class="date db-date">{t.date}</span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .db-card { display: flex; align-items: center; gap: 12px; padding: 18px 20px; background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 14px; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .db-card:hover { box-shadow: var(--shadow-sm); border-color: var(--accent-subtle); }
  .db-current { border-left: 4px solid var(--accent); box-shadow: 0 2px 16px rgba(212, 165, 116, 0.08); }
  .db-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
  .db-value { font-size: 16px; font-weight: 500; color: var(--text); flex: 1; }
  .db-quick-add { display: flex; gap: 10px; margin-bottom: 16px; }
  .db-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 24px; }
  .db-action-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .db-action-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(212, 165, 116, 0.1); }
  .db-action-btn:active { transform: scale(0.97); }
  .db-section-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
  .db-date { font-size: 12px; color: var(--text-muted); }
</style>
