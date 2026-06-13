<script>
  import { fade, fly } from 'svelte/transition'
  import { onMount } from 'svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import Dashboard from './lib/Dashboard.svelte'
  import CalendarView from './lib/Calendar.svelte'
  import GoalsView from './lib/Goals.svelte'
  import KanbanView from './lib/Kanban.svelte'
  import SettingsView from './lib/Settings.svelte'
  import HabitsView from './lib/Habits.svelte'
  import TagsView from './lib/Tags.svelte'
  import TodayView from './lib/Today.svelte'
  import InboxView from './lib/Inbox.svelte'
  import FocusView from './lib/Focus.svelte'
  import RoutinesView from './lib/Routines.svelte'
  import SomedayView from './lib/Someday.svelte'
  import LifeCoursesView from './lib/LifeCourses.svelte'
  import StatsView from './lib/Stats.svelte'
  import SearchModal from './lib/Search.svelte'
  import Onboarding from './lib/Onboarding.svelte'
  import Account from './lib/Account.svelte'
  import { store, addTask, loadAll, exportData, importData, loadPoints, savePoints, computeStreak, requestPermission, scheduleAll } from './lib/taskStore.svelte.js'
  import { Menu, Search, CalendarDays, Sunrise, Plus, CircleCheckBig } from 'lucide-svelte'

  let activeView = $state('dashboard')
  let sidebarOpen = $state(false)
  let sidebarCollapsed = $state(JSON.parse(localStorage.getItem('focus-sidebar-collapsed') || 'false'))
  let now = $state(new Date())
  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let showMorning = $state(false)
  let showEvening = $state(false)
  let showWeeklyReview = $state(false)
  let showSearch = $state(false)
  let weeklyReviewData = $state(null)
  let ritualTitle = $state('')
  let theme = $state(localStorage.getItem('focus-theme') || 'system')
  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let dayStr = $derived(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  let todayTasks = $derived(store.tasks.filter(t => t.date === todayStr))
  let completedCount = $derived(todayTasks.filter(t => t.completed).length)
  let completionRate = $derived(store.tasks.length ? Math.round(store.tasks.filter(t => t.completed).length / store.tasks.length * 100) : 0)
  let recentCompletions = $derived(store.tasks.filter(t => t.completed).toReversed().slice(0, 20))
  let showOnboarding = $state(!localStorage.getItem('focus-onboarded'))
  let showAccount = $state(!showOnboarding)
  let userName = $state(localStorage.getItem('focus-account-user') || '')
  let accentColor = $state(localStorage.getItem('focus-accent') || '')

  function isValidHex(c) { return /^#[0-9a-fA-F]{6}$/.test(c) }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  function shadeColor(hex, percent) {
    const { r, g, b } = hexToRgb(hex)
    const t = percent < 0 ? 0 : 255
    const f = percent < 0 ? 1 + percent : 1 - percent
    return `#${Math.round(t + (r - t) * f).toString(16).padStart(2, '0')}${Math.round(t + (g - t) * f).toString(16).padStart(2, '0')}${Math.round(t + (b - t) * f).toString(16).padStart(2, '0')}`
  }

  function applyAccent(color) {
    if (!color || !isValidHex(color)) return
    const { r, g, b } = hexToRgb(color)
    const root = document.documentElement
    root.style.setProperty('--accent', color)
    root.style.setProperty('--accent-hover', shadeColor(color, 10))
    root.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, ${theme === 'light' ? 0.08 : 0.12})`)
    root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${color}, ${shadeColor(color, -12)})`)
    root.style.setProperty('--accent-glow', `0 0 30px rgba(${r}, ${g}, ${b}, ${theme === 'light' ? 0.08 : 0.15})`)
    root.style.setProperty('--glow', `0 0 0 2px rgba(${r}, ${g}, ${b}, 0.25)`)
  }

  function setAccent(color) {
    accentColor = color
    if (color && isValidHex(color)) {
      localStorage.setItem('focus-accent', color)
      applyAccent(color)
    } else {
      localStorage.removeItem('focus-accent')
      const root = document.documentElement
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-hover')
      root.style.removeProperty('--accent-subtle')
      root.style.removeProperty('--accent-gradient')
      root.style.removeProperty('--accent-glow')
      root.style.removeProperty('--glow')
    }
  }

  function onOnboardingDone() {
    showOnboarding = false
    showAccount = true
    if (accentColor) {
      applyAccent(accentColor)
    }
  }

  function onOnboardingAccent(hex) {
    accentColor = hex
    applyAccent(hex)
  }

  function handleUnlock(user) {
    userName = user
    showAccount = false
  }

  function cycleTheme() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    theme = next
    localStorage.setItem('focus-theme', next)
    const root = document.documentElement
    if (next === 'dark') root.setAttribute('data-theme', 'dark')
    else if (next === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
    if (accentColor) applyAccent(accentColor)
  }

  function toggleSidebarCollapse() {
    sidebarCollapsed = !sidebarCollapsed
    localStorage.setItem('focus-sidebar-collapsed', JSON.stringify(sidebarCollapsed))
  }

  function addPoints(amt) {
    points += amt
    savePoints(points)
  }

  function onCompleteTask() {
    addPoints(10)
    streak = computeStreak()
  }

  function onCompleteSubtask() {
    addPoints(3)
  }

  function checkRituals() {
    const h = now.getHours()
    const mKey = `focus-morning:${todayStr}`
    const eKey = `focus-evening:${todayStr}`
    if (h < 12 && !localStorage.getItem(mKey)) setTimeout(() => showMorning = true, 300)
    if (h >= 18 && !localStorage.getItem(eKey)) setTimeout(() => showEvening = true, 600)
  }

  function completeMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'done')
    showMorning = false
  }

  function skipMorning() {
    localStorage.setItem(`focus-morning:${todayStr}`, 'skipped')
    showMorning = false
  }

  function completeEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'done')
    showEvening = false
  }

  function skipEvening() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'skipped')
    showEvening = false
  }

  function handleRitualSubmit() {
    if (!ritualTitle.trim()) return
    addTask(ritualTitle.trim())
    ritualTitle = ''
  }

  onMount(async () => {
    await loadAll()
    points = loadPoints()
    streak = computeStreak()
    const root = document.documentElement
    if (theme === 'dark') root.setAttribute('data-theme', 'dark')
    else if (theme === 'light') root.setAttribute('data-theme', 'light')
    if (accentColor) applyAccent(accentColor)
    requestPermission()
    scheduleAll()
    checkRituals()
    checkWeeklyReview()
    setInterval(() => {
      now = new Date()
      streak = computeStreak()
    }, 30000)
    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  })

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); showSearch = true }
  }

  function checkWeeklyReview() {
    const day = new Date().getDay()
    if (day !== 0) return
    const lastReview = localStorage.getItem('focus-weekly-review')
    if (lastReview === new Date().toISOString().split('T')[0]) return
    const byDate = {}
    for (const t of store.tasks) {
      if (!t.completed) continue
      byDate[t.date] = (byDate[t.date] || 0) + 1
    }
    const dates = Object.keys(byDate).sort()
    let bestDay = '', bestCount = 0
    for (const [d, c] of Object.entries(byDate)) {
      if (c > bestCount) { bestCount = c; bestDay = d }
    }
    const totalCompleted = store.tasks.filter(t => t.completed).length
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const weekKey = weekAgo.toISOString().split('T')[0]
    const weekCompleted = store.tasks.filter(t => t.completed && t.date >= weekKey).length
    weeklyReviewData = { totalCompleted, weekCompleted, bestDay: bestDay ? `${bestDay} (${bestCount} tasks)` : '—', streak: computeStreak() }
    showWeeklyReview = true
  }

  function dismissWeeklyReview() {
    localStorage.setItem('focus-weekly-review', todayStr)
    showWeeklyReview = false
  }

  async function handleExport() {
    const json = await exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `focus-backup-${todayStr}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      try {
        const text = await input.files[0].text()
        await importData(text)
        points = loadPoints(); streak = computeStreak()
      } catch (e) { alert('Invalid backup file') }
    }
    input.click()
  }
</script>

{#if showOnboarding}
  <Onboarding onDone={onOnboardingDone} onAccentChange={onOnboardingAccent} />
{/if}

{#if showAccount}
  <Account onUnlock={handleUnlock} />
{/if}

<Sidebar open={sidebarOpen} {activeView} {streak} {points} {theme} collapsed={sidebarCollapsed} onNavigate={(v) => activeView = v} onClose={() => sidebarOpen = false} onThemeCycle={cycleTheme} onCollapse={toggleSidebarCollapse} onExport={handleExport} onImport={handleImport} />
<div class="app">
  <header class="header">
    <button class="hamburger" onclick={() => sidebarOpen = true} aria-label="Menu">
        <Menu size={20} strokeWidth={1.5} />
    </button>
    <h1 class="logo">focus</h1>
    <div class="header-actions">
      <button class="header-search-btn" onclick={() => showSearch = true} aria-label="Search (Ctrl+K)">
        <Search size={16} strokeWidth={1.5} />
      </button>
      <span class="points-badge">✦ {points}</span>
      <span class="date">{dayStr}</span>
    </div>
  </header>

  {#if activeView === 'dashboard'}<div in:fade={{ duration: 200 }}><Dashboard onNavigate={(v) => activeView = v} /></div>{/if}
  {#if activeView === 'calendar'}<div in:fade={{ duration: 200 }}><CalendarView /></div>{/if}
  {#if activeView === 'goals'}<div in:fade={{ duration: 200 }}><GoalsView /></div>{/if}
  {#if activeView === 'kanban'}<div in:fade={{ duration: 200 }}><KanbanView /></div>{/if}
  {#if activeView === 'settings'}<div in:fade={{ duration: 200 }}><SettingsView {theme} onThemeCycle={cycleTheme} {accentColor} onAccentChange={setAccent} /></div>{/if}
  {#if activeView === 'habits'}<div in:fade={{ duration: 200 }}><HabitsView /></div>{/if}
  {#if activeView === 'tags'}<div in:fade={{ duration: 200 }}><TagsView /></div>{/if}
  {#if activeView === 'today'}<div in:fade={{ duration: 200 }}><TodayView {now} onCompleteTask={onCompleteTask} onCompleteSubtask={onCompleteSubtask} /></div>{/if}
  {#if activeView === 'inbox'}<div in:fade={{ duration: 200 }}><InboxView /></div>{/if}
  {#if activeView === 'focus'}<div in:fade={{ duration: 200 }}><FocusView /></div>{/if}
  {#if activeView === 'routines'}<div in:fade={{ duration: 200 }}><RoutinesView /></div>{/if}
  {#if activeView === 'someday'}<div in:fade={{ duration: 200 }}><SomedayView /></div>{/if}
  {#if activeView === 'life-courses'}<div in:fade={{ duration: 200 }}><LifeCoursesView /></div>{/if}
  {#if activeView === 'stats'}<div in:fade={{ duration: 200 }}><StatsView {points} {streak} {completedCount} todayTotal={todayTasks.length} {completionRate} {recentCompletions} /></div>{/if}
</div>

<SearchModal open={showSearch} onClose={() => showSearch = false} onNavigate={(v) => activeView = v} />

{#if showWeeklyReview && weeklyReviewData}
  <div class="ritual-overlay" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
    <div class="ritual-card">
      <div class="ritual-icon">
        <CalendarDays size={32} strokeWidth={1.5} color="var(--accent)" />
      </div>
      <h2 class="ritual-title">Weekly Review</h2>
      <p class="ritual-sub">Here's how this week went</p>
      <div class="review-grid">
        <div class="review-item"><span class="review-num">{weeklyReviewData.totalCompleted}</span><span class="review-label">Total done</span></div>
        <div class="review-item"><span class="review-num">{weeklyReviewData.weekCompleted}</span><span class="review-label">This week</span></div>
        <div class="review-item"><span class="review-num">🔥{weeklyReviewData.streak}</span><span class="review-label">Streak</span></div>
        <div class="review-item"><span class="review-num" style="font-size:12px">{weeklyReviewData.bestDay}</span><span class="review-label">Best day</span></div>
      </div>
      <div class="ritual-actions">
        <button class="ritual-btn primary" onclick={dismissWeeklyReview}>Got it</button>
      </div>
    </div>
  </div>
{/if}

{#if showMorning}
  <div class="ritual-overlay" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
    <div class="ritual-card">
      <div class="ritual-icon">
        <Sunrise size={32} strokeWidth={1.5} color="var(--accent)" />
      </div>
      <h2 class="ritual-title">Good morning</h2>
      <p class="ritual-sub">What are you focusing on today?</p>
      <div class="ritual-input-row">
        <input type="text" class="ritual-input" placeholder="Add a task..." bind:value={ritualTitle} onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }} />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>
      {#if todayTasks.length > 0}
        <div class="ritual-tasks">
          {#each todayTasks as t}
            <div class="ritual-task" class:rt-done={t.completed}><span>{t.title}</span>{#if t.completed}<span class="rt-check">&#10003;</span>{/if}</div>
          {/each}
        </div>
      {/if}
      <div class="ritual-actions">
        <button class="ritual-btn primary" onclick={completeMorning}>Start the day</button>
        <button class="ritual-btn secondary" onclick={skipMorning}>Skip</button>
      </div>
    </div>
  </div>
{/if}

{#if showEvening}
  <div class="ritual-overlay" transition:fly={{ y: 20, duration: 250, opacity: 0 }}>
    <div class="ritual-card">
      <div class="ritual-icon">
        <CircleCheckBig size={32} strokeWidth={1.5} color="var(--accent)" />
      </div>
      <h2 class="ritual-title">End of day</h2>
      <p class="ritual-sub">You completed <strong>{completedCount}</strong> of <strong>{todayTasks.length}</strong> tasks today</p>
      {#if todayTasks.length > 0}
        <div class="ritual-tasks">
          {#each todayTasks as t}
            <div class="ritual-task" class:rt-done={t.completed}><span>{t.title}</span>{#if t.completed}<span class="rt-check">&#10003;</span>{/if}</div>
          {/each}
        </div>
      {/if}
      <div class="ritual-input-row">
        <input type="text" class="ritual-input" placeholder="Add a task for tomorrow..." bind:value={ritualTitle} onkeydown={(e) => { if (e.key === 'Enter') handleRitualSubmit() }} />
        <button class="ritual-add-btn" aria-label="Add task" onclick={handleRitualSubmit} disabled={!ritualTitle.trim()}>
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div class="ritual-actions">
        <button class="ritual-btn primary" onclick={completeEvening}>Close the day</button>
        <button class="ritual-btn secondary" onclick={skipEvening}>Skip</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .app { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
  .header { display: flex; align-items: center; gap: 10px; padding: 16px 20px 8px; flex-shrink: 0; position: relative; }
  .header::after { content: ''; position: absolute; bottom: 0; left: 20px; right: 20px; height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); }
  .hamburger { width: 38px; height: 38px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.2s var(--ease); flex-shrink: 0; backdrop-filter: blur(var(--glass-blur)); }
  .hamburger:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .hamburger:active { transform: scale(0.92); }
  .logo { font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #f0f0f0; flex: 1; text-shadow: 0 0 40px rgba(255,255,255,0.06); }
  .header-actions { display: flex; align-items: center; gap: 8px; }
  .points-badge { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-subtle); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(212, 165, 116, 0.15); }
  .header-search-btn { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .header-search-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
  .review-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px; text-align: center; }
  .review-num { display: block; font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .review-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .date { font-size: 12px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; }
  .ritual-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 100; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .ritual-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 36px 28px 28px; width: 100%; max-width: 340px; box-shadow: var(--shadow-xl); text-align: center; animation: scaleIn 0.3s var(--ease-out); backdrop-filter: blur(var(--glass-blur)); }
  .ritual-icon { margin-bottom: 16px; display: flex; justify-content: center; animation: float 3s ease-in-out infinite; }
  .ritual-title { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 4px; letter-spacing: -0.3px; }
  .ritual-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
  .ritual-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
  .ritual-input { flex: 1; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .ritual-input:focus { border-color: var(--accent); box-shadow: var(--glow); }
  .ritual-add-btn { width: 44px; height: 44px; border-radius: var(--radius-md); background: var(--accent-gradient); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.2s var(--ease); box-shadow: var(--accent-glow); }
  .ritual-add-btn:hover { transform: scale(1.05); box-shadow: 0 0 40px rgba(212, 165, 116, 0.25); }
  .ritual-add-btn:active { transform: scale(0.95); }
  .ritual-add-btn:disabled { opacity: 0.3; box-shadow: none; }
  .ritual-tasks { text-align: left; margin-bottom: 16px; }
  .ritual-task { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; font-size: 13px; color: var(--text); border-radius: var(--radius-sm); background: var(--surface); border: 1px solid var(--border); margin-bottom: 4px; }
  .ritual-task.rt-done { opacity: 0.5; text-decoration: line-through; color: var(--text-secondary); }
  .rt-check { color: var(--complete); font-size: 13px; font-weight: 700; }
  .ritual-actions { display: flex; flex-direction: column; gap: 8px; }
  .ritual-btn { padding: 12px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); }
  .ritual-btn.primary { background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); }
  .ritual-btn.primary:hover { box-shadow: 0 0 40px rgba(212, 165, 116, 0.25); transform: translateY(-1px); }
  .ritual-btn.primary:active { transform: scale(0.98); }
  .ritual-btn.secondary { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); font-size: 13px; }
  .ritual-btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
</style>
