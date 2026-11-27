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

export function configureAndroidVersion(root = process.cwd()) {
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const versionCode = androidVersionCode(packageJson.version);
  const gradlePath = resolve(root, 'android/app/build.gradle');
  let gradle = readFileSync(gradlePath, 'utf8');
  if (!/versionCode\s+\d+/.test(gradle) || !/versionName\s+['"][^'"]+['"]/.test(gradle)) {
    throw new Error('Could not locate versionCode and versionName in generated android/app/build.gradle.');
  }
  gradle = gradle.replace(/versionCode\s+\d+/, 'versionCode ' + versionCode);
  gradle = gradle.replace(/versionName\s+['"][^'"]+['"]/, 'versionName "' + packageJson.version + '"');
  writeFileSync(gradlePath, gradle);
  return { versionName: packageJson.version, versionCode };
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  const result = configureAndroidVersion();
  console.log('Configured Android ' + result.versionName + ' (versionCode ' + result.versionCode + ').');
}
