<script>
  import { X } from 'lucide-svelte'
  import { fly } from 'svelte/transition'
  import { someday, addToSomeday, removeFromSomeday, moveSomedayToToday } from './taskStore.svelte.js'

  let title = $state('')

  function handleAdd() {
    if (!title.trim()) return
    addToSomeday(title.trim())
    title = ''
  }
</script>

<div class="view-content">
  <h2 class="view-title">Someday</h2>
  <p class="view-sub">Ideas and things you might want to do</p>
  <div class="inbox-add">
    <input type="text" class="input" placeholder="An idea..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!title.trim()}>Add</button>
  </div>
  {#if someday.items.length === 0}
    <div class="empty"><p>Your someday list is empty</p></div>
  {:else}
    <div class="inbox-list">
      {#each [...someday.items].reverse() as item (item.id)}
        <div class="inbox-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
          <span class="inbox-text">{item.title}</span>
          <div class="inbox-actions">
            <button class="inbox-action" onclick={() => moveSomedayToToday(item.id)} title="Move to today">Today</button>
            <button class="inbox-action del" onclick={() => removeFromSomeday(item.id)} title="Delete">
              <X size={12} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
