<script>
  import { fly } from 'svelte/transition'
  import { LayoutDashboard, CalendarDays, Inbox, Crosshair, ListChecks, Clock, Calendar, Target, Columns3, SquareCheck, Tags, BookOpen, TrendingUp, Settings, ChevronDown, Briefcase, Star, Flame, X, Sunrise, Moon, Sun, Monitor, Download, Upload } from 'lucide-svelte'

  let { open, activeView, streak, points, theme, effectiveTheme, onNavigate, onClose, onThemeCycle, onExport, onImport, onPlanDay, inboxCount = 0, somedayCount = 0 } = $props()

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

{#if open}
  <div class="ios-sheet-backdrop" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex={open ? 0 : -1} role="dialog" aria-label="Navigation">
    <div class="ios-sheet" in:fly={{ y: 60, duration: 350, opacity: 0 }} out:fly={{ y: 40, duration: 200, opacity: 0 }} onclick={(e) => e.stopPropagation()} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} role="dialog" aria-label="Sidebar">
      <div class="ios-sheet-handle"></div>
      <div class="ios-sheet-header">
        <h2 class="ios-sheet-title">Sola</h2>
        <div class="ios-sheet-stats">
          <span class="ios-stat"><Star size={13} strokeWidth={1.5} /> {points}</span>
          <span class="ios-stat"><Flame size={13} strokeWidth={1.5} /> {streak}</span>
        </div>
      </div>
      <div class="ios-sheet-body">
        {#each GROUPS as group}
          <div class="ios-section">
            <span class="ios-section-label">{group.label}</span>
            {#each group.views as v}
              <button class="ios-row" class:active={activeView === v.id} onclick={() => { onNavigate(v.id); onClose() }}>
                <v.icon size={18} strokeWidth={1.5} class="ios-row-icon" />
                <span class="ios-row-label">{v.label}</span>
                {#if v.badge && v.badge > 0}
                  <span class="ios-badge">{v.badge}</span>
                {/if}
              </button>
            {/each}
            {#if group.label === 'Plan'}
              <button class="ios-row" onclick={() => { onPlanDay(); onClose() }}>
                <Sunrise size={18} strokeWidth={1.5} class="ios-row-icon" />
                <span class="ios-row-label">Plan Day</span>
              </button>
            {/if}
          </div>
        {/each}
      </div>
      <div class="ios-sheet-footer">
        <button class="ios-footer-btn" onclick={onThemeCycle} title="Toggle theme">
          {#if theme === 'dark'}<Moon size={14} strokeWidth={1.5} />
          {:else if theme === 'light'}<Sun size={14} strokeWidth={1.5} />
          {:else}<Monitor size={14} strokeWidth={1.5} />
          {/if}
        </button>
        <button class="ios-footer-btn" onclick={onExport} title="Export"><Download size={14} strokeWidth={1.5} /></button>
        <button class="ios-footer-btn" onclick={onImport} title="Import"><Upload size={14} strokeWidth={1.5} /></button>
      </div>
    </div>
  </div>
{/if}

<style>
  .ios-sheet-backdrop { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); display: flex; align-items: flex-end; justify-content: center; animation: fadeIn 0.25s var(--ease-out); }
  .ios-sheet { width: 100%; max-width: 420px; max-height: 85vh; background: var(--bg); border-radius: 20px 20px 0 0; display: flex; flex-direction: column; box-shadow: 0 -4px 60px rgba(0,0,0,0.5); overflow: hidden; }
  .ios-sheet-handle { width: 36px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.15); margin: 8px auto 4px; flex-shrink: 0; }
  .ios-sheet-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px 8px; flex-shrink: 0; }
  .ios-sheet-title { font-size: 20px; font-weight: 650; color: var(--text); letter-spacing: -0.3px; }
  .ios-sheet-stats { display: flex; gap: 12px; }
  .ios-stat { font-size: 12px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
  .ios-sheet-body { flex: 1; overflow-y: auto; padding: 4px 16px 12px; }
  .ios-section { margin-bottom: 16px; }
  .ios-section:last-child { margin-bottom: 0; }
  .ios-section-label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; padding: 8px 12px 6px; display: block; }
  .ios-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px 14px; border-radius: 12px; font-size: 15px; font-weight: 400; color: var(--text); cursor: pointer; background: transparent; transition: all 0.15s var(--ease); border: none; text-align: left; }
  .ios-row:hover { background: var(--surface-hover); }
  .ios-row.active { background: var(--accent-subtle); }
  .ios-row.active .ios-row-icon { color: var(--accent); }
  .ios-row.active .ios-row-label { font-weight: 500; }
  .ios-row-icon { color: var(--text-secondary); flex-shrink: 0; }
  .ios-row-label { flex: 1; }
  .ios-badge { background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 5px; }
  .ios-sheet-footer { padding: 12px 20px 20px; padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px)); border-top: 0.5px solid var(--border); display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .ios-footer-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .ios-footer-btn:hover { color: var(--text); background: var(--surface-hover); border-color: var(--accent-subtle); }
  .ios-footer-btn:active { transform: scale(0.97); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
