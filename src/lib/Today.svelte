<script>
  import { fly } from "svelte/transition";
  import { Plus, Check, X, Info, Crosshair, Save, Star, Sunrise } from 'lucide-svelte';
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
    HOUR_H = 76;
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
  let overbooked = $derived(totalEstimatedMinutes > shutdownMinutes);
  let bookRatio = $derived(
    Math.min(1, totalEstimatedMinutes / shutdownMinutes),
  );
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
    return Math.max(((eh * 60 + em - sh * 60 - sm) / 60) * HOUR_H, 42);
  }
  let nowLineTop = $derived(
    ((now.getHours() * 60 + now.getMinutes() - START_H * 60) / 60) * HOUR_H,
  );
  let title = $state(""),
    startTime = $state(""),
    endTime = $state(""),
    taskEnergy = $state(null),
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
  function handleSubmit() {
    if (!title.trim()) return;
    addTask(title.trim(), startTime, endTime, taskEnergy, taskRepeat);
    title = "";
    startTime = "";
    endTime = "";
    taskEnergy = null;
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
  <button
    class="view-btn"
    class:active={!nextAction}
    onclick={() => (nextAction = false)}>All</button
  ><button
    class="view-btn"
    class:active={nextAction}
    onclick={() => (nextAction = true)}>Next action</button
  ><button
    class="view-btn"
    class:active={hideCompleted}
    onclick={() => (hideCompleted = !hideCompleted)}>Hide done</button
  ><button
    class="view-btn"
    class:active={doableNow}
    onclick={() => (doableNow = !doableNow)}>Do-able</button
  ><button class="view-btn mvp-btn"
    class:active={mvpMode}
    onclick={() => (mvpMode = !mvpMode)} title="Show only your 3 must-do tasks">MVP</button
  ><button class="plan-day-btn" onclick={onPlanDay} title="Plan your day">
    <Sunrise size={14} strokeWidth={1.5} />Plan
  </button><input
    type="search"
    class="search-input"
    placeholder="Search..."
    bind:value={searchQuery}
  />
</div>
{#if todayTasks.length > 0}
  <div class="workload-bar" title={`${Math.round(bookRatio * 100)}% of available time`}>
    <div class="wl-row">
      <span class="wl-label">Workload</span>
      <span class="wl-value" class:wl-over={overbooked}>
        {totalEstimatedMinutes}m planned
        {#if shutdownTime}<span class="wl-muted"> of {shutdownMinutes}m available</span>{/if}
      </span>
    </div>
    <div class="wl-track">
      <div class="wl-fill" class:wl-warn={bookRatio > 0.8 && !overbooked} class:wl-over={overbooked} style="width: {Math.min(bookRatio * 100, 100)}%"></div>
    </div>
    {#if overbooked}
      <div class="wl-warning-text">Overcommitted by {Math.abs(shutdownMinutes - totalEstimatedMinutes)}m — consider moving tasks</div>
    {:else if bookRatio > 0.8}
      <div class="wl-caution-text">Filling up — {shutdownMinutes - totalEstimatedMinutes}m remaining</div>
    {/if}
  </div>
{/if}

<div class="highlight-section">
  {#if todayHighlight}
    <div class="highlight-card">
      <div class="highlight-star"><Star size={18} strokeWidth={1.5} fill="currentColor" /></div>
      <div class="highlight-body">
        <span class="highlight-label">Today's Highlight</span>
        <span class="highlight-title">{todayHighlight.title}</span>
      </div>
      <button
        class="highlight-unmark"
        onclick={() => setHighlight('', todayStr)}
        aria-label="Unmark highlight"
      ><X size={14} strokeWidth={1.5} /></button>
    </div>
  {:else if todayTasks.length > 0}
    <button class="highlight-pick" onclick={() => {}}>
      <Star size={14} strokeWidth={1.5} />
      Pick your main focus
    </button>
  {/if}
</div>

{#if nextAction && actionTask}<div class="next-action-card">
    <div class="na-label">Next action</div>
    <div class="na-title">{actionTask.title}</div>
    <div class="na-time">
      {actionTask.startTime
        ? `${timeDisplay(actionTask.startTime)} → ${timeDisplay(actionTask.endTime)}`
        : "Unscheduled"}
    </div>
    <button
      class="na-btn"
      onclick={() => {
        const nwas = actionTask.completed;
        toggleTask(actionTask.id);
        if (!nwas) { playComplete(); onCompleteTask(); }
      }}>{actionTask.completed ? "Undo" : "Complete"}</button
    >
  </div>{:else}<div class="status">
    {#if currentTask}<span class="status-dot live"></span><span
        >Now: <strong>{currentTask.title}</strong> · ends {timeDisplay(
          currentTask.endTime,
        )}</span
      >{:else if nextTask}<span class="status-dot"></span><span
        >Next: <strong>{nextTask.title}</strong> at {timeDisplay(
          nextTask.startTime,
        )}</span
      >{:else if todayTasks.filter((t) => t.completed).length > 0}<span
        class="status-dot done"
      ></span><span>All done for today</span>{:else}<span class="status-dot"
      ></span><span>No tasks yet</span>{/if}
  </div>
  {#if showForm}<form
      class="form"
      transition:fly={{ y: 8, duration: 200, opacity: 0 }}
      onsubmit={handleSubmit}
    >
      <input
        type="text"
        class="input title-input"
        placeholder="What do you want to do?"
        bind:value={title}
      />
      <div class="time-row">
        <div class="time-field">
          <label class="time-label" for="st">Start</label><input
            id="st"
            type="time"
            class="input"
            bind:value={startTime}
          />
        </div>
        <span class="time-arrow">→</span>
        <div class="time-field">
          <label class="time-label" for="et">End</label><input
            id="et"
            type="time"
            class="input"
            bind:value={endTime}
          />
        </div>
      </div>
      <p class="time-optional">Leave times blank for unscheduled</p>
      <div class="energy-row">
        <span class="energy-label">Energy</span><button
          type="button"
          class="energy-btn"
          class:selected={taskEnergy === "low"}
          onclick={() => (taskEnergy = taskEnergy === "low" ? null : "low")}
          >Low</button
        ><button
          type="button"
          class="energy-btn"
          class:selected={taskEnergy === "medium"}
          onclick={() =>
            (taskEnergy = taskEnergy === "medium" ? null : "medium")}
          >Med</button
        ><button
          type="button"
          class="energy-btn"
          class:selected={taskEnergy === "high"}
          onclick={() => (taskEnergy = taskEnergy === "high" ? null : "high")}
          >High</button
        >
      </div>
      <div class="repeat-row">
        <span class="energy-label">Repeat</span><button
          type="button"
          class="energy-btn"
          class:selected={taskRepeat === null}
          onclick={() => (taskRepeat = null)}>None</button
        ><button
          type="button"
          class="energy-btn"
          class:selected={taskRepeat === "daily"}
          onclick={() => (taskRepeat = "daily")}>Daily</button
        ><button
          type="button"
          class="energy-btn"
          class:selected={taskRepeat === "weekday"}
          onclick={() => (taskRepeat = "weekday")}>Weekdays</button
        ><button
          type="button"
          class="energy-btn"
          class:selected={taskRepeat === "weekly"}
          onclick={() => (taskRepeat = "weekly")}>Weekly</button
        >
      </div>
      <div class="form-actions">
        <button
          type="button"
          class="btn btn-cancel"
          onclick={() => (showForm = false)}>Cancel</button
        ><button type="submit" class="btn btn-save" disabled={!title.trim()}
          >Save</button
        >
      </div>
    </form>{:else}<button class="add-trigger" onclick={openForm}
      ><Plus size={18} strokeWidth={1.5} />Add task</button
    >{/if}
  <main class="task-list">
    {#if yesterdayUnfinished.length > 0}
      <div class="yesterday-banner" transition:fly={{ y: -6, duration: 200, opacity: 0 }}>
        <span class="yesterday-label">{yesterdayUnfinished.length} task{yesterdayUnfinished.length !== 1 ? 's' : ''}
          left from yesterday</span>
        <button class="yesterday-bring" onclick={() => {
          yesterdayUnfinished.forEach(t => updateTask(t.id, { date: todayStr }));
        }}>Bring to today</button>
        <button class="yesterday-dismiss" onclick={() => {
          yesterdayUnfinished.forEach(t => updateTask(t.id, { date: todayStr }));
        }}>✓</button>
      </div>
    {/if}
    {#if timedTasks.length > 0}<div
        class="timeline"
        style="height: {TOTAL_H}px"
      >
        <div class="timeline-bg">
          {#each HOURS as h}<div
              class="tl-hour"
              style="top: {(h - START_H) * HOUR_H}px"
            >
              <span class="tl-label">{h % 12 || 12}{h >= 12 ? "p" : "a"}</span>
            </div>{/each}
        </div>
        {#if nowLineTop >= 0 && nowLineTop <= TOTAL_H}<div
            class="now-line"
            style="top: {nowLineTop}px"
          ></div>{/if}{#each timedTasks as task (task.id)}<div
            class="tl-task"
            role="button"
            tabindex="-1"
            class:completed={task.completed}
            class:expanded={task.expanded}
            class:dragging={dragTask === task.id}
            style="top: {taskTop(task)}px; height: {taskHeight(
              task,
            )}px; touch-action:pan-y"
            transition:fly={{ y: 8, duration: 200, opacity: 0 }}
            onmousedown={(e) => {
              if (!task.unscheduled) dragStart(e, task);
            }}
            ontouchstart={(e) => touchStart(e, task.id)}
            ontouchmove={touchMove}
            ontouchend={(e) => touchEnd(e, task)}
          >
            <div
              class="tl-main"
              role="button"
              tabindex="0"
              onclick={() => toggleExpand(task.id)}
              onkeydown={(e) => {
                if (e.key === "Enter") toggleExpand(task.id);
              }}
            >
              <button
                class="tl-check"
                class:checked={task.completed}
                onclick={(e) => {
                  e.stopPropagation();
                  const was = task.completed;
                  toggleTask(task.id);
                  if (!was) {
                    playComplete();
                    onCompleteTask();
                  }
                }}
                >{#if task.completed}<Check size={12} strokeWidth={1.5} />{/if}</button
              >{#if editTask === task.id}<div class="tl-body">
                  <input
                    type="text"
                    class="edit-input"
                    bind:value={editTitle}
                  />
                  <div class="edit-time-row">
                    <input
                      type="time"
                      class="edit-time"
                      bind:value={editStart}
                    /><span class="time-arrow">→</span><input
                      type="time"
                      class="edit-time"
                      bind:value={editEnd}
                    />
                  </div>
                  <div class="edit-energy-row">
                    <button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "low"}
                      onclick={() =>
                        (editEnergy = editEnergy === "low" ? null : "low")}
                      >Low</button
                    ><button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "medium"}
                      onclick={() =>
                        (editEnergy =
                          editEnergy === "medium" ? null : "medium")}
                      >Med</button
                    ><button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "high"}
                      onclick={() =>
                        (editEnergy = editEnergy === "high" ? null : "high")}
                      >High</button
                    >
                  </div>
                  <div class="edit-actions">
                    <button
                      class="edit-save"
                      onclick={(e) => {
                        e.stopPropagation();
                        saveEdit();
                      }}>Save</button
                    ><button
                      class="edit-cancel"
                      onclick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}>Cancel</button
                    >
                  </div>
                </div>{:else}<div
                  class="tl-body"
                  role="button"
                  tabindex="-1"
                  ondblclick={(e) => {
                    e.stopPropagation();
                    startEdit(task);
                  }}
                >
                  <span class="tl-title">{task.title}{#if mvpIds.includes(task.id)}<span class="mvp-dot">★</span>{/if}</span>{#if task.rolloverCount > 0}<span class="rollover-badge"
                    >{task.rolloverCount}x</span
                  >{/if}<span class="tl-time"
                    >{timeDisplay(task.startTime)} → {timeDisplay(
                      task.endTime,
                    )}{#if task.estimatedMinutes}<span class="tl-est"
                        >{task.estimatedMinutes}m</span
                      >{/if}</span
                  >
                </div>
                {#if task.energy}<span
                    class="tl-energy"
                    class:en-low={task.energy === "low"}
                    class:en-med={task.energy === "medium"}
                    class:en-high={task.energy === "high"}>{task.energy}</span
                  >{/if}{#if task.repeat}<span class="tl-repeat"
                    >{task.repeat === "daily"
                      ? "D"
                      : task.repeat === "weekday"
                        ? "W"
                        : "7"}</span
                  >{/if}<button
                  class="tl-star"
                  class:highlighted={task.highlight}
                  aria-label="Mark as highlight"
                  onclick={(e) => {
                    e.stopPropagation();
                    setHighlight(task.id, todayStr);
                  }}
                  ><Star size={11} strokeWidth={1.5} fill={task.highlight ? 'currentColor' : 'none'} /></button
                ><button
                  class="tl-mvp"
                  class:mvp-on={mvpIds.includes(task.id)}
                  aria-label="Mark as must-do"
                  onclick={(e) => { e.stopPropagation(); toggleMvp(task.id) }}>{mvpIds.includes(task.id) ? '★' : '☆'}</button
                ><button class="tl-focus"
                  aria-label="Focus"
                  onclick={(e) => {
                    e.stopPropagation();
                    onStartFocus?.(task.id);
                  }}
                  ><Crosshair size={11} strokeWidth={1.5} /></button
                ><button
                  class="tl-save"
                  aria-label="Save as template"
                  onclick={(e) => {
                    e.stopPropagation();
                    addTemplate({ title: task.title, items: task.subtasks.map(s => ({ title: s.title })) });
                  }}
                  ><Save size={11} strokeWidth={1.5} /></button
                ><button
                  class="tl-tomorrow"
                  aria-label="Move to tomorrow"
                  title="Reschedule to tomorrow"
                  onclick={(e) => { e.stopPropagation(); moveToTomorrow(task); }}
                  ><Sunrise size={11} strokeWidth={1.5} /></button
                ><button
                  class="tl-del"
                  aria-label="Delete"
                  onclick={(e) => {
                    e.stopPropagation();
                    removeTask(task.id);
                  }}
                  ><X size={12} strokeWidth={1.5} /></button
                >{/if}
            </div>
            {#if task.expanded}<div
                class="subtask-list"
                transition:fly={{ y: 6, duration: 150, opacity: 0 }}
              >
                {#each task.subtasks as st}<div
                    class="subtask-item"
                    class:st-done={st.completed}
                  >
                    <button
                      class="st-check"
                      class:checked={st.completed}
                      onclick={(e) => {
                        e.stopPropagation();
                        const swas = st.completed;
                        toggleSubtask(task.id, st.id);
                        if (!swas) onCompleteSubtask();
                      }}
                      >{#if st.completed}<Check size={10} strokeWidth={1.5} />{/if}</button
                    ><span class="st-title">{st.title}</span><button
                      class="st-del"
                      aria-label="Remove"
                      onclick={(e) => {
                        e.stopPropagation();
                        removeSubtask(task.id, st.id);
                      }}
                      ><X size={10} strokeWidth={1.5} /></button
                    >
                  </div>{/each}
                <div class="st-add">
                  <input
                    type="text"
                    class="st-input"
                    placeholder="Add a step..."
                    bind:value={subtaskInputs[task.id]}
                    onkeydown={(e) => handleSubtaskKey(e, task.id)}
                  />
                </div>
              </div>{/if}
          </div>{/each}
      </div>{:else if todayTasks.length === 0}<div class="empty">
        <p>Nothing planned today</p>
        <p class="empty-sub">Tap "Add task" to get started</p>
      </div>{/if}{#if unscheduledTasks.length > 0}<div class="unscheduled">
        <div class="us-header">
          <Info size={14} strokeWidth={1.5} />Unscheduled
        </div>
        {#each unscheduledTasks as task (task.id)}<div
            class="us-task"
            role="button"
            tabindex="-1"
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
            <div
              class="us-main"
              role="button"
              tabindex="0"
              onclick={() => toggleExpand(task.id)}
              onkeydown={(e) => {
                if (e.key === "Enter") toggleExpand(task.id);
              }}
            >
              <button
                class="check"
                class:checked={task.completed}
                onclick={(e) => {
                  e.stopPropagation();
                  const was = task.completed;
                  toggleTask(task.id);
                  if (!was) {
                    playComplete();
                    onCompleteTask();
                  }
                }}
                >{#if task.completed}<Check size={12} strokeWidth={1.5} />{/if}</button
              >{#if editTask === task.id}<div class="us-body">
                  <input
                    type="text"
                    class="edit-input"
                    bind:value={editTitle}
                  />
                  <div class="edit-time-row">
                    <input
                      type="time"
                      class="edit-time"
                      bind:value={editStart}
                    /><span class="time-arrow">→</span><input
                      type="time"
                      class="edit-time"
                      bind:value={editEnd}
                    />
                  </div>
                  <div class="edit-energy-row">
                    <button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "low"}
                      onclick={() =>
                        (editEnergy = editEnergy === "low" ? null : "low")}
                      >Low</button
                    ><button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "medium"}
                      onclick={() =>
                        (editEnergy =
                          editEnergy === "medium" ? null : "medium")}
                      >Med</button
                    ><button
                      type="button"
                      class="energy-btn sm"
                      class:selected={editEnergy === "high"}
                      onclick={() =>
                        (editEnergy = editEnergy === "high" ? null : "high")}
                      >High</button
                    >
                  </div>
                  <div class="edit-actions">
                    <button
                      class="edit-save"
                      onclick={(e) => {
                        e.stopPropagation();
                        saveEdit();
                      }}>Save</button
                    ><button
                      class="edit-cancel"
                      onclick={(e) => {
                        e.stopPropagation();
                        cancelEdit();
                      }}>Cancel</button
                    >
                  </div>
                </div>{:else}<div
                  class="us-body"
                  role="button"
                  tabindex="-1"
                  ondblclick={(e) => {
                    e.stopPropagation();
                    startEdit(task);
                  }}
                >
                  <span class="us-title"
                    >{task.title}{#if mvpIds.includes(task.id)}<span class="mvp-dot">★</span>{/if}{#if task.estimatedMinutes}<span class="us-est"
                        >{task.estimatedMinutes}m</span
                      >{/if}{#if task.rolloverCount > 0}<span class="rollover-badge"
                        >{task.rolloverCount}x</span
                      >{/if}</span
                  >
                </div>
                {#if task.energy}<span
                    class="tl-energy"
                    class:en-low={task.energy === "low"}
                    class:en-med={task.energy === "medium"}
                    class:en-high={task.energy === "high"}>{task.energy}</span
                  >{/if}{#if task.repeat}<span class="tl-repeat"
                    >{task.repeat === "daily"
                      ? "D"
                      : task.repeat === "weekday"
                        ? "W"
                        : "7"}</span
                  >{/if}<button
                  class="us-star"
                  class:highlighted={task.highlight}
                  aria-label="Mark as highlight"
                  onclick={(e) => {
                    e.stopPropagation();
                    setHighlight(task.id, todayStr);
                  }}
                  ><Star size={11} strokeWidth={1.5} fill={task.highlight ? 'currentColor' : 'none'} /></button
                ><button
                  class="tl-mvp"
                  class:mvp-on={mvpIds.includes(task.id)}
                  aria-label="Mark as must-do"
                  onclick={(e) => { e.stopPropagation(); toggleMvp(task.id) }}>{mvpIds.includes(task.id) ? '★' : '☆'}</button
                ><button class="us-focus"
                  aria-label="Focus"
                  onclick={(e) => {
                    e.stopPropagation();
                    onStartFocus?.(task.id);
                  }}
                  ><Crosshair size={11} strokeWidth={1.5} /></button
                ><button
                  class="us-save"
                  aria-label="Save as template"
                  onclick={(e) => {
                    e.stopPropagation();
                    addTemplate({ title: task.title, items: task.subtasks.map(s => ({ title: s.title })) });
                  }}
                  ><Save size={11} strokeWidth={1.5} /></button
                ><button
                  class="delete"
                  aria-label="Delete"
                  onclick={(e) => {
                    e.stopPropagation();
                    removeTask(task.id);
                  }}
                  ><X size={12} strokeWidth={1.5} /></button
                >{/if}
            </div>
            {#if task.expanded}<div
                class="subtask-list"
                transition:fly={{ y: 6, duration: 150, opacity: 0 }}
              >
                {#each task.subtasks as st}<div
                    class="subtask-item"
                    class:st-done={st.completed}
                  >
                    <button
                      class="st-check"
                      class:checked={st.completed}
                      onclick={(e) => {
                        e.stopPropagation();
                        const swas = st.completed;
                        toggleSubtask(task.id, st.id);
                        if (!swas) onCompleteSubtask();
                      }}
                      >{#if st.completed}<Check size={10} strokeWidth={1.5} />{/if}</button
                    ><span class="st-title">{st.title}</span><button
                      class="st-del"
                      aria-label="Remove"
                      onclick={(e) => {
                        e.stopPropagation();
                        removeSubtask(task.id, st.id);
                      }}
                      ><X size={10} strokeWidth={1.5} /></button
                    >
                  </div>{/each}
                <div class="st-add">
                  <input
                    type="text"
                    class="st-input"
                    placeholder="Add a step..."
                    bind:value={subtaskInputs[task.id]}
                    onkeydown={(e) => handleSubtaskKey(e, task.id)}
                  />
                </div>
              </div>{/if}
          </div>{/each}
          </div>{/if}
  {#if todayTip}<div class="today-tip">{todayTip}</div>{/if}
  </main>{/if}

<style>
  .view-toolbar {
    display: flex;
    gap: 6px;
    padding: 12px 22px 12px;
    flex-shrink: 0;
  }
  .view-btn {
    padding: 8px 18px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    background: transparent;
    transition: all 0.2s var(--ease);
  }
  .view-btn:hover {
    background: var(--surface-hover);
    color: var(--text);
  }
  .view-btn.active {
    background: var(--surface);
    color: var(--text);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border);
  }
  .plan-day-btn { display: flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; color: var(--accent); background: var(--accent-subtle); cursor: pointer; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .plan-day-btn:hover { filter: brightness(1.1); }
  .search-input {
    flex: 1;
    min-width: 80px;
    padding: 7px 14px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
    transition: all 0.2s var(--ease);
  }
  .search-input:focus {
    border-color: var(--accent);
    box-shadow: var(--accent-ring);
  }
  .next-action-card {
    margin: 0 22px 16px;
    padding: 24px;
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    text-align: center;
    box-shadow: var(--shadow-md);
    flex-shrink: 0;
    animation: fadeIn 0.35s var(--ease-out);
  }
  .na-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 10px;
  }
  .na-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
    letter-spacing: -0.3px;
  }
  .na-time {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
  }
  .na-btn {
    padding: 12px 36px;
    border-radius: 50px;
    font-size: 15px;
    font-weight: 500;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    transition: all 0.2s var(--ease);
    border: none;
  }
  .na-btn:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
  }
  .na-btn:active {
    transform: scale(0.97);
  }
  .status {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 22px 12px;
    font-size: 14px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }
  .status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--border);
    flex-shrink: 0;
  }
  .status-dot.live {
    background: var(--accent);
    box-shadow: 0 0 0 5px var(--accent-subtle);
    animation: pulse 2s infinite;
  }
  .status-dot.done {
    background: var(--complete);
  }
  .form {
    padding: 0 22px 12px;
    flex-shrink: 0;
    overflow: hidden;
  }
  .title-input {
    font-size: 16px;
    margin-bottom: 12px;
  }
  .time-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .time-field {
    flex: 1;
  }
  .time-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }
  .time-arrow {
    color: var(--text-muted);
    font-size: 18px;
    margin-top: 16px;
  }
  .time-optional {
    font-size: 12px;
    color: var(--text-muted);
    margin: -4px 0 12px;
    text-align: center;
  }
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.4);
    opacity: 0.6;
  }
  .energy-row,
  .repeat-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }
  .energy-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-right: 6px;
  }
  .task-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 22px 22px;
    -webkit-overflow-scrolling: touch;
  }
  .yesterday-banner { display: flex; align-items: center; gap: 8px; padding: 10px 14px; margin-bottom: 10px; border-radius: var(--radius-md); background: var(--accent-subtle); border: 1px solid var(--accent); }
  .yesterday-label { flex: 1; font-size: 13px; font-weight: 500; color: var(--accent); }
  .yesterday-bring { padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: 600; background: var(--accent); color: #fff; border: none; cursor: pointer; white-space: nowrap; }
  .yesterday-dismiss { width: 24px; height: 24px; border-radius: 50%; border: none; background: transparent; color: var(--accent); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }
  .timeline {
    position: relative;
    margin: 0 0 16px;
    border-radius: var(--radius-md);
    overflow: visible;
  }
  .timeline-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .tl-hour {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 1px solid var(--border-light);
    height: 0;
  }
  .tl-label {
    position: absolute;
    left: 0;
    top: -8px;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    width: 44px;
    text-align: right;
    padding-right: 10px;
    font-variant-numeric: tabular-nums;
  }
    .tl-task {
      position: absolute;
      left: 52px;
      right: 2px;
      background: var(--surface);
      border-radius: 12px;
      border: 1px solid var(--border);
      transition:
        height 0.25s var(--ease),
        opacity 0.25s var(--ease);
      overflow: hidden;
    }
    .tl-task:hover {
      background: var(--surface-hover);
      border-color: var(--border);
    }
    .tl-task.completed {
      opacity: 0.35;
    }
    .tl-task::before {
      content: "";
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent);
      border-radius: 3px 0 0 3px;
    }
    .tl-task.completed::before {
      background: var(--complete);
    }
  .tl-main {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    cursor: pointer;
  }
  .tl-check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid var(--border);
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
  .tl-check.checked {
    background: var(--complete);
    border-color: var(--complete);
    color: #fff;
  }
  .tl-check:active {
    transform: scale(0.85);
  }
  .tl-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .tl-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    line-height: 1.35;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  :global(.tl-task.completed) .tl-title,
  :global(.us-task.completed) .us-title {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
  .rollover-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 600;
    color: var(--warning);
    background: rgba(200,170,100,0.15);
    border-radius: 4px;
    padding: 0 5px;
    margin-left: 4px;
    line-height: 16px;
    vertical-align: middle;
  }
  .tl-time {
    font-size: 11px;
    color: var(--text-muted);
    font-weight: 500;
  }
  .tl-energy {
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .tl-energy.en-low {
    background: rgba(160, 150, 220, 0.12);
    color: #9990c0;
  }
  .tl-energy.en-med {
    background: rgba(200, 170, 100, 0.12);
    color: #c0a870;
  }
  .tl-energy.en-high {
    background: rgba(140, 190, 120, 0.12);
    color: #90b080;
  }
  .tl-repeat {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--accent-subtle);
    color: var(--accent);
    flex-shrink: 0;
  }
  .tl-del, .tl-tomorrow {
    width: 26px;
    height: 26px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    flex-shrink: 0;
    background: transparent;
    padding: 0;
    transition: all 0.15s var(--ease);
  }
  .tl-del:hover {
    background: var(--danger-bg);
    color: var(--danger);
  }
  .tl-tomorrow:hover { background: var(--accent-subtle); color: var(--accent); }
  .tl-focus {
    width: 26px; height: 26px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); flex-shrink: 0;
    background: transparent; padding: 0;
    transition: all 0.15s var(--ease);
  }
  .tl-focus:hover {
    background: var(--accent-subtle);
    color: var(--accent);
  }
  .tl-save, .us-save {
    width: 26px; height: 26px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); flex-shrink: 0;
    background: transparent; padding: 0;
    transition: all 0.15s var(--ease);
  }
  .tl-save:hover, .us-save:hover {
    background: var(--complete-bg);
    color: var(--complete);
  }
  .now-line {
    position: absolute;
    left: 52px;
    right: 0;
    height: 2px;
    background: var(--accent);
    z-index: 10;
    pointer-events: none;
  }
  .now-line::before {
    content: "";
    position: absolute;
    left: -6px;
    top: -5px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 5px var(--accent-subtle);
  }
  .unscheduled {
    border-top: 1px solid var(--border);
    padding-top: 14px;
    margin-top: 6px;
  }
  .us-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    padding: 0 4px;
  }
  .us-task {
    background: var(--surface);
    border-radius: 12px;
    margin-bottom: 8px;
    border: 1px solid var(--border);
    transition: all 0.15s var(--ease);
    overflow: hidden;
  }
  .us-task:hover {
    background: var(--surface-hover);
  }
  .us-task.completed {
    opacity: 0.35;
  }
  .us-main {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    cursor: pointer;
  }
  .us-body {
    flex: 1;
    min-width: 0;
  }
  .us-title {
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
  }
  .subtask-list {
    border-top: 1px solid var(--border);
    padding: 8px 12px 10px 18px;
    overflow: hidden;
  }
  .subtask-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 0;
  }
  .subtask-item.st-done {
    opacity: 0.45;
  }
  .st-check {
    width: 18px;
    height: 18px;
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
  .st-check.checked {
    background: var(--complete);
    border-color: var(--complete);
    color: #fff;
  }
  .st-title {
    font-size: 13px;
    color: var(--text-secondary);
    flex: 1;
    min-width: 0;
  }
  :global(.subtask-item.st-done) .st-title {
    text-decoration: line-through;
    color: var(--text-muted);
  }
  .st-del {
    width: 22px;
    height: 22px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    background: transparent;
    padding: 0;
    transition: all 0.15s var(--ease);
  }
  .st-del:hover {
    background: var(--danger-bg);
    color: var(--danger);
  }
  .st-add {
    padding: 6px 0 2px;
  }
  .st-input {
    width: 100%;
    padding: 9px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 13px;
    transition: border-color 0.15s var(--ease);
  }
  .st-input::placeholder {
    color: var(--text-muted);
  }
  .st-input:focus {
    border-color: var(--accent);
    box-shadow: var(--accent-ring);
  }
  .edit-input {
    width: 100%;
    padding: 7px 10px;
    background: var(--bg);
    border: 1.5px solid var(--accent);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 14px;
    margin-bottom: 6px;
  }
  .edit-time-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }
  .edit-time {
    padding: 5px 8px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text);
    font-size: 12px;
    flex: 1;
  }
  .edit-time:focus {
    border-color: var(--accent);
    box-shadow: var(--accent-ring);
  }
  .edit-energy-row {
    display: flex;
    gap: 6px;
    margin-bottom: 6px;
  }
  .edit-actions {
    display: flex;
    gap: 6px;
  }
  .edit-save {
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: var(--accent);
    color: #fff;
    cursor: pointer;
    border: none;
  }
  .edit-cancel {
    padding: 5px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    background: var(--surface);
    color: var(--text-secondary);
    cursor: pointer;
    border: 1px solid var(--border);
  }
  .dragging {
    opacity: 0.6;
    z-index: 20;
    cursor: grabbing !important;
  }
  .tl-est,
  .us-est {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-subtle);
    padding: 1px 6px;
    border-radius: 4px;
    margin-left: 6px;
  }
  .us-task.drag-over {
    border-color: var(--accent);
    box-shadow: 0 0 0 2px var(--accent-subtle);
  }
  .us-focus {
    width: 26px; height: 26px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); flex-shrink: 0;
    background: transparent; padding: 0;
    transition: all 0.15s var(--ease);
  }
  .us-focus:hover {
    background: var(--accent-subtle);
    color: var(--accent);
  }
  .highlight-section {
    padding: 0 22px 12px;
    flex-shrink: 0;
  }
  .highlight-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: linear-gradient(135deg, rgba(255, 200, 50, 0.12), rgba(255, 160, 50, 0.08));
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 200, 50, 0.2);
    box-shadow: var(--shadow-md);
  }
  .highlight-star {
    color: #f0b429;
    flex-shrink: 0;
    display: flex;
  }
  .highlight-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .highlight-label {
    font-size: 10px;
    font-weight: 700;
    color: #c8941e;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .highlight-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
  }
  .highlight-unmark {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-muted);
    background: var(--surface);
    border: none;
    flex-shrink: 0;
    transition: all 0.15s var(--ease);
  }
  .highlight-unmark:hover {
    background: var(--danger-bg);
    color: var(--danger);
  }
  .highlight-pick {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    width: 100%;
    border-radius: var(--radius-md);
    border: 1px dashed var(--border);
    background: transparent;
    color: var(--text-muted);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s var(--ease);
  }
  .highlight-pick:hover {
    border-color: var(--accent-subtle);
    color: var(--accent);
    background: var(--accent-subtle);
  }
  .workload-bar {
    margin: 0 22px 12px;
    padding: 12px 16px;
    background: var(--surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }
  .wl-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .wl-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.8px; }
  .wl-value { font-size: 12px; color: var(--text-secondary); }
  .wl-value.wl-over { color: var(--danger); font-weight: 600; }
  .wl-muted { color: var(--text-muted); }
  .wl-track { height: 6px; background: var(--border-light); border-radius: 3px; overflow: hidden; }
  .wl-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s var(--ease); }
  .wl-fill.wl-warn { background: var(--warning); }
  .wl-fill.wl-over { background: var(--danger); }
  .wl-warning-text { font-size: 11px; color: var(--danger); margin-top: 6px; }
  .wl-caution-text { font-size: 11px; color: var(--warning); margin-top: 6px; }
  .today-tip { margin: 8px 22px 4px; font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; }
  .tl-star, .us-star {
    width: 26px; height: 26px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--text-muted); flex-shrink: 0;
    background: transparent; padding: 0;
    transition: all 0.15s var(--ease);
  }
  .tl-mvp { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-muted); background: transparent; border: none; padding: 0; font-size: 13px; transition: all 0.15s var(--ease); flex-shrink: 0; }
  .tl-mvp:hover { background: var(--surface-hover); color: var(--accent); }
  .tl-mvp.mvp-on { color: var(--accent); }
  .mvp-btn { font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
  .mvp-dot { color: var(--accent); margin-left: 3px; font-size: 10px; }
  .tl-star:hover, .us-star:hover {
    background: var(--warning-bg);
    color: var(--warning);
  }
  .tl-star.highlighted, .us-star.highlighted {
    color: #f0b429;
  }
</style>
