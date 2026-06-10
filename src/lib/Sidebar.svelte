<script>
  let { open, activeView, streak, points, theme, onNavigate, onClose, onThemeCycle, onExport, onImport } = $props()

  const VIEWS = [
    { id: 'today', label: 'Today', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M2 7h14M6 1v3M12 1v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
    { id: 'inbox', label: 'Inbox', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9l4-6h8l4 6-4 5H5l-4-5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9" cy="9" r="2" fill="currentColor"/></svg>` },
    { id: 'focus', label: 'Focus', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/><circle cx="9" cy="9" r="2" fill="currentColor"/></svg>` },
    { id: 'routines', label: 'Routines', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4h12M3 9h12M3 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="14" cy="14" r="3" fill="currentColor"/></svg>` },
    { id: 'someday', label: 'Someday', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5"/></svg>` },
    { id: 'life-courses', label: 'Life Courses', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 3h12v12H3z" stroke="currentColor" stroke-width="1.5" rx="2"/><path d="M6 6h6M6 9h6M6 12h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>` },
    { id: 'stats', label: 'Stats', icon: `<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M2 14h14M4 11l3-5 3 3 4-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` },
  ]
</script>

{#if open}
  <div class="backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex="0" role="dialog" aria-label="Navigation">
    <div class="sidebar" tabindex="0" onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} role="dialog" aria-label="Sidebar">
      <div class="sb-header">
        <h2 class="sb-logo">focus</h2>
      </div>
      <div class="sb-items">
        {#each VIEWS as v}
          <button
            class="sb-item"
            class:active={activeView === v.id}
            onclick={() => { onNavigate(v.id); onClose() }}
          >
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
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 200;
    display: flex;
  }

  .sidebar {
    width: 260px;
    max-width: 80vw;
    height: 100%;
    background: var(--surface);
    display: flex;
    flex-direction: column;
    padding: 0;
    box-shadow: 4px 0 24px rgba(0,0,0,0.1);
    animation: slideIn 0.2s ease;
  }

  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }

  .sb-header {
    padding: 24px 20px 16px;
    border-bottom: 1px solid var(--border);
  }

  .sb-logo {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
  }

  .sb-items {
    flex: 1;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .sb-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    background: transparent;
    transition: all 0.12s;
  }

  .sb-item:hover {
    background: var(--surface-hover);
    color: var(--text);
  }

  .sb-item.active {
    background: var(--bg);
    color: var(--text);
  }

  .sb-footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .sb-stats {
    display: flex;
    gap: 12px;
  }

  .sb-stat {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
  }

  .sb-theme {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    cursor: pointer;
    background: transparent;
    padding: 4px 0;
    transition: color 0.12s;
    text-transform: capitalize;
  }

  .sb-theme:hover {
    color: var(--text);
  }

  .sb-io { display: flex; gap: 6px; }
  .sb-io-btn { flex: 1; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 500; color: var(--text-muted); background: var(--bg); border: 1px solid var(--border); cursor: pointer; transition: all 0.12s; }
  .sb-io-btn:hover { border-color: var(--accent); color: var(--text); }
</style>
