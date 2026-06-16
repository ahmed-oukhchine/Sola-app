<script>
  import { fade } from 'svelte/transition'
  let { username, onUnlock } = $props()
  let password = $state('')
  let error = $state('')

  async function hash(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function unlock() {
    error = ''
    if (!password) { error = 'Enter your password'; return }
    const h = await hash(password)
    if (h === localStorage.getItem('focus-account-hash')) {
      onUnlock()
    } else {
      error = 'Wrong password'
      password = ''
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') unlock()
  }
</script>

<div class="lk-overlay" transition:fade={{ duration: 300 }}>
  <div class="lk-card">
    <div class="lk-icon">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </div>
    <h2 class="lk-title">App locked</h2>
    <p class="lk-sub">{username || 'Welcome back'} — enter your password to continue</p>
    <div class="lk-form">
      <input type="password" class="lk-input" placeholder="Password" bind:value={password} onkeydown={handleKey} autocomplete="current-password" autofocus />
      <button class="lk-btn" onclick={unlock}>Unlock</button>
    </div>
    {#if error}
      <p class="lk-error" in:fade>{error}</p>
    {/if}
  </div>
</div>

<style>
  .lk-overlay { position: fixed; inset: 0; background: var(--bg, #121212); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 300; }
  .lk-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 28px; width: 100%; max-width: 320px; box-shadow: var(--shadow-xl); text-align: center; }
  .lk-icon { margin-bottom: 14px; opacity: 0.8; }
  .lk-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 4px; letter-spacing: -0.3px; }
  .lk-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 20px; }
  .lk-form { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-bottom: 8px; }
  .lk-input { width: 100%; padding: 12px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; text-align: center; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .lk-input:focus { border-color: var(--accent); box-shadow: var(--glow); outline: none; }
  .lk-btn { width: 100%; padding: 12px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; cursor: pointer; background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); transition: all 0.15s var(--ease); }
  .lk-btn:hover { box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.25); transform: translateY(-1px); }
  .lk-btn:active { transform: scale(0.98); }
  .lk-error { font-size: 12px; color: #b06060; margin-top: 4px; }
</style>
