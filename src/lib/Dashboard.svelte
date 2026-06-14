<script>
  import { CalendarDays, Inbox, Crosshair, TrendingUp, Flame, Star, Check, GripVertical, Settings, X, Clock } from 'lucide-svelte'
  import { store, addTask, loadPoints, computeStreak } from './taskStore.svelte.js'

  let { onNavigate } = $props()

  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let level = $derived(Math.floor(points / 100) + 1)
  let levelProgress = $derived(points % 100)
  let title = $state('')

  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let todayTasks = $derived(store.tasks.filter(t => t.date === todayStr))
  let completedCount = $derived(todayTasks.filter(t => t.completed).length)
  let totalCount = $derived(todayTasks.length)
  let completionRate = $derived(totalCount ? Math.round(completedCount / totalCount * 100) : 0)
  let recentCompletions = $derived(store.tasks.filter(t => t.completed).reverse().slice(0, 5))

  let now = $state(new Date())
  let currentTask = $derived(todayTasks.find(t => {
    if (t.completed) return false
    if (!t.startTime || t.unscheduled) return false
    const [sh, sm] = t.startTime.split(':').map(Number)
    const [eh, em] = t.endTime ? t.endTime.split(':').map(Number) : [0, 0]
    const n = now.getHours() * 60 + now.getMinutes()
    return n >= sh * 60 + sm && n < eh * 60 + em
  }))

  let upcomingScheduled = $derived(
    todayTasks.filter(t => !t.completed && t.startTime && !t.unscheduled)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4)
  )

  const WIDGET_META = {
    stats: { label: 'Stats' },
    current: { label: 'Current Task' },
    'quick-add': { label: 'Quick Add' },
    nav: { label: 'Navigation' },
    recent: { label: 'Recent' },
    upcoming: { label: 'Upcoming' }
  }

  const DEFAULT_ORDER = ['stats', 'current', 'quick-add', 'nav', 'recent']
  const ALL_IDS = Object.keys(WIDGET_META)

  let widgetOrder = $state(JSON.parse(localStorage.getItem('focus-db-widgets') || JSON.stringify(DEFAULT_ORDER)))
  let enabledWidgets = $state(JSON.parse(localStorage.getItem('focus-db-enabled') || '{"stats":true,"current":true,"quick-add":true,"nav":true,"recent":true,"upcoming":true}'))

  let showConfig = $state(false)

  function saveState() {
    localStorage.setItem('focus-db-widgets', JSON.stringify(widgetOrder))
    localStorage.setItem('focus-db-enabled', JSON.stringify(enabledWidgets))
  }

  function toggleWidget(id) {
    enabledWidgets = { ...enabledWidgets, [id]: !enabledWidgets[id] }
    saveState()
  }

  let visibleWidgets = $derived(widgetOrder.filter(id => enabledWidgets[id]))

  function timeDisplay(t) {
    if (!t) return ''
    const [h, m] = t.split(':').map(Number)
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`
  }

  function handleSubmit() {
    if (!title.trim()) return
    addTask(title.trim())
    title = ''
  }

  let dragId = $state(null)
  let dragOverId = $state(null)
  let dragging = $state(false)

  function ptrDown(e, id) {
    dragId = id
    dragging = true
    e.preventDefault()
  }

  function ptrMove(e) {
    if (!dragging || !dragId) return
    const container = document.querySelector('.db-widgets')
    if (!container) return
    const cards = [...container.querySelectorAll('.db-widget')]
    let over = null
    for (const c of cards) {
      const r = c.getBoundingClientRect()
      if (e.clientY >= r.top && e.clientY <= r.bottom) {
        over = c.dataset.widget
        break
      }
    }
    dragOverId = over
  }

  function ptrUp() {
    if (!dragging || !dragId || !dragOverId || dragId === dragOverId) {
      dragId = null; dragOverId = null; dragging = false
      return
    }
    const from = visibleWidgets.indexOf(dragId)
    const to = visibleWidgets.indexOf(dragOverId)
    if (from !== -1 && to !== -1) {
      const newOrder = [...widgetOrder]
      const fromFull = newOrder.indexOf(dragId)
      const toFull = newOrder.indexOf(dragOverId)
      if (fromFull !== -1 && toFull !== -1) {
        const [moved] = newOrder.splice(fromFull, 1)
        newOrder.splice(toFull, 0, moved)
        widgetOrder = newOrder
        saveState()
      }
    }
    dragId = null; dragOverId = null; dragging = false
  }

  $effect(() => {
    if (!dragging) return
    const onMove = (e) => ptrMove(e)
    const onUp = () => ptrUp()
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  })

  $effect(() => {
    const iv = setInterval(() => { now = new Date(); points = loadPoints(); streak = computeStreak() }, 30000)
    return () => clearInterval(iv)
  })
</script>

<div class="view-content">
  <div class="db-header">
    <div>
      <h2 class="view-title" style="margin-bottom:0">Dashboard</h2>
      <p class="view-sub" style="margin-bottom:0">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
    </div>
    <button class="db-config-btn" onclick={() => showConfig = !showConfig} aria-label="Configure widgets">
      <Settings size={16} strokeWidth={1.5} />
    </button>
  </div>

  {#if showConfig}
    <div class="db-config" transition:fly={{ y: -8, duration: 200, opacity: 0 }}>
      <div class="db-config-header">
        <span class="db-config-title">Widgets</span>
        <button class="db-config-close" onclick={() => showConfig = false}><X size={14} strokeWidth={1.5} /></button>
      </div>
      <div class="db-config-grid">
        {#each ALL_IDS as id}
          <button class="db-config-chip" class:on={enabledWidgets[id]} onclick={() => toggleWidget(id)}>
            {#if id === 'stats'}<Star size={12} strokeWidth={1.5} />
            {:else if id === 'current'}<Clock size={12} strokeWidth={1.5} />
            {:else if id === 'quick-add'}<TrendingUp size={12} strokeWidth={1.5} />
            {:else if id === 'nav'}<CalendarDays size={12} strokeWidth={1.5} />
            {:else if id === 'recent'}<Check size={12} strokeWidth={1.5} />
            {:else if id === 'upcoming'}<Clock size={12} strokeWidth={1.5} />
            {/if}
            {WIDGET_META[id].label}
          </button>
        {/each}
      </div>
      <p class="db-config-hint">Drag ⋮ to reorder widgets</p>
    </div>
  {/if}

  <div class="db-widgets">
    {#each visibleWidgets as wid (wid)}
      <div class="db-widget" class:dragging={dragId === wid} class:drag-over={dragOverId === wid} data-widget={wid}>
        <div class="db-widget-header">
          <button class="db-drag" onpointerdown={(e) => ptrDown(e, wid)} aria-label="Drag to reorder">
            <GripVertical size={14} strokeWidth={1.5} />
          </button>
          <span class="db-widget-label">{WIDGET_META[wid].label}</span>
        </div>

        <div class="db-widget-body">
          {#if wid === 'stats'}
            <div class="stats-grid" style="margin:0">
              <div class="stat-card" style="padding:20px 16px">
                <span class="stat-num" style="font-size:30px"><Star size={18} strokeWidth={1.5} />{points}</span>
                <span class="stat-label" style="margin-top:6px">Level {level}</span>
                <div class="level-bar"><div class="level-fill" style="width:{levelProgress}%"></div></div>
              </div>
              <div class="stat-card" style="padding:20px 16px">
                <span class="stat-num" style="font-size:30px"><Flame size={18} strokeWidth={1.5} />{streak}</span>
                <span class="stat-label" style="margin-top:6px">Day streak</span>
              </div>
              <div class="stat-card" style="padding:20px 16px">
                <span class="stat-num" style="font-size:30px">{completedCount}<span style="font-size:16px;color:var(--text-muted)">/{totalCount}</span></span>
                <span class="stat-label" style="margin-top:6px">Today</span>
              </div>
              <div class="stat-card" style="padding:20px 16px">
                <span class="stat-num" style="font-size:30px">{completionRate}<span style="font-size:16px;color:var(--text-muted)">%</span></span>
                <span class="stat-label" style="margin-top:6px">Rate</span>
              </div>
            </div>

          {:else if wid === 'current'}
            {#if currentTask}
              <div class="db-current-row">
                <span class="db-current-dot"></span>
                <span class="db-current-title">{currentTask.title}</span>
                <span class="db-current-time">{timeDisplay(currentTask.startTime)}–{timeDisplay(currentTask.endTime)}</span>
              </div>
            {:else}
              <div class="db-current-empty">No active task — check your <button class="empty-link" onclick={() => onNavigate('today')}>Today</button> view</div>
            {/if}

          {:else if wid === 'quick-add'}
            <div class="db-quick-row">
              <input type="text" class="input" placeholder="Quick add a task..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleSubmit() }} />
              <button class="inbox-add-btn" onclick={handleSubmit} disabled={!title.trim()}>Add</button>
            </div>

          {:else if wid === 'nav'}
            <div class="db-nav-grid">
              <button class="db-nav-btn" onclick={() => onNavigate('today')}>
                <CalendarDays size={16} strokeWidth={1.5} />
                <span>Today</span>
              </button>
              <button class="db-nav-btn" onclick={() => onNavigate('inbox')}>
                <Inbox size={16} strokeWidth={1.5} />
                <span>Inbox</span>
              </button>
              <button class="db-nav-btn" onclick={() => onNavigate('focus')}>
                <Crosshair size={16} strokeWidth={1.5} />
                <span>Focus</span>
              </button>
              <button class="db-nav-btn" onclick={() => onNavigate('stats')}>
                <TrendingUp size={16} strokeWidth={1.5} />
                <span>Stats</span>
              </button>
            </div>

          {:else if wid === 'recent'}
            {#if recentCompletions.length === 0 && todayTasks.length === 0}
              <div class="db-recent-empty">
                <p>Welcome to Sola — add your first task above</p>
              </div>
            {:else if recentCompletions.length === 0}
              <div class="db-recent-empty">
                <p>No completions yet today — you have {todayTasks.length} planned</p>
              </div>
            {:else}
              <div class="db-recent-list">
                {#each recentCompletions as t (t.id)}
                  <div class="db-recent-item">
                    <span class="db-recent-check"><Check size={12} strokeWidth={1.5} /></span>
                    <span class="db-recent-text">{t.title}</span>
                    <span class="db-recent-date">{t.date}</span>
                  </div>
                {/each}
              </div>
            {/if}

          {:else if wid === 'upcoming'}
            {#if upcomingScheduled.length === 0}
              <div class="db-recent-empty">
                <p>No more tasks scheduled for today</p>
              </div>
            {:else}
              <div class="db-upcoming-list">
                {#each upcomingScheduled as t (t.id)}
                  <div class="db-upcoming-item">
                    <span class="db-upcoming-time">{timeDisplay(t.startTime)}</span>
                    <span class="db-upcoming-title">{t.title}</span>
                  </div>
                {/each}
              </div>
            {/if}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .db-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
  .db-config-btn { width: 36px; height: 36px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.2s var(--ease); flex-shrink: 0; margin-top: 4px; }
  .db-config-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }

  .db-config { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px 18px; margin-bottom: 16px; overflow: hidden; }
  .db-config-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .db-config-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .db-config-close { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; transition: all 0.15s var(--ease); }
  .db-config-close:hover { background: var(--surface-hover); color: var(--text); }
  .db-config-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
  .db-config-chip { display: flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .db-config-chip:hover { border-color: var(--accent-subtle); }
  .db-config-chip.on { background: var(--accent-subtle); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.2); }
  .db-config-hint { font-size: 11px; color: var(--text-muted); }

  .db-widgets { display: flex; flex-direction: column; gap: 12px; }
  .db-widget { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .db-widget:hover { border-color: var(--accent-subtle); box-shadow: 0 2px 16px rgba(0,0,0,0.15); }
  .db-widget.dragging { opacity: 0.4; }
  .db-widget.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-subtle); }
  .db-widget-header { display: flex; align-items: center; gap: 8px; padding: 10px 14px 0; }
  .db-drag { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: grab; color: var(--text-muted); background: transparent; border: none; padding: 0; transition: all 0.15s var(--ease); touch-action: none; }
  .db-drag:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .db-drag:active { cursor: grabbing; }
  .db-widget-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .db-widget-body { padding: 10px 14px 14px; }

  .db-current-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
  .db-current-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); flex-shrink: 0; box-shadow: 0 0 0 4px var(--accent-subtle); animation: pulse 2s infinite; }
  .db-current-title { font-size: 15px; font-weight: 500; color: var(--text); flex: 1; }
  .db-current-time { font-size: 12px; color: var(--text-muted); }
  .db-current-empty { font-size: 14px; color: var(--text-secondary); padding: 6px 0; }
  .empty-link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: inherit; font-weight: 500; padding: 0; text-decoration: underline; text-underline-offset: 2px; }
  .empty-link:hover { color: var(--accent-hover); }

  .db-quick-row { display: flex; gap: 10px; }

  .db-nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .db-nav-btn { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .db-nav-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); transform: translateY(-1px); }
  .db-nav-btn:active { transform: scale(0.97); }

  .db-recent-empty { font-size: 14px; color: var(--text-secondary); padding: 6px 0; }
  .db-recent-list { display: flex; flex-direction: column; gap: 6px; }
  .db-recent-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
  .db-recent-item:last-child { border-bottom: none; }
  .db-recent-check { flex-shrink: 0; color: var(--complete); }
  .db-recent-text { flex: 1; font-size: 14px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .db-recent-date { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }

  .db-upcoming-list { display: flex; flex-direction: column; gap: 6px; }
  .db-upcoming-item { display: flex; align-items: center; gap: 12px; padding: 6px 0; border-bottom: 1px solid var(--border-light); }
  .db-upcoming-item:last-child { border-bottom: none; }
  .db-upcoming-time { font-size: 12px; font-weight: 600; color: var(--text-secondary); font-variant-numeric: tabular-nums; min-width: 44px; }
  .db-upcoming-title { font-size: 14px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .level-bar { width: 100%; height: 3px; background: var(--border); border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .level-fill { height: 100%; background: var(--accent-gradient); border-radius: 2px; transition: width 0.3s var(--ease); }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
