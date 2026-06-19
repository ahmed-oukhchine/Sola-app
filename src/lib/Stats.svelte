<script>
  import { Star, Flame, Trophy } from 'lucide-svelte'
  import { focusSessions, getLevel, getXpForNextLevel } from './taskStore.svelte.js'
  let { points, streak, completedCount, todayTotal, completionRate, recentCompletions } = $props()

  let now = $state(new Date())
  let level = $derived(getLevel(points))
  let xpNext = $derived(getXpForNextLevel(level))
  let xpCurrent = $derived(points - getXpForNextLevel(level - 1))
  let xpPrev = $derived(getXpForNextLevel(level - 1))
  let xpProgress = $derived(xpNext > 0 ? (points - xpPrev) / (xpNext - xpPrev) : 1)

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

  let maxMinutes = $derived(Math.max(...days.map(d => d.minutes), 1))

  let last30 = $derived.by(() => {
    const result = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      result.push({ date: ds, count: recentCompletions.filter(t => t.date === ds).length })
    }
    return result
  })

  let maxCompletions = $derived(Math.max(...last30.map(d => d.count), 1))

  let badgeLabel = $derived(
    level >= 50 ? 'Legend' : level >= 30 ? 'Master' : level >= 20 ? 'Expert' : level >= 10 ? 'Advanced' : level >= 5 ? 'Intermediate' : 'Beginner'
  )
</script>

<div class="view-content">
  <h2 class="view-title">Statistics</h2>
  <p class="view-sub">Your progress at a glance</p>

  <div class="stats-grid">
    <div class="stat-card"><span class="stat-num">{points}</span><span class="stat-label">Points</span></div>
    <div class="stat-card"><span class="stat-num"><Flame size={16} strokeWidth={1.5} />{streak}</span><span class="stat-label">Day streak</span></div>
    <div class="stat-card"><span class="stat-num">{completedCount}/{todayTotal}</span><span class="stat-label">Today</span></div>
    <div class="stat-card"><span class="stat-num">{Math.round(completionRate)}%</span><span class="stat-label">All time</span></div>
  </div>

  <div class="level-card">
    <div class="level-top">
      <Trophy size={24} strokeWidth={1.5} />
      <div class="level-info">
        <span class="level-num">Level {level}</span>
        <span class="level-badge">{badgeLabel}</span>
      </div>
      <span class="level-xp">{points} XP</span>
    </div>
    <div class="xp-bar-wrap">
      <div class="xp-bar" style="width: {xpProgress * 100}%"></div>
    </div>
    <span class="xp-label">{points - xpPrev} / {xpNext - xpPrev} XP to Level {level + 1}</span>
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
        <span class="heat-bar-wrap"><span class="heat-bar" style="height:{d.minutes / maxMinutes * 100}%;opacity:{heatmapOpacity(d.minutes)}"></span></span>
      </div>
    {/each}
  </div>

  <h3 class="section-title">30-day completion trend</h3>
  <div class="chart">
    {#each last30 as d}
      <div class="chart-col" title="{d.date}: {d.count} completed">
        <span class="chart-bar" style="height:{d.count / maxCompletions * 100}%"></span>
      </div>
    {/each}
  </div>

  <h3 class="section-title">Recent completions</h3>
  <div class="inbox-list">
    {#each recentCompletions as t (t.id)}
      <div class="inbox-item"><span class="inbox-text">{t.title}</span><span class="date">{t.date}</span></div>
    {/each}
    {#if recentCompletions.length === 0}
      <div class="empty"><p>No completions yet</p></div>
    {/if}
  </div>
</div>

<style>
  .date { font-size: 12px; color: var(--text-muted); font-weight: 500; }
  .section-title { font-size: 15px; font-weight: 600; color: var(--text); margin: 20px 0 10px; }
  .focus-stats-row { display: flex; gap: 8px; margin-bottom: 16px; }
  .focus-stat { flex: 1; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 14px; text-align: center; }
  .focus-stat-num { display: block; font-size: 16px; font-weight: 650; color: var(--text); }
  .focus-stat-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-top: 4px; }
  .heatmap { display: flex; gap: 4px; justify-content: center; padding: 12px 0; }
  .heat-cell { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 48px; }
  .heat-label { font-size: 10px; color: var(--text-muted); font-weight: 500; }
  .heat-bar-wrap { width: 100%; height: 60px; background: var(--surface); border-radius: 8px; border: 1px solid var(--border); display: flex; align-items: flex-end; overflow: hidden; }
  .heat-bar { width: 100%; background: var(--accent); border-radius: 0 0 8px 8px; transition: height 0.3s var(--ease); min-height: 2px; }

  .level-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 10px; }
  .level-top { display: flex; align-items: center; gap: 10px; color: var(--accent); margin-bottom: 10px; }
  .level-info { flex: 1; }
  .level-num { display: block; font-size: 16px; font-weight: 650; color: var(--text); }
  .level-badge { font-size: 11px; color: var(--accent); font-weight: 500; }
  .level-xp { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
  .xp-bar-wrap { width: 100%; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-bottom: 4px; }
  .xp-bar { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.4s var(--ease-spring); }
  .xp-label { font-size: 11px; color: var(--text-muted); }

  .chart { display: flex; gap: 1px; align-items: flex-end; height: 70px; padding: 8px 0; }
  .chart-col { flex: 1; display: flex; align-items: flex-end; height: 100%; }
  .chart-bar { width: 100%; background: var(--accent); border-radius: 2px 2px 0 0; transition: height 0.3s var(--ease); min-height: 1px; opacity: 0.8; }
  .chart-bar:hover { opacity: 1; }
</style>
