import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function androidVersionCode(version) {
  const match = String(version || '').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error('package.json version must use MAJOR.MINOR.PATCH.');
  const [, majorText, minorText, patchText] = match;
  const major = Number(majorText);
  const minor = Number(minorText);
  const patch = Number(patchText);
  if (minor >= 1000 || patch >= 1000) {
    throw new Error('Android version mapping requires MINOR and PATCH to remain below 1000.');
  }
  const versionCode = major * 1_000_000 + minor * 1_000 + patch;
  if (!Number.isSafeInteger(versionCode) || versionCode < 1) {
    throw new Error('Calculated Android versionCode is invalid.');
  }
  return versionCode;
}

export function configureGradleVersion(gradle, version, releaseSigning = false) {
  const versionCode = androidVersionCode(version);
  if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+['"][^'"]+['"]/.test(gradle)) {
    throw new Error('Could not locate versionCode and versionName in generated android/app/build.gradle.');
  }
  gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
  gradle = gradle.replace(/versionName\s+['"][^'"]+['"]/, 'versionName "' + version + '"');

  if (releaseSigning) {
    if (!gradle.includes('signingConfigs {')) {
      const buildTypesIndex = gradle.indexOf('    buildTypes {');
      if (buildTypesIndex < 0) throw new Error('Could not find buildTypes block in generated Gradle file.');
      const signingBlock = `    signingConfigs {
        release {
            storeFile file(System.getenv("QURAN_RELEASE_STORE_FILE"))
            storePassword System.getenv("QURAN_RELEASE_STORE_PASSWORD")
            keyAlias System.getenv("QURAN_RELEASE_KEY_ALIAS")
            keyPassword System.getenv("QURAN_RELEASE_KEY_PASSWORD")
        }
    }

`;
      gradle = gradle.slice(0, buildTypesIndex) + signingBlock + gradle.slice(buildTypesIndex);
    }
    const buildTypesIndex = gradle.indexOf('buildTypes {');
    if (buildTypesIndex < 0) throw new Error('Could not find buildTypes block for release signing.');
    const beforeBuildTypes = gradle.slice(0, buildTypesIndex);
    const buildTypes = gradle.slice(buildTypesIndex);
    const releaseBlock = buildTypes.match(/release\s*\{[\s\S]*?\n\s*\}/);
    if (!releaseBlock) throw new Error('Could not locate release build type for signing configuration.');
    if (!releaseBlock[0].includes('signingConfig')) {
      const updatedRelease = releaseBlock[0].replace('{', '{\n            signingConfig signingConfigs.release');
      gradle = beforeBuildTypes + buildTypes.replace(releaseBlock[0], updatedRelease);
    }
  }
  return { gradle, versionName: version, versionCode };
}

export function configureAndroidVersion(root = process.cwd(), releaseSigning = false) {
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const gradlePath = resolve(root, 'android/app/build.gradle');
  const configured = configureGradleVersion(readFileSync(gradlePath, 'utf8'), packageJson.version, releaseSigning);
  writeFileSync(gradlePath, configured.gradle);
  return { versionName: configured.versionName, versionCode: configured.versionCode };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const releaseSigning = process.env.QURAN_CONFIGURE_RELEASE_SIGNING === 'true';
  const result = configureAndroidVersion(process.cwd(), releaseSigning);
  console.log('Configured Android ' + result.versionName + ' (versionCode ' + result.versionCode + ').');
}
