<script>
  import { Eye, EyeOff, CheckCircle2, AlertCircle, LockKeyhole } from 'lucide-svelte'
  let { onSet } = $props()
  let password = $state('')
  let confirm = $state('')
  let error = $state('')
  let saved = $state(false)
  let showPw = $state(false)
  let showConfirm = $state(false)

  let passwordsMatch = $derived(confirm.length > 0 ? password === confirm : true)

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
  <div class="sp-saved">
    <CheckCircle2 size={20} strokeWidth={1.5} color="var(--complete)" />
    <div>
      <p class="sp-saved-title">Password saved!</p>
      <p class="sp-saved-sub">{localStorage.getItem('focus-account-user') || 'You'} will need it to unlock after idle.</p>
    </div>
  </div>
{:else}
  <div class="sp-form">
    <div class="sp-header">
      <LockKeyhole size={18} strokeWidth={1.5} color="var(--accent)" />
      <p class="sp-label">Set a password to lock the app when idle</p>
    </div>
    <div class="sp-pw-row">
      <input type={showPw ? 'text' : 'password'} class="sp-input" placeholder="Password (3+ chars)" bind:value={password} onkeydown={(e) => e.key === 'Enter' && save()} />
      <button class="sp-eye" onclick={() => showPw = !showPw} aria-label="Toggle password" type="button">
        {#if showPw}<EyeOff size={14} strokeWidth={1.5} />{:else}<Eye size={14} strokeWidth={1.5} />{/if}
      </button>
    </div>
    <div class="sp-pw-row">
      <input type={showConfirm ? 'text' : 'password'} class="sp-input" class:sp-input--error={confirm.length > 0 && !passwordsMatch} placeholder="Confirm password" bind:value={confirm} onkeydown={(e) => e.key === 'Enter' && save()} />
      <button class="sp-eye" onclick={() => showConfirm = !showConfirm} aria-label="Toggle confirm" type="button">
        {#if showConfirm}<EyeOff size={14} strokeWidth={1.5} />{:else}<Eye size={14} strokeWidth={1.5} />{/if}
      </button>
    </div>
    {#if confirm.length > 0}
      {#if passwordsMatch}
        <p class="sp-hint sp-hint--ok"><CheckCircle2 size={10} strokeWidth={1.5} /> Passwords match</p>
      {:else}
        <p class="sp-hint sp-hint--err"><AlertCircle size={10} strokeWidth={1.5} /> Passwords do not match</p>
      {/if}
    {/if}
    {#if error}
      <p class="sp-error"><AlertCircle size={12} strokeWidth={1.5} /> {error}</p>
    {/if}
    <button class="sp-btn" onclick={save}>Set password</button>
  </div>
{/if}

<style>
  .sp-form { padding: 4px 0 8px; display: flex; flex-direction: column; gap: 8px; }
  .sp-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .sp-label { font-size: 13px; color: var(--text-secondary); margin: 0; }
  .sp-pw-row { position: relative; width: 100%; }
  .sp-input { width: 100%; padding: 10px 40px 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; color: var(--text); font-size: 14px; transition: all 0.2s var(--ease); box-sizing: border-box; }
  .sp-input:focus { border-color: var(--accent); box-shadow: var(--accent-ring); outline: none; }
  .sp-input::placeholder { color: var(--text-muted); }
  .sp-input--error { border-color: var(--danger); }
  .sp-eye { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 6px; border-radius: 6px; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
  .sp-eye:hover { color: var(--text-secondary); background: var(--surface-hover); }
  .sp-btn { width: 100%; padding: 11px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; background: var(--accent); color: #fff; border: none; transition: all 0.2s var(--ease); margin-top: 4px; }
  .sp-btn:hover { filter: brightness(1.12); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(var(--accent-rgb), 0.25); }
  .sp-btn:active { transform: scale(0.98); }
  .sp-hint { font-size: 11px; display: flex; align-items: center; gap: 4px; margin: 0; }
  .sp-hint--err { color: var(--danger); }
  .sp-hint--ok { color: var(--complete); }
  .sp-error { font-size: 12px; color: var(--danger); display: flex; align-items: center; gap: 4px; margin: 0; }
  .sp-saved { display: flex; align-items: center; gap: 12px; padding: 12px 0; }
  .sp-saved-title { font-size: 14px; font-weight: 600; color: var(--text); margin: 0; }
  .sp-saved-sub { font-size: 12px; color: var(--text-secondary); margin: 2px 0 0; }
</style>
