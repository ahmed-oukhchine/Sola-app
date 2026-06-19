<script>
  import { Plus } from 'lucide-svelte'
  import { goals, addGoal, removeGoal, updateGoal, getGoalProgress } from './taskStore.svelte.js'

  let title = $state('')
  let desc = $state('')
  let target = $state(0)
  let period = $state('weekly')
  let showForm = $state(false)
  let editingId = $state(null)
  let editTitle = $state(''), editDesc = $state(''), editTarget = $state(0), editPeriod = $state('weekly')

  function handleAdd() {
    if (!title.trim()) return
    addGoal(title.trim(), desc, target, period)
    title = ''; desc = ''; target = 0; period = 'weekly'; showForm = false
  }

  function startEdit(g) {
    editingId = g.id; editTitle = g.title; editDesc = g.description || ''; editTarget = g.target; editPeriod = g.period
  }

  function saveEdit() {
    if (!editTitle.trim()) return
    updateGoal(editingId, { title: editTitle.trim(), description: editDesc, target: editTarget, period: editPeriod })
    editingId = null
  }

  function cancelEdit() { editingId = null }

  function periodLabel(p) {
    return p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : p
  }
</script>

<div class="view-content">
  <h2 class="view-title">Goals</h2>
  <p class="view-sub">Track what matters. Link tasks to goals to see progress.</p>

  {#if !showForm}
    <button class="add-trigger" onclick={() => showForm = true}>
      <Plus size={18} strokeWidth={1.5} />
      Add goal
    </button>
  {:else}
    <div class="goal-form" transition:slide={{ duration: 200 }}>
      <input type="text" class="input" placeholder="Goal title..." bind:value={title} />
      <input type="text" class="input" placeholder="Description (optional)" bind:value={desc} style="margin-top:6px" />
      <div class="goal-form-row">
        <input type="number" class="input goal-num" placeholder="Target completions" bind:value={target} min="0" />
        <select class="routine-select" bind:value={period}>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>
      <div class="form-actions" style="margin-top:8px">
        <button class="btn btn-cancel" onclick={() => showForm = false}>Cancel</button>
        <button class="btn btn-save" onclick={handleAdd} disabled={!title.trim()}>Save</button>
      </div>
    </div>
  {/if}

  {#if goals.items.length === 0}
    <div class="empty"><p>No goals yet</p></div>
  {:else}
    <div class="goal-list">
      {#each goals.items as g (g.id)}
        <div class="goal-card">
          {#if editingId === g.id}
            <input type="text" class="input" bind:value={editTitle} />
            <input type="text" class="input" placeholder="Description" bind:value={editDesc} style="margin-top:6px" />
            <div class="goal-form-row">
              <input type="number" class="input goal-num" bind:value={editTarget} min="0" />
              <select class="routine-select" bind:value={editPeriod}>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div class="edit-actions" style="margin-top:6px">
              <button class="edit-save" onclick={saveEdit}>Save</button>
              <button class="edit-cancel" onclick={cancelEdit}>Cancel</button>
            </div>
          {:else}
            <div class="goal-header">
              <span class="goal-title">{g.title}</span>
              <span class="goal-period">{periodLabel(g.period)}</span>
            </div>
            {#if g.description}
              <p class="goal-desc">{g.description}</p>
            {/if}
            <div class="goal-progress-row">
              <div class="goal-bar-bg">
                <div class="goal-bar-fill" style="width:{Math.min(100, Math.round(getGoalProgress(g) * 100))}%"></div>
              </div>
              <span class="goal-pct">{Math.round(getGoalProgress(g) * 100)}%</span>
            </div>
            <div class="goal-footer">
              <button class="goal-edit-btn" onclick={() => startEdit(g)}>Edit</button>
              <button class="goal-del-btn" onclick={() => removeGoal(g.id)}>Delete</button>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .goal-form { overflow: hidden; margin-bottom: 16px; }
  .goal-form-row { display: flex; gap: 10px; margin-top: 8px; }
  .goal-num { max-width: 120px; }
  .goal-list { display: flex; flex-direction: column; gap: 12px; }
  .goal-card { background: var(--surface); border-radius: var(--radius-md); border: 1px solid var(--border); padding: 18px 20px; transition: all 0.2s var(--ease); }
  .goal-card:hover { box-shadow: var(--shadow-sm); border-color: var(--accent-subtle); }
  .goal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .goal-title { font-size: 17px; font-weight: 600; color: var(--text); }
  .goal-period { font-size: 12px; font-weight: 500; color: var(--text-muted); background: var(--bg); padding: 3px 10px; border-radius: 6px; }
  .goal-desc { font-size: 14px; color: var(--text-secondary); margin-bottom: 12px; }
  .goal-progress-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
  .goal-bar-bg { flex: 1; height: 8px; background: var(--bg); border-radius: 4px; overflow: hidden; }
  .goal-bar-fill { height: 100%; background: var(--accent-gradient); border-radius: 4px; transition: width 0.4s var(--ease); box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.15); }
  .goal-pct { font-size: 14px; font-weight: 600; color: var(--text-secondary); min-width: 36px; text-align: right; }
  .goal-footer { display: flex; gap: 10px; }
  .goal-edit-btn { font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; padding: 6px 14px; border-radius: 6px; border: 1px solid var(--border); background: var(--bg); }
  .goal-edit-btn:hover { border-color: var(--accent); color: var(--text); }
  .goal-del-btn { font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; padding: 6px 14px; border-radius: 6px; background: transparent; }
  .goal-del-btn:hover { color: #b06060; }
</style>
