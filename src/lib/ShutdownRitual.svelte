<script>
  import { CircleCheckBig, Check, X, Clock } from 'lucide-svelte'
  import { store, tags, saveNote, getNote, focusSessions } from './taskStore.svelte.js'

  let { completedCount, todayTotal, onDone, onSkip } = $props()

  let todayStr = $derived(new Date().toISOString().split('T')[0])
  let currentStep = $state(0)
  let reflectionText = $state('')

  let completed = $derived(store.tasks.filter(t => t.date === todayStr && t.completed))
  let tagBreakdown = $derived.by(() => {
    const map = {}
    for (const t of completed) {
      for (const tag of t.tags) {
        map[tag] = (map[tag] || 0) + (t.estimatedMinutes || 15)
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  })
  let totalFocusMinutes = $derived(
    focusSessions.items
      .filter(s => s.date === todayStr)
      .reduce((sum, s) => sum + s.minutes, 0)
  )

  let existingNote = $derived(getNote(todayStr))

  function finish() {
    if (reflectionText.trim()) {
      saveNote(todayStr, reflectionText.trim())
    }
    localStorage.setItem(`focus-evening:${todayStr}`, 'done')
    onDone()
  }

  function skip() {
    localStorage.setItem(`focus-evening:${todayStr}`, 'skipped')
    onSkip()
  }

  function timeDisplay(mins) {
    if (!mins) return '0m'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    if (h === 0) return `${m}m`
    return `${h}h ${m > 0 ? m + 'm' : ''}`
  }
</script>

<div class="ritual-overlay" role="dialog">
  <div class="ritual-card">
    <div class="ritual-header">
      <CircleCheckBig size={20} strokeWidth={1.5} color="var(--complete)" />
      <span class="ritual-title">
        {#if currentStep === 0}Review your day
        {:else}Daily reflection
        {/if}
      </span>
      <span class="ritual-stat">{completedCount}/{todayTotal} tasks done</span>
    </div>

    {#if currentStep === 0}
      <div class="rp-body">
        <p class="rp-desc">Here's what you accomplished today:</p>

        {#if completed.length > 0}
          <div class="rp-completed-list">
            {#each completed.slice(0, 10) as t}
              <div class="rp-completed-item">
                <Check size={12} strokeWidth={1.5} color="var(--complete)" />
                <span class="rp-completed-title">{t.title}</span>
              </div>
            {/each}
            {#if completed.length > 10}
              <div class="rp-completed-more">+{completed.length - 10} more</div>
            {/if}
          </div>
        {:else}
          <div class="rp-empty">
            <p>No tasks completed today. That's okay — tomorrow is fresh.</p>
          </div>
        {/if}

        {#if tagBreakdown.length > 0}
          <div class="rp-breakdown">
            <span class="rp-breakdown-label">Time by area</span>
            {#each tagBreakdown as [tag, mins]}
              <div class="rp-break-row">
                <span class="rp-break-tag">{tag}</span>
                <span class="rp-break-time">{timeDisplay(mins)}</span>
              </div>
            {/each}
          </div>
        {/if}

        {#if totalFocusMinutes > 0}
          <div class="rp-focus-summary">
            <Clock size={14} strokeWidth={1.5} />
            <span>{timeDisplay(totalFocusMinutes)} in focus sessions</span>
          </div>
        {/if}
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={() => currentStep = 1}>Continue</button>
        <button class="ritual-btn secondary" onclick={skip}>Skip</button>
      </div>

    {:else}
      <div class="rp-body">
        <p class="rp-desc">How was your day? Anything you want to note for tomorrow?</p>
        <textarea class="rp-textarea" placeholder={existingNote?.content || "What went well? What could be better?"} bind:value={reflectionText}></textarea>
      </div>
      <div class="rp-body" style="padding-top:0">
        <div class="rp-affirmation">
          <CircleCheckBig size={30} strokeWidth={1.5} color="var(--complete)" />
          <p>You did good work today. Time to rest.</p>
        </div>
      </div>
      <div class="ritual-footer">
        <button class="ritual-btn primary" onclick={finish}>Close the day</button>
        <button class="ritual-btn secondary" onclick={skip}>Skip</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .ritual-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: flex-start; justify-content: center; padding: 60px 24px; z-index: 100; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); animation: fadeIn 0.2s var(--ease-out); }
  .ritual-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 460px; box-shadow: var(--shadow-xl); overflow: hidden; animation: fadeIn 0.15s var(--ease-out); display: flex; flex-direction: column; max-height: 80vh; }
  .ritual-header { display: flex; align-items: center; gap: 10px; padding: 18px 22px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .ritual-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .ritual-stat { font-size: 13px; color: var(--text-secondary); margin-left: auto; }
  .rp-body { padding: 18px 22px; overflow-y: auto; }
  .rp-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5; }
  .rp-completed-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
  .rp-completed-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border); }
  .rp-completed-title { font-size: 14px; color: var(--text); }
  .rp-completed-more { font-size: 12px; color: var(--text-muted); text-align: center; padding-top: 4px; }
  .rp-breakdown { margin-bottom: 14px; }
  .rp-breakdown-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; display: block; }
  .rp-break-row { display: flex; align-items: center; justify-content: space-between; padding: 5px 0; }
  .rp-break-tag { font-size: 13px; color: var(--text); }
  .rp-break-time { font-size: 13px; color: var(--text-secondary); }
  .rp-focus-summary { display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: var(--accent-subtle); border-radius: var(--radius-md); font-size: 13px; color: var(--accent); }
  .rp-empty { text-align: center; padding: 20px 0; color: var(--text-muted); font-size: 14px; }
  .rp-textarea { width: 100%; min-height: 80px; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; outline: none; resize: vertical; font-family: inherit; }
  .rp-textarea:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .rp-affirmation { text-align: center; padding: 16px 0; }
  .rp-affirmation p { font-size: 14px; color: var(--text-secondary); margin-top: 8px; }
  .ritual-footer { display: flex; gap: 8px; padding: 10px 22px 18px; flex-shrink: 0; }
  .ritual-btn { padding: 9px 20px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); }
  .ritual-btn.primary { background: var(--accent); color: #fff; border: none; }
  .ritual-btn.primary:hover { filter: brightness(1.1); }
  .ritual-btn.secondary { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
  .ritual-btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
</style>
