<script>
  import { LayoutDashboard, CalendarDays, Inbox, Crosshair, ListChecks, Clock, Calendar, Target, Columns3, SquareCheck, Tags, BookOpen, TrendingUp, Settings, Briefcase, Star, Flame, Search } from 'lucide-svelte'

  let { activeView, streak, points, theme, effectiveTheme, onNavigate, onThemeCycle, onExport, onImport, onOpenSearch, inboxCount = 0, somedayCount = 0 } = $props()

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
</script>

<div class="desktop-sidebar">
  <div class="ds-header">
    <h1 class="ds-logo">Sola</h1>
    <div class="ds-stats">
      <span class="ds-stat"><Star size={13} strokeWidth={1.5} /> {points}</span>
      <span class="ds-stat"><Flame size={13} strokeWidth={1.5} /> {streak}</span>
    </div>
  </div>

  <div class="ds-search" onclick={onOpenSearch} onkeydown={(e) => { if (e.key === 'Enter') onOpenSearch() }} tabindex={0} role="button" aria-label="Search">
    <Search size={14} strokeWidth={1.5} />
    <span class="ds-search-label">Search</span>
    <span class="ds-search-kbd">Ctrl+K</span>
  </div>

  <nav class="ds-nav">
    {#each GROUPS as group}
      <div class="ds-section">
        <span class="ds-section-label">{group.label}</span>
        {#each group.views as v}
          <button class="ds-row" class:active={activeView === v.id} onclick={() => onNavigate(v.id)}>
            <v.icon size={17} strokeWidth={1.5} class="ds-row-icon" />
            <span class="ds-row-label">{v.label}</span>
            {#if v.badge && v.badge > 0}
              <span class="ds-badge">{v.badge}</span>
            {/if}
          </button>
        {/each}
      </div>
    {/each}
  </nav>

  <div class="ds-footer">
    <button class="ds-footer-btn" onclick={onThemeCycle}>
      {effectiveTheme === 'dark' ? 'Dark' : 'Light'} mode
    </button>
    <button class="ds-footer-btn" onclick={onExport}>Export</button>
    <button class="ds-footer-btn" onclick={onImport}>Import</button>
  </div>
</div>

<style>
  .desktop-sidebar {
    width: 220px;
    min-width: 220px;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    border-right: 0.5px solid var(--border);
    padding: 0 6px;
    overflow: hidden;
    height: 100vh;
  }
  .ds-header {
    padding: 20px 16px 12px;
    padding-top: calc(20px + env(safe-area-inset-top, 0px));
    flex-shrink: 0;
  }
  .ds-logo {
    font-size: 22px;
    font-weight: 650;
    letter-spacing: -0.5px;
    color: var(--text);
    margin-bottom: 8px;
  }
  .ds-stats {
    display: flex;
    gap: 14px;
  }
  .ds-stat {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ds-search {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 10px 8px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--surface);
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.15s var(--ease);
    flex-shrink: 0;
  }
  .ds-search:hover { background: var(--surface-hover); }
  .ds-search-label { font-size: 13px; flex: 1; }
  .ds-search-kbd {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: inherit;
    letter-spacing: 0.3px;
  }
  .ds-nav {
    flex: 1;
    overflow-y: auto;
    padding: 4px 2px 8px;
  }
  .ds-section { margin-bottom: 12px; }
  .ds-section:last-child { margin-bottom: 0; }
  .ds-section-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 6px 14px 4px;
    display: block;
  }
  .ds-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 400;
    color: var(--text-secondary);
    cursor: pointer;
    background: transparent;
    transition: all 0.12s var(--ease);
    border: none;
    text-align: left;
  }
  .ds-row:hover { color: var(--text); background: var(--surface-hover); }
  .ds-row.active { color: var(--text); background: var(--accent-subtle); }
  .ds-row.active .ds-row-icon { color: var(--accent); }
  .ds-row.active .ds-row-label { font-weight: 500; }
  .ds-row-icon { color: var(--text-muted); flex-shrink: 0; }
  .ds-row-label { flex: 1; }
  .ds-badge {
    background: var(--accent);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    min-width: 16px;
    height: 16px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
  .ds-footer {
    padding: 10px 12px 16px;
    padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    border-top: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .ds-footer-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
    padding: 8px 10px; border-radius: 8px; font-size: 12px; font-weight: 500;
    color: var(--text-secondary); background: var(--surface);
    border: 1px solid var(--border); cursor: pointer;
    transition: all 0.15s var(--ease);
  }
  .ds-footer-btn:hover { color: var(--text); background: var(--surface-hover); border-color: var(--accent-subtle); }
  .ds-footer-btn:active { transform: scale(0.97); }
</style>
