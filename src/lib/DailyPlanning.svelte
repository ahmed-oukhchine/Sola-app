<script>
  import { Sunrise, Plus, X, Check, ArrowRight, Clock, Target } from 'lucide-svelte'
  import { store, inbox, someday, goals, addTask, addToInbox, addToSomeday, moveInboxToToday, moveSomedayToToday, linkTaskToGoal, removeFromInbox, removeFromSomeday, updateTask, getTodayAvailableMinutes } from './taskStore.svelte.js'

  let { onDone, onSkip, onNavigate } = $props()

  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let shutdownTime = $state(localStorage.getItem('focus-shutdown-time') || '18:00')
  let currentStep = $state(0)
  let selectedTaskIds = $state(new Set())
  let timeEstimates = $state({})
  let futureTaskIds = $state(new Set())
  let journalText = $state('')

  let unscheduled = $derived(store.tasks.filter(t => t.date !== todayStr && !t.completed && !t.repeat && t.rolloverCount !== undefined && !selectedTaskIds.has(t.id)))
  let inboxItems = $derived(inbox.items.filter(i => !selectedTaskIds.has(i.id)))
  let somedayItems = $derived(someday.items.filter(s => !selectedTaskIds.has(s.id)))
  let todayUnscheduled = $derived(store.tasks.filter(t => t.date === todayStr && !t.startTime && !t.completed))
  let activeGoals = $derived(goals.items.filter(g => g.period === 'weekly'))

  let allTodayPlanned = $derived.by(() => {
    const ids = [...selectedTaskIds]
    return todayUnscheduled.length + ids.length
  })

  let totalEstimated = $derived.by(() => {
    let total = 0
    for (const t of todayUnscheduled) total += t.estimatedMinutes || 30
    for (const id of selectedTaskIds) total += timeEstimates[id] || 30
    return total
  })

  let availableMinutes = $derived(getTodayAvailableMinutes())
  let overcommitted = $derived(totalEstimated > availableMinutes)

  function toggleTask(id) {
    const s = new Set(selectedTaskIds)
    if (s.has(id)) s.delete(id); else s.add(id)
    selectedTaskIds = s
    if (!timeEstimates[id]) timeEstimates = { ...timeEstimates, [id]: 30 }
  }

  function toggleFuture(id) {
    const s = new Set(futureTaskIds)
    if (s.has(id)) s.delete(id); else s.add(id)
    futureTaskIds = s
  }

  function setEstimate(id, val) {
    timeEstimates = { ...timeEstimates, [id]: Math.max(5, parseInt(val) || 5) }
  }

  function saveShutdown() {
    localStorage.setItem('focus-shutdown-time', shutdownTime)
    currentStep = 1
  }

  function pullSelected() {
    const ids = [...selectedTaskIds]
    for (const id of ids) {
      const t = store.tasks.find(t => t.id === id)
      if (t) {
        updateTask(id, { date: todayStr })
      }
      const inboxItem = inbox.items.find(i => i.id === id)
      if (inboxItem) moveInboxToToday(id)
      const somedayItem = someday.items.find(s => s.id === id)
      if (somedayItem) moveSomedayToToday(id)
    }
    for (const id of selectedTaskIds) {
      if (timeEstimates[id]) {
        const t = store.tasks.find(task => task.id === id)
        if (t) updateTask(id, { estimatedMinutes: timeEstimates[id] })
      }
    }
    currentStep = 2
  }

  function moveToFuture() {
    const ids = [...futureTaskIds]
    for (const id of ids) {
      const t = store.tasks.find(task => task.id === id)
      if (t) updateTask(id, { date: new Date(Date.now() + 86400000).toISOString().split('T')[0] })
    }
    futureTaskIds = new Set()
    currentStep = 3
  }

  function finishPlanning() {
    if (journalText.trim()) {
      addToInbox(journalText.trim())
    }
    localStorage.setItem(`focus-morning:${todayStr}`, 'done')
    onDone()
  }

  function skipAll() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'skipped')
    onSkip()
  }

  function timeDisplay(mins) {
    if (!mins) return ''
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    return `${h}h ${m > 0 ? m + 'm' : ''}`
  }
</script>

<div class="ritual-overlay" role="dialog">
  <div class="ritual-card">
    <div class="ritual-header">
      <Sunrise size={20} strokeWidth={1.5} color="var(--accent)" />
      <span class="ritual-title">
        {#if currentStep === 0}Plan Your Day
        {:else if currentStep === 1}Pull in tasks
        {:else if currentStep === 2}Balance your load
        {:else}Start fresh
        {/if}
      </span>
      <span class="ritual-stat">Step {currentStep + 1} of 4</span>
    </div>

    {#if currentStep === 0}
      <div class="rp-body">
        <p class="rp-desc">When do you want to finish working today?</p>
        <div class="rp-shutdown-row">
          <input type="time" class="rp-time-input" bind:value={shutdownTime} />
          <span class="rp-available">~{timeDisplay(availableMinutes)} available</span>
        </div>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={saveShutdown}>Continue</button>
        <button class="ritual-btn secondary" onclick={skipAll}>Skip</button>
      </div>

    {:else if currentStep === 1}
      <div class="rp-body rp-scroll">
        <p class="rp-desc">What are you working on? Select tasks to pull into today.</p>

        {#if unscheduled.length > 0}
          <div class="rp-section">
            <span class="rp-section-label">Unscheduled tasks ({unscheduled.length})</span>
            {#each unscheduled as t (t.id)}
              <button class="rp-row" class:rp-selected={selectedTaskIds.has(t.id)} onclick={() => toggleTask(t.id)}>
                <span class="rp-check">{#if selectedTaskIds.has(t.id)}<Check size={12} strokeWidth={1.5} />{/if}</span>
                <span class="rp-label">{t.title}</span>
                <input type="number" class="rp-est" min="5" max="480" value={timeEstimates[t.id] || 30} oninput={(e) => { e.stopPropagation(); setEstimate(t.id, e.target.value) }} onclick={(e) => e.stopPropagation()} />
                <span class="rp-est-label">min</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if inboxItems.length > 0}
          <div class="rp-section">
            <span class="rp-section-label">Inbox ({inboxItems.length})</span>
            {#each inboxItems as item (item.id)}
              <button class="rp-row" class:rp-selected={selectedTaskIds.has(item.id)} onclick={() => toggleTask(item.id)}>
                <span class="rp-check">{#if selectedTaskIds.has(item.id)}<Check size={12} strokeWidth={1.5} />{/if}</span>
                <span class="rp-label">{item.title}</span>
                <input type="number" class="rp-est" min="5" max="480" value={timeEstimates[item.id] || 30} oninput={(e) => { e.stopPropagation(); setEstimate(item.id, e.target.value) }} onclick={(e) => e.stopPropagation()} />
                <span class="rp-est-label">min</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if somedayItems.length > 0}
          <div class="rp-section">
            <span class="rp-section-label">Someday ({somedayItems.length})</span>
            {#each somedayItems as s (s.id)}
              <button class="rp-row" class:rp-selected={selectedTaskIds.has(s.id)} onclick={() => toggleTask(s.id)}>
                <span class="rp-check">{#if selectedTaskIds.has(s.id)}<Check size={12} strokeWidth={1.5} />{/if}</span>
                <span class="rp-label">{s.title}</span>
                <input type="number" class="rp-est" min="5" max="480" value={timeEstimates[s.id] || 30} oninput={(e) => { e.stopPropagation(); setEstimate(s.id, e.target.value) }} onclick={(e) => e.stopPropagation()} />
                <span class="rp-est-label">min</span>
              </button>
            {/each}
          </div>
        {/if}

        {#if activeGoals.length > 0}
          <div class="rp-section">
            <span class="rp-section-label">Weekly objectives</span>
            {#each activeGoals as g}
              <div class="rp-goal-row">
                <Target size={14} strokeWidth={1.5} />
                <span>{g.title}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if unscheduled.length === 0 && inboxItems.length === 0 && somedayItems.length === 0}
          <div class="rp-empty">
            <p>No pending tasks to pull in. Add something to your day below.</p>
          </div>
        {/if}
      </div>
      <div class="rp-summary">
        <Clock size={14} strokeWidth={1.5} />
        <span class:rp-over={overcommitted}>
          {timeDisplay(totalEstimated)} planned of {timeDisplay(availableMinutes)} available
        </span>
        {#if overcommitted}
          <span class="rp-warning">You're overcommitted!</span>
        {/if}
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={pullSelected} disabled={selectedTaskIds.size === 0}>Pull selected ({selectedTaskIds.size})</button>
        <button class="ritual-btn secondary" onclick={skipAll}>Skip</button>
      </div>

    {:else if currentStep === 2}
      <div class="rp-body rp-scroll">
        <p class="rp-desc">What can wait? Move non-urgent tasks to tomorrow.</p>
        {#each todayUnscheduled as t (t.id)}
          <button class="rp-row" class:rp-selected={futureTaskIds.has(t.id)} onclick={() => toggleFuture(t.id)}>
            <span class="rp-check">{#if futureTaskIds.has(t.id)}<X size={12} strokeWidth={1.5} />{:else}<Check size={12} strokeWidth={1.5} />{/if}</span>
            <span class="rp-label">{t.title}</span>
            <span class="rp-est-label">{t.estimatedMinutes ? t.estimatedMinutes + 'm' : ''}</span>
          </button>
        {/each}
        {#if todayUnscheduled.length === 0}
          <div class="rp-empty">
            <p>All tasks are on your timeline. Great planning!</p>
          </div>
        {/if}
        {#if overcommitted && todayUnscheduled.length > 0}
          <p class="rp-warning" style="margin-top:12px;text-align:center">
            You're over by {timeDisplay(totalEstimated - availableMinutes)}. Move some tasks to tomorrow.
          </p>
        {/if}
      </div>
      <div class="rp-summary">
        <span>{todayUnscheduled.length - futureTaskIds.size} tasks today</span>
        <span>~{timeDisplay(totalEstimated - (futureTaskIds.size > 0 ? 30 : 0))} planned</span>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={moveToFuture}>Continue</button>
        <button class="ritual-btn secondary" onclick={() => { futureTaskIds = new Set(); currentStep = 3 }}>Skip</button>
      </div>

    {:else}
      <div class="rp-body">
        <p class="rp-desc">Any obstacles or thoughts for today?</p>
        <textarea class="rp-textarea" placeholder="What might get in your way? Anything you want to remember?" bind:value={journalText}></textarea>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={finishPlanning}>Start the day</button>
        <button class="ritual-btn secondary" onclick={skipAll}>Skip</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .ritual-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 60px 24px; z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: fadeIn 0.2s var(--ease-out); }
  .ritual-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 480px; box-shadow: var(--shadow-xl); overflow: hidden; animation: fadeIn 0.15s var(--ease-out); display: flex; flex-direction: column; max-height: 80vh; }
  .ritual-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ritual-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .ritual-stat { font-size: 12px; color: var(--text-muted); margin-left: auto; }
  .rp-body { padding: 18px 22px; flex: 1; overflow-y: auto; }
  .rp-scroll { min-height: 0; }
  .rp-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.5; }
  .rp-shutdown-row { display: flex; align-items: center; gap: 12px; }
  .rp-time-input { padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 16px; outline: none; }
  .rp-time-input:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .rp-available { font-size: 13px; color: var(--text-muted); }
  .rp-section { margin-bottom: 14px; }
  .rp-section-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; display: block; }
  .rp-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1px solid var(--border); background: var(--surface); cursor: pointer; text-align: left; transition: all 0.12s var(--ease); margin-bottom: 4px; }
  .rp-row:hover { border-color: var(--accent-subtle); }
  .rp-selected { border-color: var(--accent); background: var(--accent-subtle); }
  .rp-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent); }
  .rp-label { flex: 1; font-size: 14px; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .rp-est { width: 50px; padding: 4px 6px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); font-size: 12px; text-align: center; }
  .rp-est-label { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
  .rp-goal-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; color: var(--text-secondary); }
  .rp-empty { text-align: center; padding: 30px 0; color: var(--text-muted); font-size: 14px; }
  .rp-textarea { width: 100%; min-height: 80px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; outline: none; resize: vertical; font-family: inherit; }
  .rp-textarea:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .rp-summary { display: flex; align-items: center; gap: 10px; padding: 8px 22px 2px; font-size: 13px; color: var(--text-secondary); }
  .rp-summary .rp-over { color: var(--danger); }
  .rp-warning { font-size: 12px; font-weight: 600; color: var(--danger); }
  .rp-warning::before { content: '⚠ '; }
  .ritual-footer { display: flex; gap: 8px; padding: 10px 22px 18px; flex-shrink: 0; }
  .ritual-btn { padding: 9px 20px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); }
  .ritual-btn.primary { background: var(--accent); color: #fff; border: none; }
  .ritual-btn.primary:hover { filter: brightness(1.1); }
  .ritual-btn.primary:disabled { opacity: 0.4; cursor: default; filter: none; }
  .ritual-btn.secondary { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
  .ritual-btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
