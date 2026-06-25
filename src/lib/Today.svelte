<script>
  import { fly } from "svelte/transition";
  import { Plus, Check, X, Info, Crosshair, Save, Star, Sunrise, Timer, Target, CalendarCheck } from 'lucide-svelte';
  import {
    store,
    addTask,
    toggleTask,
    removeTask,
    updateTask,
    addSubtask,
    toggleSubtask,
    removeSubtask,
    toggleExpand,
    reorderTask,
    addTemplate,
    setHighlight,
  } from "./taskStore.svelte.js";
  let { now, onCompleteTask, onCompleteSubtask, onStartFocus, onPlanDay } = $props();

  function playComplete() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const g = ctx.createGain()
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      const o = ctx.createOscillator()
      o.frequency.setValueAtTime(880, ctx.currentTime)
      o.frequency.linearRampToValueAtTime(1320, ctx.currentTime + 0.1)
      o.type = 'sine'
      o.connect(g)
      o.start()
      o.stop(ctx.currentTime + 0.3)
    } catch {}
    if (navigator.vibrate) navigator.vibrate(12)
  }
  function moveToTomorrow(task) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const tomorrow = d.toISOString().split("T")[0];
    updateTask(task.id, { date: tomorrow, startTime: '08:00', endTime: '09:00' });
  }
  let todayStr = $derived(new Date().toISOString().split("T")[0]);
  let yesterdayUnfinished = $derived.by(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    const ys = d.toISOString().split("T")[0];
    return store.tasks.filter(t => t.date === ys && !t.completed);
  });
  let todayTasks = $derived(
    store.tasks
      .filter((t) => t.date === todayStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );
  let currentTask = $derived(
    todayTasks.find((t) => {
      if (t.completed) return false;
      const [sh, sm] = t.startTime.split(":").map(Number);
      const [eh, em] = t.endTime ? t.endTime.split(":").map(Number) : [0, 0];
      const n = now.getHours() * 60 + now.getMinutes();
      return !t.unscheduled && n >= sh * 60 + sm && n < eh * 60 + em;
    }),
  );
  let nextTask = $derived(
    todayTasks.find((t) => {
      if (t.completed || t === currentTask) return false;
      const [sh, sm] = t.startTime.split(":").map(Number);
      const n = now.getHours() * 60 + now.getMinutes();
      return !t.unscheduled && sh * 60 + sm > n;
    }),
  );
  let nextAction = $state(false)
  let doableNow = $state(false);
  let hideCompleted = $state(false);
  let minutesUntilNext = $derived.by(() => {
    const n = now.getHours() * 60 + now.getMinutes()
    const next = todayTasks.find(t => {
      if (t.completed || t.unscheduled) return false
      const [sh, sm] = t.startTime.split(':').map(Number)
      return sh * 60 + sm > n
    })
    if (next) {
      const [sh, sm] = next.startTime.split(':').map(Number)
      return sh * 60 + sm - n
    }
    return shutdownMinutes
  })
  let searchQuery = $state("");
  function doableFilter(t) {
    if (!doableNow) return true
    if (t.completed) return false
    if (t.unscheduled) return true
    const est = t.estimatedMinutes || 30
    return est <= minutesUntilNext
  }
  let timedTasks = $derived(
    todayTasks.filter(
      (t) =>
        !t.unscheduled &&
        (!hideCompleted || !t.completed) &&
        (!mvpMode || mvpIds.includes(t.id)) &&
        doableFilter(t) &&
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  let unscheduledTasks = $derived(
    todayTasks.filter(
      (t) =>
        t.unscheduled &&
        (!hideCompleted || !t.completed) &&
        (!mvpMode || mvpIds.includes(t.id)) &&
        doableFilter(t) &&
        t.title.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  let todayHighlight = $derived(
    todayTasks.find((t) => t.highlight),
  );
  let actionTask = $derived(
    currentTask || nextTask || todayTasks.find((t) => !t.completed),
  );
  const START_H = 5,
    END_H = 23,
    HOUR_H = 72;
  const TOTAL_H = (END_H - START_H) * HOUR_H;
  const HOURS = Array.from({ length: END_H - START_H }, (_, i) => START_H + i);
  const AVAILABLE_MINUTES = (END_H - START_H) * 60;
  let shutdownTime = $state(localStorage.getItem('focus-shutdown-time') || '');
  let shutdownMinutes = $derived.by(() => {
    if (!shutdownTime) return AVAILABLE_MINUTES
    const [h, m] = shutdownTime.split(':').map(Number)
    const nowH = now.getHours(), nowM = now.getMinutes()
    const remaining = (h * 60 + m) - (nowH * 60 + nowM)
    return Math.max(60, remaining)
  })
  let totalEstimatedMinutes = $derived(
    todayTasks.reduce((s, t) => s + (t.estimatedMinutes || 0), 0),
  );

  let completedMinutes = $derived(
    todayTasks.filter(t => t.completed).reduce((s, t) => s + (t.estimatedMinutes || 0), 0)
  );
  let remainingMinutes = $derived(Math.max(0, totalEstimatedMinutes - completedMinutes));
  let overbooked = $derived(totalEstimatedMinutes > shutdownMinutes);
  let bookRatio = $derived(Math.min(1, totalEstimatedMinutes / shutdownMinutes));
  let focusScore = $derived(
    todayTasks.length > 0
      ? Math.round((todayTasks.filter(t => t.completed).length / todayTasks.filter(t => !t.unscheduled).length) * 100)
      : 0
  );
  let totalCompleted = $derived(todayTasks.filter(t => t.completed).length);
  let totalTimed = $derived(todayTasks.filter(t => !t.unscheduled).length);

  let currentTaskProgress = $derived.by(() => {
    if (!currentTask) return 0;
    const [sh, sm] = currentTask.startTime.split(":").map(Number);
    const [eh, em] = currentTask.endTime ? currentTask.endTime.split(":").map(Number) : [sh + 1, sm];
    const startM = sh * 60 + sm;
    const endM = eh * 60 + em;
    const nowM = now.getHours() * 60 + now.getMinutes();
    const elapsed = nowM - startM;
    const total = endM - startM;
    return Math.min(1, Math.max(0, elapsed / total));
  });
  let currentTaskRemaining = $derived.by(() => {
    if (!currentTask) return 0;
    const [eh, em] = currentTask.endTime ? currentTask.endTime.split(":").map(Number) : [0, 0];
    const nowM = now.getHours() * 60 + now.getMinutes();
    return Math.max(0, eh * 60 + em - nowM);
  });

  let todayTip = $derived.by(() => {
    if (todayTasks.length === 0) return 'Start by adding one small task'
    if (todayTasks.every(t => t.completed)) return 'All done! Time to rest.'
    if (overbooked) return 'You might have too much planned. Try moving some tasks to tomorrow.'
    if (!todayHighlight && todayTasks.filter(t => !t.completed).length > 8) return 'Try picking just 3 must-dos for today.'
    const inc = todayTasks.filter(t => !t.completed)
    if (inc.length <= 3 && inc.length > 0) return 'A light day — great for deep focus.'
    return ''
  })
  function taskTop(t) {
    const [sh, sm] = t.startTime.split(":").map(Number);
    return ((sh * 60 + sm - START_H * 60) / 60) * HOUR_H;
  }
  function taskHeight(t) {
    const [sh, sm] = t.startTime.split(":").map(Number);
    const [eh, em] = t.endTime
      ? t.endTime.split(":").map(Number)
      : [sh + 1, sm];
    return Math.max(((eh * 60 + em - sh * 60 - sm) / 60) * HOUR_H, 40);
  }
  let nowLineTop = $derived(
    ((now.getHours() * 60 + now.getMinutes() - START_H * 60) / 60) * HOUR_H,
  );
  let title = $state(""),
    startTime = $state(""),
    endTime = $state(""),
    taskEnergy = $state(localStorage.getItem('focus-default-energy') || null),
    taskRepeat = $state(null),
    showForm = $state(false);
  let mvpMode = $state(false)
  let mvpIds = $state(JSON.parse(localStorage.getItem('focus-mvp') || '[]'))
  function toggleMvp(taskId) {
    const idx = mvpIds.indexOf(taskId)
    if (idx > -1) mvpIds.splice(idx, 1)
    else if (mvpIds.length < 3) mvpIds.push(taskId)
    mvpIds = mvpIds.slice()
    localStorage.setItem('focus-mvp', JSON.stringify(mvpIds))
  }
  function openForm() {
    showForm = true;
    taskEnergy = null;
    taskRepeat = null;
    const h = now.getHours(),
      m = now.getMinutes();
    const r = Math.ceil(m / 15) * 15;
    startTime = `${String(r >= 60 ? h + 1 : h).padStart(2, "0")}:${String(r >= 60 ? 0 : r).padStart(2, "0")}`;
    const eh = r + 30 >= 60 ? (r >= 60 ? h + 1 : h) + 1 : r >= 60 ? h + 1 : h;
    endTime = `${String(eh).padStart(2, "0")}:${String(r + 30 >= 60 ? r + 30 - 60 : r + 30).padStart(2, "0")}`;
  }
  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title.trim(), startTime, endTime, taskEnergy, taskRepeat);
    if (taskEnergy) localStorage.setItem('focus-default-energy', taskEnergy)
    title = "";
    startTime = "";
    endTime = "";
    taskEnergy = localStorage.getItem('focus-default-energy') || null;
    showForm = false;
  }
  function timeDisplay(t) {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "p" : "a"}`;
  }
  let editTask = $state(null);
  let editTitle = $state(""),
    editStart = $state(""),
    editEnd = $state(""),
    editEnergy = $state(null);
  function startEdit(t) {
    editTask = t.id;
    editTitle = t.title;
    editStart = t.startTime;
    editEnd = t.endTime;
    editEnergy = t.energy;
  }
  function saveEdit() {
    if (!editTitle.trim()) return;
    updateTask(editTask, {
      title: editTitle.trim(),
      startTime: editStart,
      endTime: editEnd,
      energy: editEnergy,
    });
    editTask = null;
  }
  function cancelEdit() {
    editTask = null;
  }
  let dragTask = $state(null),
    dragStartY = $state(0),
    dragging = $state(false);
  const SNAP_MINUTES = 15;
  function dragStart(e, task) {
    if (task.unscheduled) return;
    dragTask = task.id;
    dragging = true;
    dragStartY = e.clientY;
  }
  function dragMove(e) {
    if (!dragging || !dragTask) return;
    e.preventDefault();
  }
  function dragEnd(e) {
    if (!dragging || !dragTask) return;
    const snap =
      Math.round((((e.clientY - dragStartY) / HOUR_H) * 60) / SNAP_MINUTES) *
      SNAP_MINUTES;
    const t = store.tasks.find((t) => t.id === dragTask);
    if (t) {
      const [sh, sm] = t.startTime.split(":").map(Number);
      let total = sh * 60 + sm + snap;
      if (total < START_H * 60) total = START_H * 60;
      if (total > END_H * 60 - 15) total = END_H * 60 - 15;
      const nh = Math.floor(total / 60),
        nm = total % 60;
      const ns = `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
      const dur = t.endTime
        ? (() => {
            const [eh, em] = t.endTime.split(":").map(Number);
            return eh * 60 + em - (sh * 60 + sm);
          })()
        : 30;
      const etotal = total + dur;
      const neh = Math.floor(etotal / 60),
        nem = etotal % 60;
      const ne = `${String(neh).padStart(2, "0")}:${String(nem).padStart(2, "0")}`;
      updateTask(dragTask, { startTime: ns, endTime: ne });
    }
    dragTask = null;
    dragging = false;
  }
  let swipingId = $state(null),
    swipeStartX = $state(0),
    swipeDelta = $state(0);
  function touchStart(e, id) {
    swipingId = id;
    swipeStartX = e.touches[0].clientX;
  }
  function touchMove(e) {
    if (!swipingId) return;
    swipeDelta = e.touches[0].clientX - swipeStartX;
    if (Math.abs(swipeDelta) > 10) e.preventDefault();
  }
  function touchEnd(e, task) {
    if (!swipingId) return;
    const dx = swipeDelta;
    swipingId = null;
    swipeDelta = 0;
    if (dx < -80) removeTask(task.id);
    else if (dx > 80) {
      const was = task.completed;
      toggleTask(task.id);
      if (!was) {
        playComplete();
        onCompleteTask();
      }
    }
  }
  let usDragId = $state(null);
  let usDragOverId = $state(null);
  let usDragging = $state(false);
  function usPtrDown(e, task) {
    if (task.completed) return;
    usDragId = task.id;
    usDragging = true;
    e.preventDefault();
  }
  function usPtrMove(e) {
    if (!usDragging || !usDragId) return;
    const us = document.querySelector(".unscheduled");
    if (!us) return;
    const cards = [...us.querySelectorAll(".us-task")];
    let over = null;
    for (const c of cards) {
      const r = c.getBoundingClientRect();
      if (e.clientY >= r.top && e.clientY <= r.bottom) {
        over = c.dataset.id;
        break;
      }
    }
    usDragOverId = over;
  }
  function usPtrUp() {
    if (!usDragging || !usDragId) return;
    if (usDragOverId && usDragOverId !== usDragId) {
      const tasks = store.tasks.filter(
        (t) => t.date === todayStr && t.unscheduled,
      );
      const fromIdx = tasks.findIndex((t) => t.id === usDragId);
      const toIdx = tasks.findIndex((t) => t.id === usDragOverId);
      if (fromIdx !== -1 && toIdx !== -1) {
        const reordered = [...tasks];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        reordered.forEach((t, i) => reorderTask(t.id, i));
      }
    }
    usDragId = null;
    usDragOverId = null;
    usDragging = false;
  }
  let subtaskInputs = $state({});
  function handleSubtaskKey(e, tid) {
    if (e.key !== "Enter") return;
    const val = subtaskInputs[tid];
    if (!val || !val.trim()) return;
    addSubtask(tid, val.trim());
    subtaskInputs = { ...subtaskInputs, [tid]: "" };
  }
  $effect(() => {
    if (!dragging && !usDragging) return;
    const onMove = (e) => {
      if (dragging) dragMove(e);
      if (usDragging) usPtrMove(e);
    };
    const onUp = (e) => {
      if (dragging) dragEnd(e);
      if (usDragging) usPtrUp();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });
</script>

<div class="view-toolbar">
  <div class="tb-filters">
    <button class="tb-btn" class:active={!nextAction} onclick={() => (nextAction = false)}>All</button>
    <button class="tb-btn" class:active={nextAction} onclick={() => (nextAction = true)}>Next</button>
    <button class="tb-btn" class:active={hideCompleted} onclick={() => (hideCompleted = !hideCompleted)}>Hide done</button>
    <button class="tb-btn" class:active={doableNow} onclick={() => (doableNow = !doableNow)}>Doable</button>
    <button class="tb-btn mvp-btn" class:active={mvpMode} onclick={() => (mvpMode = !mvpMode)} title="Show only your 3 must-do tasks">MVP</button>
  </div>
  <div class="tb-actions">
    <button class="tb-plan-btn" onclick={onPlanDay} title="Plan your day">
      <Sunrise size={13} strokeWidth={1.5} />Plan
    </button>
    <input type="search" class="tb-search" placeholder="Search..." bind:value={searchQuery} />
  </div>
</div>

<div class="today-scroll">
  {#if todayTasks.length > 0}
    <div class="metrics-bar">
      <div class="metrics-track">
        <div class="metrics-fill" class:warn={bookRatio > 0.8 && !overbooked} class:over={overbooked}
          style="width: {Math.min(bookRatio * 100, 100)}%"></div>
      </div>
      <div class="metrics-items">
        <div class="metric">
          <span class="metric-value">{Math.round(totalEstimatedMinutes / 60)}h</span>
          <span class="metric-label">Planned</span>
        </div>
        <div class="metric">
          <span class="metric-value" class:metric-done={completedMinutes > 0}>{Math.round(completedMinutes / 60)}h</span>
          <span class="metric-label">Done</span>
        </div>
        <div class="metric">
          <span class="metric-value" class:metric-warn={overbooked}>{Math.round(remainingMinutes / 60)}h</span>
          <span class="metric-label">Remaining</span>
        </div>
        <div class="metric metric-score">
          <span class="metric-value metric-score-val">{isNaN(focusScore) ? 0 : focusScore}%</span>
          <span class="metric-label">Focus</span>
        </div>
      </div>
    </div>
  {/if}

  {#if currentTask}
    <div class="focus-card">
      <div class="fc-glow"></div>
      <div class="fc-header">
        <span class="fc-dot"></span>
        <span class="fc-label">Now Working On</span>
      </div>
      <h3 class="fc-title">{currentTask.title}</h3>
      <div class="fc-progress">
        <div class="fc-progress-track">
          <div class="fc-progress-fill" style="width: {Math.round(currentTaskProgress * 100)}%"></div>
        </div>
        <span class="fc-progress-pct">{Math.round(currentTaskProgress * 100)}%</span>
      </div>
      <div class="fc-info">
        <div class="fc-info-item">
          <Timer size={12} strokeWidth={1.5} />
          <span>{currentTaskRemaining} min left</span>
        </div>
        <div class="fc-info-item">
          <Target size={12} strokeWidth={1.5} />
          <span>ends at {timeDisplay(currentTask.endTime)}</span>
        </div>
      </div>
      {#if currentTask.subtasks.length > 0}
        <div class="fc-next">
          <span class="fc-next-label">Next step:</span>
          <span class="fc-next-title">{currentTask.subtasks.find(s => !s.completed)?.title || 'All complete'}</span>
        </div>
      {/if}
      <div class="fc-actions">
        <button class="fc-btn fc-btn-complete" onclick={() => {
          const was = currentTask.completed;
          toggleTask(currentTask.id);
          if (!was) { playComplete(); onCompleteTask(); }
        }}>
          <Check size={14} strokeWidth={1.5} />Complete
        </button>
        <button class="fc-btn fc-btn-focus" onclick={() => onStartFocus?.(currentTask.id)}>
          <Crosshair size={14} strokeWidth={1.5} />Focus
        </button>
      </div>
    </div>
  {:else if todayTasks.length > 0}
    <div class="status-bar">
      <div class="status-bar-content">
        {#if nextTask}
          <span class="sb-dot sb-dot-next"></span>
          <span class="sb-text">Next: <strong>{nextTask.title}</strong> &middot; {timeDisplay(nextTask.startTime)}</span>
        {:else if totalCompleted > 0}
          <span class="sb-dot sb-done"></span>
          <span class="sb-text">All done &middot; {totalCompleted}/{todayTasks.length} tasks</span>
        {:else}
          <span class="sb-dot"></span>
          <span class="sb-text">No tasks scheduled yet</span>
        {/if}
      </div>
    </div>
  {/if}

  <div class="quick-add-bar">
    <button class="qa-add-btn" onclick={openForm}>
      <Plus size={16} strokeWidth={1.5} />
      <span>Add task</span>
    </button>
    {#if todayTasks.length > 0}
      <div class="qa-stats">
        <span class="qa-stat"><Check size={12} strokeWidth={1.5} />{totalCompleted}/{todayTasks.length}</span>
      </div>
    {/if}
  </div>

  {#if showForm}
    <form class="task-form" transition:fly={{ y: 8, duration: 200, opacity: 0 }} onsubmit={handleSubmit}>
      <input type="text" class="tf-input" placeholder="What do you want to do?" bind:value={title} />
      <div class="tf-row">
        <div class="tf-field">
          <label class="tf-label" for="tf-st">Start</label>
          <input id="tf-st" type="time" class="tf-time" bind:value={startTime} />
        </div>
        <span class="tf-arrow">&rarr;</span>
        <div class="tf-field">
          <label class="tf-label" for="tf-et">End</label>
          <input id="tf-et" type="time" class="tf-time" bind:value={endTime} />
        </div>
      </div>
      <p class="tf-hint">Leave times blank for unscheduled</p>
      <div class="tf-row">
        <span class="tf-label">Energy</span>
        <button type="button" class="tf-chip" class:selected={taskEnergy === "low"} onclick={() => (taskEnergy = taskEnergy === "low" ? null : "low")}>Low</button>
        <button type="button" class="tf-chip" class:selected={taskEnergy === "medium"} onclick={() => (taskEnergy = taskEnergy === "medium" ? null : "medium")}>Med</button>
        <button type="button" class="tf-chip" class:selected={taskEnergy === "high"} onclick={() => (taskEnergy = taskEnergy === "high" ? null : "high")}>High</button>
      </div>
      <div class="tf-row">
        <span class="tf-label">Repeat</span>
        <button type="button" class="tf-chip" class:selected={taskRepeat === null} onclick={() => (taskRepeat = null)}>None</button>
        <button type="button" class="tf-chip" class:selected={taskRepeat === "daily"} onclick={() => (taskRepeat = "daily")}>Daily</button>
        <button type="button" class="tf-chip" class:selected={taskRepeat === "weekday"} onclick={() => (taskRepeat = "weekday")}>Weekdays</button>
        <button type="button" class="tf-chip" class:selected={taskRepeat === "weekly"} onclick={() => (taskRepeat = "weekly")}>Weekly</button>
      </div>
      <div class="tf-actions">
        <button type="button" class="tf-btn tf-btn-cancel" onclick={() => (showForm = false)}>Cancel</button>
        <button type="submit" class="tf-btn tf-btn-save" disabled={!title.trim()}>Save</button>
      </div>
    </form>
  {/if}

  <div class="today-content">
    {#if yesterdayUnfinished.length > 0}
      <div class="yb-banner">
        <span class="yb-label">{yesterdayUnfinished.length} task{yesterdayUnfinished.length !== 1 ? 's' : ''} left from yesterday</span>
        <button class="yb-btn" onclick={() => { yesterdayUnfinished.forEach(t => updateTask(t.id, { date: todayStr })); }}>Bring to today</button>
        <button class="yb-dismiss" onclick={() => { yesterdayUnfinished.forEach(t => updateTask(t.id, { date: todayStr })); }}>&check;</button>
      </div>
    {/if}

    {#if timedTasks.length > 0}
      <div class="timeline" style="height: {TOTAL_H}px">
        <div class="tl-bg">
          {#each HOURS as h}
            <div class="tl-hour" style="top: {(h - START_H) * HOUR_H}px">
              <span class="tl-label">{h % 12 || 12}{h >= 12 ? "p" : "a"}</span>
            </div>
          {/each}
        </div>
        {#if nowLineTop >= 0 && nowLineTop <= TOTAL_H}
          <div class="now-line" style="top: {nowLineTop}px">
            <div class="now-line-dot"></div>
          </div>
        {/if}
        {#each timedTasks as task (task.id)}
          <div class="tl-task"
            class:t-current={task.id === currentTask?.id}
            class:completed={task.completed}
            class:expanded={task.expanded}
            class:dragging={dragTask === task.id}
            style="top: {taskTop(task)}px; height: {taskHeight(task)}px; touch-action:pan-y"
            transition:fly={{ y: 8, duration: 200, opacity: 0 }}
            onmousedown={(e) => { if (!task.unscheduled) dragStart(e, task); }}
            ontouchstart={(e) => touchStart(e, task.id)}
            ontouchmove={touchMove}
            ontouchend={(e) => touchEnd(e, task)}
          >
            <div class="tl-accent-bar" class:accent-current={task.id === currentTask?.id} class:accent-done={task.completed}></div>
            <div class="tl-main"
              role="button" tabindex="0"
              onclick={() => toggleExpand(task.id)}
              onkeydown={(e) => { if (e.key === "Enter") toggleExpand(task.id); }}
            >
              <button class="tl-check" class:checked={task.completed}
                onclick={(e) => {
                  e.stopPropagation();
                  const was = task.completed;
                  toggleTask(task.id);
                  if (!was) { playComplete(); onCompleteTask(); }
                }}
              >{#if task.completed}<Check size={11} strokeWidth={1.5} />{/if}</button>
              {#if editTask === task.id}
                <div class="tl-body">
                  <input type="text" class="edit-input" bind:value={editTitle} />
                  <div class="edit-time-row">
                    <input type="time" class="edit-time" bind:value={editStart} />
                    <span class="time-arrow">&rarr;</span>
                    <input type="time" class="edit-time" bind:value={editEnd} />
                  </div>
                  <div class="edit-energy-row">
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "low"} onclick={() => (editEnergy = editEnergy === "low" ? null : "low")}>Low</button>
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "medium"} onclick={() => (editEnergy = editEnergy === "medium" ? null : "medium")}>Med</button>
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "high"} onclick={() => (editEnergy = editEnergy === "high" ? null : "high")}>High</button>
                  </div>
                  <div class="edit-actions">
                    <button class="edit-save" onclick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                    <button class="edit-cancel" onclick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                  </div>
                </div>
              {:else}
                <div class="tl-body"
                  role="button" tabindex="-1"
                  ondblclick={(e) => { e.stopPropagation(); startEdit(task); }}
                >
                  <div class="tl-title-row">
                    <span class="tl-title">{task.title}</span>
                    {#if mvpIds.includes(task.id)}<span class="tl-mvp-badge">&#9733;</span>{/if}
                    {#if task.rolloverCount > 0}<span class="tl-rollover">{task.rolloverCount}x</span>{/if}
                  </div>
                  <div class="tl-meta">
                    <span class="tl-time">{timeDisplay(task.startTime)} &rarr; {timeDisplay(task.endTime)}</span>
                    {#if task.estimatedMinutes}<span class="tl-dur">{task.estimatedMinutes}m</span>{/if}
                    {#if task.energy}<span class="tl-energy" class:en-low={task.energy === "low"} class:en-med={task.energy === "medium"} class:en-high={task.energy === "high"}>{task.energy}</span>{/if}
                    {#if task.repeat}<span class="tl-repeat">{task.repeat === "daily" ? "D" : task.repeat === "weekday" ? "W" : "7"}</span>{/if}
                  </div>
                </div>
                <div class="tl-actions">
                  <button class="tl-action-btn tl-star-btn" class:starred={task.highlight} aria-label="Highlight" onclick={(e) => { e.stopPropagation(); setHighlight(task.id, todayStr); }}>
                    <Star size={11} strokeWidth={1.5} fill={task.highlight ? 'currentColor' : 'none'} />
                  </button>
                  <button class="tl-action-btn tl-mvp-action" class:mvp-on={mvpIds.includes(task.id)} aria-label="Must-do" onclick={(e) => { e.stopPropagation(); toggleMvp(task.id) }}>{mvpIds.includes(task.id) ? '\u2605' : '\u2606'}</button>
                  <button class="tl-action-btn" aria-label="Focus" onclick={(e) => { e.stopPropagation(); onStartFocus?.(task.id); }}><Crosshair size={11} strokeWidth={1.5} /></button>
                  <button class="tl-action-btn" aria-label="Save as template" onclick={(e) => { e.stopPropagation(); addTemplate({ title: task.title, items: task.subtasks.map(s => ({ title: s.title })) }); }}><Save size={11} strokeWidth={1.5} /></button>
                  <button class="tl-action-btn" aria-label="Move to tomorrow" title="Reschedule to tomorrow" onclick={(e) => { e.stopPropagation(); moveToTomorrow(task); }}><Sunrise size={11} strokeWidth={1.5} /></button>
                  <button class="tl-action-btn tl-del-btn" aria-label="Delete" onclick={(e) => { e.stopPropagation(); removeTask(task.id); }}><X size={11} strokeWidth={1.5} /></button>
                </div>
              {/if}
            </div>
            {#if task.expanded}
              <div class="subtask-list" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
                {#each task.subtasks as st}
                  <div class="st-item" class:st-done={st.completed}>
                    <button class="st-check st-check-sm" class:checked={st.completed}
                      onclick={(e) => { e.stopPropagation(); const swas = st.completed; toggleSubtask(task.id, st.id); if (!swas) onCompleteSubtask(); }}
                    >{#if st.completed}<Check size={9} strokeWidth={1.5} />{/if}</button>
                    <span class="st-title">{st.title}</span>
                    <button class="st-del" aria-label="Remove" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id); }}><X size={10} strokeWidth={1.5} /></button>
                  </div>
                {/each}
                <div class="st-add">
                  <input type="text" class="st-input" placeholder="Add a step..." bind:value={subtaskInputs[task.id]} onkeydown={(e) => handleSubtaskKey(e, task.id)} />
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else if todayTasks.length === 0}
      <div class="empty-state">
        <div class="empty-icon"><CalendarCheck size={32} strokeWidth={1.5} /></div>
        <p class="empty-title">Nothing planned today</p>
        <p class="empty-sub">Tap "Add task" to get started</p>
      </div>
    {/if}

    {#if unscheduledTasks.length > 0}
      <div class="unscheduled">
        <div class="us-header">
          <Info size={13} strokeWidth={1.5} />
          <span>Unscheduled</span>
          <span class="us-count">{unscheduledTasks.length}</span>
        </div>
        {#each unscheduledTasks as task (task.id)}
          <div class="us-task"
            data-id={task.id}
            class:completed={task.completed}
            class:expanded={task.expanded}
            class:drag-over={usDragOverId === task.id}
            class:dragging={usDragId === task.id}
            style="touch-action:pan-y"
            transition:fly={{ y: 6, duration: 180, opacity: 0 }}
            onpointerdown={(e) => usPtrDown(e, task)}
            ontouchstart={(e) => touchStart(e, task.id)}
            ontouchmove={touchMove}
            ontouchend={(e) => touchEnd(e, task)}
          >
            <div class="us-main"
              role="button" tabindex="0"
              onclick={() => toggleExpand(task.id)}
              onkeydown={(e) => { if (e.key === "Enter") toggleExpand(task.id); }}
            >
              <button class="check" class:checked={task.completed}
                onclick={(e) => {
                  e.stopPropagation();
                  const was = task.completed;
                  toggleTask(task.id);
                  if (!was) { playComplete(); onCompleteTask(); }
                }}
              >{#if task.completed}<Check size={12} strokeWidth={1.5} />{/if}</button>
              {#if editTask === task.id}
                <div class="us-body">
                  <input type="text" class="edit-input" bind:value={editTitle} />
                  <div class="edit-time-row">
                    <input type="time" class="edit-time" bind:value={editStart} />
                    <span class="time-arrow">&rarr;</span>
                    <input type="time" class="edit-time" bind:value={editEnd} />
                  </div>
                  <div class="edit-energy-row">
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "low"} onclick={() => (editEnergy = editEnergy === "low" ? null : "low")}>Low</button>
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "medium"} onclick={() => (editEnergy = editEnergy === "medium" ? null : "medium")}>Med</button>
                    <button type="button" class="energy-btn sm" class:selected={editEnergy === "high"} onclick={() => (editEnergy = editEnergy === "high" ? null : "high")}>High</button>
                  </div>
                  <div class="edit-actions">
                    <button class="edit-save" onclick={(e) => { e.stopPropagation(); saveEdit(); }}>Save</button>
                    <button class="edit-cancel" onclick={(e) => { e.stopPropagation(); cancelEdit(); }}>Cancel</button>
                  </div>
                </div>
              {:else}
                <div class="us-body"
                  role="button" tabindex="-1"
                  ondblclick={(e) => { e.stopPropagation(); startEdit(task); }}
                >
                  <div class="us-title-row">
                    <span class="us-title">{task.title}</span>
                    {#if mvpIds.includes(task.id)}<span class="tl-mvp-badge">&#9733;</span>{/if}
                    {#if task.rolloverCount > 0}<span class="tl-rollover">{task.rolloverCount}x</span>{/if}
                  </div>
                  <div class="us-meta">
                    {#if task.estimatedMinutes}<span class="tl-dur">{task.estimatedMinutes}m</span>{/if}
                    {#if task.energy}<span class="tl-energy" class:en-low={task.energy === "low"} class:en-med={task.energy === "medium"} class:en-high={task.energy === "high"}>{task.energy}</span>{/if}
                    {#if task.repeat}<span class="tl-repeat">{task.repeat === "daily" ? "D" : task.repeat === "weekday" ? "W" : "7"}</span>{/if}
                  </div>
                </div>
                <button class="tl-action-btn tl-star-btn" class:starred={task.highlight} aria-label="Highlight" onclick={(e) => { e.stopPropagation(); setHighlight(task.id, todayStr); }}>
                  <Star size={11} strokeWidth={1.5} fill={task.highlight ? 'currentColor' : 'none'} />
                </button>
                <button class="tl-action-btn tl-mvp-action" class:mvp-on={mvpIds.includes(task.id)} aria-label="Must-do" onclick={(e) => { e.stopPropagation(); toggleMvp(task.id) }}>{mvpIds.includes(task.id) ? '\u2605' : '\u2606'}</button>
                <button class="tl-action-btn" aria-label="Focus" onclick={(e) => { e.stopPropagation(); onStartFocus?.(task.id); }}><Crosshair size={11} strokeWidth={1.5} /></button>
                <button class="tl-action-btn" aria-label="Save as template" onclick={(e) => { e.stopPropagation(); addTemplate({ title: task.title, items: task.subtasks.map(s => ({ title: s.title })) }); }}><Save size={11} strokeWidth={1.5} /></button>
                <button class="tl-action-btn tl-del-btn" aria-label="Delete" onclick={(e) => { e.stopPropagation(); removeTask(task.id); }}><X size={11} strokeWidth={1.5} /></button>
              {/if}
            </div>
            {#if task.expanded}
              <div class="subtask-list" transition:fly={{ y: 6, duration: 150, opacity: 0 }}>
                {#each task.subtasks as st}
                  <div class="st-item" class:st-done={st.completed}>
                    <button class="st-check st-check-sm" class:checked={st.completed}
                      onclick={(e) => { e.stopPropagation(); const swas = st.completed; toggleSubtask(task.id, st.id); if (!swas) onCompleteSubtask(); }}
                    >{#if st.completed}<Check size={9} strokeWidth={1.5} />{/if}</button>
                    <span class="st-title">{st.title}</span>
                    <button class="st-del" aria-label="Remove" onclick={(e) => { e.stopPropagation(); removeSubtask(task.id, st.id); }}><X size={10} strokeWidth={1.5} /></button>
                  </div>
                {/each}
                <div class="st-add">
                  <input type="text" class="st-input" placeholder="Add a step..." bind:value={subtaskInputs[task.id]} onkeydown={(e) => handleSubtaskKey(e, task.id)} />
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    {#if todayTasks.length > 0 && todayTip}
      <div class="today-tip">{todayTip}</div>
    {/if}
  </div>
</div>

<style>
  .view-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 22px 8px;
    flex-shrink: 0;
  }
  .tb-filters { display: flex; gap: 4px; flex: 1; }
  .tb-btn {
    padding: 6px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    background: transparent;
    transition: all 0.15s var(--ease);
    white-space: nowrap;
  }
  .tb-btn:hover { background: var(--surface-hover); color: var(--text); }
  .tb-btn.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
    border: 0.5px solid var(--border);
  }
  .tb-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .tb-plan-btn {
    display: flex; align-items: center; gap: 4px;
    padding: 6px 12px; border-radius: 8px;
    font-size: 12px; font-weight: 500;
    color: var(--accent); background: var(--accent-subtle);
    cursor: pointer; transition: all 0.15s var(--ease);
  }
  .tb-plan-btn:hover { filter: brightness(1.1); }
  .tb-search {
    width: 120px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 0.5px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 12px;
    transition: all 0.15s var(--ease);
  }
  .tb-search:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }

  .today-scroll {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .today-content {
    padding: 0 22px 24px;
  }

  /* ---- Metrics Bar ---- */
  .metrics-bar {
    margin: 4px 22px 12px;
    padding: 10px 16px 8px;
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border);
    flex-shrink: 0;
  }
  .metrics-track {
    height: 3px;
    background: var(--border-light);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .metrics-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.4s var(--ease);
  }
  .metrics-fill.warn { background: var(--warning); }
  .metrics-fill.over { background: var(--danger); }
  .metrics-items {
    display: flex;
    justify-content: space-between;
  }
  .metric { text-align: center; flex: 1; }
  .metric-value {
    display: block;
    font-size: 15px;
    font-weight: 650;
    color: var(--text);
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .metric-value.metric-done { color: var(--complete); }
  .metric-value.metric-warn { color: var(--danger); }
  .metric-label {
    display: block;
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-top: 1px;
  }
  .metric-score-val { color: var(--accent); }

  /* ---- Focus Card ---- */
  .focus-card {
    position: relative;
    margin: 0 22px 14px;
    padding: 20px 22px;
    background: var(--surface-raised);
    border-radius: var(--radius-xl);
    border: 0.5px solid var(--accent);
    overflow: hidden;
    flex-shrink: 0;
  }
  .fc-glow {
    position: absolute;
    top: -50%;
    right: -30%;
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.08) 0%, transparent 70%);
    pointer-events: none;
  }
  .fc-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .fc-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.15);
    animation: fcPulse 2s ease-in-out infinite;
  }
  .fc-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .fc-title {
    font-size: 22px;
    font-weight: 650;
    color: var(--text);
    letter-spacing: -0.4px;
    line-height: 1.25;
    margin-bottom: 12px;
  }
  .fc-progress {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .fc-progress-track {
    flex: 1;
    height: 4px;
    background: var(--border-light);
    border-radius: 2px;
    overflow: hidden;
  }
  .fc-progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 2px;
    transition: width 0.5s var(--ease);
  }
  .fc-progress-pct {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    font-variant-numeric: tabular-nums;
  }
  .fc-info {
    display: flex;
    gap: 16px;
    margin-bottom: 10px;
  }
  .fc-info-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .fc-next {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: var(--surface);
    border-radius: var(--radius-sm);
    margin-bottom: 14px;
  }
  .fc-next-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .fc-next-title {
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
  }
  .fc-actions {
    display: flex;
    gap: 8px;
  }
  .fc-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s var(--ease);
  }
  .fc-btn-complete { background: var(--accent); color: #fff; border: none; }
  .fc-btn-complete:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .fc-btn-focus { background: var(--bg); color: var(--text); border: 0.5px solid var(--border); }
  .fc-btn-focus:hover { background: var(--surface-hover); color: var(--accent); border-color: var(--accent-subtle); }

  /* ---- Status Bar ---- */
  .status-bar {
    margin: 0 22px 12px;
    padding: 10px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
    flex-shrink: 0;
  }
  .status-bar-content {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  .sb-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: var(--border);
    flex-shrink: 0;
  }
  .sb-dot.sb-dot-next { background: var(--accent); }
  .sb-dot.sb-done { background: var(--complete); }

  /* ---- Quick Add ---- */
  .quick-add-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 22px 10px;
    flex-shrink: 0;
  }
  .qa-add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 10px;
    background: var(--accent-subtle);
    color: var(--accent);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    border: 0.5px solid transparent;
    transition: all 0.15s var(--ease);
  }
  .qa-add-btn:hover { background: var(--accent); color: #fff; }
  .qa-stats { display: flex; align-items: center; gap: 8px; }
  .qa-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  /* ---- Task Form ---- */
  .task-form {
    margin: 0 22px 12px;
    padding: 16px 18px;
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border);
    flex-shrink: 0;
    overflow: hidden;
  }
  .tf-input {
    width: 100%;
    padding: 12px 14px;
    background: var(--bg);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    color: var(--text);
    font-size: 15px;
    margin-bottom: 12px;
    transition: border-color 0.15s var(--ease);
  }
  .tf-input:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .tf-input::placeholder { color: var(--text-muted); }
  .tf-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
  .tf-field { flex: 1; }
  .tf-label {
    display: block;
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 4px;
  }
  .tf-time {
    width: 100%;
    padding: 8px 10px;
    background: var(--bg);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    transition: border-color 0.15s var(--ease);
  }
  .tf-time:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .tf-arrow { color: var(--text-muted); font-size: 16px; margin-top: 14px; }
  .tf-hint { font-size: 11px; color: var(--text-muted); margin: -6px 0 10px; text-align: center; }
  .tf-chip {
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-secondary);
    background: var(--bg);
    border: 0.5px solid var(--border);
    cursor: pointer;
    transition: all 0.15s var(--ease);
  }
  .tf-chip:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .tf-chip.selected { background: var(--accent); color: #fff; border-color: transparent; }
  .tf-actions { display: flex; gap: 8px; margin-top: 4px; }
  .tf-btn {
    flex: 1;
    padding: 10px;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s var(--ease);
  }
  .tf-btn-cancel { background: var(--bg); border: 0.5px solid var(--border); color: var(--text-secondary); }
  .tf-btn-cancel:hover { background: var(--surface-hover); color: var(--text); }
  .tf-btn-save { background: var(--accent); color: #fff; border: none; }
  .tf-btn-save:hover { filter: brightness(1.1); }
  .tf-btn-save:disabled { opacity: 0.25; cursor: default; }

  /* ---- Yesterday Banner ---- */
  .yb-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    margin-bottom: 10px;
    border-radius: var(--radius-md);
    background: var(--accent-subtle);
    border: 0.5px solid var(--accent);
  }
  .yb-label { flex: 1; font-size: 13px; font-weight: 500; color: var(--accent); }
  .yb-btn {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    background: var(--accent);
    color: #fff;
    border: none;
    cursor: pointer;
    white-space: nowrap;
  }
  .yb-dismiss {
    width: 22px; height: 22px;
    border-radius: 50%;
    border: none;
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  /* ---- Empty State ---- */
  .empty-state {
    text-align: center;
    padding: 48px 24px;
  }
  .empty-icon {
    color: var(--text-muted);
    margin-bottom: 12px;
    opacity: 0.5;
  }
  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }
  .empty-sub {
    font-size: 13px;
    color: var(--text-muted);
  }

  /* ---- Timeline ---- */
  .timeline {
    position: relative;
    margin: 0 0 14px;
    border-radius: var(--radius-md);
    overflow: visible;
  }
  .tl-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .tl-hour {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 0.5px solid var(--border-light);
    height: 0;
  }
  .tl-label {
    position: absolute;
    left: 0;
    top: -8px;
    font-size: 10px;
    font-weight: 500;
    color: var(--text-muted);
    width: 40px;
    text-align: right;
    padding-right: 10px;
    font-variant-numeric: tabular-nums;
  }
  .tl-task {
    position: absolute;
    left: 48px;
    right: 0;
    background: var(--surface);
    border-radius: 10px;
    border: 0.5px solid var(--border);
    overflow: hidden;
    transition: height 0.25s var(--ease), opacity 0.25s var(--ease), box-shadow 0.2s var(--ease);
  }
  .tl-task:hover {
    background: var(--surface-hover);
    border-color: var(--accent-subtle);
    box-shadow: var(--shadow-sm);
  }
  .tl-task.t-current {
    background: rgba(var(--accent-rgb), 0.06);
    border-color: var(--accent);
    box-shadow: 0 0 0 0.5px var(--accent), var(--shadow-md);
  }
  .tl-task.completed { opacity: 0.3; }
  .tl-task.dragging { opacity: 0.6; z-index: 20; cursor: grabbing !important; }
  .tl-accent-bar {
    position: absolute;
    left: 0;
    top: 4px;
    bottom: 4px;
    width: 3px;
    background: var(--accent);
    border-radius: 2px;
    opacity: 0.6;
  }
  .tl-accent-bar.accent-current { opacity: 1; box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.4); }
  .tl-accent-bar.accent-done { background: var(--complete); }
  .tl-main {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 10px 8px 12px;
    cursor: pointer;
    min-height: 36px;
  }
  .tl-check {
    width: 20px; height: 20px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    margin-top: 2px;
    transition: all 0.25s var(--ease-spring);
    background: transparent;
    padding: 0;
  }
  .tl-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .tl-body { flex: 1; min-width: 0; }
  .tl-title-row { display: flex; align-items: center; gap: 4px; }
  .tl-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .tl-mvp-badge { color: var(--accent); font-size: 10px; flex-shrink: 0; }
  .tl-rollover {
    display: inline-flex; align-items: center;
    font-size: 9px; font-weight: 600;
    color: var(--warning);
    background: var(--warning-bg);
    border-radius: 3px;
    padding: 0 4px;
    line-height: 14px;
    flex-shrink: 0;
  }
  .tl-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 1px;
    flex-wrap: wrap;
  }
  .tl-time {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .tl-dur {
    font-size: 9px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-subtle);
    padding: 1px 5px;
    border-radius: 3px;
  }
  .tl-energy {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .tl-energy.en-low { background: rgba(160, 150, 220, 0.12); color: #9990c0; }
  .tl-energy.en-med { background: rgba(200, 170, 100, 0.12); color: #c0a870; }
  .tl-energy.en-high { background: rgba(140, 190, 120, 0.12); color: #90b080; }
  .tl-repeat {
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--accent-subtle);
    color: var(--accent);
  }
  .tl-actions {
    display: none;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  .tl-task:hover .tl-actions { display: flex; }
  .tl-action-btn {
    width: 24px; height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    padding: 0;
    border: none;
    transition: all 0.12s var(--ease);
    flex-shrink: 0;
  }
  .tl-action-btn:hover { background: var(--surface-hover); color: var(--text); }
  .tl-del-btn:hover { background: var(--danger-bg); color: var(--danger); }
  .tl-star-btn:hover { background: var(--warning-bg); color: var(--warning); }
  .tl-star-btn.starred { color: var(--warning); }
  .tl-mvp-action { font-size: 12px; }
  .tl-mvp-action:hover { background: var(--surface-hover); color: var(--accent); }
  .tl-mvp-action.mvp-on { color: var(--accent); }

  /* ---- Now Line ---- */
  .now-line {
    position: absolute;
    left: 48px;
    right: 0;
    height: 2px;
    background: var(--accent);
    z-index: 10;
    pointer-events: none;
    box-shadow: 0 0 6px rgba(var(--accent-rgb), 0.3);
  }
  .now-line-dot {
    position: absolute;
    left: -5px;
    top: -5px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.15), 0 0 12px rgba(var(--accent-rgb), 0.2);
  }

  /* ---- Unscheduled ---- */
  .unscheduled {
    border-top: 0.5px solid var(--border);
    padding-top: 12px;
    margin-top: 4px;
  }
  .us-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 8px;
    padding: 0 4px;
  }
  .us-count {
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
    background: var(--surface);
    padding: 0 6px;
    border-radius: 4px;
    line-height: 16px;
  }
  .us-task {
    background: var(--surface);
    border-radius: 10px;
    margin-bottom: 6px;
    border: 0.5px solid var(--border);
    transition: all 0.15s var(--ease);
    overflow: hidden;
  }
  .us-task:hover { background: var(--surface-hover); border-color: var(--accent-subtle); }
  .us-task.completed { opacity: 0.3; }
  .us-task.drag-over { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-subtle); }
  .us-task.dragging { opacity: 0.6; }
  .us-main {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
  }
  .us-body { flex: 1; min-width: 0; }
  .us-title-row { display: flex; align-items: center; gap: 4px; }
  .us-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
  }
  .us-meta { display: flex; align-items: center; gap: 4px; margin-top: 2px; flex-wrap: wrap; }

  /* ---- Subtask ---- */
  .subtask-list {
    border-top: 0.5px solid var(--border);
    padding: 6px 10px 8px 14px;
    overflow: hidden;
  }
  .st-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
  }
  .st-item.st-done { opacity: 0.4; }
  .st-check {
    width: 16px; height: 16px;
    border-radius: 50%;
    border: 1.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    background: transparent;
    padding: 0;
    transition: all 0.2s var(--ease);
  }
  .st-check.checked { background: var(--complete); border-color: var(--complete); color: #fff; }
  .st-title {
    font-size: 12px;
    color: var(--text-secondary);
    flex: 1;
    min-width: 0;
  }
  .st-done .st-title { text-decoration: line-through; color: var(--text-muted); }
  .st-del {
    width: 20px; height: 20px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    padding: 0;
    border: none;
    transition: all 0.12s var(--ease);
  }
  .st-del:hover { background: var(--danger-bg); color: var(--danger); }
  .st-add { padding: 4px 0 2px; }
  .st-input {
    width: 100%;
    padding: 7px 10px;
    background: var(--bg);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-size: 12px;
    transition: border-color 0.15s var(--ease);
  }
  .st-input::placeholder { color: var(--text-muted); }
  .st-input:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }

  /* ---- Edit Inline ---- */
  .edit-input {
    width: 100%;
    padding: 6px 10px;
    background: var(--bg);
    border: 1.5px solid var(--accent);
    border-radius: 8px;
    color: var(--text);
    font-size: 13px;
    margin-bottom: 6px;
  }
  .edit-time-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .edit-time {
    padding: 4px 8px;
    background: var(--bg);
    border: 0.5px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 11px;
    flex: 1;
    transition: border-color 0.15s var(--ease);
  }
  .edit-time:focus { border-color: var(--accent); box-shadow: var(--accent-ring); }
  .time-arrow { color: var(--text-muted); font-size: 14px; }
  .edit-energy-row { display: flex; gap: 4px; margin-bottom: 6px; }
  .edit-actions { display: flex; gap: 6px; }
  .edit-save {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    border: none;
  }
  .edit-cancel {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    background: var(--bg);
    color: var(--text-secondary);
    cursor: pointer;
    border: 0.5px solid var(--border);
  }
  .energy-btn { padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 500; color: var(--text-secondary); background: var(--bg); border: 0.5px solid var(--border); cursor: pointer; transition: all 0.15s var(--ease); }
  .energy-btn:hover { border-color: var(--accent-subtle); color: var(--accent); }
  .energy-btn.selected { background: var(--accent); color: #fff; border-color: transparent; }
  .energy-btn.sm { padding: 4px 10px; font-size: 10px; }

  /* ---- Today Tip ---- */
  .today-tip {
    margin: 8px 4px 4px;
    font-size: 11px;
    color: var(--text-muted);
    font-style: italic;
    text-align: center;
  }

  .mvp-btn { font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }

  @keyframes fcPulse {
    0%, 100% { box-shadow: 0 0 0 4px rgba(var(--accent-rgb), 0.15); }
    50% { box-shadow: 0 0 0 6px rgba(var(--accent-rgb), 0.08); }
  }

  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.4);
    opacity: 0.6;
  }
  :global(.tl-task.completed) .tl-title,
  :global(.us-task.completed) .us-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
</style>
