<script>
  import { fade } from 'svelte/transition'
  import { X, StickyNote } from 'lucide-svelte'
  import { fly } from 'svelte/transition'
  import { inbox, addToInbox, removeFromInbox, moveInboxToToday } from './taskStore.svelte.js'

  let title = $state('')
  let dumpText = $state('')
  let dumps = $state(JSON.parse(localStorage.getItem('focus-dumps') || '[]'))

  function handleAdd() {
    if (!title.trim()) return
    addToInbox(title.trim())
    title = ''
  }

  function saveDumps() {
    try { localStorage.setItem('focus-dumps', JSON.stringify(dumps)) } catch {}
  }

  function addDump() {
    if (!dumpText.trim()) return
    dumps.push({ id: Date.now(), text: dumpText.trim(), date: new Date().toISOString().split('T')[0] })
    dumpText = ''
    saveDumps()
  }

  function removeDump(id) {
    dumps = dumps.filter(d => d.id !== id)
    saveDumps()
  }
</script>

<div class="view-content">
  <h2 class="view-title">Inbox</h2>
  <p class="view-sub">Dump everything on your mind. Process later.</p>

  <div class="inbox-add">
    <input type="text" class="input" placeholder="Quick task idea?" bind:value={title} onkeydown={(e) => { if (e.key === 'Enter') handleAdd() }} />
    <button class="inbox-add-btn" onclick={handleAdd} disabled={!title.trim()}>Add</button>
  </div>
  {#if inbox.items.length === 0}
    <div class="empty"><p style="margin:0">Your inbox is empty</p></div>
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

  <div class="dump-section">
    <h3 class="dump-title"><StickyNote size={16} strokeWidth={1.5} /> Brain Dump</h3>
    <p class="dump-sub">Free-form thoughts — no structure needed</p>
    <div class="dump-input-row">
      <textarea class="dump-input" placeholder="Anything on your mind? Let it out..." bind:value={dumpText} onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addDump() } }}></textarea>
      <button class="dump-btn" onclick={addDump} disabled={!dumpText.trim()}>Dump</button>
    </div>
    {#if dumps.length === 0}
      <div class="empty"><p>No dumps yet</p></div>
    {:else}
      <div class="dump-list">
        {#each [...dumps].reverse() as d (d.id)}
          <div class="dump-item" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
            <p class="dump-text">{d.text}</p>
            <div class="dump-meta">
              <span class="dump-date">{d.date}</span>
              <button class="dump-del" onclick={() => removeDump(d.id)} aria-label="Remove"><X size={11} strokeWidth={1.5} /></button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .dump-section { margin-top: 24px; }
  .dump-title { font-size: 15px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
  .dump-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
  .dump-input-row { display: flex; gap: 8px; }
  .dump-input { flex: 1; min-height: 60px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 10px 12px; color: var(--text); font-size: 14px; resize: vertical; font-family: inherit; outline: none; transition: border-color 0.2s var(--ease); }
  .dump-input:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .dump-input::placeholder { color: var(--text-muted); }
  .dump-btn { height: fit-content; padding: 10px 20px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; background: var(--accent); color: #fff; border: none; cursor: pointer; transition: all 0.2s var(--ease); white-space: nowrap; }
  .dump-btn:hover { filter: brightness(1.1); }
  .dump-btn:disabled { opacity: 0.3; cursor: default; box-shadow: none; }
  .dump-list { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
  .dump-item { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 14px; }
  .dump-text { font-size: 14px; color: var(--text); line-height: 1.5; margin: 0 0 6px; white-space: pre-wrap; word-break: break-word; }
  .dump-meta { display: flex; align-items: center; justify-content: space-between; }
  .dump-date { font-size: 11px; color: var(--text-muted); font-weight: 500; }
  .dump-del { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); background: transparent; border: none; cursor: pointer; padding: 0; transition: all 0.2s var(--ease); }
  .dump-del:hover { background: var(--danger-bg); color: var(--danger); }
</style>
