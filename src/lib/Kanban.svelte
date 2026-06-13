<script>
  import { store, updateTask, addTask } from './taskStore.svelte.js'

  let title = $state('')
  let showForm = $state(false)

  let todoTasks = $derived(store.tasks.filter(t => !t.completed))
  let doneTasks = $derived(store.tasks.filter(t => t.completed))

  function moveToDone(id) {
    updateTask(id, { completed: true })
  }

  function moveToTodo(id) {
    updateTask(id, { completed: false })
  }

  function handleAdd() {
    if (!title.trim()) return
    addTask(title.trim())
    title = ''; showForm = false
  }
</script>

<div class="view-content">
  <h2 class="view-title">Kanban</h2>
  <p class="view-sub">Organize your tasks visually</p>

  {#if !showForm}
    <button class="add-trigger" onclick={() => showForm = true}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 3v12M3 9h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Add task
    </button>
  {:else}
    <div class="kanban-form" transition:slide={{ duration: 200 }}>
      <input type="text" class="input" placeholder="Task title..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
      <div class="form-actions" style="margin-top:6px">
        <button class="btn btn-cancel" onclick={() => showForm = false}>Cancel</button>
        <button class="btn btn-save" onclick={handleAdd} disabled={!title.trim()}>Add</button>
      </div>
    </div>
  {/if}

  <div class="kanban-columns">
    <div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title">To Do</span>
        <span class="kanban-count">{todoTasks.length}</span>
      </div>
      <div class="kanban-items">
        {#each todoTasks as t (t.id)}
          <div class="kanban-item">
            <span class="kanban-item-text">{t.title}</span>
            <button class="kanban-move" onclick={() => moveToDone(t.id)} title="Done">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6l3 3 4-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        {:else}
          <div class="kanban-empty">Empty</div>
        {/each}
      </div>
    </div>

    <div class="kanban-col">
      <div class="kanban-col-header">
        <span class="kanban-col-title">Done</span>
        <span class="kanban-count">{doneTasks.length}</span>
      </div>
      <div class="kanban-items">
        {#each doneTasks as t (t.id)}
          <div class="kanban-item done">
            <span class="kanban-item-text">{t.title}</span>
            <button class="kanban-move" onclick={() => moveToTodo(t.id)} title="Undo">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2L1 5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        {:else}
          <div class="kanban-empty">Empty</div>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .kanban-form { overflow: hidden; margin-bottom: 16px; }
  .kanban-columns { display: flex; gap: 12px; flex: 1; min-height: 240px; }
  .kanban-col { flex: 1; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .kanban-col-header { display: flex; align-items: center; justify-content: space-between; padding: 0 2px; }
  .kanban-col-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .kanban-count { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface); padding: 2px 9px; border-radius: 10px; border: 1px solid var(--border); }
  .kanban-items { display: flex; flex-direction: column; gap: 6px; }
  .kanban-item { display: flex; align-items: center; gap: 8px; padding: 12px 14px; background: var(--surface); border-radius: 10px; border: 1px solid var(--border); font-size: 14px; transition: all 0.15s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .kanban-item:hover { border-color: var(--accent-subtle); box-shadow: var(--shadow-sm); }
  .kanban-item.done { opacity: 0.5; }
  .kanban-item.done .kanban-item-text { text-decoration: line-through; }
  .kanban-item-text { flex: 1; color: var(--text); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kanban-move { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); cursor: pointer; background: transparent; flex-shrink: 0; transition: all 0.15s var(--ease); }
  .kanban-move:hover { background: var(--surface-hover); color: var(--text-secondary); }
  .kanban-empty { text-align: center; padding: 20px; color: var(--text-muted); font-size: 13px; }
</style>
