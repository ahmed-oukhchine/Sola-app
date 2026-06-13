<script>
  import { LayoutDashboard, CalendarDays, Inbox, Crosshair, ListChecks, Clock, Calendar, Target, Columns3, SquareCheck, Tags, BookOpen, TrendingUp, Settings, ChevronLeft, ChevronRight, Moon, Sun, Circle } from 'lucide-svelte'

  let { open, activeView, streak, points, theme, collapsed, onNavigate, onClose, onThemeCycle, onExport, onImport, onCollapse } = $props()

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'today', label: 'Today', icon: CalendarDays },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'focus', label: 'Sola', icon: Crosshair },
    { id: 'routines', label: 'Routines', icon: ListChecks },
    { id: 'someday', label: 'Someday', icon: Clock },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'goals', label: 'Goals', icon: Target },
    { id: 'kanban', label: 'Kanban', icon: Columns3 },
    { id: 'habits', label: 'Habits', icon: SquareCheck },
    { id: 'tags', label: 'Tags', icon: Tags },
    { id: 'life-courses', label: 'Courses', icon: BookOpen },
    { id: 'stats', label: 'Stats', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]
</script>

{#if open}
  <div class="backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex="0" role="dialog" aria-label="Navigation">
    <div class="sidebar" class:collapsed class:expanded={!collapsed} tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} role="dialog" aria-label="Sidebar">
      {#if collapsed}
        <div class="sb-header-col">
          <button class="sb-toggle" onclick={onCollapse} aria-label="Expand sidebar">
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div class="sb-items-col">
          {#each VIEWS as v}
            <button class="sb-item-col" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }} title={v.label}>
              <v.icon size={18} strokeWidth={1.5} />
            </button>
          {/each}
        </div>
        <div class="sb-footer-col">
          <button class="sb-item-col" onclick={onThemeCycle} title="Theme">
            {#if theme === 'dark'}
              <Moon size={18} strokeWidth={1.5} />
            {:else if theme === 'light'}
              <Sun size={18} strokeWidth={1.5} />
            {:else}
              <Circle size={18} strokeWidth={1.5} />
            {/if}
          </button>
        </div>
      {:else}
        <div class="sb-header">
          <h2 class="sb-logo">Sola</h2>
          <button class="sb-toggle" onclick={onCollapse} aria-label="Collapse sidebar">
            <ChevronLeft size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div class="sb-items">
          {#each VIEWS as v}
            <button class="sb-item" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }}>
              <v.icon size={18} strokeWidth={1.5} />
              <span>{v.label}</span>
            </button>
          {/each}
        </div>
        <div class="sb-footer">
          <div class="sb-stats">
            <span class="sb-stat">✦ {points}</span>
            <span class="sb-stat">🔥 {streak} day{streak !== 1 ? 's' : ''}</span>
          </div>
          <button class="sb-theme" onclick={onThemeCycle}>
            {#if theme === 'dark'}
              <Moon size={14} strokeWidth={1.5} />
            {:else if theme === 'light'}
              <Sun size={14} strokeWidth={1.5} />
            {:else}
              <Circle size={14} strokeWidth={1.5} />
            {/if}
            <span>{theme}</span>
          </button>
          <div class="sb-io">
            <button class="sb-io-btn" onclick={onExport}>Export</button>
            <button class="sb-io-btn" onclick={onImport}>Import</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; display: flex; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
  .sidebar { height: 100%; background: var(--surface-raised); backdrop-filter: blur(var(--glass-blur)); border-right: 1px solid var(--border); display: flex; flex-direction: column; box-shadow: 4px 0 40px rgba(0,0,0,0.2); animation: slideIn 0.3s var(--ease-out); }
  .sidebar.expanded { width: 280px; max-width: 80vw; padding: 0; }
  .sidebar.collapsed { width: 72px; align-items: center; padding: 0; }
  @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .sb-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 18px 14px; border-bottom: 1px solid var(--border); }
  .sb-header-col { padding: 18px 0; }
  .sb-logo { font-size: 22px; font-weight: 700; color: #f0f0f0; letter-spacing: -0.5px; text-shadow: 0 0 40px rgba(255,255,255,0.06); }
  .sb-toggle { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.15s var(--ease); }
  .sb-toggle:hover { background: var(--surface-hover); color: var(--text); }
  .sb-items { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .sb-items-col { flex: 1; padding: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; overflow-y: auto; }
  .sb-footer-col { padding: 10px 0; display: flex; flex-direction: column; align-items: center; }
  .sb-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-sm); font-size: 15px; font-weight: 500; color: var(--text-secondary); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; text-align: left; width: 100%; }
  .sb-item:hover { background: var(--surface-hover); color: var(--text); transform: translateX(2px); }
  .sb-item.active { background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(var(--accent-rgb), 0.15); }
  .sb-item-col { width: 44px; height: 44px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; }
  .sb-item-col:hover { background: var(--surface-hover); color: var(--text); }
  .sb-item-col.active { background: var(--accent-subtle); color: var(--accent); box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.1); }
  .sb-footer { padding: 14px 18px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
  .sb-stats { display: flex; gap: 14px; }
  .sb-stat { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .sb-theme { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; background: transparent; padding: 6px 0; transition: color 0.15s var(--ease); text-transform: capitalize; border: none; }
  .sb-theme:hover { color: var(--text); }
  .sb-io { display: flex; gap: 8px; }
  .sb-io-btn { flex: 1; padding: 9px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .sb-io-btn:hover { border-color: var(--accent); color: var(--text); }
</style>
