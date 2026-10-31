import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const match = String(packageJson.version || '').match(/^(\\d+)\\.(\\d+)\\.(\\d+)$/);
if (!match) throw new Error('package.json version must use MAJOR.MINOR.PATCH (for example 1.0.1).');

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

const gradlePath = resolve(root, 'android/app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
if (!/versionCode\\s+\\d+/.test(gradle) || !/versionName\\s+['"][^'"]+['"]/.test(gradle)) {
  throw new Error('Could not locate versionCode and versionName in generated android/app/build.gradle.');
}
gradle = gradle.replace(/versionCode\\s+\\d+/, 'versionCode ' + versionCode);
gradle = gradle.replace(/versionName\\s+['"][^'"]+['"]/, 'versionName "' + packageJson.version + '"');

if (process.env.QURAN_CONFIGURE_RELEASE_SIGNING === 'true') {
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
  const releaseBlock = gradle.match(/release\\s*\\{[\\s\\S]*?\\n\\s*\\}/);
  if (!releaseBlock) throw new Error('Could not locate release build type for signing configuration.');
  if (!releaseBlock[0].includes('signingConfig')) {
    gradle = gradle.replace(releaseBlock[0], releaseBlock[0].replace('{', '{\\n            signingConfig signingConfigs.release'));
  }
}
writeFileSync(gradlePath, gradle);
console.log(`Configured Android ${packageJson.version} (versionCode ${versionCode}).`);
