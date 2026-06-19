<script>
  import { AlertTriangle, X } from 'lucide-svelte'

  let { open, title, message, confirmLabel = 'Delete', confirmClass = 'danger', onConfirm, onCancel } = $props()
</script>

{#if open}
  <div class="confirm-overlay" role="dialog" aria-label={title} onclick={onCancel} onkeydown={(e) => { if (e.key === 'Escape') onCancel() }} tabindex="0">
    <div class="confirm-modal" onclick={(e) => e.stopPropagation()} role="document">
      <div class="confirm-header">
        <AlertTriangle size={20} strokeWidth={1.5} color="var(--accent)" />
        <span class="confirm-title">{title}</span>
        <button class="confirm-close-btn" onclick={onCancel} aria-label="Cancel">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
      <div class="confirm-body">
        <p class="confirm-message">{message}</p>
      </div>
      <div class="confirm-footer">
        <button class="confirm-btn secondary" onclick={onCancel}>Cancel</button>
        <button class="confirm-btn primary {confirmClass}" onclick={onConfirm}>{confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 210; backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); }
  .confirm-modal { background: var(--glass-bg); backdrop-filter: blur(var(--glass-blur)); border: 1px solid var(--glass-border); border-radius: var(--radius-xl); width: 100%; max-width: 420px; box-shadow: var(--shadow-xl); overflow: hidden; animation: scaleIn 0.2s var(--ease-out); }
  .confirm-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--glass-border); }
  .confirm-title { font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
  .confirm-close-btn { width: 32px; height: 32px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; transition: all 0.2s var(--ease); flex-shrink: 0; }
  .confirm-close-btn:hover { background: var(--surface-hover); color: var(--text); transform: scale(1.05); }
  .confirm-body { padding: 24px; }
  .confirm-message { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
  .confirm-footer { display: flex; gap: 10px; justify-content: flex-end; padding: 14px 20px; border-top: 1px solid var(--glass-border); }
  .confirm-btn { padding: 9px 20px; border-radius: var(--radius-md); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s var(--ease); border: none; }
  .confirm-btn.secondary { background: var(--surface-raised); color: var(--text-secondary); border: 1px solid var(--glass-border); backdrop-filter: blur(12px); }
  .confirm-btn.secondary:hover { background: var(--surface-hover); color: var(--text); border-color: var(--accent-subtle); }
  .confirm-btn.primary { background: var(--accent); color: #fff; }
  .confirm-btn.primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .confirm-btn.primary.danger { background: linear-gradient(135deg, var(--danger), #a05040); box-shadow: 0 0 20px rgba(192, 112, 96, 0.15); }
  .confirm-btn.primary.danger:hover { filter: brightness(1.1); }
</style>
