<script>
  import { onMount } from 'svelte'
  import { fly } from 'svelte/transition'
  import { Crosshair, CalendarDays, Timer, MapPin, Sparkles, UserRound, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-svelte'

  let { onDone, onAccentChange } = $props()

  const COLORS = [
    { name: 'Amber', hex: '#d4a574' },
    { name: 'Emerald', hex: '#5a9a7a' },
    { name: 'Sapphire', hex: '#5a8ab8' },
    { name: 'Rose', hex: '#c07a7a' },
    { name: 'Lavender', hex: '#9a8ac0' },
    { name: 'Coral', hex: '#d47a6a' },
    { name: 'Teal', hex: '#5a9a9a' },
    { name: 'Slate', hex: '#8a8a9a' },
  ]

  let step = $state(0)
  let chosenColor = $state('')
  let canvasEl

  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let acctError = $state('')
  let showPw = $state(false)
  let showConfirm = $state(false)

  async function hash(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  onMount(() => {
    const canvas = canvasEl
    const ctx = canvas.getContext('2d')
    let stars = []
    let animId

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        speed: Math.random() * 0.15 + 0.02,
        opacity: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
      })
    }

    let mouseX = canvas.width / 2, mouseY = canvas.height / 2

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const s of stars) {
        s.y -= s.speed
        s.x += (mouseX - canvas.width / 2) * 0.0001
        if (s.y < -2) { s.y = canvas.height + 2; s.x = Math.random() * canvas.width }
        const twinkle = Math.sin(Date.now() * s.twinkleSpeed + s.twinklePhase) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r * twinkle, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * twinkle})`
        ctx.fill()
      }
      animId = requestAnimationFrame(animate)
    }
    animate()

    const onMouse = (e) => { mouseX = e.clientX || (e.touches?.[0]?.clientX ?? mouseX); mouseY = e.clientY || (e.touches?.[0]?.clientY ?? mouseY) }
    document.addEventListener('mousemove', onMouse)
    document.addEventListener('touchmove', onMouse, { passive: true })

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
      document.removeEventListener('mousemove', onMouse)
      document.removeEventListener('touchmove', onMouse)
    }
  })

  function advance() {
    if (step === 5) { finish(); return }
    if (step === 2 && !chosenColor) return
    if (step === 3) { return }
    if (step === 4) { return }
    step++
  }

  function nextUsername() {
    if (!username.trim() || username.trim().length < 2) { acctError = 'Username must be at least 2 characters'; return }
    acctError = ''
    step++
  }

  async function createAccount() {
    if (password.length < 3) { acctError = 'Password must be at least 3 characters'; return }
    if (password !== confirm) { acctError = 'Passwords do not match'; return }
    const h = await hash(password)
    localStorage.setItem('focus-account-user', username.trim())
    localStorage.setItem('focus-account-hash', h)
    const exp = Date.now() + 30 * 60 * 1000 + 86400000
    localStorage.setItem('focus-session-expiry', String(exp))
    step++
  }

  function pickColor(hex) {
    chosenColor = hex
    onAccentChange(hex)
  }

  function finish() {
    if (chosenColor) {
      localStorage.setItem('focus-accent', chosenColor)
      onAccentChange(chosenColor)
    }
    localStorage.setItem('focus-onboarded', 'true')
    onDone()
  }

  function skipAccount() {
    step++
  }
</script>

<div class="ob-wrap" style="--ob-accent: {chosenColor || '#5a9a9a'};" onclick={advance} role="button" tabindex="0" onkeydown={(e) => e.key === 'Enter' && advance()}>
  <canvas bind:this={canvasEl} class="ob-canvas"></canvas>
  <div class="ob-overlay"></div>

  {#key step}
    {#if step === 0}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }}>
        <div class="ob-icon" style="--i: 0">
          <Crosshair size={32} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} />
        </div>
        <h1 class="ob-title">
          {#each 'Sola' as c, i}
            <span class="ob-char" style="--i: {i}">{c}</span>
          {/each}
        </h1>
        <p class="ob-line" style="--i: 1; color: {chosenColor || 'var(--accent)'}">Your personal productivity space</p>
        <p class="ob-subline" style="--i: 2">Plan your day, track tasks, and stay in the zone.</p>
        <p class="ob-hint" style="--i: 3">Click anywhere to continue</p>
      </div>

    {:else if step === 1}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }}>
        <h2 class="ob-heading" style="--i: 0">Everything you need</h2>
        <div class="ob-items">
          <span class="ob-item" style="--i: 1"><CalendarDays size={16} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} /> Daily timeline</span>
          <span class="ob-item" style="--i: 2"><Timer size={16} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} /> Focus timer</span>
          <span class="ob-item" style="--i: 3"><MapPin size={16} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} /> Works offline</span>
        </div>
        <p class="ob-hint" style="--i: 4">Click anywhere to continue</p>
      </div>

    {:else if step === 2}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }}>
        <h2 class="ob-heading" style="--i: 0">Pick your color</h2>
        <p class="ob-subline" style="--i: 1; margin-bottom:28px;font-size:13px">Choose a primary accent</p>
        <div class="ob-picker" style="--i: 2" onclick={(e) => e.stopPropagation()}>
          {#each COLORS as c}
            <button class="ob-dot" class:selected={chosenColor === c.hex} onclick={(e) => { e.stopPropagation(); pickColor(c.hex) }} aria-label={c.name} style="background:{c.hex}"></button>
          {/each}
        </div>
        {#if chosenColor}
          <p class="ob-hint" style="--i: 3; margin-top:32px">Click to continue</p>
        {:else}
          <p class="ob-hint" style="--i: 3; margin-top:32px;color:rgba(255,255,255,0.2)">Select a color to continue</p>
        {/if}
      </div>

    {:else if step === 3}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }} onclick={(e) => e.stopPropagation()}>
        <div class="ob-icon" style="--i: 0">
          <UserRound size={28} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} />
        </div>
        <h2 class="ob-heading" style="--i: 1">Choose a username</h2>
        <p class="ob-subline" style="--i: 2; margin-bottom:24px">This stays on your device</p>
        <div class="ob-form" style="--i: 3">
          <input type="text" class="ob-input" placeholder="Username" bind:value={username} onkeydown={(e) => e.key === 'Enter' && nextUsername()} autocomplete="off" />
          {#if acctError}
            <p class="ob-err">{acctError}</p>
          {/if}
          <button class="ob-form-btn" onclick={nextUsername}>
            <span>Continue</span>
            <ArrowRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

    {:else if step === 4}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }} onclick={(e) => e.stopPropagation()}>
        <div class="ob-icon" style="--i: 0">
          <LockKeyhole size={28} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} />
        </div>
        <h2 class="ob-heading" style="--i: 1">Create a password</h2>
        <p class="ob-subline" style="--i: 2; margin-bottom:24px">At least 3 characters</p>
        <div class="ob-form" style="--i: 3">
          <div class="ob-pw-row">
            <input type={showPw ? 'text' : 'password'} class="ob-input" placeholder="Password" bind:value={password} onkeydown={(e) => e.key === 'Enter' && createAccount()} />
            <button class="ob-eye" onclick={() => showPw = !showPw} aria-label="Toggle password">
              {#if showPw}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
            </button>
          </div>
          <div class="ob-pw-row">
            <input type={showConfirm ? 'text' : 'password'} class="ob-input" placeholder="Confirm password" bind:value={confirm} onkeydown={(e) => e.key === 'Enter' && createAccount()} />
            <button class="ob-eye" onclick={() => showConfirm = !showConfirm} aria-label="Toggle confirm">
              {#if showConfirm}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
            </button>
          </div>
          {#if acctError}
            <p class="ob-err">{acctError}</p>
          {/if}
          <button class="ob-form-btn" onclick={createAccount}>Create account</button>
          <button class="ob-skip-btn" onclick={skipAccount}>Skip</button>
        </div>
      </div>

    {:else if step === 5}
      <div class="ob-center" in:fly={{ y: 30, duration: 450, opacity: 0 }}>
        <div class="ob-icon" style="--i: 0">
          <Sparkles size={32} strokeWidth={1.5} color={chosenColor || 'var(--accent)'} />
        </div>
        <h2 class="ob-heading" style="--i: 1; margin-top:16px">
          {#if localStorage.getItem('focus-account-user')}
            Welcome, {localStorage.getItem('focus-account-user')}
          {:else}
            You're all set
          {/if}
        </h2>
        <p class="ob-subline" style="--i: 2; margin-top:4px">Everything stays on your device.</p>
        <p class="ob-hint" style="--i: 3; margin-top:40px">Click to start using Sola</p>
      </div>
    {/if}
  {/key}

  <div class="ob-dots">
    {#each { length: 6 } as _, i}
      <span class="ob-dot-ind" class:active={i === step}></span>
    {/each}
  </div>
</div>

<style>
  .ob-wrap { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; overflow: hidden; cursor: pointer; background: #08080a; }
  .ob-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
  .ob-overlay { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 50%, transparent 0%, rgba(8,8,10,0.6) 100%); pointer-events: none; }

  .ob-center { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; padding: 24px; }
  .ob-center > * { opacity: 0; animation: fadeSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; animation-delay: calc(var(--i) * 0.1s); }

  .ob-icon { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.06); margin-bottom: 16px; }
  .ob-title { font-size: 42px; font-weight: 800; letter-spacing: -2px; color: #fff; margin-bottom: 8px; line-height: 1; display: flex; gap: 2px; }
  .ob-char { display: inline-block; animation: charPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: calc(var(--i) * 0.08s + 0.15s); }
  .ob-line { font-size: 16px; font-weight: 500; margin-bottom: 4px; letter-spacing: -0.2px; }
  .ob-subline { font-size: 14px; color: rgba(255,255,255,0.35); line-height: 1.6; text-align: center; }
  .ob-heading { font-size: 26px; font-weight: 700; color: #fff; letter-spacing: -0.5px; margin-bottom: 4px; }
  .ob-hint { font-size: 12px; color: rgba(255,255,255,0.25); margin-top: 28px; letter-spacing: 0.3px; }

  .ob-items { display: flex; flex-direction: column; gap: 8px; margin-top: 20px; }
  .ob-item { display: flex; align-items: center; gap: 10px; font-size: 15px; color: rgba(255,255,255,0.7); font-weight: 400; }

  .ob-picker { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
  .ob-dot { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.08); cursor: pointer; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); padding: 0; }
  .ob-dot:hover { transform: scale(1.15); border-color: rgba(255,255,255,0.2); }
  .ob-dot.selected { transform: scale(1.25); border-color: transparent; box-shadow: 0 0 24px rgba(var(--accent-rgb), 0.3); }

  .ob-form { display: flex; flex-direction: column; gap: 10px; width: 260px; }
  .ob-input { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; color: #fff; font-size: 14px; text-align: center; transition: all 0.2s; box-sizing: border-box; }
  .ob-input:focus { border-color: var(--ob-accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ob-accent) 20%, transparent); outline: none; }
  .ob-input::placeholder { color: rgba(255,255,255,0.2); }
  .ob-pw-row { position: relative; width: 100%; }
  .ob-pw-row .ob-input { padding-right: 40px; }
  .ob-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; padding: 6px; border-radius: 6px; }
  .ob-eye:hover { color: rgba(255,255,255,0.6); background: rgba(255,255,255,0.05); }
  .ob-err { font-size: 12px; color: #c07060; text-align: center; }
  .ob-form-btn { width: 100%; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 500; background: linear-gradient(135deg, var(--ob-accent), color-mix(in srgb, var(--ob-accent) 80%, #000)); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 4px; }
  .ob-form-btn:hover { transform: translateY(-1px); }
  .ob-skip-btn { width: 100%; padding: 10px; border-radius: 10px; font-size: 12px; color: rgba(255,255,255,0.3); background: none; border: none; cursor: pointer; }
  .ob-skip-btn:hover { color: rgba(255,255,255,0.5); }

  .ob-dots { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 1; }
  .ob-dot-ind { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.15); transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .ob-dot-ind.active { background: var(--accent); width: 22px; border-radius: 3px; }

  @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes charPop { 0% { opacity: 0; transform: translateY(20px) scale(0.5); } 60% { transform: translateY(-4px) scale(1.1); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
</style>
