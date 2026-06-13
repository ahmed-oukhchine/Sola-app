<script>
  let { open, activeView, streak, points, theme, collapsed, onNavigate, onClose, onThemeCycle, onExport, onImport, onCollapse } = $props()

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>` },
    { id: 'today', label: 'Today', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h14M6 1v3M12 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
    { id: 'inbox', label: 'Inbox', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9l4-6h8l4 6-4 5H5l-4-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2" fill="currentColor"/></svg>` },
    { id: 'focus', label: 'Focus', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2" fill="currentColor"/></svg>` },
    { id: 'routines', label: 'Routines', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 9h12M3 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="14" r="3" fill="currentColor"/></svg>` },
    { id: 'someday', label: 'Someday', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/></svg>` },
    { id: 'calendar', label: 'Calendar', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h14M6 1v3M12 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="9" cy="11" r="1.5" fill="currentColor"/></svg>` },
    { id: 'goals', label: 'Goals', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="1.5" fill="currentColor"/></svg>` },
    { id: 'kanban', label: 'Kanban', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 6h14M7 2v14" stroke="currentColor" stroke-width="1.5"/></svg>` },
    { id: 'habits', label: 'Habits', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 5h10v10H4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 2v3M11 2v3M7 10l2 2 3-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
    { id: 'tags', label: 'Tags', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h5l7 7-5 5-7-7V3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="6" r="1" fill="currentColor"/></svg>` },
    { id: 'life-courses', label: 'Courses', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h12v12H3z" stroke="currentColor" stroke-width="1.5"/><path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
    { id: 'stats', label: 'Stats', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14h14M4 11l3-5 3 3 4-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
    { id: 'settings', label: 'Settings', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
  ]
</script>

{#if open}
  <div class="backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex="0" role="dialog" aria-label="Navigation">
    <div class="sidebar" class:collapsed class:expanded={!collapsed} tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} role="dialog" aria-label="Sidebar">
      {#if collapsed}
        <div class="sb-header-col">
          <button class="sb-toggle" onclick={onCollapse} aria-label="Expand sidebar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M12 4l-6 5 6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="sb-items-col">
          {#each VIEWS as v}
            <button class="sb-item-col" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }} title={v.label}>
              {@html v.icon}
            </button>
          {/each}
        </div>
        <div class="sb-footer-col">
          <button class="sb-item-col" onclick={onThemeCycle} title="Theme">
            {@html theme === 'dark'
              ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M14 10.5A5.5 5.5 0 016.5 3 5.5 5.5 0 1014 10.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`
              : theme === 'light'
              ? `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="4" stroke="currentColor" stroke-width="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3.3 3.3l1.4 1.4M13.3 13.3l1.4 1.4M3.3 14.7l1.4-1.4M13.3 4.7l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`
              : `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2.5" fill="currentColor"/></svg>`}
          </button>
        </div>
      {:else}
        <div class="sb-header">
          <h2 class="sb-logo">focus</h2>
          <button class="sb-toggle" onclick={onCollapse} aria-label="Collapse sidebar">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M6 4l6 5-6 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="sb-items">
          {#each VIEWS as v}
            <button class="sb-item" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }}>
              {@html v.icon}
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
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              {#if theme === 'dark'}
                <path d="M11.5 8.7A5.5 5.5 0 015.3 2.5 5.5 5.5 0 1011.5 8.7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
              {:else if theme === 'light'}
                <circle cx="7" cy="7" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M2.5 11.5l1-1M10.5 3.5l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              {:else}
                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>
              {/if}
            </svg>
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
  .sb-logo { font-size: 22px; font-weight: 700; color: transparent; letter-spacing: -0.5px; background: var(--accent-gradient); -webkit-background-clip: text; background-clip: text; }
  .sb-toggle { width: 34px; height: 34px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.15s var(--ease); }
  .sb-toggle:hover { background: var(--surface-hover); color: var(--text); }
  .sb-items { flex: 1; padding: 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }
  .sb-items-col { flex: 1; padding: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; overflow-y: auto; }
  .sb-footer-col { padding: 10px 0; display: flex; flex-direction: column; align-items: center; }
  .sb-item { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-sm); font-size: 15px; font-weight: 500; color: var(--text-secondary); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; text-align: left; width: 100%; }
  .sb-item:hover { background: var(--surface-hover); color: var(--text); transform: translateX(2px); }
  .sb-item.active { background: var(--accent-subtle); color: var(--accent); border: 1px solid rgba(212, 165, 116, 0.15); }
  .sb-item-col { width: 44px; height: 44px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; background: transparent; transition: all 0.2s var(--ease); border: none; }
  .sb-item-col:hover { background: var(--surface-hover); color: var(--text); }
  .sb-item-col.active { background: var(--accent-subtle); color: var(--accent); box-shadow: 0 0 20px rgba(212, 165, 116, 0.1); }
  .sb-footer { padding: 14px 18px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px; }
  .sb-stats { display: flex; gap: 14px; }
  .sb-stat { font-size: 13px; font-weight: 600; color: var(--text-muted); }
  .sb-theme { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; background: transparent; padding: 6px 0; transition: color 0.15s var(--ease); text-transform: capitalize; border: none; }
  .sb-theme:hover { color: var(--text); }
  .sb-io { display: flex; gap: 8px; }
  .sb-io-btn { flex: 1; padding: 9px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .sb-io-btn:hover { border-color: var(--accent); color: var(--text); }
</style>
