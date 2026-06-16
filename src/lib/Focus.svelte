<script>
  import { fade } from 'svelte/transition'
  import { Play, Pause, RotateCcw, PlusCircle, X, Timer, PartyPopper } from 'lucide-svelte';
  import { store, logFocusSession } from './taskStore.svelte.js'
  const PRESETS = [5, 15, 25, 45]
  let timerMinutes = $state(25), timerRemaining = $state(25 * 60)
  let timerRunning = $state(false), timerPaused = $state(false), timerStart = $state(0)
  let timerPauseRemaining = $state(0), tickInterval = $state(null), doTick = $state(false), prevSecond = $state(-1)
  let pomodoroActive = $state(false), pomodoroSession = $state('focus'), pomodoroCount = $state(0)
  let showCelebration = $state(false)
  let { taskId, onClearTask } = $props()
  let focusTask = $derived(taskId ? store.tasks.find(t => t.id === taskId) : null)

  // Ambient sounds
  let soundType = $state('none')
  let audioCtx = $state(null)
  let soundNodes = $state([])

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
      if (!pomodoroActive) { showCelebration = true; setTimeout(() => showCelebration = false, 3000) }
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
</script>

<main class="focus-view">
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

  <button class="pomo-btn" class:active={pomodoroActive} onclick={() => { pomodoroActive = !pomodoroActive; if (!pomodoroActive) resetTimer() }}>
      <Timer size={14} strokeWidth={1.5} />
    <span>{pomodoroActive ? `${pomodoroSession} ${pomodoroCount > 0 ? `(${pomodoroCount})` : ''}` : 'Pomodoro'}</span>
  </button>
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
  .focus-view { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; gap: 14px; position: relative; }
  .time-timer { width: 260px; height: 260px; overflow: visible; margin-top: 10px; }
  .tt-bg { fill: none; stroke: rgba(255,255,255,0.04); stroke-width: 10px; }
  .tt-fill { fill: none; stroke: var(--accent); stroke-width: 10px; stroke-linecap: round; transition: stroke-dashoffset 0.4s var(--ease); filter: drop-shadow(0 0 20px rgba(var(--accent-rgb), 0.2)); }
  .tt-digits { font-size: 56px; font-weight: 650; fill: var(--text); font-variant-numeric: tabular-nums; letter-spacing: 2px; }
  .tt-label { font-size: 13px; fill: var(--text-muted); font-weight: 500; letter-spacing: 2px; text-transform: uppercase; }
  .sound-indicator { font-size: 11px; color: var(--accent); font-weight: 500; letter-spacing: 0.5px; }
  .sound-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
  .sound-btn { padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--glass-bg); border: 1px solid var(--glass-border); cursor: pointer; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .sound-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .sound-btn.active { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .sound-btn:disabled { opacity: 0.2; cursor: default; }
  .presets { display: flex; gap: 8px; }
  .preset-btn { width: 50px; height: 50px; border-radius: 50%; font-size: 13px; font-weight: 600; color: var(--text-secondary); background: var(--glass-bg); border: 1px solid var(--glass-border); cursor: pointer; transition: all 0.25s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .preset-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
  .preset-btn.active { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .preset-btn:disabled { opacity: 0.2; cursor: default; }
  .focus-controls { display: flex; gap: 12px; align-items: center; }
  .focus-btn { padding: 14px 32px; border-radius: 50px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.25s var(--ease); display: flex; align-items: center; gap: 8px; }
  .focus-btn.primary { background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); }
  .focus-btn.primary:hover { box-shadow: 0 0 60px rgba(var(--accent-rgb), 0.3); transform: translateY(-2px); }
  .focus-btn.primary:active { transform: scale(0.97); }
  .focus-btn.primary:disabled { opacity: 0.2; cursor: default; box-shadow: none; transform: none; }
  .focus-btn.secondary { width: 48px; height: 48px; border-radius: 50%; background: var(--surface); color: var(--text); border: 1px solid var(--border); justify-content: center; }
  .focus-btn.secondary:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); transform: translateY(-2px); }
  .pomo-btn { display: flex; align-items: center; gap: 6px; padding: 8px 20px; border-radius: 20px; font-size: 12px; font-weight: 500; color: var(--text-secondary); background: var(--glass-bg); border: 1px solid var(--glass-border); cursor: pointer; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .pomo-btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-subtle); }
  .pomo-btn.active { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
  .focus-task-badge { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 50px; max-width: 80%; backdrop-filter: blur(var(--glass-blur)); }
  .focus-task-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .focus-task-title { font-size: 13px; color: var(--text); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .focus-task-clear { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; padding: 0; flex-shrink: 0; transition: all 0.2s var(--ease); }
  .focus-task-clear:hover { background: var(--danger-bg); color: var(--danger); }
  .celebration-overlay { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); animation: fadeIn 0.3s ease; }
  .celebration-card { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border); padding: 40px 48px; text-align: center; animation: scaleIn 0.35s var(--ease-spring); box-shadow: 0 0 80px rgba(var(--accent-rgb), 0.15); }
  .celebration-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .celebration-sub { font-size: 14px; color: var(--text-secondary); }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
