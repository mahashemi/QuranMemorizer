import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'android/app/src/main/AndroidManifest.xml');
if (!existsSync(manifestPath)) throw new Error('Android manifest not found. Run npx cap add android first.');

let manifest = readFileSync(manifestPath, 'utf8');
for (const permission of ['android.permission.RECORD_AUDIO', 'android.permission.MODIFY_AUDIO_SETTINGS', 'android.permission.WAKE_LOCK', 'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK']) {
  if (!manifest.includes(permission)) {
    manifest = manifest.replace(
      /(<manifest\b[^>]*>)/,
      '$1\n    <uses-permission android:name="' + permission + '" />'
    );
  }
}
if (!manifest.includes('QuranPlaybackService')) {
  manifest = manifest.replace(
    /<application\b([^>]*)>/,
    '<application$1>\n        <service android:name=".QuranPlaybackService" android:exported="false" android:foregroundServiceType="mediaPlayback" />'
  );
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
import android.content.Intent;
import android.os.Build;
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
    private static volatile MainActivity currentActivity;


    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        currentActivity = this;
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

        @JavascriptInterface
        public void updateMediaMetadata(String title, String artist, boolean playing) {
            Intent intent = new Intent(MainActivity.this, QuranPlaybackService.class)
                .setAction(QuranPlaybackService.ACTION_UPDATE)
                .putExtra(QuranPlaybackService.EXTRA_TITLE, title)
                .putExtra(QuranPlaybackService.EXTRA_ARTIST, artist)
                .putExtra(QuranPlaybackService.EXTRA_PLAYING, playing);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent);
            } else {
                startService(intent);
            }
        }

        @JavascriptInterface
        public void stopMediaSession() {
            startService(new Intent(MainActivity.this, QuranPlaybackService.class)
                .setAction(QuranPlaybackService.ACTION_STOP));
        }
    }

    static void dispatchMediaAction(String action) {
        MainActivity activity = currentActivity;
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (activity.bridge != null && activity.bridge.getWebView() != null) {
                String safeAction = action.replace("'", "");
                activity.bridge.getWebView().evaluateJavascript(
                    "if (typeof window.onQuranMediaAction === 'function') window.onQuranMediaAction('" + safeAction + "')",
                    null
                );
            }
        });
    }

    @Override
    public void onDestroy() {
        if (playbackWakeLock != null && playbackWakeLock.isHeld()) {
            playbackWakeLock.release();
        }
        if (currentActivity == this) currentActivity = null;
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
const serviceSource = `package ${resolvedPackageName};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.util.Log;

public class QuranPlaybackService extends Service {
    static final String ACTION_UPDATE = "org.quranmemorizer.UPDATE_MEDIA";
    static final String ACTION_STOP = "org.quranmemorizer.STOP_MEDIA";
    static final String ACTION_PLAY = "org.quranmemorizer.MEDIA_PLAY";
    static final String ACTION_PAUSE = "org.quranmemorizer.MEDIA_PAUSE";
    static final String ACTION_NEXT = "org.quranmemorizer.MEDIA_NEXT";
    static final String ACTION_PREVIOUS = "org.quranmemorizer.MEDIA_PREVIOUS";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_ARTIST = "artist";
    static final String EXTRA_PLAYING = "playing";
    private static final String CHANNEL_ID = "quran_playback";
    private static final int NOTIFICATION_ID = 7413;
    private MediaSession mediaSession;
    private String title = "Qur’an recitation";
    private String artist = "QuranMemorizer";
    private boolean playing;
    private PowerManager.WakeLock serviceWakeLock;

    @Override public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        if (powerManager != null) {
            serviceWakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK, getPackageName() + ":QuranMediaService"
            );
            serviceWakeLock.setReferenceCounted(false);
        }
        mediaSession = new MediaSession(this, "QuranMemorizer");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { MainActivity.dispatchMediaAction("play"); setPlaying(true); }
            @Override public void onPause() { MainActivity.dispatchMediaAction("pause"); setPlaying(false); }
            @Override public void onSkipToNext() { MainActivity.dispatchMediaAction("next"); }
            @Override public void onSkipToPrevious() { MainActivity.dispatchMediaAction("previous"); }
        });
        mediaSession.setActive(true);
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            playing = false;
            updateWakeLock();
            if (mediaSession != null) mediaSession.setActive(false);
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_PLAY.equals(action)) { MainActivity.dispatchMediaAction("play"); playing = true; }
            else if (ACTION_PAUSE.equals(action)) { MainActivity.dispatchMediaAction("pause"); playing = false; }
            else if (ACTION_NEXT.equals(action)) MainActivity.dispatchMediaAction("next");
            else if (ACTION_PREVIOUS.equals(action)) MainActivity.dispatchMediaAction("previous");
            if (intent.hasExtra(EXTRA_TITLE)) title = intent.getStringExtra(EXTRA_TITLE);
            if (intent.hasExtra(EXTRA_ARTIST)) artist = intent.getStringExtra(EXTRA_ARTIST);
            if (intent.hasExtra(EXTRA_PLAYING)) playing = intent.getBooleanExtra(EXTRA_PLAYING, false);
        }
        updateWakeLock();
        updateSession();
        startForeground(NOTIFICATION_ID, buildNotification());
        return START_NOT_STICKY;
    }

    private void setPlaying(boolean value) {
        playing = value;
        updateWakeLock();
        updateSession();
        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, buildNotification());
    }

    private void updateWakeLock() {
        if (serviceWakeLock == null) return;
        if (playing && !serviceWakeLock.isHeld()) serviceWakeLock.acquire();
        else if (!playing && serviceWakeLock.isHeld()) serviceWakeLock.release();
    }

    private void updateSession() {
        if (mediaSession == null) return;
        mediaSession.setMetadata(new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, "Qur’an Memorizer")
            .build());
        long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        mediaSession.setPlaybackState(new PlaybackState.Builder()
            .setActions(actions)
            .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, 0, 1.0f)
            .build());
        mediaSession.setActive(true);
    }

    private Notification buildNotification() {
        Intent launch = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent content = launch == null ? null : PendingIntent.getActivity(this, 1, launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(this, CHANNEL_ID) : new Notification.Builder(this);
        builder.setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title).setContentText(artist)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(playing).setContentIntent(content)
            .addAction(android.R.drawable.ic_media_previous, "Previous", actionIntent(ACTION_PREVIOUS, 2))
            .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play,
                playing ? "Pause" : "Play", actionIntent(playing ? ACTION_PAUSE : ACTION_PLAY, 3))
            .addAction(android.R.drawable.ic_media_next, "Next", actionIntent(ACTION_NEXT, 4));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            builder.setStyle(new Notification.MediaStyle().setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0, 1, 2));
        }
        return builder.build();
    }

    private PendingIntent actionIntent(String action, int requestCode) {
        return PendingIntent.getService(this, requestCode,
            new Intent(this, QuranPlaybackService.class).setAction(action),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Qur’an playback",
                NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Playback controls for Qur’an recitation");
            NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override public IBinder onBind(Intent intent) { return null; }
    @Override public void onDestroy() {
        playing = false;
        updateWakeLock();
        if (mediaSession != null) { mediaSession.setActive(false); mediaSession.release(); mediaSession = null; }
        super.onDestroy();
    }
}
`;
writeFileSync(join(activityDir, 'QuranPlaybackService.java'), serviceSource);

if (existsSync(kotlinPath)) unlinkSync(kotlinPath);
writeFileSync(javaPath, javaSource);
console.log('Prepared microphone permissions, WebView capture grants, wake locks, and Android lock-screen media playback controls.');
