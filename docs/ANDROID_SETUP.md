# Android build (Capacitor)

QuranMemorizer remains a static web app. Capacitor packages the same files in an Android WebView; the web app is copied into `www/` during the build.

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

## Microphone permission

The per-ayah voice recorder uses `getUserMedia()` and `MediaRecorder`, and stores recordings in IndexedDB on the device. Recordings are not uploaded.

After `npm run cap:add:android`, add this permission inside the top-level `<manifest>` element in `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

Then run `npm run cap:sync` and test on a real Android device. The app must request/receive microphone permission at runtime as well; if the WebView does not surface the permission prompt on your device, we should add a small native Capacitor permission bridge rather than silently assuming permission was granted.

## Subsequent builds

```bash
npm run cap:sync
npm run cap:open
```

The build script copies only `index.html`, `static/`, and `data/quran/` to `www/`. It deliberately does not bundle `data/audio/minshawi_murattal/`, because those files are git-ignored and must be distributed only if their licensing permits it.

## App icon

`assets/icon.svg` is the editable source artwork: a deep emerald background, gold arch and crescent, and an open book. `npm run assets:android` generates Android launcher assets from it. If the asset generator requires raster input in your installed version, export the SVG to a square PNG at 1024×1024 and use that as the source.
