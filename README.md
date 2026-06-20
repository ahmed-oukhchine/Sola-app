# Sola

A personal focus and task management app — runs entirely offline. localStorage for storage, local account system, no backend, no servers, no tracking.

## Pages

### Dashboard
The home screen. Displays customizable widgets:
- **Stats** — points, streak, today's progress, completion rate, and **Momentum** score (0–100 based on completion, priority work, and recovery from bad days)
- **Current Task** — shows the active timed task if one is running now
- **Quick Add** — add a task without leaving the dashboard
- **Navigation** — shortcuts to Today, Inbox, Focus, and Stats
- **Recent** — last 5 completed tasks
- **Upcoming** — next 4 scheduled tasks for today

Widgets can be reordered by dragging and toggled on/off via the settings icon.

### Today
The daily task timeline. Shows all tasks scheduled for today in two sections:
- **Timed** — tasks with start/end times, sorted chronologically
- **Unscheduled** — tasks with no time assigned

Features:
- Filter: All / Next Action / Hide Done
- Plan Day button — opens the Daily Planning ritual
- Search within today's tasks
- Overcommitment warning bar — compares total estimated time against available time until shutdown
- Drag to reorder tasks
- Inline subtasks, tag assignment, time estimates
- Quick-add new tasks directly

### Inbox
A capture bucket for uncategorized thoughts. Items can be:
- Deleted
- Moved directly to Today
- Used as a brain dump area

### Focus
A full-screen timer with ambient starfield background:
- **Preset durations**: 5, 15, 25, 45 minutes
- **Ambient sounds**: Rain, Waves, Forest, White Noise (synthesized via Web Audio API, no audio files needed)
- **Pomodoro mode**: structured 25min focus / 5min break cycles (15min after 4 cycles)
- **Body Double**: a gentle companion that cycles through encouraging messages every 8s
- **Linked task**: assign a specific task to focus on via the Today view
- **Starfield**: when the timer runs, 80 stars drift very slowly (28–50s cycles) with subtle twinkling — static when idle
- Timer completion plays a chime, logs the session, and (on mobile) vibrates

### Calendar
A monthly calendar view showing task density. Features:
- Month/year navigation with a year-dot heatmap overview
- Days highlighted based on task count
- Click a day to view/edit that day's tasks
- Quick-add tasks directly on any day
- Drag tasks to reorder within a day
- Swipe gesture support for mobile

### Goals
Track objectives with linked tasks:
- **Weekly objectives** — prominently displayed at top with progress bars
- Create goals with optional target counts and descriptions
- Link tasks from any view to a goal
- Shows how many linked tasks are completed vs total
- Filter by period (weekly, monthly, yearly)

### Routines
Morning and evening checklists:
- Create routines categorized as Morning or Evening
- Each routine contains a list of items that reset daily
- Check off items as you complete them

### Kanban
A simple two-column board (To Do / Done):
- All uncompleted tasks in one column, completed in another
- Move tasks between columns with one click
- Quick-add tasks directly

### Habit Tracker
Track daily habits with streaks and timing:
- Add habits with a target day streak (default 41 days)
- Daily check-in with streak counter
- Per-habit timer to log how many minutes you spent
- Weekly minute totals
- Heatmap-style weekly view per habit
- Completion detection (streak ≥ target days)

### Templates
Save and reuse task structures:
- Create templates from scratch
- Apply a template to instantly create a new task with subtasks
- Delete templates you no longer need

### Someday
A parking lot for ideas and tasks with no date:
- Capture things you might do in the future
- Move items to Today when you're ready
- Clean separation from active tasks

### Life Courses
A personal journal for lessons learned:
- Write down insights, realizations, and wisdom
- Serves as a personal knowledge base
- Items are listed reverse-chronologically

### Tags
Create and manage colored tags:
- 8 preset colors to choose from
- Assign tags to tasks for categorization
- Tag color picker with visual preview

### Stats
Detailed progress tracking:
- **Level system** — gain XP from completing tasks (10pts per task, 3pts per subtask), level up every 100 XP
- **Current level** with XP progress bar and badge title
- **Streak** — consecutive days with at least one completed task
- **This week** — total focus minutes, pomodoro count, session count
- **Weekly focus heatmap** — bar chart of minutes per day
- **Focus history** — 30-day completion heatmap

### Settings
Application configuration:
- **Theme** — cycle through System / Light / Dark
- **Accent color** — pick any custom hex color
- **Auto theme** — set a time for automatic day/night switch
- **Password** — create or change your local account password
- **Desktop notifications** — toggle task and timer notifications
- **Language** — interface language selection
- **Export / Import** — full data backup as JSON
- **Clear all data** — factory reset
- **Sign out** — remove account credentials

## Rituals (Overlays)

### Daily Planning (Morning)
A guided 4-step morning ritual:
1. **Set intention** — shows rolled-over tasks, streak, asks for today's priority, sets shutdown time
2. **Pull tasks** — select from unscheduled tasks, inbox, and someday, with time estimates and adaptive load hint
3. **Balance** — review your load, move non-urgent tasks to tomorrow
4. **Journal** — note any obstacles or thoughts before starting

Auto-shows before 12 PM if not yet completed.

### Shutdown Ritual (Evening)
A 2-step end-of-day review:
1. **Review** — completed tasks list, time breakdown by tag, focus session minutes
2. **Reflect** — write a note, then close the day

After completion, a "Done" badge appears in the header signaling the day is finished. Auto-shows after 6 PM if not yet completed.

### Weekly Review (Sunday)
A generated paragraph summarizing the week: tasks completed, best day, focus hours, streak, rollover warnings, momentum assessment. Appears automatically on Sundays.

### Weekly Letter
On Sunday, Sola generates a plain-text weekly letter with personalized insights.

### Dopamine Menu
A menu of quick 1–3 minute micro-activities (stretch, dance, breathe, hydrate, gratitude, rest eyes, sunlight, reset focus) with an in-app countdown timer. Accessible via the sparkle icon in the header.

### Search (Ctrl+K)
Fuzzy search across all tasks, inbox items, someday items, notes, goals, and habits. Navigate results with arrow keys and Enter.

### Lock Screen
After 5 minutes of inactivity (with an account set up), Sola locks with a password prompt. Password is SHA-256 hashed client-side. Resets on any mouse/keyboard/touch activity after unlock.

## Features

- **Rollover** — incomplete tasks auto-move to today on app start, with a rollover counter
- **Momentum Score** — 0–100 daily score combining completion rate, priority work, and recovery after bad days
- **Adaptive Load Suggestion** — during morning planning, shows your typical completion rate vs planned count
- **Overcommitment Detection** — real-time warning when planned time exceeds available time
- **Shutdown Signal** — "Done" badge in header after evening ritual, auto-resets at midnight
- **Points & Streaks** — 10pts per task, 3pts per subtask; streak tracks consecutive active days
- **Body Double** — virtual focus companion with cycling encouragement
- **Natural Language Date Parsing** — type "tomorrow at 3pm" when adding tasks
- **Onboarding** — first-launch flow with accent color picker and account creation
- **Android APK** — built with Capacitor, fully offline as a native app

## Install & Run

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+) and npm.

```bash
git clone https://github.com/ahmed-oukhchine/Sola-app.git
cd Sola-app
npm install
npm run dev
```

Dev server starts at `http://localhost:5173` by default.

## Build APK (Android)

**Prerequisites:** Android SDK and a Java JDK (17–21 recommended).

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init Sola com.yourname.solaapp
npx cap add android
npm run build
npx cap copy
npx cap open android
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

## Tech Stack

- **Svelte 5** — Runes-based reactivity ($state, $derived, $effect)
- **Vite** — Build tool
- **Capacitor** — Android wrapper
- **localStorage** — All data persistence (no IndexedDB)
- **Web Audio API** — Synthesized ambient sounds (no audio files)
- **Crypto Subtle** — SHA-256 password hashing
- **Chrono-node** — Natural language date parsing
- **Lucide Svelte** — Icon library
- **PWA** — Service worker with Workbox for offline support
