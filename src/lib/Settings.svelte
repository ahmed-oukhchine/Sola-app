<script>
  import { loadLocale, setLocale, getLocale, LANGUAGES } from './i18n.svelte.js'

  let locale = $state(getLocale())
  import { exportData, importData, loadPoints, computeStreak, requestNotificationPermission } from './taskStore.svelte.js'

  let { theme, onThemeCycle } = $props()

  let points = $state(loadPoints())
  let streak = $state(computeStreak())

  let lockEnabled = $state(!!localStorage.getItem('focus-lock-hash'))
  let lockPassword = $state('')
  let lockConfirm = $state('')
  let lockError = $state('')
  let showLockForm = $state(false)
  let removingLock = $state(false)

  let ntfyEnabled = $state(localStorage.getItem('focus-ntfy-enabled') === 'true')

  async function hashPassword(pw) {
    const enc = new TextEncoder().encode(pw)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function setLock() {
    lockError = ''
    if (lockPassword.length < 3) { lockError = 'Password must be at least 3 characters'; return }
    if (lockPassword !== lockConfirm) { lockError = 'Passwords do not match'; return }
    const hash = await hashPassword(lockPassword)
    localStorage.setItem('focus-lock-hash', hash)
    lockEnabled = true
    lockPassword = ''
    lockConfirm = ''
  }

  function startRemoveLock() { removingLock = true; lockError = ''; lockPassword = '' }

  async function confirmRemoveLock() {
    lockError = ''
    if (!lockPassword) { lockError = 'Enter your current password'; return }
    const hash = await hashPassword(lockPassword)
    if (hash !== localStorage.getItem('focus-lock-hash')) { lockError = 'Wrong password'; return }
    localStorage.removeItem('focus-lock-hash')
    lockEnabled = false
    removingLock = false
    lockPassword = ''
  }

  function cancelRemoveLock() { removingLock = false; lockPassword = ''; lockError = '' }

  function toggleNtfy() {
    ntfyEnabled = !ntfyEnabled
    localStorage.setItem('focus-ntfy-enabled', ntfyEnabled ? 'true' : 'false')
    if (ntfyEnabled) requestNotificationPermission()
  }

  async function handleExport() {
    const json = await exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `focus-backup-${new Date().toISOString().split('T')[0]}.json`; a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async () => {
      try {
        const text = await input.files[0].text()
        await importData(text)
        points = loadPoints(); streak = computeStreak()
      } catch (e) { alert('Invalid backup file') }
    }
    input.click()
  }

  function clearAll() {
    if (!confirm('Delete all data? This cannot be undone.')) return
    localStorage.clear()
    window.location.reload()
  }
</script>

<div class="view-content">
  <h2 class="view-title">Settings</h2>
  <p class="view-sub">Customize your experience</p>

  <div class="settings-section">
    <h3 class="settings-section-title">Appearance</h3>
    <div class="settings-row">
      <span class="settings-label">Theme</span>
      <button class="settings-theme-btn" onclick={onThemeCycle}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          {#if theme === 'dark'}
            <path d="M12.5 9.7A5.5 5.5 0 016.3 3.5 5.5 5.5 0 1012.5 9.7z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
          {:else if theme === 'light'}
            <circle cx="8" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          {:else}
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5"/><circle cx="8" cy="8" r="2" fill="currentColor"/>
          {/if}
        </svg>
        <span>{theme}</span>
      </button>
    </div>

    <div class="settings-row">
      <span class="settings-label">Language</span>
      <select class="routine-select" value={locale} onchange={(e) => { setLocale(e.target.value); locale = e.target.value }}>
        {#each LANGUAGES as lang}
          <option value={lang.code} selected={locale === lang.code}>{lang.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Security</h3>
    <div class="settings-row">
      <span class="settings-label">App lock</span>
      {#if !lockEnabled}
        <button class="settings-action-btn mini" onclick={() => showLockForm = !showLockForm}>{showLockForm ? 'Cancel' : 'Set password'}</button>
      {:else}
        <span class="settings-value">Enabled</span>
      {/if}
    </div>
    <div id="lock-setup" class="lock-form" class:open={showLockForm}>
      {#if !lockEnabled}
        <input type="password" class="lock-input" placeholder="New password" bind:value={lockPassword} onkeydown={(e) => { if (e.key === 'Enter') setLock() }} />
        <input type="password" class="lock-input" placeholder="Confirm password" bind:value={lockConfirm} onkeydown={(e) => { if (e.key === 'Enter') setLock() }} />
        <button class="settings-action-btn primary mini" onclick={setLock}>Set</button>
      {:else if !removingLock}
        <button class="settings-action-btn danger mini" onclick={startRemoveLock}>Remove password</button>
      {:else}
        <input type="password" class="lock-input" placeholder="Current password" bind:value={lockPassword} onkeydown={(e) => { if (e.key === 'Enter') confirmRemoveLock() }} />
        <div class="lock-btn-row">
          <button class="settings-action-btn danger mini" onclick={confirmRemoveLock}>Remove</button>
          <button class="settings-action-btn mini" onclick={cancelRemoveLock}>Cancel</button>
        </div>
      {/if}
      {#if lockError}<p class="lock-error">{lockError}</p>{/if}
    </div>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Notifications</h3>
    <div class="settings-row">
      <span class="settings-label">Desktop notifications</span>
      <button class="toggle-btn" class:on={ntfyEnabled} onclick={toggleNtfy} role="switch" aria-checked={ntfyEnabled}>
        <span class="toggle-knob"></span>
      </button>
    </div>
    <p class="settings-hint">Get notified when a timed task starts and when focus sessions complete</p>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Progress</h3>
    <div class="settings-row">
      <span class="settings-label">Points</span>
      <span class="settings-value">✦ {points}</span>
    </div>
    <div class="settings-row">
      <span class="settings-label">Streak</span>
      <span class="settings-value">🔥 {streak} day{streak !== 1 ? 's' : ''}</span>
    </div>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Data</h3>
    <div class="settings-btn-row">
      <button class="settings-action-btn primary" onclick={handleExport}>Export data</button>
      <button class="settings-action-btn" onclick={handleImport}>Import data</button>
    </div>
    <button class="settings-action-btn danger" onclick={clearAll}>Clear all data</button>
  </div>
</div>

<style>
  .settings-section { margin-bottom: 28px; }
  .settings-section-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
  .settings-label { font-size: 15px; color: var(--text); }
  .settings-value { font-size: 15px; color: var(--text-secondary); font-weight: 500; }
  .settings-theme-btn { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer; text-transform: capitalize; transition: all 0.15s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .settings-theme-btn:hover { border-color: var(--accent); box-shadow: var(--glow); }
  .settings-btn-row { display: flex; gap: 10px; margin-bottom: 10px; }
  .settings-action-btn { width: 100%; padding: 12px 16px; border-radius: 12px; font-size: 15px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--text-secondary); text-align: center; transition: all 0.15s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .settings-action-btn:hover { border-color: var(--accent); color: var(--text); box-shadow: var(--glow); }
  .settings-action-btn.primary { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .settings-action-btn.primary:hover { box-shadow: 0 0 50px rgba(212, 165, 116, 0.3); }
  .settings-action-btn.danger { color: #b06060; border-color: rgba(176, 96, 96, 0.3); margin-top: 10px; }
  .settings-action-btn.danger:hover { background: rgba(176, 96, 96, 0.1); border-color: #b06060; }
  .settings-action-btn.mini { width: auto; padding: 6px 14px; font-size: 12px; border-radius: 8px; display: inline-block; margin: 0; }
  .settings-action-btn.danger.mini { margin-top: 0; }
  .settings-hint { font-size: 11px; color: var(--text-muted); margin-top: -8px; margin-bottom: 16px; line-height: 1.4; }
  .lock-form { display: none; flex-direction: column; gap: 8px; padding: 4px 0 12px; }
  .lock-form.open { display: flex; }
  .lock-form .lock-input { width: 100%; padding: 10px 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-md); color: var(--text); font-size: 13px; box-sizing: border-box; }
  .lock-form .lock-input:focus { border-color: var(--accent); box-shadow: var(--glow); outline: none; }
  .lock-error { font-size: 12px; color: #b06060; margin: 0; }
  .lock-btn-row { display: flex; gap: 8px; }
  .toggle-btn { width: 44px; height: 24px; border-radius: 12px; background: var(--border); border: none; cursor: pointer; position: relative; transition: background 0.2s var(--ease); flex-shrink: 0; padding: 0; }
  .toggle-btn.on { background: var(--accent); }
  .toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: left 0.2s var(--ease); box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
  .toggle-btn.on .toggle-knob { left: 23px; }
</style>
