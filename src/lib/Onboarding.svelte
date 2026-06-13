<script>
  import { fade, fly } from 'svelte/transition'
  import { Crosshair, ChevronRight, CalendarDays, Timer, MapPin, CircleCheckBig, ChevronLeft } from 'lucide-svelte'

  let { onDone, onAccentChange } = $props()

  const COLORS = [
    { name: 'Amber', hex: '#d4a574', desc: 'Warm classic' },
    { name: 'Emerald', hex: '#5a9a7a', desc: 'Natural calm' },
    { name: 'Sapphire', hex: '#5a8ab8', desc: 'Cool focus' },
    { name: 'Rose', hex: '#c07a7a', desc: 'Soft elegance' },
    { name: 'Lavender', hex: '#9a8ac0', desc: 'Gentle depth' },
    { name: 'Coral', hex: '#d47a6a', desc: 'Vibrant warmth' },
    { name: 'Teal', hex: '#5a9a9a', desc: 'Fresh clarity' },
    { name: 'Slate', hex: '#8a8a9a', desc: 'Minimal muted' },
  ]

  let step = $state(0)
  let chosenColor = $state('')
  let showContent = $state(false)
  let stepKey = $state(0)

  function next() {
    stepKey++
    if (step < 3) { step++ }
    else finish()
  }

  function finish() {
    if (chosenColor) {
      localStorage.setItem('focus-accent', chosenColor)
      onAccentChange(chosenColor)
    }
    localStorage.setItem('focus-onboarded', 'true')
    onDone()
  }

  function pickColor(hex) {
    chosenColor = hex
    onAccentChange(hex)
  }

  let loaded = $state(false)
  $effect(() => { loaded = true })
</script>

<div class="ob-wrap">
  <div class="ob-bg"></div>

  {#if step === 0}
    <div class="ob-step" in:fly={{ y: 30, duration: 600, opacity: 0 }}>
      <div class="ob-welcome-icon">
        <Crosshair size={48} strokeWidth={1.5} />
      </div>
      <h1 class="ob-title">
        {#each 'Sola' as char, i}
          <span class="ob-char" style="animation-delay: {i * 80}ms">{char}</span>
        {/each}
      </h1>
      <p class="ob-tagline" in:fade={{ duration: 800, delay: 600 }}>Your personal productivity space</p>
      <p class="ob-desc" in:fade={{ duration: 800, delay: 900 }}>Plan your day, track tasks, and stay in the zone — all offline, entirely yours.</p>
      <button class="ob-btn primary" in:fade={{ duration: 500, delay: 1300 }} onclick={next}>
        <span>Get started</span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
    </div>

  {:else if step === 1}
    <div class="ob-step">
      <h2 class="ob-heading" in:fly={{ y: 20, duration: 400, opacity: 0 }}>Everything you need</h2>
      <div class="ob-features">
        <div class="ob-feat" in:fly={{ y: 30, duration: 500, delay: 100, opacity: 0 }}>
          <div class="ob-feat-icon">
            <CalendarDays size={24} strokeWidth={1.5} />
          </div>
          <span class="ob-feat-title">Daily timeline</span>
          <span class="ob-feat-text">Schedule tasks with time blocks. Drag to reorder, swipe to complete.</span>
        </div>
        <div class="ob-feat" in:fly={{ y: 30, duration: 500, delay: 250, opacity: 0 }}>
          <div class="ob-feat-icon">
            <Timer size={24} strokeWidth={1.5} />
          </div>
          <span class="ob-feat-title">Focus timer</span>
          <span class="ob-feat-text">Built-in timer with ambient sounds. Pomodoro mode keeps you in flow.</span>
        </div>
        <div class="ob-feat" in:fly={{ y: 30, duration: 500, delay: 400, opacity: 0 }}>
          <div class="ob-feat-icon">
            <MapPin size={24} strokeWidth={1.5} />
          </div>
          <span class="ob-feat-title">100% offline</span>
          <span class="ob-feat-text">Everything stored locally. No accounts, no servers, no tracking.</span>
        </div>
      </div>
      <button class="ob-btn primary" in:fade={{ duration: 400, delay: 600 }} onclick={next}>
        <span>Choose your theme</span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
    </div>

  {:else if step === 2}
    <div class="ob-step">
      <h2 class="ob-heading" in:fly={{ y: 20, duration: 400, opacity: 0 }}>Pick your color</h2>
      <p class="ob-sub" in:fade={{ duration: 400, delay: 200 }}>Choose a primary accent for the app</p>
      <div class="ob-colors" in:fly={{ y: 20, duration: 500, delay: 300, opacity: 0 }}>
        {#each COLORS as c}
          <button class="ob-color-btn" class:selected={chosenColor === c.hex} onclick={() => pickColor(c.hex)} aria-label={c.name}>
            <span class="ob-color-swatch" style="background:{c.hex}"></span>
            <span class="ob-color-name">{c.name}</span>
            <span class="ob-color-desc">{c.desc}</span>
          </button>
        {/each}
      </div>
      <div class="ob-preview" in:fade={{ duration: 500, delay: 500 }}>
        <div class="ob-preview-label">Preview</div>
        <div class="ob-preview-row">
          <button class="ob-preview-btn" style="background: {chosenColor || 'var(--accent)'}; color: #fff;">Button</button>
          <span class="ob-preview-tag" style="background: color-mix(in srgb, {chosenColor || 'var(--accent)'} 15%, transparent); color: {chosenColor || 'var(--accent)'};">Tag</span>
        </div>
      </div>
      <button class="ob-btn primary" in:fade={{ duration: 400, delay: 700 }} onclick={next} disabled={!chosenColor}>
        <span>Continue</span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
    </div>

  {:else if step === 3}
    <div class="ob-step">
      <div class="ob-ready-icon" in:fly={{ y: 20, duration: 500, opacity: 0 }}>
        <CircleCheckBig size={56} strokeWidth={1.5} />
      </div>
      <h2 class="ob-heading" in:fly={{ y: 20, duration: 400, delay: 200, opacity: 0 }}>You're all set</h2>
      <p class="ob-desc" in:fade={{ duration: 600, delay: 400 }}>Your preferences are saved. Everything stays on your device — no accounts, no servers.</p>
      <div class="ob-summary" in:fly={{ y: 20, duration: 500, delay: 600, opacity: 0 }}>
        <div class="ob-summary-row">
          <span>Theme</span>
          <span style="color: {chosenColor || 'var(--accent)'}">{COLORS.find(c => c.hex === chosenColor)?.name || 'Default'}</span>
        </div>
        <div class="ob-summary-row">
          <span>Data</span>
          <span>100% local</span>
        </div>
      </div>
      <button class="ob-btn primary" in:fade={{ duration: 500, delay: 900 }} onclick={finish}>
        <span>Start using Sola</span>
        <ChevronRight size={16} strokeWidth={1.5} />
      </button>
    </div>
  {/if}

  {#if step > 0 && step < 3}
    <button class="ob-back" onclick={() => { step--; stepKey++ }}>
      <ChevronLeft size={14} strokeWidth={1.5} />
      Back
    </button>
  {/if}

  {#if step > 0}
    <div class="ob-progress">
      <div class="ob-progress-bar" style="width: {((step) / 3) * 100}%"></div>
    </div>
  {/if}
</div>

<style>
  .ob-wrap { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .ob-bg { position: absolute; inset: 0; background: #0a0a0a; }
  .ob-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 24px; width: 100%; max-width: 400px; text-align: center; }

  .ob-welcome-icon { margin-bottom: 20px; animation: float 4s ease-in-out infinite; }
  .ob-title { font-size: 48px; font-weight: 800; letter-spacing: -2px; color: #fff; margin-bottom: 12px; line-height: 1; }
  .ob-char { display: inline-block; animation: charIn 0.5s var(--ease-out) both; }
  .ob-tagline { font-size: 18px; color: var(--accent); font-weight: 500; margin-bottom: 8px; letter-spacing: -0.3px; }
  .ob-desc { font-size: 15px; color: rgba(255,255,255,0.45); line-height: 1.6; margin-bottom: 28px; max-width: 300px; }

  .ob-heading { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: -0.5px; }
  .ob-sub { font-size: 14px; color: rgba(255,255,255,0.4); margin-bottom: 24px; }

  .ob-features { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-bottom: 28px; }
  .ob-feat { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 18px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; }
  .ob-feat-icon { margin-bottom: 4px; opacity: 0.8; }
  .ob-feat-title { font-size: 15px; font-weight: 600; color: #fff; }
  .ob-feat-text { font-size: 13px; color: rgba(255,255,255,0.4); line-height: 1.5; }

  .ob-colors { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%; margin-bottom: 20px; }
  .ob-color-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 14px 8px 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; cursor: pointer; transition: all 0.25s var(--ease); }
  .ob-color-btn:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12); }
  .ob-color-btn.selected { border-color: var(--accent); background: rgba(255,255,255,0.06); box-shadow: 0 0 30px rgba(var(--accent-rgb), 0.08); }
  .ob-color-swatch { width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.1); transition: transform 0.25s var(--ease-spring); }
  .ob-color-btn.selected .ob-color-swatch { transform: scale(1.15); border-color: transparent; box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.25); }
  .ob-color-name { font-size: 12px; font-weight: 600; color: #fff; }
  .ob-color-desc { font-size: 10px; color: rgba(255,255,255,0.35); }

  .ob-preview { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; margin-bottom: 24px; }
  .ob-preview-label { font-size: 10px; color: rgba(255,255,255,0.25); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  .ob-preview-row { display: flex; align-items: center; gap: 12px; }
  .ob-preview-btn { padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 500; border: none; cursor: default; transition: background 0.3s var(--ease); }
  .ob-preview-tag { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; transition: all 0.3s var(--ease); }

  .ob-btn { display: flex; align-items: center; gap: 8px; padding: 14px 28px; border-radius: 12px; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s var(--ease); border: none; }
  .ob-btn.primary { background: var(--accent-gradient); color: #fff; box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.15); }
  .ob-btn.primary:hover { transform: translateY(-2px); box-shadow: 0 0 60px rgba(var(--accent-rgb), 0.25); }
  .ob-btn.primary:active { transform: scale(0.97); }
  .ob-btn.primary:disabled { opacity: 0.3; cursor: default; transform: none; box-shadow: none; }

  .ob-ready-icon { margin-bottom: 16px; }
  .ob-ready-icon :global(svg) { animation: scaleIn 0.5s var(--ease-out); }
  .ob-summary { width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; margin-bottom: 28px; }
  .ob-summary-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; color: rgba(255,255,255,0.6); }
  .ob-summary-row span:last-child { font-weight: 500; color: #fff; }

  .ob-back { position: fixed; top: 20px; left: 20px; z-index: 2; display: flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 10px; font-size: 13px; color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); cursor: pointer; transition: all 0.2s var(--ease); }
  .ob-back:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.08); }

  .ob-progress { position: fixed; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.05); z-index: 2; }
  .ob-progress-bar { height: 100%; background: var(--accent-gradient); transition: width 0.5s var(--ease); border-radius: 0 2px 2px 0; }

  @keyframes charIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
</style>
