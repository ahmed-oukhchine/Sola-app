<script>
  import { fade } from 'svelte/transition'
  import { Play, Pause, PlusCircle, X, Timer, PartyPopper, UserRound } from 'lucide-svelte';
  import { store, logFocusSession } from './taskStore.svelte.js'
  const PRESETS = [5, 15, 25, 45]
  let timerMinutes = $state(25), timerRemaining = $state(25 * 60)
  let timerRunning = $state(false), timerPaused = $state(false), timerStart = $state(0)
  let timerPauseRemaining = $state(0), tickInterval = $state(null), doTick = $state(false), prevSecond = $state(-1)
  let pomodoroActive = $state(false), pomodoroSession = $state('focus'), pomodoroCount = $state(0)
  let showCelebration = $state(false)
  let showExtend = $state(false)
  let just5Session = $state(false)

  function extendSession() {
    timerMinutes = 5
    timerRemaining = 5 * 60
    showExtend = false
    startTimerv()
  }
  let { taskId, onClearTask } = $props()
  let focusTask = $derived(taskId ? store.tasks.find(t => t.id === taskId) : null)

  // Ambient sounds
  let soundType = $state('none')
  let audioCtx = $state(null)
  let soundNodes = $state([])

  // Ambient firefly particles
  let fireflyCount = 60
  let fireflies = $derived.by(() => {
    const arr = []
    for (let i = 0; i < fireflyCount; i++) {
      const drifter = i < Math.round(fireflyCount * 0.2)
      const x = Math.random() * 100
      const y = Math.random() * 100
      arr.push({
        x, y,
        size: 1 + Math.random() * 2,
        opacity: 0.15 + Math.random() * 0.35,
        delay: Math.random() * 10,
        drifter,
        driftX: drifter ? (Math.random() - 0.5) * 25 : 0,
        driftY: drifter ? (Math.random() - 0.5) * 25 : 0,
        glowColor: Math.random() > 0.4 ? 'rgba(255,245,210,0.5)' : 'rgba(210,225,255,0.35)',
        toX: `${(50 - x) * 0.4}vw`,
        toY: `${(50 - y) * 0.4}vh`
      })
    }
    return arr
  })

  const SOUNDS = [
    { id: 'none', label: 'Silent' },
    { id: 'rain', label: 'Rain' },
    { id: 'waves', label: 'Waves' },
    { id: 'forest', label: 'Forest' },
    { id: 'noise', label: 'White Noise' }
  ]

  let timerDisplay = $derived.by(() => {
    const m = Math.floor(timerRemaining / 60), s = Math.floor(timerRemaining % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })
  let timerStatus = $derived(
    !timerRunning && timerRemaining === timerMinutes * 60 ? 'ready' :
    timerRunning ? 'running' : timerPaused ? 'paused' : timerRemaining <= 0 ? 'done' : 'ready'
  )
  let progress = $derived(1 - timerRemaining / (timerMinutes * 60))
  function playTimerSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const play = (freq, start, dur) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = freq
        o.type = 'sine'
        g.gain.setValueAtTime(0.3, start)
        g.gain.exponentialRampToValueAtTime(0.01, start + dur)
        o.connect(g).connect(ctx.destination)
        o.start(start)
        o.stop(start + dur)
      }
      play(880, ctx.currentTime, 0.15)
      play(660, ctx.currentTime + 0.15, 0.15)
      play(880, ctx.currentTime + 0.3, 0.15)
      play(1100, ctx.currentTime + 0.45, 0.4)
    } catch {}
  }

  function startSound() {
    try {
      stopSound()
      if (soundType === 'none') return
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtx = ctx
      const master = ctx.createGain()
      master.gain.value = 0.15
      master.connect(ctx.destination)

      if (soundType === 'noise') {
        const bufSize = ctx.sampleRate * 2
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 2000
        src.connect(filter).connect(master)
        src.start()
        soundNodes = [src, filter, master]
      } else if (soundType === 'rain') {
        const bufSize = ctx.sampleRate * 2
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const hp = ctx.createBiquadFilter()
        hp.type = 'highpass'
        hp.frequency.value = 800
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 6000
        const gain = ctx.createGain()
        gain.gain.value = 0.4
        src.connect(hp).connect(lp).connect(gain).connect(master)
        src.start()
        soundNodes = [src, hp, lp, gain, master]
      } else if (soundType === 'waves') {
        const bufSize = ctx.sampleRate * 4
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) {
          const t = i / ctx.sampleRate
          data[i] = (Math.random() * 2 - 1) * (0.3 + 0.7 * (Math.sin(t * 0.08) * 0.5 + 0.5))
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        const lp = ctx.createBiquadFilter()
        lp.type = 'lowpass'
        lp.frequency.value = 400
        src.connect(lp).connect(master)
        src.start()
        soundNodes = [src, lp, master]
      } else if (soundType === 'forest') {
        const chirpInterval = setInterval(() => {
          if (!audioCtx) { clearInterval(chirpInterval); return }
          try {
            const o = audioCtx.createOscillator()
            const g = audioCtx.createGain()
            const freq = 2000 + Math.random() * 3000
            o.frequency.value = freq
            o.type = 'sine'
            g.gain.setValueAtTime(0, audioCtx.currentTime)
            g.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + 0.02)
            g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12 + Math.random() * 0.1)
            o.connect(g).connect(master)
            o.start()
            o.stop(audioCtx.currentTime + 0.3)
            soundNodes.push(o, g)
          } catch {}
        }, 800 + Math.random() * 2000)
        soundNodes.push({ cleanup: () => clearInterval(chirpInterval) })
        const bufSize = ctx.sampleRate * 2
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
        const data = buf.getChannelData(0)
        for (let i = 0; i < bufSize; i++) {
          const t = i / ctx.sampleRate
          data[i] = (Math.random() * 2 - 1) * (0.1 + 0.2 * Math.sin(t * 0.5))
        }
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.loop = true
        src.connect(master)
        src.start()
        soundNodes.push(src, master)
      }
    } catch {}
  }

  function stopSound() {
    if (audioCtx) { audioCtx.close(); audioCtx = null }
    for (const n of soundNodes) { if (n && typeof n.cleanup === 'function') n.cleanup() }
    soundNodes = []
  }

  function toggleSound(id) {
    soundType = soundType === id ? 'none' : id
    startSound()
  }

  function setPreset(m) { if (!timerRunning && !timerPaused) { timerMinutes = m; timerRemaining = m * 60 } }
  function timerTick() {
    if (!timerRunning) return
    const elapsed = (Date.now() - timerStart) / 1000
    const remaining = Math.max(0, timerPauseRemaining - elapsed)
    timerRemaining = remaining
    const cs = Math.floor(remaining)
    if (cs !== prevSecond) { prevSecond = cs; doTick = true; setTimeout(() => doTick = false, 150) }
    if (remaining <= 0) {
      clearInterval(tickInterval); tickInterval = null; timerRunning = false
      playTimerSound()
      const sessionMinutes = timerMinutes
      logFocusSession(sessionMinutes, pomodoroActive ? (pomodoroSession === 'focus' ? 'pomodoro-focus' : 'pomodoro-break') : 'focus')
      if (just5Session) { just5Session = false; showExtend = true }
      else if (!pomodoroActive) { showCelebration = true; setTimeout(() => showCelebration = false, 3000) }
      if (pomodoroActive) {
        if (pomodoroSession === 'focus') {
          pomodoroSession = 'break'; pomodoroCount++
          const bm = pomodoroCount % 4 === 0 ? 15 : 5
          timerMinutes = bm; timerRemaining = bm * 60
          startTimerv()
        } else {
          pomodoroSession = 'focus'
          timerMinutes = 25; timerRemaining = 25 * 60
          startTimerv()
        }
      }
      if (localStorage.getItem('focus-ntfy-enabled') === 'true' && 'Notification' in window && Notification.permission === 'granted') new Notification('Sola', { body: pomodoroActive ? `Pomodoro ${pomodoroSession} complete!` : 'Focus session complete!' })
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
    }
  }
  function startTimerv() { if (timerRemaining <= 0) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function pauseTimer() { if (!timerRunning) return; timerRunning = false; timerPaused = true; clearInterval(tickInterval); tickInterval = null }
  function resumeTimer() { if (!timerPaused) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function resetTimer() { timerRunning = false; timerPaused = false; clearInterval(tickInterval); tickInterval = null; timerRemaining = timerMinutes * 60; stopSound() }

  $effect(() => () => { if (tickInterval) clearInterval(tickInterval); stopSound() })

  // Focus insurance
  let fallbackTask = $state(localStorage.getItem('focus-fallback') || '')
  let showFallback = $state(false)
  function saveFallback() {
    localStorage.setItem('focus-fallback', fallbackTask)
    showFallback = false
  }

  // --- Body Double ---
  let showBodyDouble = $state(false)
  const bdMessages = ['Right here with you', 'You can do this', 'One step at a time', 'Stay with it', 'Almost there', 'You got this', 'Keep going', 'Breathe and focus']
  let bdIndex = $state(0)
  $effect(() => {
    if (!showBodyDouble || !timerRunning) return
    const interval = setInterval(() => { bdIndex = (bdIndex + 1) % bdMessages.length }, 8000)
    return () => clearInterval(interval)
  })
</script>

<main class="focus-view" class:breathing={timerStatus === 'running'} class:celebrating={showCelebration}>
  <div class="bg-layer">
    <div class="glow" class:glow-active={timerStatus === 'running'} class:glow-celebrate={showCelebration}></div>
    {#each fireflies as p, i}
      <div
        class="firefly"
        class:drifter={p.drifter}
        style="left: {p.x}%; top: {p.y}%;
          width: {p.size}px; height: {p.size}px;
          opacity: {p.opacity};
          --delay: {p.delay}s;
          --drift-x: {p.driftX}px; --drift-y: {p.driftY}px;
          --glow: {p.glowColor};
          --to-x: {p.toX}; --to-y: {p.toY};"
      ></div>
    {/each}
  </div>
  <svg class="time-timer" viewBox="0 0 280 280">
    <circle class="tt-bg" cx="140" cy="140" r="120" />
    <circle class="tt-fill" cx="140" cy="140" r="120"
      style="stroke-dasharray: {2 * Math.PI * 120}; stroke-dashoffset: {2 * Math.PI * 120 * (1 - progress)}"
      transform="rotate(-90 140 140)"
    />
    <text class="tt-digits" x="140" y="140" text-anchor="middle" dominant-baseline="central">{timerDisplay}</text>
    <text class="tt-label" x="140" y="176" text-anchor="middle">
      {timerStatus === 'ready' ? (pomodoroActive ? `Ready for ${pomodoroSession}` : 'Ready') : timerStatus === 'running' ? (pomodoroActive ? `${pomodoroSession}` : 'Focusing') : timerStatus === 'paused' ? 'Paused' : 'Complete!'}
    </text>
  </svg>

  {#if focusTask}
    <div class="focus-task-badge">
      <span class="focus-task-label">Focusing on</span>
      <span class="focus-task-title">{focusTask.title}</span>
      <button class="focus-task-clear" onclick={onClearTask} aria-label="Clear task"><X size={12} strokeWidth={1.5} /></button>
    </div>
  {/if}

  {#if soundType !== 'none'}
    <div class="sound-indicator">{SOUNDS.find(s => s.id === soundType)?.label}</div>
  {/if}

  <div class="sound-row">
    {#each SOUNDS as s}
      <button class="sound-btn" class:active={soundType === s.id} onclick={() => toggleSound(s.id)} disabled={timerStatus === 'done'}>
        {s.label}
      </button>
    {/each}
  </div>

  <div class="presets">
    {#each PRESETS as m}
      <button class="preset-btn" class:active={timerMinutes === m && timerStatus === 'ready'} onclick={() => setPreset(m)} disabled={timerRunning || timerPaused}>{m}</button>
    {/each}
  </div>
  <button class="just5-btn" onclick={() => { if (timerStatus === 'ready') { just5Session = true; timerMinutes = 5; timerRemaining = 5 * 60; startTimerv() } }} disabled={timerRunning || timerPaused}>
    Just 5 min
  </button>

  {#if showExtend}
    <div class="extend-prompt" transition:fade={{ duration: 200 }}>
      <span class="extend-text">Keep going?</span>
      <button class="extend-btn" onclick={() => { extendSession() }}>+5 min</button>
      <button class="extend-btn secondary" onclick={() => { showExtend = false }}>Done</button>
    </div>
  {/if}

  <div class="focus-controls">
    {#if timerStatus === 'ready'}
      <button class="focus-btn primary" onclick={startTimerv} disabled={timerMinutes <= 0}>
        <Play size={16} strokeWidth={1.5} />
        Start
      </button>
    {:else if timerStatus === 'running'}
      <button class="focus-btn" onclick={pauseTimer}>
        <Pause size={14} strokeWidth={1.5} />
      </button>
      <button class="focus-btn secondary" onclick={resetTimer}>Reset</button>
    {:else if timerStatus === 'paused'}
      <button class="focus-btn primary" onclick={resumeTimer}>
        <Play size={16} strokeWidth={1.5} />
        Resume
      </button>
      <button class="focus-btn" onclick={resetTimer}>Reset</button>
    {:else}
      <button class="focus-btn primary" onclick={resetTimer}>
        <PlusCircle size={16} strokeWidth={1.5} />
        New session
      </button>
    {/if}
  </div>

  {#if showFallback}
    <div class="fallback-row" transition:fade={{ duration: 150 }}>
      <span class="fallback-label">If you can't focus, do this instead:</span>
      <input type="text" class="fallback-input" bind:value={fallbackTask} placeholder="e.g. stretch, make tea, tidy desk" onkeydown={(e) => { if (e.key === 'Enter') saveFallback() }} />
      <button class="fallback-save" onclick={saveFallback}>Save</button>
    </div>
  {:else if !fallbackTask && timerStatus === 'ready'}
    <button class="fallback-set" onclick={() => showFallback = true}>Set a fallback task</button>
  {:else if fallbackTask && (timerStatus === 'running' || timerStatus === 'paused')}
    <div class="fallback-active">Fallback: {fallbackTask}</div>
  {/if}

  <button class="pomo-btn" class:active={pomodoroActive} onclick={() => { pomodoroActive = !pomodoroActive; if (!pomodoroActive) resetTimer() }}>
      <Timer size={14} strokeWidth={1.5} />
    <span>{pomodoroActive ? `${pomodoroSession} ${pomodoroCount > 0 ? `(${pomodoroCount})` : ''}` : 'Pomodoro'}</span>
  </button>

  <button class="bd-toggle" class:active={showBodyDouble} onclick={() => showBodyDouble = !showBodyDouble}>
    <UserRound size={14} strokeWidth={1.5} />
    <span>{showBodyDouble ? 'Double on' : 'Body double'}</span>
  </button>

  {#if showBodyDouble}
    <div class="bd-card" transition:fade={{ duration: 300 }}>
      <div class="bd-avatar">
        <UserRound size={28} strokeWidth={1.5} />
      </div>
      <div class="bd-info">
        <span class="bd-name">Your focus partner</span>
        <span class="bd-message">{bdMessages[bdIndex]}</span>
      </div>
      <div class="bd-status">
        <span class="bd-dot"></span>
      </div>
    </div>
  {/if}
</main>

{#if showCelebration}
  <div class="celebration-overlay" out:fade={{ duration: 200 }} onclick={() => showCelebration = false}>
    <div class="celebration-card" out:fade={{ duration: 150 }}>
      <PartyPopper size={56} strokeWidth={1.5} />
      <div class="celebration-title">Session Complete!</div>
      <div class="celebration-sub">{timerMinutes} minute{timerMinutes !== 1 ? 's' : ''} focused</div>
    </div>
  </div>
{/if}

<style>
  .focus-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; gap: 14px; position: relative; background: #000; }
  .time-timer { width: 240px; height: 240px; overflow: visible; margin-top: 10px; }
  .tt-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 8px; }
  .tt-fill { fill: none; stroke: var(--accent); stroke-width: 8px; stroke-linecap: round; transition: stroke-dashoffset 0.5s var(--ease-out); filter: drop-shadow(0 0 24px rgba(var(--accent-rgb), 0.15)); }
  .tt-digits { font-size: 52px; font-weight: 600; fill: var(--text); font-variant-numeric: tabular-nums; letter-spacing: 2px; }
  .tt-label { font-size: 11px; fill: var(--text-muted); font-weight: 500; letter-spacing: 2px; text-transform: uppercase; }
  .sound-indicator { font-size: 11px; color: var(--accent); font-weight: 500; letter-spacing: 0.3px; }
  .sound-row { display: flex; gap: 4px; flex-wrap: wrap; justify-content: center; }
  .sound-btn { padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .sound-btn:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .sound-btn.active { background: var(--accent); color: #fff; border-color: transparent; }
  .sound-btn:disabled { opacity: 0.35; cursor: default; }
  .presets { display: flex; gap: 8px; }
  .preset-btn { width: 46px; height: 46px; border-radius: 50%; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .preset-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
  .preset-btn.active { background: var(--accent); color: #fff; border-color: transparent; }
  .preset-btn:disabled { opacity: 0.35; cursor: default; }
  .focus-controls { display: flex; gap: 10px; align-items: center; }
  .focus-btn { padding: 12px 28px; border-radius: 50px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s var(--ease); display: flex; align-items: center; gap: 6px; }
  .focus-btn.primary { background: var(--accent); color: #fff; border: none; }
  .focus-btn.primary:hover { filter: brightness(1.15); }
  .focus-btn.primary:active { transform: scale(0.97); }
  .focus-btn.primary:disabled { opacity: 0.2; cursor: default; }
  .focus-btn.secondary { width: 44px; height: 44px; border-radius: 50%; background: var(--surface); color: var(--text); border: 1px solid var(--border); justify-content: center; }
  .focus-btn.secondary:hover { border-color: var(--accent); color: var(--accent); }
  .pomo-btn { display: flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .pomo-btn:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .pomo-btn.active { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
  .bd-toggle { display: flex; align-items: center; gap: 6px; padding: 6px 16px; border-radius: 20px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--surface); border: 1px solid var(--border); cursor: pointer; transition: all 0.2s var(--ease); }
  .bd-toggle:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .bd-toggle.active { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
  .bd-card { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); width: 100%; max-width: 300px; }
  .bd-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--accent-subtle); display: flex; align-items: center; justify-content: center; color: var(--accent); flex-shrink: 0; }
  .bd-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
  .bd-name { font-size: 13px; font-weight: 500; color: var(--text); }
  .bd-message { font-size: 11px; color: var(--text-secondary); font-style: italic; }
  .bd-status { display: flex; align-items: center; }
  .bd-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--complete); animation: pulse-dot 2s ease-in-out infinite; }
  @keyframes pulse-dot { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
  .focus-task-badge { display: flex; align-items: center; gap: 6px; padding: 6px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 50px; max-width: 80%; }
  .focus-task-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .focus-task-title { font-size: 12px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .focus-task-clear { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; padding: 0; flex-shrink: 0; transition: all 0.2s var(--ease); }
  .focus-task-clear:hover { background: var(--danger-bg); color: var(--danger); }
  .celebration-overlay { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(16px); animation: fadeIn 0.2s var(--ease-out); }
  .celebration-card { background: var(--bg); border-radius: var(--radius-xl); border: 1px solid var(--border); padding: 36px 44px; text-align: center; animation: scaleIn 0.35s var(--ease-spring); }
  .celebration-title { font-size: 20px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .celebration-sub { font-size: 13px; color: var(--text-secondary); }
  /* --- Focus Bubble Background --- */
  .bg-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; display: flex; align-items: center; justify-content: center; }
  .glow {
    position: absolute;
    width: 320px; height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle at center, rgba(160,180,255,0.04) 0%, transparent 65%);
    transform: scale(0.92);
    opacity: 0.4;
    animation: breathe 7s ease-in-out infinite;
    transition: opacity 1.5s ease, background 1.5s ease;
  }
  .glow-active {
    opacity: 1;
    background: radial-gradient(circle at center, rgba(160,180,255,0.08) 0%, transparent 60%);
  }
  .glow-celebrate {
    animation: celebrate-pulse 3s ease-out forwards;
  }
  @keyframes breathe {
    0%, 100% { transform: scale(0.92); opacity: 0.4; }
    50% { transform: scale(1.06); opacity: 0.8; }
  }
  @keyframes celebrate-pulse {
    0% { transform: scale(0.95); opacity: 1; background: radial-gradient(circle at center, rgba(160,180,255,0.2) 0%, transparent 50%); }
    100% { transform: scale(1.8); opacity: 0; background: radial-gradient(circle at center, rgba(160,180,255,0.05) 0%, transparent 60%); }
  }
  .firefly {
    position: absolute;
    border-radius: 50%;
    background: var(--glow, rgba(255,245,210,0.4));
    box-shadow: 0 0 5px 2px var(--glow, rgba(255,245,210,0.2));
    animation: firefly-pulse 6s ease-in-out infinite;
    animation-delay: var(--delay, 0s);
    transition: opacity 1.5s ease;
  }
  .firefly.drifter {
    animation: firefly-pulse 6s ease-in-out infinite, firefly-drift 45s ease-in-out infinite alternate;
    animation-delay: var(--delay, 0s), var(--delay, 0s);
  }
  .breathing .firefly.drifter {
    animation-duration: 6s, 55s;
  }
  .celebrating .firefly {
    animation: firefly-center 2.8s cubic-bezier(0.4, 0.0, 0.2, 1) forwards;
  }
  @keyframes firefly-pulse {
    0%, 100% { opacity: 0.15; transform: scale(0.8); }
    50% { opacity: 0.9; transform: scale(1.15); }
  }
  @keyframes firefly-drift {
    0% { transform: translate(0, 0); }
    100% { transform: translate(var(--drift-x), var(--drift-y)); }
  }
  @keyframes firefly-center {
    0% { transform: translate(0, 0); opacity: 1; }
    100% { transform: translate(var(--to-x), var(--to-y)); opacity: 0; }
  }
  .fallback-row { display: flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); }
  .fallback-label { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
  .fallback-input { flex: 1; padding: 6px 8px; border: none; border-radius: var(--radius-sm); background: var(--bg); color: var(--text); font-size: 12px; min-width: 0; }
  .fallback-input:focus { outline: none; }
  .fallback-save { padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: 600; background: var(--accent); color: #fff; border: none; cursor: pointer; }
  .fallback-set { padding: 4px 14px; border-radius: 14px; font-size: 11px; font-weight: 500; color: var(--text-muted); background: transparent; border: 1px dashed var(--border); cursor: pointer; }
  .fallback-set:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .fallback-active { font-size: 11px; color: var(--text-muted); padding: 4px 12px; border: 0.5px solid var(--border-light); border-radius: 12px; }
  .just5-btn { padding: 6px 20px; border-radius: 20px; font-size: 11px; font-weight: 600; color: var(--accent); background: transparent; border: 1px solid var(--accent-subtle); cursor: pointer; transition: all 0.2s var(--ease); }
  .just5-btn:hover:not(:disabled) { background: var(--accent-subtle); }
  .just5-btn:disabled { opacity: 0.35; cursor: default; }
  .extend-prompt { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 50px; }
  .extend-text { font-size: 13px; color: var(--text); font-weight: 500; }
  .extend-btn { padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; color: #fff; background: var(--accent); border: none; cursor: pointer; }
  .extend-btn.secondary { background: transparent; color: var(--text-secondary); border: 1px solid var(--border); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
