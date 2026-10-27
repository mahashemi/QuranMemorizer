import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'android/app/src/main/AndroidManifest.xml');
if (!existsSync(manifestPath)) throw new Error('Android manifest not found. Run npx cap add android first.');

let manifest = readFileSync(manifestPath, 'utf8');
for (const permission of ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.WAKE_LOCK']) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(
      /(<manifest\b[^>]*>)/,
      '$1\n    <uses-permission android:name="' + permission + '" />'
    );
  }
}
writeFileSync(manifestPath, manifest);

const javaRoot = resolve(root, 'android/app/src/main/java');
function findMainActivity(dir) {
  if (!existsSync(dir)) return null;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(fullPath);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') {
      return fullPath;
    }
  }
  return null;
}
const existingActivity = findMainActivity(javaRoot);
if (!existingActivity) throw new Error('Could not find Capacitor MainActivity source.');
const packageName = existingActivity.endsWith('.java')
  ? (readFileSync(existingActivity, 'utf8').match(/^package\s+([\w.]+);/m) || [])[1]
  : (readFileSync(existingActivity, 'utf8').match(/^package\s+([\w.]+)/m) || [])[1];
const resolvedPackageName = packageName || 'org.quranmemorizer.app';
const activityDir = dirname(existingActivity);
const javaPath = join(activityDir, 'MainActivity.java');
const kotlinPath = join(activityDir, 'MainActivity.kt');

const javaSource = `package ${resolvedPackageName};

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

/** Requests Android microphone permission before allowing WebView audio capture. */
public class MainActivity extends BridgeActivity {
    private static final int REQUEST_MICROPHONE = 7412;
    private static final String MIC_TAG = "QuranMemorizerMic";
    private PermissionRequest pendingAudioRequest;
    private PowerManager.WakeLock playbackWakeLock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().setWebChromeClient(new RecordingWebChromeClient(bridge));
            bridge.getWebView().addJavascriptInterface(new PlaybackControl(), "QuranMemorizerNative");
        }
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            playbackWakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":QuranPlayback"
            );
            playbackWakeLock.setReferenceCounted(false);
        }
    }

    private final class PlaybackControl {
        @JavascriptInterface
        public void setPlaybackActive(boolean active) {
            runOnUiThread(() -> {
                if (playbackWakeLock == null) return;
                if (active) {
                    if (!playbackWakeLock.isHeld()) playbackWakeLock.acquire();
                } else if (playbackWakeLock.isHeld()) {
                    playbackWakeLock.release();
                }
            });
        }
    }

    @Override
    protected void onDestroy() {
        if (playbackWakeLock != null && playbackWakeLock.isHeld()) {
            playbackWakeLock.release();
        }
        super.onDestroy();
    }

    private final class RecordingWebChromeClient extends BridgeWebChromeClient {
        RecordingWebChromeClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            Log.i(MIC_TAG, "WebView permission request: origin=" + request.getOrigin() + ", resources=" + java.util.Arrays.toString(request.getResources()));
            boolean asksForAudio = false;
            for (String resource : request.getResources()) {
                if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) asksForAudio = true;
            }
            if (!asksForAudio) {
                Log.w(MIC_TAG, "Denying WebView request without audio capture resource");
                request.deny();
                return;
            }
            if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                    == PackageManager.PERMISSION_GRANTED) {
                Log.i(MIC_TAG, "Android RECORD_AUDIO permission already granted; granting WebView audio capture");
                request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
                return;
            }
            runOnUiThread(() -> {
                pendingAudioRequest = request;
                Log.i(MIC_TAG, "Requesting Android RECORD_AUDIO runtime permission");
                ActivityCompat.requestPermissions(
                    MainActivity.this,
                    new String[] { Manifest.permission.RECORD_AUDIO },
                    REQUEST_MICROPHONE
                );
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQUEST_MICROPHONE || pendingAudioRequest == null) return;
        Log.i(MIC_TAG, "Android microphone permission result: " + (grantResults.length > 0 ? grantResults[0] : "empty"));
        PermissionRequest request = pendingAudioRequest;
        pendingAudioRequest = null;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
        } else {
            request.deny();
        }
    }
}
`;
if (existsSync(kotlinPath)) unlinkSync(kotlinPath);
writeFileSync(javaPath, javaSource);
console.log('Prepared Android microphone/audio-settings permissions, runtime WebView capture grants, and playback wake lock.');
