<script>
  import { Star, Flame } from 'lucide-svelte'
  import { focusSessions } from './taskStore.svelte.js'
  let { points, streak, completedCount, todayTotal, completionRate, recentCompletions } = $props()

  let now = $state(new Date())
  let weekStart = $derived.by(() => { const d = new Date(now); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d })
  let weekSessions = $derived.by(() => focusSessions.items.filter(s => {
    const sd = new Date(s.date)
    return sd >= weekStart && sd <= now
  }))
  let weekMinutes = $derived(weekSessions.reduce((s, x) => s + x.minutes, 0))
  let pomodoroCount = $derived(focusSessions.items.filter(s => s.type === 'pomodoro-focus').length)
  let totalFocusMinutes = $derived(focusSessions.items.reduce((s, x) => s + x.minutes, 0))

  function getDaySessions(dateStr) {
    return focusSessions.items.filter(s => s.date === dateStr).reduce((s, x) => s + x.minutes, 0)
  }

  function heatmapOpacity(minutes) {
    if (minutes === 0) return 0.08
    if (minutes < 15) return 0.3
    if (minutes < 30) return 0.5
    if (minutes < 60) return 0.75
    return 1
  }

  let days = $derived.by(() => {
    const result = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
      result.push({ date: ds, label: dayName, minutes: getDaySessions(ds) })
    }
    return result
  })
</script>

<div class="view-content">
  <h2 class="view-title">Statistics</h2>
  <p class="view-sub">Your progress at a glance</p>

  <div class="stats-grid">
    <div class="stat-card"><span class="stat-num"><Star size={16} strokeWidth={1.5} />{points}</span><span class="stat-label">Points</span></div>
    <div class="stat-card"><span class="stat-num"><Flame size={16} strokeWidth={1.5} />{streak}</span><span class="stat-label">Day streak</span></div>
    <div class="stat-card"><span class="stat-num">{completedCount}/{todayTotal}</span><span class="stat-label">Today</span></div>
    <div class="stat-card"><span class="stat-num">{Math.round(completionRate)}%</span><span class="stat-label">All time</span></div>
  </div>

  <h3 class="section-title">Focus this week</h3>
  <div class="focus-stats-row">
    <div class="focus-stat"><span class="focus-stat-num">{Math.round(weekMinutes / 60)}h {weekMinutes % 60}m</span><span class="focus-stat-label">This week</span></div>
    <div class="focus-stat"><span class="focus-stat-num">{pomodoroCount}</span><span class="focus-stat-label">Pomodoros</span></div>
    <div class="focus-stat"><span class="focus-stat-num">{Math.round(totalFocusMinutes / 60)}h</span><span class="focus-stat-label">Total focus</span></div>
  </div>

  <div class="heatmap">
    {#each days as d}
      <div class="heat-cell" title="{d.label}: {d.minutes}m">
        <span class="heat-label">{d.label}</span>
        <span class="heat-bar-wrap"><span class="heat-bar" style="height:{Math.min(100, d.minutes / 60 * 100)}%;opacity:{heatmapOpacity(d.minutes)}"></span></span>
      </div>
    {/each}
  </div>

  <h3 class="section-title">Recent completions</h3>
  <div class="inbox-list">
    {#each recentCompletions as t (t.id)}
      <div class="inbox-item"><span class="inbox-text">&#10003; {t.title}</span><span class="date">{t.date}</span></div>
    {/each}
    {#if recentCompletions.length === 0}
      <div class="empty"><p>No completions yet</p></div>
    {/if}
  </div>
</div>

<style>
  .date { font-size: 13px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; }
  .section-title { font-size: 16px; font-weight: 600; color: var(--text); margin: 20px 0 12px; }
  .focus-stats-row { display: flex; gap: 10px; margin-bottom: 16px; }
  .focus-stat { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 16px; text-align: center; }
  .focus-stat-num { display: block; font-size: 18px; font-weight: 700; color: var(--text); }
  .focus-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; }
  .heatmap { display: flex; gap: 6px; justify-content: center; padding: 16px 0; }
  .heat-cell { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 48px; }
  .heat-label { font-size: 10px; color: var(--text-muted); font-weight: 500; }
  .heat-bar-wrap { width: 100%; height: 60px; background: var(--surface); border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; align-items: flex-end; overflow: hidden; }
  .heat-bar { width: 100%; background: var(--accent-gradient); border-radius: 0 0 var(--radius-sm) var(--radius-sm); transition: height 0.3s var(--ease); min-height: 2px; }
</style>
