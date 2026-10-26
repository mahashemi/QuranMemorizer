# Android build (Capacitor)

QuranMemorizer is a static web app packaged for Android with Capacitor. The same web UI is used in the browser and in the Android app, but voice recordings use the appropriate local-storage adapter for each environment.

## Requirements

- Node.js 22 or newer
- Android Studio and an Android SDK
- A physical Android device for microphone-recording tests (emulator microphone support can be limited)

## First-time setup

Run these commands from the repository root:

```bash
npm install
npm run cap:add:android
npm run assets:android
npm run cap:sync
npm run cap:open
```

In Android Studio, wait for Gradle sync, then run the app on a device or emulator.

## Voice recordings and storage

Recordings are never uploaded and do not require a cloud account.

- **Android app:** recordings are ordinary audio files in the app's private files directory. They are organized by surah and ayah, and the app creates folders automatically. No recordings-folder picker is needed. App-private files are not normally visible to other apps and can be removed if the app is uninstalled, so use the app's ZIP export to make a portable backup.
- **Compatible desktop browsers:** choose a parent folder in Settings. QuranMemorizer creates `QuranMemorizer/recordings/` beneath it, with one audio file per ayah and a `manifest.json`. Grant the same folder to another compatible browser to read those recordings there.
- **Browsers without direct folder access:** voice recordings remain in browser-local storage. This fallback is isolated to that browser/profile and is not automatically shared with other browsers.
- **Portable transfer:** use **Export recordings as ZIP** and **Import recordings from ZIP** in Settings to back up or move recordings without cloud sync. Import asks before replacing matching ayahs.

Folder access is supported only where the browser implements the File System Access API. The browser may ask you to reconnect a previously selected folder when permission expires. Never assume a folder permission has persisted until the app reports it as connected.

The recorder uses `getUserMedia()` and `MediaRecorder`. Recording requires a secure context and microphone permission. The app also needs the Android manifest permission and WebView microphone permission handling described below.

After `npm run cap:add:android`, ensure this permission is inside the top-level `<manifest>` element in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Run `npm run cap:sync` and test on a real Android device. The Android WebView must request/receive microphone permission at runtime as well. If the prompt does not appear on your device, add a small native Capacitor permission bridge instead of silently assuming permission was granted.

## Subsequent builds

```bash
npm run cap:sync
npm run cap:open
```

The build script copies only `index.html`, `static/`, and the app data directories to `www/`, then bundles the Capacitor Filesystem adapter for native builds. It deliberately does not bundle `data/audio/minshawi_murattal/`, because those files are git-ignored and must be distributed only if their licensing permits it.

## App icon

`assets/icon.svg` is the editable source artwork: a deep emerald background, gold arch and crescent, and an open book. `npm run assets:android` generates Android launcher assets from it. If the asset generator requires raster input in your installed version, export the SVG to a square PNG at 1024×1024 and use that as the source.

## Validation

Run the automated JavaScript and ZIP archive tests with:

```bash
npm test
npm run build
```

The automated checks do not replace hands-on microphone testing. Before release, verify record/stop/replay/re-record/delete, folder permissions, and ZIP export/import on a supported desktop browser and on a real Android device.
