<script>
  import { fly } from 'svelte/transition'
  import { lifeCourses, addLifeCourse, removeLifeCourse } from './taskStore.svelte.js'

  let title = $state('')

  function handleAdd() {
    if (!title.trim()) return
    addLifeCourse(title.trim())
    title = ''
  }
</script>

<div class="view-content">
  <h2 class="view-title">Life Courses</h2>
  <p class="view-sub">Lessons life taught you — write them down so you never forget</p>
  <div class="inbox-add">
    <input type="text" class="input" placeholder="A lesson you learned..." bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!title.trim()}>Add</button>
  </div>
  {#if lifeCourses.items.length === 0}
    <div class="empty"><p>No lessons yet</p></div>
  {:else}
    <div class="inbox-list">
      {#each [...lifeCourses.items].reverse() as item (item.id)}
        <div class="inbox-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
          <span class="inbox-text">{item.title}</span>
          <div class="inbox-actions">
            <button class="inbox-action del" onclick={() => removeLifeCourse(item.id)} title="Delete">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
