<script>
  import { fly } from 'svelte/transition'
  import { LayoutDashboard, CalendarDays, Inbox, Crosshair, ListChecks, Clock, Calendar, Target, Columns3, SquareCheck, Tags, BookOpen, TrendingUp, Settings, ChevronLeft, ChevronRight, Moon, Sun, Circle, ChevronDown, Briefcase, Star, Flame } from 'lucide-svelte'

  let { open, activeView, streak, points, theme, collapsed, onNavigate, onClose, onThemeCycle, onExport, onImport, onCollapse, inboxCount = 0, somedayCount = 0 } = $props()

  const GROUPS = [
    {
      label: 'Plan',
      views: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'today', label: 'Today', icon: CalendarDays },
        { id: 'inbox', label: 'Inbox', icon: Inbox, badge: inboxCount },
        { id: 'focus', label: 'Focus', icon: Crosshair },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
      ]
    },
    {
      label: 'Organize',
      views: [
        { id: 'routines', label: 'Routines', icon: ListChecks },
        { id: 'someday', label: 'Someday', icon: Clock, badge: somedayCount },
        { id: 'templates', label: 'Templates', icon: Briefcase },
        { id: 'goals', label: 'Goals', icon: Target },
        { id: 'kanban', label: 'Kanban', icon: Columns3 },
        { id: 'habits', label: 'Habits', icon: SquareCheck },
        { id: 'tags', label: 'Tags', icon: Tags },
        { id: 'life-courses', label: 'Courses', icon: BookOpen },
      ]
    },
    {
      label: 'Review',
      views: [
        { id: 'stats', label: 'Stats', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ]

  let expandedGroups = $state({ Plan: true, Organize: true, Review: true })

  function toggleGroup(label) {
    expandedGroups[label] = !expandedGroups[label]
  }
</script>

{#if open}
  <div class="backdrop" out:fade={{ duration: 200 }} onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex="0" role="dialog" aria-label="Navigation">
    <div class="sidebar" class:collapsed class:expanded={!collapsed} out:fly={{ x: -300, duration: 250 }} tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} role="dialog" aria-label="Sidebar">
      {#if collapsed}
        <div class="sb-header-col">
          <button class="sb-toggle" onclick={onCollapse} aria-label="Expand sidebar">
            <ChevronRight size={18} strokeWidth={1.5} />
          </button>
        </div>
        {#each GROUPS as group}
          <div class="sb-group-col">
            <span class="sb-group-label-col">{group.label}</span>
            {#each group.views as v}
              <button class="sb-item-col" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }} title={v.label}>
                <v.icon size={18} strokeWidth={1.5} />
              </button>
            {/each}
          </div>
        {/each}
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
          {#each GROUPS as group}
            <div class="sb-group">
              <button class="sb-group-header" onclick={() => toggleGroup(group.label)}>
                <span class="sb-group-label">{group.label}</span>
                <span class="chevron-wrap" class:rotated={!expandedGroups[group.label]}><ChevronDown size={14} strokeWidth={1.5} /></span>
              </button>
              {#if expandedGroups[group.label]}
                {#each group.views as v}
                  <button class="sb-item" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }}>
                    <v.icon size={18} strokeWidth={1.5} />
                    <span>{v.label}</span>
                    {#if v.badge && v.badge > 0}
                      <span class="sb-badge">{v.badge}</span>
                    {/if}
                  </button>
                {/each}
              {/if}
            </div>
          {/each}
        </div>
        <div class="sb-footer">
          <div class="sb-stats">
            <span class="sb-stat"><Star size={14} strokeWidth={1.5} /> {points}</span>
            <span class="sb-stat"><Flame size={14} strokeWidth={1.5} /> {streak} day{streak !== 1 ? 's' : ''}</span>
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
  .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200; display: flex; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .sidebar { height: 100%; background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)); border-right: 1px solid var(--glass-border); display: flex; flex-direction: column; box-shadow: 4px 0 60px rgba(0,0,0,0.3); animation: slideIn 0.35s var(--ease-out); }
  .sidebar.expanded { width: 280px; max-width: 80vw; padding: 0; }
  .sidebar.collapsed { width: 72px; align-items: center; padding: 0; }
  @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
  .sb-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--glass-border); }
  .sb-header-col { padding: 20px 0; }
  .sb-logo { font-size: 22px; font-weight: 700; color: var(--text); letter-spacing: -0.5px; }
  .sb-toggle { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.2s var(--ease); }
  .sb-toggle:hover { background: var(--surface-hover); color: var(--text); }
  .sb-items { flex: 1; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }

  .sb-footer-col { padding: 12px 0; display: flex; flex-direction: column; align-items: center; border-top: 1px solid var(--glass-border); }
  .sb-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; color: var(--text-secondary); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; text-align: left; width: 100%; }
  .sb-item:hover { background: var(--surface-hover); color: var(--text); transform: translateX(3px); }
  .sb-item.active { background: var(--accent-subtle); color: var(--accent); box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.08); }
  .sb-item-col { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; }
  .sb-item-col:hover { background: var(--surface-hover); color: var(--text); }
  .sb-item-col.active { background: var(--accent-subtle); color: var(--accent); box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.1); }
  .sb-footer { padding: 14px 20px; border-top: 1px solid var(--glass-border); display: flex; flex-direction: column; gap: 10px; }
  .sb-stats { display: flex; gap: 14px; }
  .sb-stat { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .sb-theme { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; background: transparent; padding: 6px 0; transition: color 0.2s var(--ease); text-transform: capitalize; border: none; }
  .sb-theme:hover { color: var(--text); }
  .sb-io { display: flex; gap: 8px; }
  .sb-io-btn { flex: 1; padding: 10px; border-radius: var(--radius-md); font-size: 12px; font-weight: 500; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .sb-io-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .sb-group { margin-bottom: 2px; }
  .sb-group-header { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 10px 14px 6px; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; cursor: pointer; background: none; border: none; transition: color 0.2s var(--ease); }
  .sb-group-header:hover { color: var(--text-secondary); }
  .chevron-wrap { display: inline-flex; align-items: center; transition: transform 0.25s var(--ease); }
  .chevron-wrap.rotated { transform: rotate(-90deg); }
  .sb-group-label { pointer-events: none; }
  .sb-group-col { display: flex; flex-direction: column; align-items: center; padding: 6px 0; }
  .sb-group-col:not(:last-child) { border-bottom: 1px solid var(--border-light); margin-bottom: 6px; }
  .collapsed .sb-group-label-col { display: none; }
  .sb-group-label-col { font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 6px; pointer-events: none; }
  .sb-badge { margin-left: auto; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; line-height: 1; }
</style>
