<script>
  import { fly } from 'svelte/transition'
  import { CalendarDays, Inbox, Crosshair, TrendingUp, Flame, Star, Check, GripVertical, Settings, X, Clock, Zap } from 'lucide-svelte'
  import { store, addTask, loadPoints, computeStreak, computeMomentum, focusSessions } from './taskStore.svelte.js'

  let { onNavigate } = $props()

  let lastVisit = $state(localStorage.getItem('focus-last-visit') || '')
  let today = new Date().toISOString().split('T')[0]
  let daysAway = $derived.by(() => {
    if (!lastVisit) return 0
    const diff = (new Date(today).getTime() - new Date(lastVisit).getTime()) / 86400000
    return Math.floor(diff)
  })
  let rebound = $derived(daysAway >= 3 && daysAway < 60)
  let reboundDays = $derived(daysAway)

  $effect(() => {
    localStorage.setItem('focus-last-visit', today)
  })

  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let momentum = $derived(computeMomentum())
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
    upcoming: { label: 'Upcoming' },
    starred: { label: 'Starred' },
    'micro-wins': { label: 'Micro-Wins' },
    sessions: { label: 'Sessions' },
    random: { label: 'Random Task' }
  }
  let starredTasks = $derived(store.tasks.filter(t => t.highlight).reverse())
  let randomTask = $state(null)
  function pickRandom() {
    const undone = store.tasks.filter(t => !t.completed)
    if (undone.length === 0) { randomTask = null; return }
    randomTask = undone[Math.floor(Math.random() * undone.length)]
  }
  let recentSessions = $derived([...focusSessions.items].reverse().slice(0, 5))
  let microWins = $state(JSON.parse(localStorage.getItem('focus-micro-wins') || '[]'))
  let winText = $state('')
  function addWin() {
    if (!winText.trim()) return
    microWins = [{ id: Date.now(), text: winText.trim(), date: todayStr }, ...microWins]
    localStorage.setItem('focus-micro-wins', JSON.stringify(microWins))
    winText = ''
  }
  function removeWin(id) {
    microWins = microWins.filter(w => w.id !== id)
    localStorage.setItem('focus-micro-wins', JSON.stringify(microWins))
  }
  let pastAffirmation = $derived.by(() => {
    const past = store.tasks.filter(t => t.completed && t.date !== todayStr)
    if (past.length === 0) return null
    const seed = todayStr.split('-').reduce((a, c) => a + c.charCodeAt(0), 0)
    return past[seed % past.length]
  })

  const DEFAULT_ORDER = ['stats', 'current', 'quick-add', 'nav', 'recent']
  const ALL_IDS = Object.keys(WIDGET_META)

  let widgetOrder = $state(JSON.parse(localStorage.getItem('focus-db-widgets') || JSON.stringify(DEFAULT_ORDER)))
  let enabledWidgets = $state(JSON.parse(localStorage.getItem('focus-db-enabled') || '{"stats":true,"current":true,"quick-add":true,"nav":true,"recent":true,"upcoming":true,"starred":true,"micro-wins":true,"sessions":true,"random":true}'))

  let showConfig = $state(false)

  function closeConfig() { showConfig = false }

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

  {#if pastAffirmation}
    <div class="affirmation-banner" transition:fly={{ y: -6, duration: 300, opacity: 0 }}>
      <div class="affirmation-icon">&#127775;</div>
      <div class="affirmation-text">
        <strong>Past you did this:</strong> {pastAffirmation.title}
        <span class="affirmation-date">— {pastAffirmation.date}</span>
      </div>
    </div>
  {/if}
  {#if rebound}
    <div class="rebound-banner" transition:fly={{ y: -6, duration: 300, opacity: 0 }}>
      <div class="rebound-icon">&#127800;</div>
      <div class="rebound-text">
        <strong>Welcome back!</strong> It's been {reboundDays} day{reboundDays !== 1 ? 's' : ''}. No pressure — pick one small thing.
      </div>
    </div>
  {/if}

  {#if showConfig}
    <div class="db-config" transition:fly={{ y: -8, duration: 200, opacity: 0 }}>
      <div class="db-config-header">
        <span class="db-config-title">Widgets</span>
        <button class="db-config-close" onclick={closeConfig}><X size={14} strokeWidth={1.5} /></button>
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
            {:else if id === 'starred'}<Star size={12} strokeWidth={1.5} />
            {:else if id === 'micro-wins'}<Zap size={12} strokeWidth={1.5} />
            {:else if id === 'sessions'}<Clock size={12} strokeWidth={1.5} />
            {:else if id === 'random'}<Zap size={12} strokeWidth={1.5} />
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
              <div class="stat-card" style="padding:14px 12px">
                <span class="stat-num" style="font-size:22px"><Star size={14} strokeWidth={1.5} />{points}</span>
                <span class="stat-label" style="margin-top:3px">Level {level}</span>
                <div class="level-bar"><div class="level-fill" style="width:{levelProgress}%"></div></div>
              </div>
              <div class="stat-card" style="padding:14px 12px">
                <span class="stat-num" style="font-size:22px"><Flame size={14} strokeWidth={1.5} />{streak}</span>
                <span class="stat-label" style="margin-top:3px">Day streak</span>
                <div class="chain-row">{#each Array(Math.min(streak, 30)) as _, i}<span class="chain-link" style="--i:{i};animation-delay:{i * 0.05}s"></span>{/each}{#if streak > 30}<span class="chain-more">+{streak - 30}</span>{/if}</div>
              </div>
              <div class="stat-card" style="padding:14px 12px">
                <span class="stat-num" style="font-size:22px">{completedCount}<span style="font-size:14px;color:var(--text-muted)">/{totalCount}</span></span>
                <span class="stat-label" style="margin-top:3px">Today</span>
              </div>
              <div class="stat-card" style="padding:14px 12px">
                <span class="stat-num" style="font-size:22px">{completionRate}<span style="font-size:14px;color:var(--text-muted)">%</span></span>
                <span class="stat-label" style="margin-top:3px">Rate</span>
              </div>
              <div class="stat-card" style="padding:14px 12px">
                <span class="stat-num" style="font-size:22px;color:{momentum < 30 ? 'var(--danger)' : momentum > 70 ? 'var(--complete)' : 'var(--text)'}">{momentum}</span>
                <span class="stat-label" style="margin-top:3px">Momentum</span>
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

          {:else if wid === 'starred'}
            {#if starredTasks.length === 0}
              <div class="db-recent-empty">
                <p>Star a task from Today to see it here</p>
              </div>
            {:else}
              <div class="db-starred-list">
                {#each starredTasks as t (t.id)}
                  <div class="db-starred-item">
                    <span class="db-starred-icon"><Star size={11} strokeWidth={1.5} fill="currentColor" /></span>
                    <span class="db-starred-title">{t.title}</span>
                    <span class="db-starred-date">{t.date}</span>
                  </div>
                {/each}
              </div>
            {/if}

          {:else if wid === 'sessions'}
            {#if recentSessions.length === 0}
              <div class="db-recent-empty"><p>No focus sessions yet — start a timer in Focus</p></div>
            {:else}
              <div class="db-session-list">
                {#each recentSessions as s (s.id)}
                  <div class="db-session-item">
                    <span class="db-session-icon">{s.type === 'sprint' ? '⚡' : '🎯'}</span>
                    <span class="db-session-min">{s.minutes}m</span>
                    <span class="db-session-date">{s.date}</span>
                  </div>
                {/each}
              </div>
            {/if}

          {:else if wid === 'random'}
            {#if randomTask}
              <div class="db-random-row">
                <span class="db-random-title">{randomTask.title}</span>
                <span class="db-random-date">{randomTask.date}</span>
                <button class="db-random-btn" onclick={pickRandom}>Another</button>
              </div>
            {:else}
              <div class="db-random-row">
                <span class="db-random-empty">Pick a random undone task</span>
                <button class="db-random-btn" onclick={pickRandom}>Pick</button>
              </div>
            {/if}

          {:else if wid === 'micro-wins'}
            <div class="db-win-row">
              <input type="text" class="input" placeholder="A small win..." bind:value={winText} onkeydown={(e) => { if (e.key === 'Enter') addWin() }} />
              <button class="inbox-add-btn" onclick={addWin} disabled={!winText.trim()}>Log</button>
            </div>
            {#if microWins.length === 0}
              <div class="db-recent-empty"><p>No micro-wins yet — log your first small win!</p></div>
            {:else}
              <div class="db-win-list">
                {#each microWins as w (w.id)}
                  <div class="db-win-item">
                    <span class="db-win-icon">&#127775;</span>
                    <span class="db-win-text">{w.text}</span>
                    <button class="db-win-del" onclick={() => removeWin(w.id)} aria-label="Remove"><X size={10} strokeWidth={1.5} /></button>
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
  .db-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
  .db-config-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: 1px solid var(--border); padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; margin-top: 4px; }
  .db-config-btn:hover { color: var(--accent); border-color: var(--accent-subtle); }

  .db-config { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px; }
  .db-config-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .db-config-title { font-size: 13px; font-weight: 600; color: var(--text); }
  .db-config-close { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; transition: all 0.15s var(--ease); }
  .db-config-close:hover { background: var(--surface-hover); color: var(--text); }
  .db-config-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
  .db-config-chip { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .db-config-chip:hover { border-color: var(--accent-subtle); }
  .db-config-chip.on { background: var(--accent-subtle); color: var(--accent); border-color: transparent; }
  .db-config-hint { font-size: 11px; color: var(--text-muted); }

  .db-widgets { display: flex; flex-direction: column; gap: 8px; }
  .db-widget { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); overflow: hidden; transition: all 0.15s var(--ease); }
  .db-widget:hover { border-color: var(--border); background: var(--surface-hover); }
  .db-widget.dragging { opacity: 0.4; }
  .db-widget.drag-over { border-color: var(--accent); }
  .db-widget-header { display: flex; align-items: center; gap: 6px; padding: 8px 12px 0; }
  .db-drag { width: 24px; height: 24px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: grab; color: var(--text-muted); background: transparent; border: none; padding: 0; transition: all 0.15s var(--ease); touch-action: none; }
  .db-drag:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .db-drag:active { cursor: grabbing; }
  .db-widget-label { font-size: 9px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .db-widget-body { padding: 6px 12px 10px; }

  .db-current-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
  .db-current-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; box-shadow: 0 0 0 3px var(--accent-subtle); animation: pulse 2s infinite; }
  .db-current-title { font-size: 14px; font-weight: 500; color: var(--text); flex: 1; }
  .db-current-time { font-size: 11px; color: var(--text-muted); }
  .db-current-empty { font-size: 13px; color: var(--text-secondary); padding: 2px 0; }
  .empty-link { background: none; border: none; color: var(--accent); cursor: pointer; font-size: inherit; font-weight: 500; padding: 0; }
  .empty-link:hover { opacity: 0.8; }

  .db-quick-row { display: flex; gap: 6px; }
  .db-quick-row .input { padding: 10px 14px; font-size: 14px; }

  .db-nav-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
  .db-nav-btn { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 8px; border-radius: 8px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .db-nav-btn:hover { color: var(--accent); border-color: var(--accent-subtle); background: var(--accent-subtle); }
  .db-nav-btn:active { transform: scale(0.97); }

  .db-recent-empty { font-size: 13px; color: var(--text-secondary); padding: 3px 0; }
  .db-recent-list { display: flex; flex-direction: column; gap: 2px; }
  .db-recent-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 0.5px solid var(--border-light); }
  .db-recent-item:last-child { border-bottom: none; }
  .db-recent-check { flex-shrink: 0; color: var(--complete); }
  .db-recent-text { flex: 1; font-size: 13px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .db-recent-date { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }

  .db-upcoming-list { display: flex; flex-direction: column; gap: 4px; }
  .db-upcoming-item { display: flex; align-items: center; gap: 10px; padding: 4px 0; border-bottom: 0.5px solid var(--border-light); }
  .db-upcoming-item:last-child { border-bottom: none; }
  .db-upcoming-time { font-size: 11px; font-weight: 600; color: var(--text-secondary); font-variant-numeric: tabular-nums; min-width: 40px; }
  .db-upcoming-title { font-size: 13px; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .db-starred-list { display: flex; flex-direction: column; gap: 2px; }
  .db-starred-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 0.5px solid var(--border-light); }
  .db-starred-item:last-child { border-bottom: none; }
  .db-starred-icon { flex-shrink: 0; color: var(--accent); }
  .db-starred-title { flex: 1; font-size: 13px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .db-starred-date { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
  .db-win-row { display: flex; gap: 6px; margin-bottom: 6px; }
  .db-win-row .input { padding: 8px 12px; font-size: 13px; }
  .inbox-add-btn { padding: 8px 16px; border-radius: var(--radius-md); font-size: 12px; font-weight: 500; background: var(--accent); color: #fff; border: none; cursor: pointer; transition: all 0.2s var(--ease); white-space: nowrap; }
  .inbox-add-btn:disabled { opacity: 0.3; cursor: default; }
  .db-win-list { display: flex; flex-direction: column; gap: 2px; }
  .db-win-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 0.5px solid var(--border-light); }
  .db-win-item:last-child { border-bottom: none; }
  .db-win-icon { flex-shrink: 0; font-size: 12px; }
  .db-win-text { flex: 1; font-size: 13px; color: var(--text); }
  .db-win-del { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: transparent; border: none; cursor: pointer; padding: 0; transition: all 0.15s var(--ease); }
  .db-win-del:hover { background: var(--danger-bg); color: var(--danger); }
  .db-session-list { display: flex; flex-direction: column; gap: 2px; }
  .db-session-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; border-bottom: 0.5px solid var(--border-light); }
  .db-session-item:last-child { border-bottom: none; }
  .db-session-icon { flex-shrink: 0; font-size: 12px; }
  .db-session-min { font-size: 12px; font-weight: 600; color: var(--accent); min-width: 30px; }
  .db-session-date { font-size: 11px; color: var(--text-muted); }
  .db-random-row { display: flex; align-items: center; gap: 8px; padding: 2px 0; }
  .db-random-title { flex: 1; font-size: 13px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .db-random-date { font-size: 10px; color: var(--text-muted); }
  .db-random-empty { flex: 1; font-size: 13px; color: var(--text-muted); }
  .db-random-btn { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 500; background: var(--accent); color: #fff; border: none; cursor: pointer; white-space: nowrap; }
  .affirmation-banner { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: linear-gradient(135deg, var(--accent-subtle), transparent); border: 1px solid var(--accent); border-radius: var(--radius-md); margin-bottom: 8px; }
  .affirmation-icon { font-size: 18px; flex-shrink: 0; }
  .affirmation-text { font-size: 13px; color: var(--text); line-height: 1.4; }
  .affirmation-text strong { color: var(--accent); }
  .affirmation-date { font-size: 11px; color: var(--text-muted); }
  .rebound-banner { display: flex; align-items: center; gap: 10px; padding: 14px 16px; background: var(--accent-subtle); border: 1px solid var(--accent-subtle); border-radius: var(--radius-md); margin-bottom: 14px; }
  .rebound-icon { font-size: 20px; flex-shrink: 0; }
  .rebound-text { font-size: 13px; color: var(--text); line-height: 1.4; }
  .rebound-text strong { color: var(--accent); }
  .level-bar { width: 100%; height: 2px; background: var(--border); border-radius: 2px; margin-top: 4px; overflow: hidden; }
  .level-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s var(--ease); }

  .chain-row { display: flex; gap: 2px; align-items: center; margin-top: 6px; flex-wrap: wrap; }
  .chain-link { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); opacity: 0.3; animation: chain-glow 3s ease-in-out infinite; animation-delay: var(--i, 0)s; }
  .chain-link:nth-child(7n) { background: var(--complete); }
  .chain-more { font-size: 9px; color: var(--text-muted); margin-left: 2px; }
  @keyframes chain-glow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.9; } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
