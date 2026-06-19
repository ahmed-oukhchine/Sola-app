<script>
  import { fade } from 'svelte/transition'
  import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-svelte'
  let { username, onUnlock } = $props()
  let password = $state('')
  let error = $state('')
  let loading = $state(false)
  let showPw = $state(false)

  async function hash(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function unlock() {
    error = ''
    if (!password) { error = 'Enter your password'; return }
    loading = true
    const h = await hash(password)
    if (h === localStorage.getItem('focus-account-hash')) {
      onUnlock()
    } else {
      loading = false
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
    <div class="lk-brand">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </div>

    <h2 class="lk-title">App locked</h2>
    <p class="lk-sub">{username || 'Welcome back'} — enter your password to continue</p>

    <div class="lk-form">
      <div class="lk-pw-row">
        <input type={showPw ? 'text' : 'password'} class="lk-input" placeholder="Password" bind:value={password} onkeydown={handleKey} autocomplete="current-password" autofocus />
        <button class="lk-eye" onclick={() => showPw = !showPw} aria-label="Toggle password" type="button">
          {#if showPw}<EyeOff size={16} strokeWidth={1.5} />{:else}<Eye size={16} strokeWidth={1.5} />{/if}
        </button>
      </div>
      <button class="lk-btn" onclick={unlock} disabled={loading}>
        {#if loading}
          <span class="lk-spinner"></span>
        {:else}
          <LogIn size={16} strokeWidth={1.5} />
        {/if}
        Unlock
      </button>
    </div>

    {#if error}
      <div class="lk-error" in:fade>
        <AlertCircle size={14} strokeWidth={1.5} />
        {error}
      </div>
    {/if}
  </div>
</div>

<style>
  .lk-overlay { position: fixed; inset: 0; background: var(--bg); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 300; }
  .lk-card { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 360px; box-shadow: var(--shadow-xl); text-align: center; }
  .lk-brand { display: flex; justify-content: center; margin-bottom: 20px; }
  .lk-brand svg { opacity: 0.9; }
  .lk-title { font-size: 20px; font-weight: 650; color: var(--text); margin-bottom: 4px; letter-spacing: -0.4px; }
  .lk-sub { font-size: 13px; color: var(--text-secondary); margin-bottom: 24px; line-height: 1.5; }
  .lk-form { display: flex; flex-direction: column; gap: 10px; width: 100%; margin-bottom: 4px; }
  .lk-pw-row { position: relative; width: 100%; }
  .lk-input { width: 100%; padding: 12px 44px 12px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; transition: all 0.2s var(--ease); box-sizing: border-box; text-align: left; }
  .lk-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12); outline: none; }
  .lk-input::placeholder { color: var(--text-muted); }
  .lk-eye { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .lk-eye:hover { color: var(--text-secondary); background: var(--surface-hover); }
  .lk-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 13px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; border: none; transition: all 0.2s var(--ease); }
  .lk-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.25); }
  .lk-btn:active:not(:disabled) { transform: scale(0.98); }
  .lk-btn:disabled { opacity: 0.4; cursor: default; }
  .lk-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.6s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .lk-error { display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; color: var(--danger); margin-top: 16px; padding: 10px 14px; background: var(--danger-bg); border-radius: 10px; }
</style>
