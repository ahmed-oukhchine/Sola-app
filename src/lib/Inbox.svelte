<script>
  import { X } from 'lucide-svelte'
  import { fly } from 'svelte/transition'
  import { inbox, addToInbox, removeFromInbox, moveInboxToToday } from './taskStore.svelte.js'

  let title = $state('')

  function handleAdd() {
    if (!title.trim()) return
    addToInbox(title.trim())
    title = ''
  }
</script>

<div class="view-content">
  <h2 class="view-title">Inbox</h2>
  <p class="view-sub">Dump everything on your mind. Process later.</p>
  <div class="inbox-add">
    <input type="text" class="input" placeholder="Anything on your mind?" bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!title.trim()}>Add</button>
  </div>
  {#if inbox.items.length === 0}
    <div class="empty"><p>Your inbox is empty</p></div>
  {:else}
    <div class="inbox-list">
      {#each [...inbox.items].reverse() as item (item.id)}
        <div class="inbox-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
          <span class="inbox-text">{item.title}</span>
          <div class="inbox-actions">
            <button class="inbox-action" onclick={() => moveInboxToToday(item.id)} title="Move to today">Today</button>
            <button class="inbox-action del" onclick={() => removeFromInbox(item.id)} title="Delete">
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
