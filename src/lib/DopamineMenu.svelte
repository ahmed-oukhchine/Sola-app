<script>
  import { fade, fly } from 'svelte/transition'
  import { Sparkles, Music, PersonStanding, Heart, Coffee, Hash, Eye, SmilePlus, Sun, Timer, X } from 'lucide-svelte'

  let { open, onClose } = $props()
  let activeDose = $state(null)
  let doseTimer = $state(0)
  let doseInterval = $state(null)

  const DOSES = [
    { id: 'stretch', icon: PersonStanding, label: 'Stretch', time: 2, color: '#90b080' },
    { id: 'dance', icon: Music, label: 'Dance Break', time: 3, color: '#c0a870' },
    { id: 'breathe', icon: Heart, label: 'Deep Breaths', time: 2, color: '#9990c0' },
    { id: 'hydrate', icon: Coffee, label: 'Drink Water', time: 1, color: '#70a0b0' },
    { id: 'gratitude', icon: SmilePlus, label: 'One Good Thing', time: 2, color: '#b09070' },
    { id: 'eyes', icon: Eye, label: 'Rest Eyes', time: 2, color: '#80a090' },
    { id: 'sun', icon: Sun, label: 'Sunlight', time: 3, color: '#c0b060' },
    { id: 'fidget', icon: Sparkles, label: 'Reset Focus', time: 1, color: '#a080c0' },
  ]

  function startDose(d) {
    activeDose = d
    doseTimer = d.time * 60
    if (doseInterval) clearInterval(doseInterval)
    doseInterval = setInterval(() => {
      doseTimer--
      if (doseTimer <= 0) {
        clearInterval(doseInterval)
        doseInterval = null
        activeDose = null
      }
    }, 1000)
  }

  function cancelDose() {
    if (doseInterval) clearInterval(doseInterval)
    doseInterval = null
    activeDose = null
  }

  function handleClose() {
    cancelDose()
    onClose()
  }

  let doseDisplay = $derived.by(() => {
    if (doseTimer === null || doseTimer === undefined) return ''
    const m = Math.floor(doseTimer / 60)
    const s = doseTimer % 60
    return `${m}:${String(s).padStart(2, '0')}`
  })

  let doseProgress = $derived(activeDose ? 1 - doseTimer / (activeDose.time * 60) : 0)
</script>

{#if open}
  <div class="dm-overlay" out:fade={{ duration: 200 }} onclick={handleClose} role="dialog" tabindex="0" onkeydown={(e) => { if (e.key === 'Escape') handleClose() }}>
    <div class="dm-panel" out:fly={{ y: 40, duration: 250, opacity: 0 }} onclick={(e) => e.stopPropagation()} role="document">
      <div class="dm-header">
        <Sparkles size={18} strokeWidth={1.5} />
        <span class="dm-title">Dopamine Menu</span>
        <button class="dm-close" onclick={handleClose}><X size={16} strokeWidth={1.5} /></button>
      </div>
      <p class="dm-sub">Quick resets for your brain — pick one and go.</p>

      {#if activeDose}
        <div class="dm-dose-active" style="--dose-color: {activeDose.color}">
          <div class="dm-dose-progress" style="width: {doseProgress * 100}%"></div>
          <activeDose.icon size={28} strokeWidth={1.5} />
          <span class="dm-dose-label">{activeDose.label}</span>
          <span class="dm-dose-timer">{doseDisplay}</span>
          <button class="dm-dose-skip" onclick={cancelDose}>Skip</button>
        </div>
      {:else}
        <div class="dm-grid">
          {#each DOSES as d}
            <button class="dm-dose" style="--dose-color: {d.color}" onclick={() => startDose(d)}>
              <d.icon size={22} strokeWidth={1.5} />
              <span class="dm-dose-name">{d.label}</span>
              <span class="dm-dose-time"><Timer size={10} strokeWidth={1.5} /> {d.time}m</span>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .dm-overlay { position: fixed; inset: 0; z-index: 250; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 20px; }
  .dm-panel { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-xl); width: 100%; max-width: 400px; padding: 24px; animation: scaleIn 0.35s var(--ease-spring); }
  .dm-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
  .dm-close { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); padding: 0; transition: all 0.15s var(--ease); background: transparent; border: none; }
  .dm-close:hover { background: var(--surface); color: var(--text); }
  .dm-title { font-size: 18px; font-weight: 650; color: var(--text); }
  .dm-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 18px; margin-top: 4px; }
  .dm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .dm-dose { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 12px; border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); color: var(--text); }
  .dm-dose:hover { background: var(--surface-hover); }
  .dm-dose:active { transform: scale(0.97); }
  .dm-dose-name { font-size: 13px; font-weight: 500; }
  .dm-dose-time { font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 3px; }
  .dm-dose-active { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 32px; border-radius: var(--radius-xl); background: var(--surface); border: 1px solid var(--dose-color, var(--accent)); position: relative; overflow: hidden; color: var(--dose-color, var(--accent)); }
  .dm-dose-progress { position: absolute; top: 0; left: 0; height: 100%; background: rgba(var(--accent-rgb), 0.20); transition: width 0.4s var(--ease); }
  .dm-dose-label { font-size: 20px; font-weight: 600; z-index: 1; }
  .dm-dose-timer { font-size: 36px; font-weight: 650; font-variant-numeric: tabular-nums; z-index: 1; letter-spacing: 2px; }
  .dm-dose-skip { padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; z-index: 1; transition: all 0.15s var(--ease); }
  .dm-dose-skip:hover { color: var(--accent); border-color: var(--accent-subtle); }
  @keyframes scaleIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
