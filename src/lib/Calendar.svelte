<script>
  import { store } from './taskStore.svelte.js'

  let month = $state(new Date().getMonth())
  let year = $state(new Date().getFullYear())
  let selectedDate = $state(new Date().toISOString().split('T')[0])

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  let monthTasks = $derived(store.tasks.filter(t => {
    const d = new Date(t.date)
    return d.getMonth() === month && d.getFullYear() === year
  }))

  let selectedTasks = $derived(store.tasks.filter(t => t.date === selectedDate))

  let daysInMonth = $derived(new Date(year, month + 1, 0).getDate())
  let firstDayOfWeek = $derived(new Date(year, month, 1).getDay())

  let todayStr = $derived(new Date().toISOString().split('T')[0])

  function getTaskCount(day) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return monthTasks.filter(t => t.date === ds).length
  }

  function selectDay(day) {
    selectedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function prevMonth() {
    if (month === 0) { month = 11; year-- } else { month-- }
  }

  function nextMonth() {
    if (month === 11) { month = 0; year++ } else { month++ }
  }

  function goToday() {
    const d = new Date()
    month = d.getMonth()
    year = d.getFullYear()
    selectedDate = todayStr
  }

  function gridIndex(day) {
    return firstDayOfWeek + day - 1
  }
</script>

<div class="view-content">
  <div class="cal-header">
    <button class="cal-nav" onclick={prevMonth} aria-label="Previous month">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3l-4 4 4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <h2 class="cal-month">{MONTHS[month]} {year}</h2>
    <button class="cal-nav" onclick={nextMonth} aria-label="Next month">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
  </div>
  <button class="cal-today" onclick={goToday}>Today</button>

  <div class="cal-grid">
    {#each DAYS as d}
      <div class="cal-day-header">{d}</div>
    {/each}
    {#each Array(firstDayOfWeek) as _}
      <div class="cal-day empty"></div>
    {/each}
    {#each Array(daysInMonth) as _, i}
      {@const day = i + 1}
      {@const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`}
      {@const count = getTaskCount(day)}
      <button class="cal-day" class:today={ds === todayStr} class:selected={ds === selectedDate} onclick={() => selectDay(day)}>
        <span class="cal-day-num">{day}</span>
        {#if count > 0}
          <span class="cal-dot">{count}</span>
        {/if}
      </button>
    {/each}
  </div>

  <h3 class="cal-task-title">{selectedDate === todayStr ? 'Today' : selectedDate}</h3>
  {#if selectedTasks.length === 0}
    <div class="empty"><p>No tasks</p></div>
  {:else}
    <div class="inbox-list">
      {#each selectedTasks as t (t.id)}
        <div class="inbox-item" class:cal-completed={t.completed}>
          <span class="inbox-text">{t.title}</span>
          {#if t.startTime}
            <span class="date">{t.startTime}{t.endTime ? `-${t.endTime}` : ''}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .cal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .cal-month { font-size: 20px; font-weight: 600; color: var(--text); }
  .cal-nav { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: transparent; transition: all 0.15s var(--ease); }
  .cal-nav:hover { background: var(--surface-hover); color: var(--text); }
  .cal-today { font-size: 13px; font-weight: 500; color: var(--accent); cursor: pointer; padding: 6px 0 14px; display: block; background: transparent; }
  .cal-today:hover { text-decoration: underline; }
  .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 20px; }
  .cal-day-header { text-align: center; font-size: 12px; font-weight: 600; color: var(--text-muted); padding: 6px 0; }
  .cal-day { aspect-ratio: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 10px; cursor: pointer; background: transparent; transition: all 0.15s var(--ease); gap: 3px; position: relative; border: none; color: var(--text); }
  .cal-day.empty { cursor: default; }
  .cal-day:hover:not(.empty) { background: var(--surface-hover); transform: scale(1.05); }
  .cal-day.today { background: var(--accent-subtle); border: 1px solid rgba(212, 165, 116, 0.15); }
  .cal-day.selected { background: var(--accent-gradient); color: #fff; box-shadow: var(--accent-glow); }
  .cal-day.selected .cal-dot { background: rgba(255,255,255,0.35); color: #fff; }
  .cal-day-num { font-size: 15px; font-weight: 500; line-height: 1; }
  .cal-dot { font-size: 10px; font-weight: 700; background: var(--border); color: var(--text-muted); padding: 2px 7px; border-radius: 8px; line-height: 1.3; }
  .cal-task-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 10px; }
  .cal-completed { opacity: 0.45; }
  .cal-completed .inbox-text { text-decoration: line-through; }
</style>
