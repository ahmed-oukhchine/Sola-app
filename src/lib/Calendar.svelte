<script>
  import { fly } from 'svelte/transition'
  import { ChevronLeft, ChevronRight, CalendarDays, Check, GripVertical, X } from 'lucide-svelte'
  import { store, toggleTask, addTask, updateTask } from './taskStore.svelte.js'

  let month = $state(new Date().getMonth())
  let year = $state(new Date().getFullYear())
  let selectedDate = $state(new Date().toISOString().split('T')[0])
  let animDir = $state(0)
  let collapseWeekends = $state(false)

  let hoveredDay = $state(null)
  let hoveredRect = $state(null)

  let quickAddDay = $state(null)
  let quickAddTitle = $state('')
  let quickAddInput = $state(null)

  let pressTimer = null
  let pressDay = null

  let dragTaskId = $state(null)
  let dragOverDay = $state(null)
  let showDayDialog = $state(false)
  let dialogDate = $state('')
  let dialogTasks = $derived(store.tasks.filter(t => t.date === dialogDate))

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const DAY_H = collapseWeekends ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  let todayStr = $derived(new Date().toISOString().split('T')[0])

  let yearTasks = $derived(store.tasks.filter(t => t.date && new Date(t.date).getFullYear() === year))
  let monthTasks = $derived(yearTasks.filter(t => new Date(t.date).getMonth() === month))

  let selectedTasks = $derived(store.tasks.filter(t => t.date === selectedDate))

  let daysInMonth = $derived(new Date(year, month + 1, 0).getDate())
  let padStart = $derived((new Date(year, month, 1).getDay() + 6) % 7)

  let monthDensities = $derived.by(() => {
    const counts = Array(12).fill(0)
    for (const t of yearTasks) {
      if (t.date) counts[new Date(t.date).getMonth()]++
    }
    const max = Math.max(...counts, 1)
    return counts.map(c => ({ count: c, pct: Math.max(c / max * 100, 4) }))
  })

  let nextUpTask = $derived.by(() => {
    const now = new Date()
    const today = todayStr
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const upcoming = store.tasks
      .filter(t => t.date && !t.completed)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || '').localeCompare(b.startTime || ''))
    for (const t of upcoming) {
      if (t.date > today) return t
      if (t.date === today && (!t.startTime || t.startTime >= timeStr)) return t
    }
    return null
  })

  function ds(day) { return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` }

  function isoWeek(dateStr) {
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
    const w1 = new Date(d.getFullYear(), 0, 4)
    return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7)
  }

  let weeks = $derived.by(() => {
    const seen = new Set(), res = []
    for (let d = 1; d <= daysInMonth; d++) {
      const w = isoWeek(ds(d))
      if (!seen.has(w)) { seen.add(w); res.push({ week: w, day: d }) }
    }
    return res
  })

  function dayIndex(day) { return (padStart + day - 1) % 7 }

  function tasksForDay(day) { return monthTasks.filter(t => t.date === ds(day)) }
  function countDay(day) { const t = tasksForDay(day); return t.length }
  function doneDay(day) { return tasksForDay(day).filter(t => t.completed).length }

  function isOverdue(day) {
    return ds(day) < todayStr && countDay(day) > 0 && countDay(day) > doneDay(day)
  }

  function dominantEnergy(day) {
    const tasks = tasksForDay(day)
    if (tasks.some(t => t.energy === 'high')) return 'high'
    if (tasks.some(t => t.energy === 'medium')) return 'med'
    if (tasks.some(t => t.energy === 'low')) return 'low'
    return null
  }

  function weekOf(dateStr) {
    const d = new Date(dateStr)
    const start = new Date(d); start.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const end = new Date(start); end.setDate(start.getDate() + 6)
    return { start, end }
  }

  let weekInfo = $derived.by(() => {
    const { start, end } = weekOf(selectedDate)
    const fmt = (d) => d.toISOString().split('T')[0]
    const tasks = store.tasks.filter(t => t.date && t.date >= fmt(start) && t.date <= fmt(end))
    return { start, end, total: tasks.length, done: tasks.filter(t => t.completed).length }
  })

  function selectDay(day) {
    selectedDate = ds(day)
    dialogDate = ds(day)
    showDayDialog = true
  }
  function goMonth(m) { if (m === month) return; animDir = m > month ? 1 : -1; month = m }
  function goToday() { const d = new Date(); month = d.getMonth(); year = d.getFullYear(); selectedDate = todayStr }

  function goMonthDelta(delta) {
    animDir = delta
    let m = month + delta, y = year
    if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
    month = m; year = y
  }

  function cellPointerDown(e, day) {
    clearTimeout(pressTimer)
    pressDay = day
    pressTimer = setTimeout(() => {
      if (pressDay === day) {
        pressDay = null
        quickAddDay = day
        quickAddTitle = ''
      }
    }, 500)
  }

  function cellPointerUp(day) {
    clearTimeout(pressTimer)
    if (pressDay === day) {
      selectDay(day)
      pressDay = null
    }
  }

  function cellPointerLeave() { clearTimeout(pressTimer); pressDay = null }

  function commitQuickAdd() {
    if (quickAddTitle.trim() && quickAddDay !== null) {
      addTask(quickAddTitle.trim(), '', '', null, null, null, ds(quickAddDay), [], null, [])
      quickAddDay = null
      quickAddTitle = ''
    }
  }

  function cancelQuickAdd() { quickAddDay = null; quickAddTitle = '' }

  $effect(() => {
    if (quickAddDay !== null && quickAddInput) quickAddInput.focus()
  })

  function showTooltip(e, day) {
    hoveredDay = day
    hoveredRect = e.currentTarget.getBoundingClientRect()
  }

  function moveTooltip(e) {
    if (hoveredDay !== null) {
      hoveredRect = e.currentTarget.getBoundingClientRect()
    }
  }

  function hideTooltip() { hoveredDay = null; hoveredRect = null }

  function dragStart(e, taskId) {
    dragTaskId = taskId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  function dragOver(e, day) {
    e.preventDefault()
    dragOverDay = day
  }
  function dragEnter(e, day) {
    e.preventDefault()
    dragOverDay = day
  }
  function dragLeave() { dragOverDay = null }

  function drop(e, day) {
    e.preventDefault()
    if (dragTaskId) {
      updateTask(dragTaskId, { date: ds(day) })
      selectDay(day)
    }
    dragTaskId = null
    dragOverDay = null
  }

  function dragEnd() { dragTaskId = null; dragOverDay = null }

  let touchX = $state(0), touchY = $state(0)
  function tStart(e) { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY }
  function tEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) goMonthDelta(dx < 0 ? 1 : -1)
  }

  function onKey(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    if (e.key === 'ArrowLeft') goMonthDelta(-1)
    else if (e.key === 'ArrowRight') goMonthDelta(1)
  }

  let selHeading = $derived(selectedDate === todayStr ? 'Today' : new Date(selectedDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))
</script>

<svelte:window onkeydown={onKey} />

<div class="view-content" ontouchstart={tStart} ontouchend={tEnd}>
  <div class="cal-header">
    <h2 class="view-title" style="margin-bottom:0">Calendar</h2>
    <button class="cal-today-btn" onclick={goToday}><CalendarDays size={14} strokeWidth={1.5} /> Today</button>
  </div>

  <div class="cal-year-strip">
    {#each MONTHS_S as m, i}
      <button class="cal-ym" class:active={i === month} onclick={() => goMonth(i)}>{m}</button>
    {/each}
  </div>

  <div class="cal-nav-row">
    <button class="cal-nav" onclick={() => goMonthDelta(-1)} aria-label="Previous month"><ChevronLeft size={16} strokeWidth={1.5} /></button>
    <span class="cal-nav-label">{MONTHS[month]} {year}</span>
    <button class="cal-nav" onclick={() => goMonthDelta(1)} aria-label="Next month"><ChevronRight size={16} strokeWidth={1.5} /></button>
    <div class="cal-nav-spacer"></div>
    <button class="cal-collapse-btn" class:active={collapseWeekends} onclick={() => collapseWeekends = !collapseWeekends} title="Collapse weekends">
      <span class="cal-collapse-dot"></span>
      <span class="cal-collapse-dot dim"></span>
    </button>
  </div>

  <div class="cal-year-dots-row">
    {#each monthDensities as m, i}
      <button class="cal-year-dot" class:active={i === month} onclick={() => goMonth(i)} style="height: {m.pct}%; background: {i === month ? 'var(--accent)' : 'rgba(var(--accent-rgb), ' + (0.08 + m.pct / 100 * 0.6) + ')'}"></button>
    {/each}
  </div>

  {#key month + '-' + year}
    <div class="cal-grid-wrap" in:fly={{ x: animDir * 36, duration: 260, opacity: 0 }} out:fly={{ x: animDir * -36, duration: 200, opacity: 0 }}>
      <div class="cal-grid" class:no-weekends={collapseWeekends}>
        <div class="cal-week-col"></div>
        {#each DAY_H as d}
          <div class="cal-dh" class:weekend={d === 'Sat' || d === 'Sun'}>{d}</div>
        {/each}
        {#each weeks as w}
          <div class="cal-wn">{w.week}</div>
        {/each}
        {#each Array(padStart) as _}
          <div class="cal-cell empty"></div>
        {/each}
        {#each Array(daysInMonth) as _, i}
          {@const day = i + 1}
          {@const dss = ds(day)}
          {@const total = countDay(day)}
          {@const done = doneDay(day)}
          {@const energy = dominantEnergy(day)}
          {@const od = isOverdue(day)}
          {@const di = dayIndex(day)}
          {@const isWeekend = di === 5 || di === 6}
          <button
            class="cal-cell"
            class:today={dss === todayStr}
            class:sel={dss === selectedDate}
            class:overdue={od}
            class:weekend={isWeekend}
            class:drag-over={dragOverDay === day && dragTaskId}
            style="--i:{i}"
            draggable="false"
            onpointerdown={(e) => cellPointerDown(e, day)}
            onpointerup={() => cellPointerUp(day)}
            onpointerleave={cellPointerLeave}
            onmouseenter={(e) => showTooltip(e, day)}
            onmousemove={(e) => moveTooltip(e)}
            onmouseleave={hideTooltip}
            ondragenter={(e) => dragEnter(e, day)}
            ondragover={(e) => dragOver(e, day)}
            ondragleave={dragLeave}
            ondrop={(e) => drop(e, day)}
          >
            {#if quickAddDay === day}
                <div class="cal-qa-wrap" onclick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  class="cal-qa-input"
                  placeholder="Add task…"
                  bind:value={quickAddTitle}
                  bind:this={quickAddInput}
                  onkeydown={(e) => { if (e.key === 'Enter') commitQuickAdd(); else if (e.key === 'Escape') cancelQuickAdd() }}
                  onblur={() => { if (!quickAddTitle.trim()) cancelQuickAdd() }}
                />
              </div>
            {:else}
              <span class="cal-num">{day}</span>
              {#if total > 0}
                <div class="cal-dots" class:energy>
                  {#each { length: Math.min(total, 3) } as _, di}
                    <span class="cal-dot" class:done={di < done} style={energy ? `background:var(--en-${energy})` : ''}></span>
                  {/each}
                  {#if total > 3}
                    <span class="cal-dot-more">+{total - 3}</span>
                  {/if}
                </div>
              {/if}
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/key}

  {#if hoveredDay !== null && hoveredRect && tasksForDay(hoveredDay).length > 0}
    {@const tasks = tasksForDay(hoveredDay)}
    <div class="cal-tooltip-fixed" style="top:{hoveredRect.top - 8}px;left:{hoveredRect.left + hoveredRect.width / 2}px">
      {#each tasks.slice(0, 6) as t}
        <span class="cal-tt-item" class:done={t.completed}>{t.title}</span>
      {/each}
      {#if tasks.length > 6}
        <span class="cal-tt-more">+{tasks.length - 6} more</span>
      {/if}
    </div>
  {/if}

  {#if nextUpTask}
    <div class="cal-nextup-bar">
      <span class="cal-nu-label">Next</span>
      <span class="cal-nu-title">{nextUpTask.title}</span>
      {#if nextUpTask.startTime}
        <span class="cal-nu-time">{nextUpTask.startTime}</span>
      {/if}
      {#if nextUpTask.date !== todayStr}
        <span class="cal-nu-date">{new Date(nextUpTask.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
      {/if}
    </div>
  {:else if weekInfo.total > 0}
    <div class="cal-nextup-bar muted">
      <span class="cal-nu-label">Week {isoWeek(selectedDate)}</span>
      <span class="cal-nu-stat">{weekInfo.total} task{weekInfo.total !== 1 ? 's' : ''}</span>
      <span class="cal-nu-sep">·</span>
      <span class="cal-nu-stat done">{weekInfo.done} done</span>
    </div>
  {/if}

  <h3 class="cal-day-heading">{selHeading}</h3>

  {#if selectedTasks.length === 0}
    <div class="cal-empty">
      {#if selectedDate >= todayStr}
        <p>No tasks — long-press a day to quick-add</p>
      {:else}
        <p>No tasks this day</p>
      {/if}
    </div>
  {:else}
    <div class="cal-task-list">
      {#each selectedTasks as t (t.id)}
        <div
          class="cal-task"
          class:done={t.completed}
          draggable="true"
          ondragstart={(e) => dragStart(e, t.id)}
          ondragend={dragEnd}
        >
          <div class="cal-tk-grip"><GripVertical size={12} strokeWidth={1.5} /></div>
          <button class="cal-tk-check" class:checked={t.completed} onclick={() => toggleTask(t.id)}>
            {#if t.completed}<Check size={10} strokeWidth={2} />{/if}
          </button>
          <span class="cal-tk-title">{t.title}</span>
          {#if t.energy}
            <span class="cal-tk-en cal-en-{t.energy}">{t.energy}</span>
          {/if}
          {#if t.subtasks && t.subtasks.length > 0}
            <span class="cal-tk-sub">{t.subtasks.filter(s => s.completed).length}/{t.subtasks.length}</span>
          {/if}
          {#if t.startTime}
            <span class="cal-tk-time">{t.startTime}{t.endTime ? `–${t.endTime}` : ''}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if showDayDialog}
  <div class="cal-dialog-overlay" role="dialog" onclick={() => showDayDialog = false} onkeydown={(e) => { if (e.key === 'Escape') showDayDialog = false }} tabindex="0">
    <div class="cal-dialog" onclick={(e) => e.stopPropagation()} role="document">
      <div class="cal-dialog-header">
        <h3 class="cal-dialog-heading">{dialogDate === todayStr ? 'Today' : new Date(dialogDate + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
        <button class="cal-dialog-close" onclick={() => showDayDialog = false} aria-label="Close"><X size={18} strokeWidth={1.5} /></button>
      </div>
      <div class="cal-dialog-body">
        {#if dialogTasks.length === 0}
          <p class="cal-dialog-empty">No tasks</p>
        {:else}
          {#each dialogTasks as t (t.id)}
            <div class="cal-dialog-task" class:done={t.completed}>
              <button class="cal-dialog-check" class:checked={t.completed} onclick={() => toggleTask(t.id)}>
                {#if t.completed}<Check size={12} strokeWidth={2} />{/if}
              </button>
              <span class="cal-dialog-task-title">{t.title}</span>
              {#if t.startTime}
                <span class="cal-dialog-time">{t.startTime}{t.endTime ? `–${t.endTime}` : ''}</span>
              {/if}
              {#if t.energy}
                <span class="cal-dialog-energy cal-en-{t.energy}">{t.energy}</span>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
  .cal-today-btn { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; color: var(--accent); background: var(--accent-subtle); border: 1px solid rgba(var(--accent-rgb), 0.15); cursor: pointer; transition: all 0.2s var(--ease); }
  .cal-today-btn:hover { background: rgba(var(--accent-rgb), 0.15); }

  .cal-year-strip { display: flex; gap: 4px; overflow-x: auto; padding: 0 0 12px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
  .cal-year-strip::-webkit-scrollbar { display: none; }
  .cal-ym { flex-shrink: 0; padding: 6px 14px; border-radius: 8px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: transparent; border: none; cursor: pointer; transition: all 0.15s var(--ease); }
  .cal-ym:hover { background: var(--surface-hover); color: var(--text); }
  .cal-ym.active { background: var(--accent-subtle); color: var(--accent); font-weight: 600; }

  .cal-nav-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .cal-nav { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .cal-nav:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .cal-nav-label { font-size: 18px; font-weight: 600; color: var(--text); flex: 1; }
  .cal-nav-spacer { flex: 1; }
  .cal-collapse-btn { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 3px; cursor: pointer; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .cal-collapse-btn:hover { border-color: var(--text-secondary); }
  .cal-collapse-btn.active { border-color: var(--accent); background: var(--accent-subtle); color: var(--accent); }
  .cal-collapse-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
  .cal-collapse-dot.dim { opacity: 0.3; }

  .cal-year-dots-row { display: flex; align-items: flex-end; gap: 4px; height: 28px; margin-bottom: 14px; padding: 0 2px; }
  .cal-year-dot { flex: 1; min-width: 4px; border-radius: 3px 3px 2px 2px; border: none; cursor: pointer; transition: all 0.2s var(--ease); opacity: 0.7; }
  .cal-year-dot:hover { opacity: 1; transform: scaleY(1.15); }
  .cal-year-dot.active { opacity: 1; }

  .cal-grid-wrap { overflow: hidden; }
  .cal-grid { display: grid; grid-template-columns: 32px repeat(7, 1fr); gap: 2px; transition: grid-template-columns 0.25s var(--ease); }
  .cal-grid.no-weekends { grid-template-columns: 32px repeat(5, 1fr); }
  .cal-grid.no-weekends .cal-dh.weekend,
  .cal-grid.no-weekends .cal-cell.weekend,
  .cal-grid.no-weekends .cal-wn:has(+ .cal-cell.weekend) { display: none; }
  .cal-dh { text-align: center; font-size: 11px; font-weight: 600; color: var(--text-secondary); padding: 4px 0 6px; }
  .cal-dh.weekend { color: var(--text-secondary); opacity: 0.45; }
  .cal-wn { font-size: 10px; font-weight: 500; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; padding: 2px 0; opacity: 0.6; }

  .cal-cell { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; background: transparent; border: 1px solid transparent; transition: all 0.15s var(--ease); gap: 2px; position: relative; min-height: 0; padding: 0; overflow: visible; animation: cellEnter 0.35s var(--ease) both; animation-delay: calc(var(--i, 0) * 12ms); }
  .cal-cell:hover { background: var(--surface-hover); }
  .cal-cell.weekend { opacity: 0.65; }
  .cal-cell.today { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.12); }
  .cal-cell.sel { background: var(--accent); border-color: transparent; box-shadow: var(--accent-ring); animation: selPulse 2.5s var(--ease) infinite; color: #fff; }
  .cal-cell.sel .cal-num { color: #fff; font-weight: 600; }
  .cal-cell.overdue { box-shadow: 0 0 0 1px rgba(var(--danger-rgb), 0.3), 0 0 12px rgba(var(--danger-rgb), 0.08); }
  .cal-cell.overdue:hover { box-shadow: 0 0 0 1px rgba(var(--danger-rgb), 0.5), 0 0 16px rgba(var(--danger-rgb), 0.12); }
  .cal-cell.overdue.sel { box-shadow: var(--accent-ring); }
  .cal-cell.empty { cursor: default; pointer-events: none; }
  .cal-cell.drag-over { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.08); transform: scale(1.06); }

  @keyframes cellEnter { from { opacity: 0; transform: translateY(8px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes selPulse { 0%, 100% { box-shadow: var(--accent-ring); } 50% { box-shadow: var(--accent-ring), 0 0 24px rgba(var(--accent-rgb), 0.2); } }

  .cal-num { font-size: 14px; font-weight: 500; color: var(--text); line-height: 1; }
  .cal-dots { display: flex; gap: 2px; align-items: center; height: 4px; }
  .cal-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--accent); transition: background 0.2s var(--ease); }
  .cal-dot.done { background: var(--complete); }
  .cal-dot-more { font-size: 8px; font-weight: 700; color: var(--text-secondary); line-height: 1; }
  .cal-dots.energy .cal-dot { }
  :global(.view-content) { --en-high: #90b080; --en-med: #c0a870; --en-low: #9990c0; }

  .cal-qa-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; padding: 2px; }
  .cal-qa-input { width: 100%; padding: 4px 6px; font-size: 11px; border-radius: 6px; border: 1px solid var(--accent); background: var(--surface-raised); color: var(--text); outline: none; text-align: center; }

  .cal-tooltip-fixed { position: fixed; transform: translate(-50%, -100%); z-index: 100; background: var(--surface-raised); border: 1px solid var(--border); border-radius: 8px; padding: 6px 10px; display: flex; flex-direction: column; gap: 3px; pointer-events: none; box-shadow: 0 4px 16px rgba(0,0,0,0.25); max-width: 200px; }
  .cal-tt-item { font-size: 11px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-tt-item.done { text-decoration: line-through; opacity: 0.5; }
  .cal-tt-more { font-size: 10px; color: var(--text-secondary); }

  .cal-nextup-bar { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-top: 14px; background: var(--accent-subtle); border: 1px solid rgba(var(--accent-rgb), 0.12); border-radius: var(--radius-sm); }
  .cal-nextup-bar.muted { background: var(--surface); border-color: var(--border); }
  .cal-nu-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--accent); }
  .cal-nu-title { flex: 1; font-size: 13px; font-weight: 500; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-nu-time { font-size: 12px; font-weight: 500; color: var(--text-secondary); font-variant-numeric: tabular-nums; flex-shrink: 0; }
  .cal-nu-date { font-size: 11px; color: var(--text-secondary); flex-shrink: 0; }
  .cal-nu-sep { color: var(--text-muted); }
  .cal-nu-stat { font-size: 12px; font-weight: 500; color: var(--text-secondary); }
  .cal-nu-stat.done { color: var(--complete); }

  .cal-day-heading { font-size: 16px; font-weight: 600; color: var(--text); margin: 12px 0 10px; }

  .cal-empty { text-align: center; padding: 24px 0; color: var(--text-secondary); font-size: 14px; }

  .cal-task-list { display: flex; flex-direction: column; gap: 6px; }
  .cal-task { display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-sm); transition: all 0.2s var(--ease); overflow: hidden; cursor: grab; }
  .cal-task:hover { border-color: var(--accent-subtle); }
  .cal-task:active { cursor: grabbing; }
  .cal-task.done { opacity: 0.4; }
  .cal-task.done .cal-tk-title { text-decoration: line-through; color: var(--text-secondary); }
  .cal-tk-grip { display: flex; align-items: center; color: var(--text-secondary); opacity: 0.25; transition: opacity 0.15s var(--ease); flex-shrink: 0; }
  .cal-task:hover .cal-tk-grip { opacity: 0.6; }
  .cal-tk-check { width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; background: transparent; padding: 0; transition: all 0.25s var(--ease-spring); }
  .cal-tk-check:hover { border-color: var(--complete); background: var(--complete-bg); transform: scale(1.12); }
  .cal-tk-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; transform: scale(1.05); }
  .cal-tk-check.checked:hover { transform: scale(1.1); }
  .cal-tk-title { flex: 1; font-size: 14px; font-weight: 500; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-tk-en { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.3px; flex-shrink: 0; }
  .cal-en-high { background: rgba(144, 176, 128, 0.15); color: #90b080; }
  .cal-en-med { background: rgba(192, 168, 112, 0.15); color: #c0a870; }
  .cal-en-low { background: rgba(153, 144, 192, 0.15); color: #9990c0; }
  .cal-tk-sub { font-size: 11px; font-weight: 600; color: var(--text-secondary); background: var(--surface-raised); padding: 2px 8px; border-radius: 6px; }
  .cal-tk-time { font-size: 12px; font-weight: 500; color: var(--text-secondary); font-variant-numeric: tabular-nums; flex-shrink: 0; }

  .cal-dialog-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: calFadeIn 0.2s ease-out; }
  .cal-dialog { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 400px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: var(--shadow-xl); animation: calScaleIn 0.3s var(--ease-spring); }
  .cal-dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 0.5px solid var(--border); }
  .cal-dialog-heading { font-size: 17px; font-weight: 650; color: var(--text); margin: 0; }
  .cal-dialog-close { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .cal-dialog-close:hover { background: var(--surface-hover); color: var(--text); }
  .cal-dialog-body { padding: 12px 20px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
  .cal-dialog-empty { text-align: center; color: var(--text-muted); font-size: 14px; padding: 20px 0; margin: 0; }
  .cal-dialog-task { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--surface); border: 0.5px solid var(--border); border-radius: var(--radius-md); }
  .cal-dialog-task.done { opacity: 0.45; }
  .cal-dialog-task.done .cal-dialog-task-title { text-decoration: line-through; color: var(--text-secondary); }
  .cal-dialog-check { width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; background: transparent; padding: 0; transition: all 0.2s var(--ease); }
  .cal-dialog-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .cal-dialog-check:hover { border-color: var(--complete); background: var(--complete-bg); }
  .cal-dialog-task-title { flex: 1; font-size: 14px; font-weight: 500; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cal-dialog-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
  .cal-dialog-energy { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 5px; text-transform: uppercase; letter-spacing: 0.3px; flex-shrink: 0; }
  @keyframes calFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes calScaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
