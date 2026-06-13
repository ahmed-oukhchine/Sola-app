<script>
  import { fade, fly } from 'svelte/transition'
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
    const h = await hash(password)
    localStorage.setItem('focus-account-user', username.trim())
    localStorage.setItem('focus-account-hash', h)
    onUnlock(username.trim())
  }

  async function signIn() {
    error = ''
    if (!username.trim() || !password) { error = 'Enter your username and password'; return }
    const h = await hash(password)
    if (h === localStorage.getItem('focus-account-hash') && username.trim() === storedUser) {
      onUnlock(username.trim())
    } else {
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
    mode = m
  }
</script>

<div class="ac-overlay" transition:fade={{ duration: 300 }}>
  <div class="ac-card">
    <div class="ac-tabs">
      <button class="ac-tab" class:active={mode === 'signin'} onclick={() => switchMode('signin')}>Sign In</button>
      <button class="ac-tab" class:active={mode === 'signup'} onclick={() => switchMode('signup')}>Create</button>
      <div class="ac-tab-indicator" class:right={mode === 'signup'}></div>
    </div>

    {#key mode}
      {#if mode === 'signin'}
        <div class="ac-body" in:fly={{ y: 12, duration: 350, opacity: 0 }}>
          <div class="ac-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="16" stroke="var(--accent)" stroke-width="2" fill="none"/>
              <circle cx="20" cy="16" r="5" stroke="var(--accent)" stroke-width="2" fill="none"/>
              <path d="M10 30c0-5 4.5-7 10-7s10 2 10 7" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 class="ac-title">Welcome back</h2>
          <p class="ac-sub">Sign in to your account</p>
          <div class="ac-form">
            <input type="text" class="ac-input" placeholder={storedUser || 'Username'} bind:value={username} onkeydown={(e) => handleKey(e, signIn)} autocomplete="username" />
            <input type="password" class="ac-input" placeholder="Password" bind:value={password} onkeydown={(e) => handleKey(e, signIn)} autocomplete="current-password" />
            <button class="ac-btn primary" onclick={signIn}>Sign in</button>
          </div>
        </div>
      {:else}
        <div class="ac-body" in:fly={{ y: 12, duration: 350, opacity: 0 }}>
          <div class="ac-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="8" y="16" width="24" height="18" rx="3" stroke="var(--accent)" stroke-width="2" fill="none"/>
              <path d="M14 16v-4a6 6 0 0112 0v4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none"/>
              <circle cx="20" cy="25" r="2" fill="var(--accent)"/>
              <path d="M20 27v3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <h2 class="ac-title">Create account</h2>
          <p class="ac-sub">All data stays on your device</p>
          <div class="ac-form">
            <input type="text" class="ac-input" placeholder="Username" bind:value={username} onkeydown={(e) => handleKey(e, createAccount)} autocomplete="off" />
            <input type="password" class="ac-input" placeholder="Password" bind:value={password} onkeydown={(e) => handleKey(e, createAccount)} />
            <input type="password" class="ac-input" placeholder="Confirm password" bind:value={confirm} onkeydown={(e) => handleKey(e, createAccount)} />
            <button class="ac-btn primary" onclick={createAccount}>Create account</button>
          </div>
        </div>
      {/if}
    {/key}

    {#if error}
      <p class="ac-error" in:fade>{error}</p>
    {/if}
  </div>
</div>

<style>
  .ac-overlay { position: fixed; inset: 0; background: var(--bg, #121212); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 200; }
  .ac-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 28px; width: 100%; max-width: 320px; box-shadow: var(--shadow-xl); text-align: center; position: relative; overflow: hidden; }
  .ac-tabs { display: flex; position: relative; margin-bottom: 24px; background: var(--surface); border-radius: var(--radius-md); padding: 3px; }
  .ac-tab { flex: 1; padding: 8px; border: none; background: none; color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: color 0.2s var(--ease); position: relative; z-index: 1; border-radius: var(--radius-sm); }
  .ac-tab.active { color: var(--text); }
  .ac-tab-indicator { position: absolute; top: 3px; bottom: 3px; width: calc(50% - 3px); background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-sm); transition: transform 0.35s var(--ease-spring); left: 3px; }
  .ac-tab-indicator.right { transform: translateX(calc(100% + 0px)); }
  .ac-body { display: flex; flex-direction: column; align-items: center; }
  .ac-icon { margin-bottom: 14px; opacity: 0.8; }
  .ac-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 4px; letter-spacing: -0.3px; }
  .ac-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
  .ac-form { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-bottom: 8px; }
  .ac-input { width: 100%; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; text-align: center; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .ac-input:focus { border-color: var(--accent); box-shadow: var(--glow); outline: none; }
  .ac-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); }
  .ac-btn.primary { background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); }
  .ac-btn.primary:hover { box-shadow: 0 0 40px rgba(212, 165, 116, 0.25); transform: translateY(-1px); }
  .ac-btn.primary:active { transform: scale(0.98); }
  .ac-error { font-size: 12px; color: #b06060; margin-top: 4px; }
</style>
