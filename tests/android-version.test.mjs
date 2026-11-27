import assert from 'node:assert/strict';
import test from 'node:test';
import { androidVersionCode } from '../scripts/configure-android-version.mjs';

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
