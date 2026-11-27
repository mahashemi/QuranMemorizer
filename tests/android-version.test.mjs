import assert from 'node:assert/strict';
import test from 'node:test';
import { androidVersionCode, configureGradleVersion } from '../scripts/configure-android-version.mjs';

test('Android version codes increase monotonically across semantic versions', () => {
  assert.equal(androidVersionCode('1.0.0'), 1000000);
  assert.equal(androidVersionCode('1.0.1'), 1000001);
  assert.equal(androidVersionCode('1.1.0'), 1001000);
  assert.equal(androidVersionCode('2.0.0'), 2000000);
  assert.ok(androidVersionCode('1.0.2') > androidVersionCode('1.0.1'));
});

test('Android version code rejects ambiguous or overflowing versions', () => {
  assert.throws(() => androidVersionCode('1.0'), /MAJOR.MINOR.PATCH/);
  assert.throws(() => androidVersionCode('1.1000.0'), /below 1000/);
});

test('Gradle release signing is inserted only into buildTypes.release', () => {
  const original = 'android {\n    defaultConfig {\n        versionCode 1\n        versionName "1.0"\n    }\n    buildTypes {\n        release {\n            minifyEnabled false\n        }\n    }\n}';
  const configured = configureGradleVersion(original, '1.0.1', true);
  assert.equal(configured.versionCode, 1000001);
  assert.match(configured.gradle, /versionCode 1000001/);
  assert.match(configured.gradle, /versionName "1\.0\.1"/);
  assert.match(configured.gradle, /release \{\s*signingConfig signingConfigs\.release/);
  assert.doesNotMatch(configured.gradle, /signingConfigs \{[\s\S]*?signingConfig signingConfigs\.release/);
});
