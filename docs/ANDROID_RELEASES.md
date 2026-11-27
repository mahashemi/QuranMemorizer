# Android versions and update compatibility

## Version numbers

The app version is controlled by `package.json` using `MAJOR.MINOR.PATCH`.
The build script maps it to a monotonically increasing Android version code:

- `1.0.1` → versionCode `1000001`
- `1.1.0` → versionCode `1001000`
- `2.0.0` → versionCode `2000000`

Increase the package version for every published Android release. Never lower versionCode.

## Stable application identity and signing

The Capacitor application ID is `org.quranmemorizer.app`. Do not change it for an ordinary update.

Android permits an in-place update only when both the application ID and signing certificate match the installed app, and the new versionCode is higher. The release workflow uses one permanent keystore for every release. Keep that keystore safe, encrypted, and backed up. Losing it prevents future updates signed with a replacement key.

Generate the permanent keystore on a trusted computer (do not commit it to Git):

```bash
keytool -genkeypair -v \\
  -keystore quran-release.keystore \\
  -alias quranmemorizer \\
  -keyalg RSA -keysize 4096 -validity 10000
```

Add these repository Actions secrets under **Settings → Secrets and variables → Actions**:

- `ANDROID_KEYSTORE_BASE64`: base64-encoded keystore contents
  - macOS: `base64 -i quran-release.keystore | tr -d '\\n' | pbcopy`, then paste the clipboard value into the secret.
- `ANDROID_KEYSTORE_PASSWORD`: keystore password
- `ANDROID_KEY_ALIAS`: `quranmemorizer` (or the alias selected above)
- `ANDROID_KEY_PASSWORD`: key password

Never commit the keystore or place passwords in source files, issues, or chat.

After configuring the secrets, run **Actions → Build signed Android release → Run workflow**. Install the signed APK artifact. Subsequent signed APKs built with the same keystore and a higher versionCode install over the existing app without uninstalling; app-private recordings and preferences remain in place.

## Important first-update check

The current CI debug workflow generates a fresh Android project on each run, so its default debug signing key is not guaranteed to match across builds. If the installed app was installed from one of those CI debug APKs, a first switch to the permanent release keystore cannot update it in place. Android will reject the different certificate. We must identify the signing certificate of the app currently installed before choosing the safest transition. Do not uninstall or clear app data until recordings have been exported and the transition is agreed.

If the current installation was built locally with a retained signing key, we may be able to configure future builds to use that exact key and avoid a reinstall. Do not assume the key based only on the version name.


## GitHub Pages

The Pages workflow builds the same static web assets and deploys them to:

https://mahashemi.github.io/QuranMemorizer/

The repository Pages source should be **GitHub Actions**. The deployment workflow checks for the committed Quran chunk manifest and the separate Dua and Ziyarat collection manifests. It must not publish `data/quran/all_suras.json` as a runtime asset.
