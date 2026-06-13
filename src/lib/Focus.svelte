<script>
  const PRESETS = [5, 15, 25, 45]
  let timerMinutes = $state(25), timerRemaining = $state(25 * 60)
  let timerRunning = $state(false), timerPaused = $state(false), timerStart = $state(0)
  let timerPauseRemaining = $state(0), tickInterval = $state(null), doTick = $state(false), prevSecond = $state(-1)
  let pomodoroActive = $state(false), pomodoroSession = $state('focus'), pomodoroCount = $state(0)

  let timerDisplay = $derived.by(() => {
    const m = Math.floor(timerRemaining / 60), s = Math.floor(timerRemaining % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })
  let timerStatus = $derived(
    !timerRunning && timerRemaining === timerMinutes * 60 ? 'ready' :
    timerRunning ? 'running' : timerPaused ? 'paused' : timerRemaining <= 0 ? 'done' : 'ready'
  )
  let progress = $derived(1 - timerRemaining / (timerMinutes * 60))
  let ringDash = $derived(2 * Math.PI * 120 * (1 - progress))

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
      if ('Notification' in window && Notification.permission === 'granted') new Notification('Focus', { body: 'Session complete!' })
      if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400])
    }
  }
  function startTimerv() { if (timerRemaining <= 0) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function pauseTimer() { if (!timerRunning) return; timerRunning = false; timerPaused = true; clearInterval(tickInterval); tickInterval = null }
  function resumeTimer() { if (!timerPaused) return; timerRunning = true; timerPaused = false; timerStart = Date.now(); timerPauseRemaining = timerRemaining; tickInterval = setInterval(timerTick, 50) }
  function resetTimer() { timerRunning = false; timerPaused = false; clearInterval(tickInterval); tickInterval = null; timerRemaining = timerMinutes * 60 }

  $effect(() => () => { if (tickInterval) clearInterval(tickInterval) })
</script>

<main class="focus-view">
  <div class="timer-ring-container">
    <svg class="timer-ring" width="280" height="280" viewBox="0 0 280 280">
      <circle cx="140" cy="140" r="120" fill="none" stroke="var(--border)" stroke-width="4" opacity="0.3"/>
      <circle class="timer-ring-progress" cx="140" cy="140" r="120" fill="none" stroke="url(#ringGrad)" stroke-width="4" stroke-linecap="round"
        stroke-dasharray={2 * Math.PI * 120} stroke-dashoffset={ringDash} transform="rotate(-90 140 140)"/>
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#d4a574"/>
          <stop offset="100%" stop-color="#c17f59"/>
        </linearGradient>
      </defs>
    </svg>
    <div class="timer-digits-wrapper">
      <div class="timer-digits" class:tick={doTick}>{timerDisplay}</div>
      <div class="timer-status-text">
        {timerStatus === 'ready' ? (pomodoroActive ? `Ready for ${pomodoroSession}` : 'Ready') : timerStatus === 'running' ? (pomodoroActive ? `${pomodoroSession}` : 'Focusing') : timerStatus === 'paused' ? 'Paused' : 'Complete!'}
      </div>
    </div>
  </div>

  <div class="presets">
    {#each PRESETS as m}
      <button class="preset-btn" class:active={timerMinutes === m && timerStatus === 'ready'} onclick={() => setPreset(m)} disabled={timerRunning || timerPaused}>{m}</button>
    {/each}
  </div>

  <div class="focus-controls">
    {#if timerStatus === 'ready'}
      <button class="focus-btn primary" onclick={startTimerv} disabled={timerMinutes <= 0}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3l8 5-8 5V3z" fill="currentColor"/></svg>
        Start
      </button>
    {:else if timerStatus === 'running'}
      <button class="focus-btn" onclick={pauseTimer}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="1" width="3.2" height="12" rx="1" fill="currentColor"/><rect x="7.8" y="1" width="3.2" height="12" rx="1" fill="currentColor"/></svg>
      </button>
      <button class="focus-btn secondary" onclick={resetTimer}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 7H5M5 7v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    {:else if timerStatus === 'paused'}
      <button class="focus-btn primary" onclick={resumeTimer}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 3l8 5-8 5V3z" fill="currentColor"/></svg>
        Resume
      </button>
      <button class="focus-btn secondary" onclick={resetTimer}>Reset</button>
    {:else}
      <button class="focus-btn primary" onclick={resetTimer}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 1v8a4 4 0 004 4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        New session
      </button>
    {/if}
  </div>

  <button class="pomo-btn" class:active={pomodoroActive} onclick={() => { pomodoroActive = !pomodoroActive; if (!pomodoroActive) resetTimer() }}>
    <span class="pomo-icon">🍅</span>
    <span>{pomodoroActive ? `${pomodoroSession} ${pomodoroCount > 0 ? `(${pomodoroCount})` : ''}` : 'Pomodoro'}</span>
  </button>
</main>

<style>
  .focus-view {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 20px; gap: 20px;
  }
  .timer-ring-container { position: relative; display: flex; align-items: center; justify-content: center; }
  .timer-ring { position: absolute; }
  .timer-ring-progress { transition: stroke-dashoffset 0.3s var(--ease); filter: drop-shadow(0 0 8px rgba(212, 165, 116, 0.2)); }
  .timer-digits-wrapper {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    width: 220px; height: 220px; border-radius: 50%; justify-content: center;
    background: var(--surface); border: 1px solid var(--border);
    backdrop-filter: blur(var(--glass-blur)); z-index: 1;
  }
  .timer-digits {
    font-size: 3.4rem; font-weight: 700; letter-spacing: 3px;
    color: var(--text); line-height: 1; font-variant-numeric: tabular-nums;
    transition: transform 0.15s var(--ease-spring); user-select: none;
  }
  .timer-digits.tick { animation: timerPop 0.15s var(--ease-spring); }
  @keyframes timerPop { 0% { transform: scale(1); } 40% { transform: scale(1.06); } 100% { transform: scale(1); } }
  .timer-status-text { font-size: 12px; color: var(--text-muted); font-weight: 500; text-transform: uppercase; letter-spacing: 1.5px; }

  .presets { display: flex; gap: 6px; }
  .preset-btn {
    width: 48px; height: 48px; border-radius: 50%;
    font-size: 13px; font-weight: 600; color: var(--text-secondary);
    background: var(--surface); border: 1px solid var(--border);
    cursor: pointer; transition: all 0.2s var(--ease);
    backdrop-filter: blur(var(--glass-blur));
  }
  .preset-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); transform: translateY(-2px); }
  .preset-btn.active { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .preset-btn:disabled { opacity: 0.25; cursor: default; }

  .focus-controls { display: flex; gap: 10px; align-items: center; }
  .focus-btn {
    padding: 12px 28px; border-radius: 50px; font-size: 14px; font-weight: 500;
    cursor: pointer; transition: all 0.2s var(--ease);
    display: flex; align-items: center; gap: 6px;
  }
  .focus-btn.primary {
    background: var(--accent-gradient); color: #fff; border: none;
    box-shadow: var(--accent-glow);
  }
  .focus-btn.primary:hover { box-shadow: 0 0 50px rgba(212, 165, 116, 0.3); transform: translateY(-2px); }
  .focus-btn.primary:active { transform: scale(0.97); }
  .focus-btn.primary:disabled { opacity: 0.2; cursor: default; box-shadow: none; transform: none; }
  .focus-btn.secondary {
    width: 44px; height: 44px; border-radius: 50%;
    background: var(--surface); color: var(--text-secondary);
    border: 1px solid var(--border); justify-content: center;
    backdrop-filter: blur(var(--glass-blur));
  }
  .focus-btn.secondary:hover { border-color: var(--accent); color: var(--accent); }

  .pomo-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 18px; border-radius: 20px;
    font-size: 12px; font-weight: 500; color: var(--text-secondary);
    background: var(--surface); border: 1px solid var(--border);
    cursor: pointer; transition: all 0.2s var(--ease);
    backdrop-filter: blur(var(--glass-blur));
  }
  .pomo-btn:hover { border-color: var(--accent); color: var(--accent); }
  .pomo-btn.active { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); }
  .pomo-icon { font-size: 14px; }
</style>
