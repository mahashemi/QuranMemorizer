# Android versions and release updates

## Version numbers

The app version is controlled by `package.json` using `MAJOR.MINOR.PATCH`.
The Android build script maps it to a monotonically increasing version code:

- `1.0.1` → versionCode `1000001`
- `1.1.0` → versionCode `1001000`
- `2.0.0` → versionCode `2000000`

Keep MINOR and PATCH below 1000. Increase the package version for every published release.

## One-time release signing setup

Android only installs an update over an existing app when the package ID and signing certificate match. The permanent release keystore must be kept safe and backed up. If it is lost, future updates signed with a replacement key cannot update the installed app.

Generate the keystore on a trusted computer (do not commit it to Git):

```bash
keytool -genkeypair -v \
  -keystore quran-release.keystore \
  -alias quranmemorizer \
  -keyalg RSA -keysize 4096 -validity 10000
```

Add these four repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded contents of `quran-release.keystore`
  - macOS: `base64 -i quran-release.keystore | tr -d '\\n' | pbcopy`, then paste the clipboard value into the secret.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: `quranmemorizer` (or the alias you chose)
- `ANDROID_KEY_PASSWORD`: key password

Keep the keystore and passwords in a secure password manager and a separate encrypted backup. Never upload the keystore to this repository or share it in chat.

After configuring the secrets, run **Actions → Build signed Android release → Run workflow**. It produces a signed APK for direct installation and an AAB for a future Play Store release.

## Important: moving from current debug APKs to release updates

The current CI debug APKs are built from a newly generated Android project on each run. Their debug signing key is not persisted between runs. Therefore the first permanent release-signed APK cannot update an already installed CI debug APK in place.

Plan this transition once, after backing up any recordings with the app's Export recordings feature. Installing the first release build will require uninstalling the current debug build; Android removes app-private data on uninstall. Re-downloadable reciter audio can be downloaded again. After the first release-signed APK is installed, all subsequent APKs signed with this same keystore and using a higher version code can be installed as normal updates without uninstalling or losing app data.

Do not lose or replace the permanent keystore.

## GitHub Pages

The web deployment workflow builds the same `www` web assets and deploys them to:

https://mahashemi.github.io/QuranMemorizer/

In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions** once if it is not already configured. The Pages workflow then deploys automatically on relevant pushes to `main`.
