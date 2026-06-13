# Sola

A personal focus and task management app — runs entirely offline. IndexedDB for storage, local account system, no backend, no servers, no tracking.

## Features

- **Daily timeline** — schedule tasks with time blocks, drag to reorder
- **Focus timer** — countdown with ambient sounds (Rain, Waves, Forest, White Noise)
- **Local account** — create a username + password, stored securely with SHA-256
- **Desktop notifications** — get notified when tasks start and focus sessions end
- **Onboarding** — pick your accent color on first launch
- **Fuzzy search** — Ctrl+K to quickly find any task
- **Pomodoro mode** — structured work/break cycles
- **100% offline** — everything stays on your device

## Install & Run

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+) and npm.

```bash
# 1. Clone
git clone https://github.com/ahmed-oukhchine/Sola-app.git
cd Sola-app

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

The dev server starts at `http://localhost:5173` by default.

### Per-OS shortcuts

| OS      | Command              |
|---------|----------------------|
| Linux   | `./run.sh`           |
| macOS   | `./run.sh`           |
| Windows | `run.bat` or `npm run dev` |

## Build APK (Android)

**Prerequisites:** [Android SDK](https://developer.android.com/studio/) and a Java JDK (17 recommended) installed.

```bash
# 1. Install Capacitor
npm install @capacitor/core @capacitor/cli @capacitor/android

# 2. Initialize (run once)
npx cap init Sola com.yourname.solaapp

# 3. Add Android platform
npx cap add android

# 4. Build the web app and sync
npm run build
npx cap copy

# 5. Open in Android Studio
npx cap open android
```

In Android Studio:
- **Build → Build Bundle(s) / APK(s) → Build APK(s)**
- APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

For a signed release APK, use **Build → Generate Signed Bundle / APK**.
