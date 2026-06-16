<script>
  let { onSet } = $props()
  let password = $state('')
  let confirm = $state('')
  let error = $state('')
  let saved = $state(false)

  async function hash(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function save() {
    error = ''
    if (password.length < 3) { error = 'Password must be at least 3 characters'; return }
    if (password !== confirm) { error = 'Passwords do not match'; return }
    const h = await hash(password)
    localStorage.setItem('focus-account-hash', h)
    if (!localStorage.getItem('focus-account-user')) {
      localStorage.setItem('focus-account-user', 'User')
    }
    saved = true
    setTimeout(onSet, 1500)
  }
</script>

{#if saved}
  <p class="sp-saved">Password saved! {localStorage.getItem('focus-account-user') || 'You'} will need it to unlock after idle.</p>
{:else}
  <div class="sp-form">
    <p class="sp-label">Set a password to lock the app when idle</p>
    <input type="password" class="sp-input" placeholder="Password (3+ chars)" bind:value={password} onkeydown={(e) => e.key === 'Enter' && save()} />
    <input type="password" class="sp-input" placeholder="Confirm password" bind:value={confirm} onkeydown={(e) => e.key === 'Enter' && save()} />
    {#if error}
      <p class="sp-error">{error}</p>
    {/if}
    <button class="sp-btn" onclick={save}>Set password</button>
  </div>
{/if}

<style>
  .sp-form { padding: 12px 0 8px; display: flex; flex-direction: column; gap: 8px; }
  .sp-label { font-size: 13px; color: var(--text-secondary); margin: 0; }
  .sp-input { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 14px; text-align: center; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .sp-input:focus { border-color: var(--accent); box-shadow: var(--glow); outline: none; }
  .sp-btn { width: 100%; padding: 10px 16px; border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer; background: var(--accent-gradient); color: #fff; border: none; box-shadow: var(--accent-glow); transition: all 0.15s var(--ease); }
  .sp-btn:hover { box-shadow: 0 0 40px rgba(var(--accent-rgb), 0.25); transform: translateY(-1px); }
  .sp-error { font-size: 12px; color: #b06060; margin: 0; }
  .sp-saved { font-size: 13px; color: var(--accent); padding: 12px 0; margin: 0; }
</style>
