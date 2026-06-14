<script>
  import ConfirmDialog from './ConfirmDialog.svelte'
  import { loadLocale, setLocale, getLocale, LANGUAGES } from './i18n.svelte.js'

  let locale = $state(getLocale())
  import { exportData, importData, loadPoints, computeStreak, requestNotificationPermission } from './taskStore.svelte.js'
  import { Moon, Sun, Circle, X, Star, Flame } from 'lucide-svelte'

  let { theme, onThemeCycle, accentColor, onAccentChange, autoThemeTime, onAutoThemeChange } = $props()

  let colorInput = $state(accentColor || '')

  let points = $state(loadPoints())
  let streak = $state(computeStreak())

  let ntfyEnabled = $state(localStorage.getItem('focus-ntfy-enabled') === 'true')
  let confirmAction = $state(null)

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

  function requestClearAll() {
    confirmAction = 'clear'
  }

  function requestSignOut() {
    confirmAction = 'signout'
  }

  function doConfirm() {
    if (confirmAction === 'clear') {
      localStorage.clear()
      window.location.reload()
    } else if (confirmAction === 'signout') {
      localStorage.removeItem('focus-account-hash')
      localStorage.removeItem('focus-account-user')
      localStorage.removeItem('focus-session-expiry')
      localStorage.removeItem('focus-session-activity')
      window.location.reload()
    }
    confirmAction = null
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
        {#if theme === 'dark'}
          <Moon size={16} strokeWidth={1.5} />
        {:else if theme === 'light'}
          <Sun size={16} strokeWidth={1.5} />
        {:else}
          <Circle size={16} strokeWidth={1.5} />
        {/if}
        <span>{theme}</span>
      </button>
    </div>
    <div class="settings-row">
      <span class="settings-label">Auto switch at</span>
      <input type="time" class="auto-theme-input" value={autoThemeTime} oninput={(e) => { const v = e.target.value; localStorage.setItem('focus-auto-theme-time', v); onAutoThemeChange(v) }} />
    </div>
    <p class="settings-hint">Theme will toggle between dark and light at this time daily</p>

    <div class="settings-row">
      <span class="settings-label">Language</span>
      <select class="routine-select" value={locale} onchange={(e) => { setLocale(e.target.value); locale = e.target.value }}>
        {#each LANGUAGES as lang}
          <option value={lang.code} selected={locale === lang.code}>{lang.label}</option>
        {/each}
      </select>
    </div>
    <div class="settings-row">
      <span class="settings-label">Accent color</span>
      <div class="accent-row">
        <input type="color" class="accent-picker" value={accentColor || '#5a9a9a'} oninput={(e) => { const v = e.target.value; colorInput = v; onAccentChange(v) }} />
        <input type="text" class="accent-input" placeholder="#5a9a9a" bind:value={colorInput} onkeydown={(e) => { if (e.key === 'Enter' && /^#[0-9a-fA-F]{6}$/.test(colorInput)) onAccentChange(colorInput) }} />
        {#if accentColor}
          <button class="accent-reset" onclick={() => { colorInput = ''; onAccentChange('') }} aria-label="Reset accent">
            <X size={14} strokeWidth={1.5} />
          </button>
        {/if}
      </div>
    </div>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Account</h3>
    <div class="settings-row">
      <span class="settings-label">Signed in as</span>
      <span class="settings-value">{localStorage.getItem('focus-account-user') || '—'}</span>
    </div>
    <button class="settings-action-btn danger" onclick={requestSignOut}>Sign out</button>
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
      <span class="settings-value"><Star size={14} strokeWidth={1.5} /> {points}</span>
    </div>
    <div class="settings-row">
      <span class="settings-label">Streak</span>
      <span class="settings-value"><Flame size={14} strokeWidth={1.5} /> {streak} day{streak !== 1 ? 's' : ''}</span>
    </div>
  </div>

  <div class="settings-section">
    <h3 class="settings-section-title">Data</h3>
    <div class="settings-btn-row">
      <button class="settings-action-btn primary" onclick={handleExport}>Export data</button>
      <button class="settings-action-btn" onclick={handleImport}>Import data</button>
    </div>
    <button class="settings-action-btn danger" onclick={requestClearAll}>Clear all data</button>
  </div>
</div>

<ConfirmDialog open={confirmAction === 'clear'} title="Clear all data" message="Delete all data? This cannot be undone." confirmLabel="Delete all" onConfirm={doConfirm} onCancel={() => confirmAction = null} />
<ConfirmDialog open={confirmAction === 'signout'} title="Sign out" message="Sign out? You will need your password to sign back in." confirmLabel="Sign out" onConfirm={doConfirm} onCancel={() => confirmAction = null} />

<style>
  .settings-section { margin-bottom: 32px; }
  .settings-section-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--border); }
  .settings-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; }
  .settings-label { font-size: 15px; color: var(--text); }
  .settings-value { font-size: 15px; color: var(--text-secondary); font-weight: 500; }
  .settings-theme-btn { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 10px; border: 1px solid var(--border); background: var(--glass-bg); color: var(--text); font-size: 14px; font-weight: 500; cursor: pointer; text-transform: capitalize; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .settings-theme-btn:hover { border-color: var(--accent); box-shadow: var(--glow); transform: translateY(-1px); }
  .settings-btn-row { display: flex; gap: 10px; margin-bottom: 10px; }
  .settings-action-btn { width: 100%; padding: 13px 16px; border-radius: var(--radius-md); font-size: 15px; font-weight: 500; cursor: pointer; border: 1px solid var(--border); background: var(--glass-bg); color: var(--text-secondary); text-align: center; transition: all 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .settings-action-btn:hover { border-color: var(--accent); color: var(--text); box-shadow: var(--glow); transform: translateY(-1px); }
  .settings-action-btn.primary { background: var(--accent-gradient); color: #fff; border-color: transparent; box-shadow: var(--accent-glow); }
  .settings-action-btn.primary:hover { box-shadow: 0 0 50px rgba(var(--accent-rgb), 0.3); }
  .settings-action-btn.danger { color: #b06060; border-color: rgba(176, 96, 96, 0.25); margin-top: 10px; }
  .settings-action-btn.danger:hover { background: rgba(176, 96, 96, 0.08); border-color: var(--danger); color: var(--danger); }
  .settings-action-btn.mini { width: auto; padding: 6px 14px; font-size: 12px; border-radius: 8px; display: inline-block; margin: 0; }
  .settings-action-btn.danger.mini { margin-top: 0; }
  .settings-hint { font-size: 11px; color: var(--text-muted); margin-top: -8px; margin-bottom: 16px; line-height: 1.5; }
  .toggle-btn { width: 44px; height: 24px; border-radius: 12px; background: var(--border); border: none; cursor: pointer; position: relative; transition: background 0.25s var(--ease); flex-shrink: 0; padding: 0; }
  .toggle-btn.on { background: var(--accent); }
  .toggle-knob { width: 18px; height: 18px; border-radius: 50%; background: #fff; position: absolute; top: 3px; left: 3px; transition: left 0.25s var(--ease-spring); box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
  .toggle-btn.on .toggle-knob { left: 23px; }
  .accent-row { display: flex; align-items: center; gap: 8px; }
  .accent-picker { width: 36px; height: 36px; border: none; border-radius: 50%; cursor: pointer; background: none; padding: 0; }
  .accent-picker::-webkit-color-swatch-wrapper { padding: 0; }
  .accent-picker::-webkit-color-swatch { border: 2px solid var(--border); border-radius: 50%; }
  .accent-input { width: 90px; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface); color: var(--text); font-size: 13px; font-family: var(--font-mono); text-align: center; transition: border-color 0.2s var(--ease); }
  .accent-input:focus { border-color: var(--accent); outline: none; box-shadow: var(--glow); }
  .accent-reset { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); padding: 0; transition: all 0.2s var(--ease); }
  .accent-reset:hover { color: var(--danger); border-color: var(--danger); transform: scale(1.05); }
  .auto-theme-input { padding: 6px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--glass-bg); color: var(--text); font-size: 13px; transition: border-color 0.2s var(--ease); backdrop-filter: blur(var(--glass-blur)); }
  .auto-theme-input:focus { border-color: var(--accent); outline: none; box-shadow: var(--glow); }
</style>
