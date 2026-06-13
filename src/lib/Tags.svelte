<script>
  import { tags, addTag, removeTag, updateTagColor } from './taskStore.svelte.js'

  let name = $state('')
  let color = $state('#6b6b6b')

  const PRESET_COLORS = ['#6b6b6b', '#8888cc', '#80a060', '#b0a070', '#c08080', '#60a0a0', '#a080c0', '#c0a060']

  function handleAdd() {
    if (!name.trim()) return
    addTag(name.trim(), color)
    name = ''; color = '#6b6b6b'
  }

  function handleColorChange(tagId, newColor) {
    updateTagColor(tagId, newColor)
  }
</script>

<div class="view-content">
  <h2 class="view-title">Tags</h2>
  <p class="view-sub">Categorize tasks with colored tags</p>

  <div class="tag-add">
    <input type="text" class="input" placeholder="Tag name..." bind:value={name} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <div class="tag-color-picker">
      {#each PRESET_COLORS as c}
        <button class="tag-color-swatch" class:selected={color === c} style="background:{c}" onclick={() => color = c} aria-label={c}></button>
      {/each}
    </div>
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!name.trim()}>Add</button>
  </div>

  {#if tags.items.length === 0}
    <div class="empty"><p>No tags yet</p></div>
  {:else}
    <div class="tag-list">
      {#each tags.items as t (t.id)}
        <div class="tag-item">
          <div class="tag-left">
            <div class="tag-badge" style="background:{t.color}"></div>
            <span class="tag-name">{t.name}</span>
          </div>
          <div class="tag-right">
            <div class="tag-color-picker sm">
              {#each PRESET_COLORS as c}
                <button class="tag-color-swatch sm" class:selected={t.color === c} style="background:{c}" onclick={() => handleColorChange(t.id, c)} aria-label={c}></button>
              {/each}
            </div>
            <button class="tag-del" onclick={() => removeTag(t.id)} aria-label="Delete tag">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .tag-add { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .tag-color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
  .tag-color-picker.sm { gap: 4px; }
  .tag-color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid var(--border); cursor: pointer; padding: 0; transition: all 0.15s var(--ease-spring); flex-shrink: 0; }
  .tag-color-swatch:hover { transform: scale(1.2); }
  .tag-color-swatch.selected { border-color: var(--text); box-shadow: 0 0 0 2px var(--bg), 0 0 0 4px var(--text); }
  .tag-color-swatch.sm { width: 24px; height: 24px; }
  .tag-list { display: flex; flex-direction: column; gap: 8px; }
  .tag-item { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: var(--surface); border-radius: 10px; border: 1px solid var(--border); transition: all 0.15s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .tag-item:hover { border-color: var(--accent-subtle); box-shadow: var(--shadow-sm); }
  .tag-left { display: flex; align-items: center; gap: 12px; }
  .tag-badge { width: 14px; height: 14px; border-radius: 4px; flex-shrink: 0; }
  .tag-name { font-size: 15px; font-weight: 500; color: var(--text); }
  .tag-right { display: flex; align-items: center; gap: 10px; }
  .tag-del { width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; transition: all 0.15s var(--ease); }
  .tag-del:hover { background: var(--surface-hover); color: var(--text-secondary); }
</style>
