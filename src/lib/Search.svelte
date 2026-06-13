<script>
  import { searchAll, notes, store, inbox, someday, goals, habits } from './taskStore.svelte.js'
  import { Search, X } from 'lucide-svelte'

  let { open, onClose, onNavigate } = $props()
  let query = $state('')
  let results = $state([])
  let selectedIndex = $state(0)

  $effect(() => {
    if (!open) { query = ''; results = []; return }
    setTimeout(() => document.getElementById('search-input')?.focus(), 100)
  })

  function handleInput() {
    results = searchAll(query)
    selectedIndex = 0
  }

  function handleKeydown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, results.length - 1) }
    if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0) }
    if (e.key === 'Enter' && results[selectedIndex]) navigateToResult(results[selectedIndex])
    if (e.key === 'Escape') { onClose() }
  }

  function navigateToResult(r) {
    onClose()
    if (r.type === 'inbox') onNavigate('inbox')
    else if (r.type === 'someday') onNavigate('someday')
    else if (r.type === 'goal') onNavigate('goals')
    else if (r.type === 'habit') onNavigate('habits')
    else if (r.type === 'task') onNavigate('today')
    else onNavigate('dashboard')
  }
</script>

{#if open}
  <div class="search-overlay" role="dialog" aria-label="Search" onclick={onClose} onkeydown={(e) => { if (e.key === 'Escape') onClose() }} tabindex="0">
    <div class="search-modal" onclick={(e) => e.stopPropagation()} role="document">
      <div class="search-input-row">
        <Search size={18} strokeWidth={1.5} class="search-icon" />
        <input id="search-input" type="text" class="search-input" placeholder="Search tasks, notes, inbox..." bind:value={query} oninput={handleInput} onkeydown={handleKeydown} />
        <button class="search-close-btn" onclick={onClose} aria-label="Close search">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
      {#if query && results.length > 0}
        <div class="search-results">
          {#each results as r, i}
            <button class="search-result" class:selected={i === selectedIndex} onclick={() => navigateToResult(r)} onmouseenter={() => selectedIndex = i}>
              <div class="sr-type">{r.type}</div>
              <div class="sr-title">{r.title}</div>
              <div class="sr-sub">{r.subtitle}</div>
            </button>
          {/each}
        </div>
      {:else if query && results.length === 0}
        <div class="search-empty">No results found</div>
      {:else}
        <div class="search-hints">
          <div class="hint"><kbd>↑</kbd><kbd>↓</kbd> Navigate</div>
          <div class="hint"><kbd>Enter</kbd> Open</div>
          <div class="hint"><kbd>Esc</kbd> Close</div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .search-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: flex-start; justify-content: center; padding: 80px 24px; z-index: 200; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .search-modal { background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); width: 100%; max-width: 520px; box-shadow: var(--shadow-xl); overflow: hidden; animation: scaleIn 0.2s var(--ease-out); }
  .search-input-row { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--glass-border); }
  .search-input { flex: 1; border: none; background: transparent; color: var(--text); font-size: 16px; outline: none; }
  .search-input::placeholder { color: var(--text-muted); }
  .search-icon { flex-shrink: 0; color: var(--text-muted); }
  .search-close-btn { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; transition: all 0.2s var(--ease); flex-shrink: 0; }
  .search-close-btn:hover { background: var(--surface-hover); color: var(--text); transform: scale(1.05); }
  .search-results { max-height: 360px; overflow-y: auto; padding: 8px; }
  .search-result { display: flex; flex-direction: column; gap: 2px; width: 100%; padding: 12px 16px; border-radius: var(--radius-md); cursor: pointer; text-align: left; background: transparent; border: none; transition: all 0.15s var(--ease); }
  .search-result.selected { background: var(--accent-subtle); }
  .search-result:hover { background: var(--surface-hover); }
  .sr-type { font-size: 10px; font-weight: 600; color: var(--accent); text-transform: uppercase; letter-spacing: 0.8px; }
  .sr-title { font-size: 14px; font-weight: 500; color: var(--text); }
  .sr-sub { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .search-empty { padding: 40px 20px; text-align: center; color: var(--text-muted); font-size: 14px; }
  .search-hints { display: flex; gap: 16px; justify-content: center; padding: 14px 20px; }
  .hint { font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
  .hint kbd { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 6px; padding: 2px 8px; font-size: 11px; font-family: inherit; color: var(--text-secondary); }
</style>
