<script>
  let { points, streak, completedCount, todayTotal, completionRate, recentCompletions } = $props()
</script>

<div class="view-content">
  <h2 class="view-title">Statistics</h2>
  <p class="view-sub">Your progress at a glance</p>
  <div class="stats-grid">
    <div class="stat-card"><span class="stat-num">✦{points}</span><span class="stat-label">Points</span></div>
    <div class="stat-card"><span class="stat-num">🔥{streak}</span><span class="stat-label">Day streak</span></div>
    <div class="stat-card"><span class="stat-num">{completedCount}/{todayTotal}</span><span class="stat-label">Today</span></div>
    <div class="stat-card"><span class="stat-num">{Math.round(completionRate)}%</span><span class="stat-label">All time</span></div>
  </div>
  <h3 class="view-sub" style="margin-top:20px">Recent completions</h3>
  <div class="inbox-list">
    {#each recentCompletions as t (t.id)}
      <div class="inbox-item"><span class="inbox-text">&#10003; {t.title}</span><span class="date">{t.date}</span></div>
    {/each}
    {#if recentCompletions.length === 0}
      <div class="empty"><p>No completions yet</p></div>
    {/if}
  </div>
</div>

<style>
  .date { font-size: 13px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.3px; }
</style>
