<script>
  let { onUnlock } = $props()
  let hasAccount = $state(!!localStorage.getItem('focus-account-hash'))
  let storedUser = $state(localStorage.getItem('focus-account-user') || '')

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
</script>

<div class="ac-overlay" transition:fade={{ duration: 300 }}>
  <div class="ac-card">
    <div class="ac-icon">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {#if hasAccount}
          <circle cx="20" cy="20" r="16" stroke="var(--accent)" stroke-width="2" fill="none"/>
          <circle cx="20" cy="16" r="5" stroke="var(--accent)" stroke-width="2" fill="none"/>
          <path d="M10 30c0-5 4.5-7 10-7s10 2 10 7" stroke="var(--accent)" stroke-width="2" fill="none" stroke-linecap="round"/>
        {:else}
          <rect x="8" y="16" width="24" height="18" rx="3" stroke="var(--accent)" stroke-width="2" fill="none"/>
          <path d="M14 16v-4a6 6 0 0112 0v4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" fill="none"/>
          <circle cx="20" cy="25" r="2" fill="var(--accent)"/>
          <path d="M20 27v3" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
        {/if}
      </svg>
    </div>

    <h2 class="ac-title">{hasAccount ? 'Welcome back' : 'Create your account'}</h2>
    <p class="ac-sub">{hasAccount ? 'Sign in to continue' : 'All data stays on your device — no servers'}</p>

    <div class="ac-form">
      {#if !hasAccount}
        <input type="text" class="ac-input" placeholder="Username" bind:value={username} onkeydown={(e) => handleKey(e, createAccount)} autocomplete="off" />
        <input type="password" class="ac-input" placeholder="Password" bind:value={password} onkeydown={(e) => handleKey(e, createAccount)} />
        <input type="password" class="ac-input" placeholder="Confirm password" bind:value={confirm} onkeydown={(e) => handleKey(e, createAccount)} />
        <button class="ac-btn primary" onclick={createAccount}>Create account</button>
      {:else}
        <input type="text" class="ac-input" placeholder={storedUser} bind:value={username} onkeydown={(e) => handleKey(e, signIn)} autocomplete="username" />
        <input type="password" class="ac-input" placeholder="Password" bind:value={password} onkeydown={(e) => handleKey(e, signIn)} autocomplete="current-password" />
        <button class="ac-btn primary" onclick={signIn}>Sign in</button>
      {/if}
    </div>

    {#if error}
      <p class="ac-error">{error}</p>
    {/if}
  </div>
</div>

<style>
  .ac-overlay { position: fixed; inset: 0; background: var(--bg, #121212); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 200; }
  .ac-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 40px 28px 28px; width: 100%; max-width: 320px; box-shadow: var(--shadow-xl); text-align: center; }
  .ac-icon { margin-bottom: 16px; }
  .ac-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 4px; letter-spacing: -0.3px; }
  .ac-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
  .ac-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
  .ac-input { width: 100%; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; text-align: center; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .ac-input:focus { border-color: var(--accent); box-shadow: var(--glow); outline: none; }
  .ac-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.15s var(--ease); }
  .ac-btn.primary { background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); }
  .ac-btn.primary:hover { box-shadow: 0 0 40px rgba(212, 165, 116, 0.25); transform: translateY(-1px); }
  .ac-btn.primary:active { transform: scale(0.98); }
  .ac-error { font-size: 12px; color: #b06060; margin-top: 8px; }
</style>
