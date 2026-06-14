<script>
  import { fly } from 'svelte/transition'
  import { X } from 'lucide-svelte'

  let { toasts, onDismiss, onUndo } = $props()
</script>

<div class="toast-container">
  {#each toasts as t (t.id)}
    <div class="toast" class:success={t.type === 'success'} class:error={t.type === 'error'} class:info={t.type === 'info'}
      out:fly={{ y: 16, duration: 200 }}
      style="animation: slideUp 0.25s var(--ease-out)"
    >
      <span class="toast-msg">{t.message}</span>
      <div class="toast-actions">
        {#if t.undo}
          <button class="toast-undo" onclick={() => onUndo(t.id)}>Undo</button>
        {/if}
        <button class="toast-dismiss" onclick={() => onDismiss(t.id)} aria-label="Dismiss">
          <X size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; gap: 8px;
    z-index: 500; pointer-events: none;
    max-width: 420px; width: calc(100% - 48px);
  }
  .toast {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 16px; border-radius: var(--radius-md);
    background: var(--glass-bg); backdrop-filter: blur(24px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    pointer-events: auto;
    animation: slideUp 0.25s var(--ease-out);
  }
  .toast.success { border-color: var(--complete); }
  .toast.error { border-color: var(--danger); }
  .toast.info { border-color: var(--accent); }
  .toast-msg { flex: 1; font-size: 14px; color: var(--text); font-weight: 500; }
  .toast-actions { display: flex; align-items: center; gap: 8px; }
  .toast-undo {
    font-size: 13px; font-weight: 600; color: var(--accent); cursor: pointer;
    background: none; border: none; padding: 4px 8px; border-radius: 6px;
    transition: all 0.15s var(--ease);
  }
  .toast-undo:hover { background: var(--accent-subtle); }
  .toast-dismiss {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); background: transparent;
    border: none; transition: all 0.15s var(--ease);
  }
  .toast-dismiss:hover { background: var(--surface-hover); color: var(--text); }
</style>
