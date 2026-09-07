import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseManifestPermissions, checkPermissionUsage } from '../permissionCheck';

const MANIFEST = `<?xml version="1.0"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.CAMERA" />
  <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
  <application>
  </application>
</manifest>`;

test('parseManifestPermissions reads every uses-permission entry', () => {
  const permissions = parseManifestPermissions(MANIFEST);
  assert.deepEqual(permissions.sort(), ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.CAMERA']);
});

test('parseManifestPermissions dedupes repeated declarations', () => {
  const text = `<uses-permission android:name="android.permission.CAMERA" />\n<uses-permission android:name="android.permission.CAMERA" />`;
  assert.deepEqual(parseManifestPermissions(text), ['android.permission.CAMERA']);
});

test('checkPermissionUsage marks a permission used when its signal appears in source', () => {
  const results = checkPermissionUsage(['android.permission.CAMERA'], ['val cameraX = CameraX.getInstance()']);
  assert.equal(results[0].status, 'used');
});

test('checkPermissionUsage marks a permission unused when no signal appears anywhere', () => {
  const results = checkPermissionUsage(['android.permission.CAMERA'], ['class MainActivity : Activity()']);
  assert.equal(results[0].status, 'unused');
});

test('checkPermissionUsage marks an unrecognized permission as unmapped, never a false-positive unused', () => {
  const results = checkPermissionUsage(['android.permission.SOME_FUTURE_PERMISSION'], ['class MainActivity']);
  assert.equal(results[0].status, 'unmapped');
});

test('checkPermissionUsage checks across multiple source files', () => {
  const results = checkPermissionUsage(
    ['android.permission.RECORD_AUDIO'],
    ['class A', 'class B { val recorder = MediaRecorder() }'],
  );
  assert.equal(results[0].status, 'used');
});

test('checkPermissionUsage accepts any of several signals for the same permission', () => {
  const results = checkPermissionUsage(['android.permission.BLUETOOTH_CONNECT'], ['val gatt: BluetoothGatt? = null']);
  assert.equal(results[0].status, 'used');
});
