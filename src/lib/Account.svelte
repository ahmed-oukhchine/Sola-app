<script>
  import { fade, fly } from 'svelte/transition'
  import { UserRound, LockKeyhole, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, LogIn } from 'lucide-svelte'
  let { onUnlock } = $props()
  let hasLegacy = !!localStorage.getItem('focus-lock-hash') && !localStorage.getItem('focus-account-hash')
  let hasAccount = $state(!!localStorage.getItem('focus-account-hash') || hasLegacy)
  let storedUser = $state(localStorage.getItem('focus-account-user') || (hasLegacy ? 'User' : ''))

  if (hasLegacy) {
    localStorage.setItem('focus-account-hash', localStorage.getItem('focus-lock-hash'))
    localStorage.setItem('focus-account-user', 'User')
    localStorage.removeItem('focus-lock-hash')
    hasAccount = true
  }

  let mode = $state(hasAccount ? 'signin' : 'signup')
  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let error = $state('')
  let loading = $state(false)
  let showPw = $state(false)
  let showConfirm = $state(false)

  let usernameValid = $derived(username.trim().length >= 2)
  let pwStrength = $derived.by(() => {
    if (password.length === 0) return 0
    if (password.length < 3) return 1
    if (password.length < 6) return 2
    if (password.length < 10) return 3
    return 4
  })
  let pwLabel = $derived(['', 'Weak', 'Fair', 'Good', 'Strong'][pwStrength])
  let pwColor = $derived(['', 'var(--danger)', '#c0a030', 'var(--accent)', 'var(--complete)'][pwStrength])
  let passwordsMatch = $derived(mode === 'signup' ? (confirm.length > 0 ? password === confirm : true) : true)

  async function hash(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function createAccount() {
    error = ''
    if (!username.trim() || username.trim().length < 2) { error = 'Username must be at least 2 characters'; return }
    if (password.length < 3) { error = 'Password must be at least 3 characters'; return }
    if (password !== confirm) { error = 'Passwords do not match'; return }
    loading = true
    const h = await hash(password)
    localStorage.setItem('focus-account-user', username.trim())
    localStorage.setItem('focus-account-hash', h)
    loading = false
    onUnlock(username.trim())
  }

  async function signIn() {
    error = ''
    if (!username.trim() || !password) { error = 'Enter your username and password'; return }
    loading = true
    const h = await hash(password)
    if (h === localStorage.getItem('focus-account-hash') && username.trim() === storedUser) {
      loading = false
      onUnlock(username.trim())
    } else {
      loading = false
      error = 'Wrong username or password'
    }
  }

  function handleKey(e, fn) {
    if (e.key === 'Enter') fn()
  }

  function switchMode(m) {
    error = ''
    username = ''
    password = ''
    confirm = ''
    showPw = false
    showConfirm = false
    mode = m
  }
</script>

<div class="ac-overlay" transition:fade={{ duration: 300 }}>
  <div class="ac-card">
    <div class="ac-brand">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
    </div>

    <div class="ac-tabs">
      <button class="ac-tab" class:active={mode === 'signin'} onclick={() => switchMode('signin')}>
        <LogIn size={14} strokeWidth={1.5} />
        Sign In
      </button>
      <button class="ac-tab" class:active={mode === 'signup'} onclick={() => switchMode('signup')}>
        <UserRound size={14} strokeWidth={1.5} />
        Create
      </button>
    </div>

    {#key mode}
      {#if mode === 'signin'}
        <div class="ac-body" in:fly={{ y: 12, duration: 350, opacity: 0 }}>
          <h2 class="ac-title">Welcome back</h2>
          <p class="ac-sub">Sign in to your account to continue</p>
          <div class="ac-form">
            <div class="ac-field">
              <label class="ac-label">Username</label>
              <input type="text" class="ac-input" placeholder={storedUser || 'Enter your username'} bind:value={username} onkeydown={(e) => handleKey(e, signIn)} autocomplete="username" />
            </div>
            <div class="ac-field">
              <label class="ac-label">Password</label>
              <div class="ac-pw-row">
                <input type={showPw ? 'text' : 'password'} class="ac-input ac-input--pw" placeholder="Enter your password" bind:value={password} onkeydown={(e) => handleKey(e, signIn)} autocomplete="current-password" />
                <button class="ac-eye" onclick={() => showPw = !showPw} aria-label="Toggle password" type="button">
                  {#if showPw}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
                </button>
              </div>
            </div>
            <button class="ac-btn" onclick={signIn} disabled={loading}>
              {#if loading}
                <span class="ac-spinner"></span>
              {:else}
                <LogIn size={16} strokeWidth={1.5} />
              {/if}
              Sign in
            </button>
          </div>
        </div>
      {:else}
        <div class="ac-body" in:fly={{ y: 12, duration: 350, opacity: 0 }}>
          <h2 class="ac-title">Create account</h2>
          <p class="ac-sub">All data stays on your device — no sign-up needed</p>
          <div class="ac-form">
            <div class="ac-field">
              <label class="ac-label">Username</label>
              <div class="ac-input-row">
                <input type="text" class="ac-input" class:ac-input--valid={username.trim().length >= 2} placeholder="Choose a username" bind:value={username} onkeydown={(e) => handleKey(e, createAccount)} autocomplete="off" />
                {#if username.trim().length >= 2}
                  <CheckCircle2 size={16} strokeWidth={1.5} class="ac-valid-icon" color="var(--complete)" />
                {/if}
              </div>
            </div>
            <div class="ac-field">
              <label class="ac-label">Password</label>
              <div class="ac-pw-row">
                <input type={showPw ? 'text' : 'password'} class="ac-input ac-input--pw" placeholder="Create a password (3+ chars)" bind:value={password} onkeydown={(e) => handleKey(e, createAccount)} autocomplete="new-password" />
                <button class="ac-eye" onclick={() => showPw = !showPw} aria-label="Toggle password" type="button">
                  {#if showPw}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
                </button>
              </div>
              {#if password.length > 0 && password.length < 3}
                <p class="ac-hint ac-hint--error"><AlertCircle size={10} strokeWidth={1.5} /> At least 3 characters required</p>
              {:else if password.length >= 3}
                <div class="ac-strength">
                  <div class="ac-strength-bar" style="width: {pwStrength * 25}%; background: {pwColor};"></div>
                  <span class="ac-strength-label" style="color: {pwColor}">{pwLabel}</span>
                </div>
              {/if}
            </div>
            <div class="ac-field">
              <label class="ac-label">Confirm password</label>
              <div class="ac-pw-row">
                <input type={showConfirm ? 'text' : 'password'} class="ac-input ac-input--pw" class:ac-input--error={confirm.length > 0 && !passwordsMatch} placeholder="Confirm your password" bind:value={confirm} onkeydown={(e) => handleKey(e, createAccount)} autocomplete="new-password" />
                <button class="ac-eye" onclick={() => showConfirm = !showConfirm} aria-label="Toggle confirm" type="button">
                  {#if showConfirm}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
                </button>
              </div>
              {#if confirm.length > 0 && !passwordsMatch}
                <p class="ac-hint ac-hint--error"><AlertCircle size={10} strokeWidth={1.5} /> Passwords do not match</p>
              {:else if confirm.length > 0 && passwordsMatch}
                <p class="ac-hint ac-hint--success"><CheckCircle2 size={10} strokeWidth={1.5} /> Passwords match</p>
              {/if}
            </div>
            <button class="ac-btn" onclick={createAccount} disabled={loading}>
              {#if loading}
                <span class="ac-spinner"></span>
              {:else}
                <UserRound size={16} strokeWidth={1.5} />
              {/if}
              Create account
            </button>
          </div>
        </div>
      {/if}
    {/key}

    {#if error}
      <div class="ac-error" in:fade>
        <AlertCircle size={14} strokeWidth={1.5} />
        {error}
      </div>
    {/if}
  </div>
</div>

<style>
  .ac-overlay { position: fixed; inset: 0; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 200; }
  .ac-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 380px; box-shadow: var(--shadow-xl); position: relative; overflow: hidden; }
  .ac-brand { display: flex; justify-content: center; margin-bottom: 28px; }
  .ac-brand svg { opacity: 0.9; }

  .ac-tabs { display: flex; gap: 4px; margin-bottom: 28px; background: var(--surface); border-radius: 12px; padding: 4px; }
  .ac-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 12px; border: none; background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s var(--ease); border-radius: 10px; }
  .ac-tab.active { background: var(--surface-raised); color: var(--text); box-shadow: var(--shadow-sm); }

  .ac-body { display: flex; flex-direction: column; }
  .ac-title { font-size: 20px; font-weight: 650; color: var(--text); margin-bottom: 4px; letter-spacing: -0.4px; }
  .ac-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5; }
  .ac-form { display: flex; flex-direction: column; gap: 16px; width: 100%; margin-bottom: 4px; }
  .ac-field { display: flex; flex-direction: column; gap: 6px; }
  .ac-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
  .ac-input { width: 100%; padding: 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .ac-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12); outline: none; }
  .ac-input::placeholder { color: var(--text-muted); }
  .ac-input--valid { border-color: rgba(var(--complete), 0.3); }
  .ac-input--error { border-color: var(--danger); }
  .ac-input--pw { padding-right: 44px; }
  .ac-input-row { position: relative; width: 100%; }
  .ac-input-row .ac-input { padding-right: 36px; }
  .ac-valid-icon { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .ac-pw-row { position: relative; width: 100%; }
  .ac-pw-row .ac-input { padding-right: 44px; }
  .ac-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .ac-eye:hover { color: var(--text-secondary); background: var(--surface-hover); }
  .ac-hint { font-size: 11px; display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .ac-hint--error { color: var(--danger); }
  .ac-hint--success { color: var(--complete); }
  .ac-strength { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .ac-strength-bar { height: 3px; border-radius: 2px; transition: all 0.3s var(--ease); flex: 1; background: var(--border); }
  .ac-strength-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; min-width: 36px; text-align: right; }

  .ac-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; border: none; transition: all 0.2s var(--ease); margin-top: 4px; }
  .ac-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.25); }
  .ac-btn:active:not(:disabled) { transform: scale(0.98); }
  .ac-btn:disabled { opacity: 0.4; cursor: default; }

  .ac-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .ac-error { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--danger); margin-top: 16px; padding: 10px 14px; background: var(--danger-bg); border-radius: 10px; }
</style>
