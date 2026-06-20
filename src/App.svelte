<script>
  import { fade, fly } from 'svelte/transition'
  import { onMount } from 'svelte'
  import Sidebar from './lib/Sidebar.svelte'
  import DesktopSidebar from './lib/DesktopSidebar.svelte'
  import RightPanel from './lib/RightPanel.svelte'
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
  import TemplatesView from './lib/Templates.svelte'
  import SomedayView from './lib/Someday.svelte'
  import LifeCoursesView from './lib/LifeCourses.svelte'
  import StatsView from './lib/Stats.svelte'
  import SearchModal from './lib/Search.svelte'
  import Onboarding from './lib/Onboarding.svelte'
  import Account from './lib/Account.svelte'
  import { store, someday, addTask, loadAll, exportData, importData, loadPoints, savePoints, computeStreak, requestPermission, scheduleAll, removeTask, rolloverIncompleteTasks } from './lib/taskStore.svelte.js'
  import { Menu, Search, CalendarDays, Sunrise, Plus, CircleCheckBig, Download, Star, Flame, Sparkles, Monitor } from 'lucide-svelte'
import Toast from './lib/Toast.svelte'
import LockScreen from './lib/LockScreen.svelte'
import DopamineMenu from './lib/DopamineMenu.svelte'
import DailyPlanning from './lib/DailyPlanning.svelte'
import ShutdownRitual from './lib/ShutdownRitual.svelte'

  let activeView = $state('dashboard')
  let sidebarOpen = $state(false)
  let now = $state(new Date())
  let points = $state(loadPoints())
  let streak = $state(computeStreak())
  let showMorning = $state(false)
  let showEvening = $state(false)
  let showWeeklyReview = $state(false)
  let showSearch = $state(false)
  let focusTaskId = $state(null)
  let weeklyReviewData = $state(null)
  let ritualTitle = $state('')
  let theme = $state(localStorage.getItem('focus-theme') || 'system')
  let systemDark = $state(false)
  let effectiveTheme = $derived(theme === 'system' ? (systemDark ? 'dark' : 'light') : theme)
  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let dayStr = $derived(new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
  let todayTasks = $derived(store.tasks.filter(t => t.date === todayStr))
  let completedCount = $derived(todayTasks.filter(t => t.completed).length)
  let completionRate = $derived(store.tasks.length ? Math.round(store.tasks.filter(t => t.completed).length / store.tasks.length * 100) : 0)
  let recentCompletions = $derived(store.tasks.filter(t => t.completed).toReversed().slice(0, 20))
  let showOnboarding = $state(!localStorage.getItem('focus-onboarded'))
  const hasAccount = !!localStorage.getItem('focus-account-user')
  const expiry = localStorage.getItem('focus-session-expiry')
  const sessionExpired = !expiry || parseInt(expiry) < Date.now()
  let showAccount = $state(hasAccount && sessionExpired)
  let userName = $state(localStorage.getItem('focus-account-user') || '')
  let accentColor = $state(localStorage.getItem('focus-accent') || '')
  let showBackupReminder = $state(false)
  let autoThemeTime = $state(localStorage.getItem('focus-auto-theme-time') || '')
  let inboxCount = $derived(store.tasks.filter(t => !t.date || (t.date === todayStr && !t.startTime && !t.completed)).length)
  let somedayCount = $derived(someday.items.length)
  let toasts = $state([])
  let toastId = $state(0)
  let deferredInstall = $state(null)
  const IDLE_TIMEOUT = 5 * 60 * 1000
  let lastActivity = $state(Date.now())
  let showLock = $state(false)
  let showDopamine = $state(false)
  let isDesktop = $state(false)

  function refreshActivity() {
    lastActivity = Date.now()
    if (showLock) showLock = false
  }

  function toast(message, type = 'success', undo = null) {
    const id = ++toastId
    toasts = [...toasts, { id, message, type, undo: !!undo, undoData: undo }]
    setTimeout(() => { toasts = toasts.filter(t => t.id !== id) }, 4000)
  }

  function dismissToast(id) {
    toasts = toasts.filter(t => t.id !== id)
  }

  function handleUndo(id) {
    const t = toasts.find(t => t.id === id)
    if (t?.undoData) t.undoData()
    dismissToast(id)
  }

  function handleInstall() {
    if (!deferredInstall) return
    deferredInstall.prompt()
    deferredInstall.userChoice.then(() => { deferredInstall = null })
  }

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
    root.style.setProperty('--accent-rgb', `${r},${g},${b}`)
    root.style.setProperty('--accent-hover', shadeColor(color, 10))
    root.style.setProperty('--accent-subtle', `rgba(${r}, ${g}, ${b}, ${effectiveTheme === 'light' ? 0.08 : 0.12})`)
    root.style.setProperty('--accent-hover', shadeColor(color, effectiveTheme === 'light' ? -10 : 10))
    root.style.setProperty('--accent-ring', `0 0 0 3px rgba(${r}, ${g}, ${b}, ${effectiveTheme === 'light' ? 0.20 : 0.25})`)
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
      root.style.removeProperty('--accent-hover')
      root.style.removeProperty('--accent-ring')
      root.style.removeProperty('--glow')
    }
  }

  function onOnboardingDone() {
    showOnboarding = false
    showAccount = false
    if (accentColor) {
      applyAccent(accentColor)
    }
    userName = localStorage.getItem('focus-account-user') || ''
    checkRituals()
    checkWeeklyReview()
    checkBackupReminder()
  }

  function onOnboardingAccent(hex) {
    accentColor = hex
    applyAccent(hex)
  }

  function handleUnlock(user) {
    userName = user
    showAccount = false
    checkRituals()
    checkWeeklyReview()
    checkBackupReminder()
  }

  function applyTheme(t) {
    const root = document.documentElement
    theme = t
    localStorage.setItem('focus-theme', t)
    applyEffectiveTheme()
  }

  function applyEffectiveTheme() {
    const root = document.documentElement
    if (effectiveTheme === 'light') root.setAttribute('data-theme', 'light')
    else root.removeAttribute('data-theme')
    if (accentColor) applyAccent(accentColor)
  }

  function cycleTheme() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    applyTheme(next)
  }

  function checkAutoTheme() {
    if (!autoThemeTime) return
    const h = now.getHours(), m = now.getMinutes()
    const [ah, am] = autoThemeTime.split(':').map(Number)
    if (h === ah && m === am) {
      const next = theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
    }
  }

  function addPoints(amt) {
    points += amt
    savePoints(points)
  }

  function onCompleteTask() {
    addPoints(10)
    streak = computeStreak()
    if (navigator.vibrate) navigator.vibrate(20)
    toast('Task completed! +10 pts', 'success')
  }

  function onCompleteSubtask() {
    addPoints(3)
    if (navigator.vibrate) navigator.vibrate(10)
    toast('Subtask done! +3 pts', 'success')
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
    const dq = window.matchMedia('(min-width: 1280px)')
    isDesktop = dq.matches
    dq.addEventListener('change', (e) => { isDesktop = e.matches })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark = mq.matches
    mq.addEventListener('change', (e) => { systemDark = e.matches; applyEffectiveTheme() })
    applyEffectiveTheme()
    scheduleAll()
    if (!showOnboarding && !showAccount) {
      checkRituals()
      checkWeeklyReview()
      checkBackupReminder()
    }
    setInterval(() => {
      now = new Date()
      streak = computeStreak()
      checkAutoTheme()
      if (hasAccount && !showOnboarding && !showAccount && Date.now() - lastActivity > IDLE_TIMEOUT) {
        showLock = true
      }
    }, 5000)
    document.addEventListener('keydown', handleKeydown)
    const evts = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll', 'wheel']
    for (const evt of evts) document.addEventListener(evt, refreshActivity, { passive: true })
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; setTimeout(() => deferredInstall = null, 30000) })
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      for (const evt of evts) document.removeEventListener(evt, refreshActivity)
    }
  })

  const SHORTCUT_VIEWS = { d: 'dashboard', t: 'today', i: 'inbox', f: 'focus', c: 'calendar', r: 'routines', g: 'goals', s: 'stats' }

  function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); showSearch = true; return }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
    const key = e.key.toLowerCase()
    if (key === 'n') { e.preventDefault(); activeView = 'today'; sidebarOpen = false; return }
    if (key in SHORTCUT_VIEWS) { e.preventDefault(); activeView = SHORTCUT_VIEWS[key]; sidebarOpen = false }
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

  function checkBackupReminder() {
    const lastBackup = localStorage.getItem('focus-backup-reminder')
    if (lastBackup === todayStr) return
    const day = new Date().getDay()
    if (day !== 0) return
    showBackupReminder = true
  }

  async function handleExport() {
    const json = exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `focus-backup-${todayStr}.json`; a.click()
    URL.revokeObjectURL(url)
    toast('Data exported successfully', 'success')
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      try {
        const text = await input.files[0].text()
        importData(text)
        points = loadPoints(); streak = computeStreak()
        toast('Data imported successfully', 'success')
      } catch (e) { toast('Invalid backup file', 'error') }
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

{#if showLock}
  <LockScreen username={userName} onUnlock={() => { refreshActivity(); handleUnlock(userName) }} />
{/if}

{#if !isDesktop}
  <Sidebar open={sidebarOpen} {activeView} {streak} {points} {theme} {effectiveTheme} onNavigate={(v) => activeView = v} onClose={() => sidebarOpen = false} onThemeCycle={cycleTheme} onExport={handleExport} onImport={handleImport} onPlanDay={() => showMorning = true} {inboxCount} {somedayCount} />
{/if}

<div class="app-layout">
  {#if isDesktop}
    <DesktopSidebar {activeView} {streak} {points} {theme} {effectiveTheme} onNavigate={(v) => activeView = v} onThemeCycle={cycleTheme} onExport={handleExport} onImport={handleImport} {inboxCount} {somedayCount} onOpenSearch={() => showSearch = true} onPlanDay={() => showMorning = true} />
  {/if}

  <div class="app-main">
    <header class="header" class:desktop={isDesktop}>
      {#if !isDesktop}
        <button class="hamburger" onclick={() => sidebarOpen = true} aria-label="Menu">
          <Menu size={20} strokeWidth={1.5} />
        </button>
      {:else}
        <button class="hamburger desktop-ham" onclick={() => activeView = 'dashboard'} aria-label="Home">
          <Monitor size={18} strokeWidth={1.5} />
        </button>
      {/if}
      <h1 class="logo">Sola</h1>
      <div class="header-actions">
        {#if deferredInstall && !isDesktop}
          <button class="install-btn" onclick={handleInstall} title="Install app">
            <Download size={14} strokeWidth={1.5} />
          </button>
        {/if}
        <button class="header-search-btn" onclick={() => showSearch = true} aria-label="Search (Ctrl+K)">
          <Search size={16} strokeWidth={1.5} />
        </button>
        <span class="points-badge"><Star size={14} strokeWidth={1.5} /> {points}</span>
        <button class="dm-btn" onclick={() => showDopamine = true} aria-label="Dopamine menu">
          <Sparkles size={16} strokeWidth={1.5} />
        </button>
        {#if !isDesktop}
          <span class="date">{dayStr}</span>
        {/if}
      </div>
    </header>

    <div class="app-content">
      {#if activeView === 'dashboard'}<div in:fade={{ duration: 200 }} class="view-wrap"><Dashboard onNavigate={(v) => activeView = v} /></div>{/if}
      {#if activeView === 'calendar'}<div in:fade={{ duration: 200 }} class="view-wrap"><CalendarView /></div>{/if}
      {#if activeView === 'goals'}<div in:fade={{ duration: 200 }} class="view-wrap"><GoalsView /></div>{/if}
      {#if activeView === 'kanban'}<div in:fade={{ duration: 200 }} class="view-wrap"><KanbanView /></div>{/if}
      {#if activeView === 'settings'}<div in:fade={{ duration: 200 }} class="view-wrap"><SettingsView {theme} {effectiveTheme} onThemeCycle={cycleTheme} {accentColor} onAccentChange={setAccent} {autoThemeTime} onAutoThemeChange={(t) => autoThemeTime = t} /></div>{/if}
      {#if activeView === 'habits'}<div in:fade={{ duration: 200 }} class="view-wrap"><HabitsView /></div>{/if}
      {#if activeView === 'tags'}<div in:fade={{ duration: 200 }} class="view-wrap"><TagsView /></div>{/if}
      {#if activeView === 'today'}<div in:fade={{ duration: 200 }} class="view-wrap"><TodayView {now} onCompleteTask={onCompleteTask} onCompleteSubtask={onCompleteSubtask} onStartFocus={(id) => { focusTaskId = id; activeView = 'focus' }} onPlanDay={() => showMorning = true} /></div>{/if}
      {#if activeView === 'inbox'}<div in:fade={{ duration: 200 }} class="view-wrap"><InboxView /></div>{/if}
      {#if activeView === 'focus'}<div in:fade={{ duration: 200 }} class="view-wrap"><FocusView taskId={focusTaskId} onClearTask={() => focusTaskId = null} /></div>{/if}
      {#if activeView === 'templates'}<div in:fade={{ duration: 200 }} class="view-wrap"><TemplatesView /></div>{/if}
      {#if activeView === 'routines'}<div in:fade={{ duration: 200 }} class="view-wrap"><RoutinesView /></div>{/if}
      {#if activeView === 'someday'}<div in:fade={{ duration: 200 }} class="view-wrap"><SomedayView /></div>{/if}
      {#if activeView === 'life-courses'}<div in:fade={{ duration: 200 }} class="view-wrap"><LifeCoursesView /></div>{/if}
      {#if activeView === 'stats'}<div in:fade={{ duration: 200 }} class="view-wrap"><StatsView {points} {streak} {completedCount} todayTotal={todayTasks.length} {completionRate} {recentCompletions} /></div>{/if}
    </div>
  </div>

  {#if isDesktop}
    <RightPanel {activeView} {points} {streak} {now} {todayTasks} {completedCount} onNavigate={(v) => activeView = v} onStartFocus={(id) => { focusTaskId = id; activeView = 'focus' }} onOpenDopamine={() => showDopamine = true} onPlanDay={() => showMorning = true} />
  {/if}
</div>

<SearchModal open={showSearch} onClose={() => showSearch = false} onNavigate={(v) => activeView = v} />

<DopamineMenu open={showDopamine} onClose={() => showDopamine = false} />

{#if showWeeklyReview && weeklyReviewData}
  <div class="ritual-overlay" out:fade={{ duration: 200 }} onclick={dismissWeeklyReview} role="dialog">
    <div class="ritual-card" out:fade={{ duration: 150 }} onclick={(e) => e.stopPropagation()}>
      <div class="ritual-header">
        <CalendarDays size={20} strokeWidth={1.5} color="var(--accent)" />
        <span class="ritual-title">Weekly Review</span>
      </div>
      <div class="review-grid">
        <div class="review-item"><span class="review-num">{weeklyReviewData.totalCompleted}</span><span class="review-label">Total done</span></div>
        <div class="review-item"><span class="review-num">{weeklyReviewData.weekCompleted}</span><span class="review-label">This week</span></div>
        <div class="review-item"><span class="review-num"><Flame size={14} strokeWidth={1.5} />{weeklyReviewData.streak}</span><span class="review-label">Streak</span></div>
        <div class="review-item"><span class="review-num" style="font-size:12px">{weeklyReviewData.bestDay}</span><span class="review-label">Best day</span></div>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={dismissWeeklyReview}>Got it</button>
      </div>
    </div>
  </div>
{/if}

{#if showMorning}
  <DailyPlanning onDone={completeMorning} onSkip={skipMorning} onNavigate={(v) => activeView = v} />
{/if}

{#if showEvening}
  <ShutdownRitual {completedCount} todayTotal={todayTasks.length} onDone={completeEvening} onSkip={skipEvening} />
{/if}

{#if showBackupReminder}
  <div class="ritual-overlay" out:fade={{ duration: 200 }} onclick={() => showBackupReminder = false} role="dialog">
    <div class="ritual-card" out:fade={{ duration: 150 }} onclick={(e) => e.stopPropagation()}>
      <div class="ritual-header">
        <Download size={20} strokeWidth={1.5} color="var(--accent)" />
        <span class="ritual-title">Backup reminder</span>
      </div>
      <div class="ritual-body" style="flex-direction:column;gap:4px;padding-bottom:4px">
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.5">It's Sunday — consider exporting your data to keep a safe backup.</p>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={() => { handleExport(); showBackupReminder = false; localStorage.setItem('focus-backup-reminder', todayStr) }}>Export now</button>
        <button class="ritual-btn secondary" onclick={() => { showBackupReminder = false; localStorage.setItem('focus-backup-reminder', todayStr) }}>Later</button>
      </div>
    </div>
  </div>
{/if}

<Toast {toasts} onDismiss={dismissToast} onUndo={handleUndo} />

<style>
  .app-layout { display: flex; flex: 1; min-height: 0; height: 100%; }
  .app-main { display: flex; flex-direction: column; flex: 1; min-width: 0; overflow: hidden; }
  .app-content { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .view-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .header { display: flex; align-items: center; gap: 8px; padding: 12px 20px 10px; padding-top: calc(12px + env(safe-area-inset-top, 0px)); flex-shrink: 0; position: relative; }
  .header.desktop { padding: 10px 20px; padding-top: calc(10px + env(safe-area-inset-top, 0px)); }
  .header::after { content: ''; position: absolute; bottom: 0; left: 16px; right: 16px; height: 0.5px; background: var(--border); }
  .header.desktop::after { left: 0; right: 0; }
  .desktop-ham { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .desktop-ham:hover { color: var(--text); background: var(--surface-hover); }
  .hamburger { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: transparent; padding: 0; transition: all 0.2s var(--ease); flex-shrink: 0; }
  .hamburger:hover { color: var(--text); background: var(--surface-hover); }
  .hamburger:active { transform: scale(0.92); }
  .logo { font-size: 20px; font-weight: 650; letter-spacing: -0.3px; color: var(--text); flex: 1; }
  .header-actions { display: flex; align-items: center; gap: 6px; }
  .points-badge { font-size: 11px; font-weight: 600; color: var(--accent); background: var(--accent-subtle); padding: 4px 10px; border-radius: 20px; display: flex; align-items: center; gap: 4px; }
  .header-search-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); background: transparent; border: none; padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .header-search-btn:hover { color: var(--text); background: var(--surface-hover); }
  .install-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--complete); background: transparent; border: none; padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .install-btn:hover { background: var(--complete-bg); }
  .dm-btn { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--accent); background: transparent; border: none; padding: 0; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .dm-btn:hover { background: var(--accent-subtle); }

  @media (max-width: 1279px) {
    .app-layout { flex-direction: column; }
    .app-main { height: 100%; }
  }

  @media (min-width: 1280px) {
    .app-layout { height: 100vh; }
    .app-main { border-left: 0.5px solid var(--border); border-right: 0.5px solid var(--border); }
  }
  .review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 16px 22px; }
  .review-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px; text-align: center; }
  .review-num { display: block; font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 2px; }
  .review-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .date { font-size: 12px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; }
  .ritual-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 60px 24px; z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: fadeIn 0.2s var(--ease-out); }
  .ritual-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 420px; box-shadow: var(--shadow-xl); overflow: hidden; animation: fadeIn 0.15s var(--ease-out); }
  .ritual-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid var(--border); }
  .ritual-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .ritual-footer { display: flex; gap: 8px; padding: 8px 22px 18px; }

</style>
