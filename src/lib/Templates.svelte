<script>
  import ConfirmDialog from './ConfirmDialog.svelte'
  import { store, addTask, addTemplate, removeTemplate } from './taskStore.svelte.js'
  import { templates } from './taskStore.svelte.js'
  import { Plus, X, Clock, Copy } from 'lucide-svelte'

  let title = $state('')
  let deleteId = $state(null)

  function createTemplate() {
    if (!title.trim()) return
    addTemplate({ title: title.trim(), items: [] })
    title = ''
  }

  function useTemplate(t) {
    addTask(t.title)
  }

  function confirmDelete(id) {
    deleteId = id
  }

  function doDelete() {
    if (deleteId) removeTemplate(deleteId)
    deleteId = null
  }
</script>

<div class="view-content">
  <h2 class="view-title">Templates</h2>
  <p class="view-sub">Save task templates you use often</p>

  <div class="inbox-add">
    <input type="text" class="input" placeholder="New template name..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') createTemplate() }} />
    <button class="inbox-add-btn" onclick={createTemplate} disabled={!title.trim()}>
      <Plus size={16} strokeWidth={1.5} />
    </button>
  </div>

  {#if templates.items.length === 0}
    <div class="empty">
      <p>No templates yet</p>
      <p class="empty-sub">Create a template from any task by clicking the save icon, or add one above</p>
    </div>
  {:else}
    <div class="inbox-list">
      {#each templates.items as t (t.id)}
        <div class="inbox-item">
          <span class="inbox-text">{t.title}</span>
          <div class="inbox-actions">
            <button class="inbox-action" onclick={() => useTemplate(t)} title="Create task from template">
              <Copy size={14} strokeWidth={1.5} />
            </button>
            <button class="inbox-action del" onclick={() => confirmDelete(t.id)} title="Delete template">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<ConfirmDialog open={deleteId !== null} title="Delete template" message="Delete this template? This cannot be undone." confirmLabel="Delete" onConfirm={doDelete} onCancel={() => deleteId = null} />
