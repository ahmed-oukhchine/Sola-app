<script>
  let { onDone } = $props()
  let slides = [
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="16" stroke="var(--accent)" stroke-width="2" fill="none"/><path d="M14 20l4 4 8-8" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      title: 'Welcome to Focus',
      text: 'Your personal productivity companion. Plan your day, track tasks, and stay in the zone — all offline, all yours.'
    },
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><rect x="6" y="8" width="28" height="24" rx="3" stroke="var(--accent)" stroke-width="2" fill="none"/><path d="M6 16h28M14 8v6M26 8v6" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/><circle cx="14" cy="23" r="1.5" fill="var(--accent)"/><circle cx="20" cy="23" r="1.5" fill="var(--accent)"/><circle cx="26" cy="23" r="1.5" fill="var(--accent)"/></svg>`,
      title: 'Today & Tasks',
      text: 'See your day at a glance. Add timed tasks, quick todos, and subtasks. Drag to reorder, swipe to complete or delete.'
    },
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="14" stroke="var(--accent)" stroke-width="2" fill="none"/><circle cx="20" cy="20" r="8" stroke="var(--accent)" stroke-width="2" fill="none"/><path d="M20 4v4M20 32v4M4 20h4M32 20h4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>`,
      title: 'Focus Timer',
      text: 'Use the built-in focus timer with ambient sounds (rain, waves, forest). Pomodoro mode keeps you in flow.'
    },
    {
      icon: `<svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 8c-4 0-8 3-8 8 0 6 8 14 8 14s8-8 8-14c0-5-4-8-8-8z" stroke="var(--accent)" stroke-width="2" fill="none"/><circle cx="20" cy="16" r="3" stroke="var(--accent)" stroke-width="2" fill="none"/></svg>`,
      title: 'Your Data Stays Here',
      text: 'Everything is saved locally in your browser. No accounts, no servers, no tracking. Export your data anytime from Settings.'
    }
  ]
  let current = $state(0)
  function next() {
    if (current < slides.length - 1) { current++ }
    else dismiss()
  }
  function prev() { if (current > 0) current-- }
  function dismiss() {
    localStorage.setItem('focus-onboarded', 'true')
    onDone()
  }
</script>

<div class="ob-overlay" transition:fade={{ duration: 300 }}>
  <div class="ob-card">
    <div class="ob-slide">
      <div class="ob-icon">{@html slides[current].icon}</div>
      <h2 class="ob-title">{slides[current].title}</h2>
      <p class="ob-text">{slides[current].text}</p>
    </div>
    <div class="ob-dots">
      {#each slides as _, i}
        <button class="ob-dot" class:active={i === current} onclick={() => current = i} aria-label="Slide {i + 1}"></button>
      {/each}
    </div>
    <div class="ob-actions">
      {#if current > 0}
        <button class="ob-btn ghost" onclick={prev}>Back</button>
      {:else}
        <div></div>
      {/if}
      <button class="ob-btn primary" onclick={next}>{current < slides.length - 1 ? 'Next' : 'Get started'}</button>
    </div>
    {#if current < slides.length - 1}
      <button class="ob-skip" onclick={dismiss}>Skip</button>
    {/if}
  </div>
</div>

<style>
  .ob-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 300; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .ob-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 48px 28px 24px; width: 100%; max-width: 340px; box-shadow: var(--shadow-xl); text-align: center; position: relative; }
  .ob-slide { min-height: 200px; display: flex; flex-direction: column; align-items: center; }
  .ob-icon { margin-bottom: 20px; }
  .ob-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 10px; letter-spacing: -0.3px; }
  .ob-text { font-size: 15px; color: var(--text-secondary); line-height: 1.6; }
  .ob-dots { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 28px 0 20px; }
  .ob-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); border: none; cursor: pointer; padding: 0; transition: all 0.3s var(--ease); }
  .ob-dot.active { width: 24px; border-radius: 4px; background: var(--accent); }
  .ob-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .ob-btn { padding: 12px 24px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); min-width: 100px; }
  .ob-btn.primary { background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); }
  .ob-btn.primary:hover { box-shadow: 0 0 40px rgba(212, 165, 116, 0.25); transform: translateY(-1px); }
  .ob-btn.ghost { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
  .ob-btn.ghost:hover { border-color: var(--accent); color: var(--text); }
  .ob-skip { position: absolute; bottom: 12px; right: 16px; font-size: 12px; color: var(--text-muted); background: none; border: none; cursor: pointer; padding: 4px 8px; }
  .ob-skip:hover { color: var(--text-secondary); }
</style>
