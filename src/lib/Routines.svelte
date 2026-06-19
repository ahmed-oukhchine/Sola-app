<script>
  import { X, Check, Sun, Moon } from 'lucide-svelte'
  import { routines, addRoutine, removeRoutine, addRoutineItem, toggleRoutineItem, removeRoutineItem } from './taskStore.svelte.js'

  let title = $state(''), type = $state('morning'), itemInput = $state({})

  function resetRoutines() {
    const today = new Date().toISOString().split('T')[0]
    const lastReset = localStorage.getItem('focus-routine-reset')
    if (lastReset === today) return
    for (const r of routines.items) {
      for (const item of r.items) {
        if (item.completed) item.completed = false
      }
    }
    localStorage.setItem('focus-routine-reset', today)
  }

  resetRoutines()

  function handleAdd() {
    if (!title.trim()) return
    addRoutine(title.trim(), type)
    title = ''
  }

  function handleItemKey(e, rid) {
    if (e.key !== 'Enter') return
    const val = itemInput[rid]
    if (!val || !val.trim()) return
    addRoutineItem(rid, val.trim())
    itemInput = { ...itemInput, [rid]: '' }
  }
</script>

<div class="view-content">
  <h2 class="view-title">Routines</h2>
  <p class="view-sub">Morning and evening checklists</p>
  <div class="routine-add-row">
    <input type="text" class="input" placeholder="Routine name..." bind:value={title} />
    <select class="routine-select" bind:value={type}>
      <option value="morning">Morning</option>
      <option value="evening">Evening</option>
    </select>
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!title.trim()}>Add</button>
  </div>
  {#if routines.items.length === 0}
    <div class="empty"><p>No routines yet</p></div>
  {:else}
    {#each ['morning', 'evening'] as routineType}
      {@const filtered = routines.items.filter(r => r.type === routineType)}
      {#if filtered.length > 0}
        <h3 class="routine-type-heading">{#if routineType === 'morning'}<Sun size={16} strokeWidth={1.5} /> Morning{:else}<Moon size={16} strokeWidth={1.5} /> Evening{/if}</h3>
        {#each filtered as routine (routine.id)}
          <div class="routine-card">
            <div class="routine-header">
              <span class="routine-title">{routine.title}</span>
              <button class="routine-del" aria-label="Delete routine" onclick={() => removeRoutine(routine.id)}>
                <X size={12} strokeWidth={1.5} />
              </button>
            </div>
            <div class="routine-items">
              {#each routine.items as item}
                <div class="routine-item">
                  <button class="rg-check" class:checked={item.completed} onclick={() => toggleRoutineItem(routine.id, item.id)}>
                    {#if item.completed}<Check size={10} strokeWidth={1.5} />{/if}
                  </button>
                  <span class="rg-title" class:rg-done={item.completed}>{item.title}</span>
                  <button class="rg-del" aria-label="Remove" onclick={() => removeRoutineItem(routine.id, item.id)}>
                    <X size={10} strokeWidth={1.5} />
                  </button>
                </div>
              {/each}
              <div class="rg-add">
                <input type="text" class="rg-input" placeholder="Add item..." bind:value={itemInput[routine.id]} onkeydown={(e) => handleItemKey(e, routine.id)} />
              </div>
            </div>
          </div>
        {/each}
      {/if}
    {/each}
  {/if}
</div>

<style>
  .routine-add-row { display: flex; gap: 10px; margin-bottom: 20px; }
  .routine-type-heading { font-size: 16px; font-weight: 600; color: var(--text); margin: 16px 0 10px; }
  .routine-card { background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 12px; padding: 18px 20px; transition: all 0.2s var(--ease); }
  .routine-card:hover { box-shadow: var(--shadow-sm); border-color: var(--accent-subtle); }
  .routine-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .routine-title { font-size: 16px; font-weight: 600; color: var(--text); }
  .routine-del { width: 30px; height: 30px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; transition: all 0.15s var(--ease); }
  .routine-del:hover { background: var(--danger-bg); color: var(--danger); }
  .routine-items { display: flex; flex-direction: column; gap: 6px; }
  .routine-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
  .rg-check { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid var(--border); display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; padding: 0; transition: all 0.15s var(--ease-spring); flex-shrink: 0; }
  .rg-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; box-shadow: 0 0 10px rgba(138, 154, 122, 0.25); }
  .rg-title { font-size: 14px; color: var(--text); flex: 1; }
  .rg-title.rg-done { text-decoration: line-through; color: var(--text-muted); }
  .rg-del { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; padding: 0; transition: all 0.15s var(--ease); }
  .rg-del:hover { background: var(--danger-bg); color: var(--danger); }
  .rg-add { padding: 6px 0; }
  .rg-input { width: 100%; padding: 9px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-size: 13px; transition: border-color 0.15s var(--ease); }
  .rg-input::placeholder { color: var(--text-muted); }
  .rg-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12); }
</style>
