# Sola

A personal focus and task management app — runs entirely in the browser with IndexedDB for storage. No backend, no database setup, no env vars.

## Install & Run

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+) and npm.

```bash
# 1. Clone
git clone https://github.com/ahmed-oukhchine/Personnel-Focus-App.git
cd Personnel-Focus-App

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

### Per-OS shortcuts

| OS      | Command              |
|---------|----------------------|
| Linux   | `./run.sh`           |
| macOS   | `./run.sh`           |
| Windows | `run.bat` or `npm run dev` |

The dev server starts at `http://localhost:5173` by default.

## Build APK (Android)

**Prerequisites:** [Android SDK](https://developer.android.com/studio) installed.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init FocusApp com.yourname.focusapp
npx cap add android
npm run build
npx cap copy
npx cap open android
```

Android Studio will open. Then **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

APK location: `android/app/build/outputs/apk/debug/app-debug.apk`
