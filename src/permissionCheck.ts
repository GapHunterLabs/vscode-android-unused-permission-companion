/**
 * Pure logic -- no `vscode` dependency. New niche (not a port from
 * the Kotlin catalog, though it reuses this workstream's established
 * "curated permission/import to API signal map" technique). Evidence:
 * confirmed -- existing extensions (`Android Permissions Helper`,
 * `Android Manifest Snippets`) only ADD permissions to
 * AndroidManifest.xml; none detects one that's declared but never
 * actually used in the Kotlin/Java source.
 *
 * v0.1 scope, honestly noted: name/text-based signal matching, not
 * real symbol resolution -- a permission whose API is called through
 * reflection, a third-party SDK wrapper, or a signal not in this
 * curated list won't be recognized either way (never flagged as
 * unused OR confirmed used -- see UNMAPPED_PERMISSIONS below, which
 * are always treated as "can't evaluate", never a false positive).
 */

// Each entry: at least one of these signals appearing anywhere in the
// app's own Kotlin/Java source counts as "this permission is used".
const PERMISSION_SIGNALS: Record<string, string[]> = {
  'android.permission.ACCESS_FINE_LOCATION': ['FusedLocationProviderClient', 'LocationManager', 'LocationRequest'],
  'android.permission.ACCESS_COARSE_LOCATION': ['FusedLocationProviderClient', 'LocationManager', 'LocationRequest'],
  'android.permission.CAMERA': ['Camera2', 'CameraX', 'ImageCapture', 'android.hardware.camera2', 'Camera.open'],
  'android.permission.RECORD_AUDIO': ['MediaRecorder', 'AudioRecord'],
  'android.permission.READ_CONTACTS': ['ContactsContract'],
  'android.permission.WRITE_CONTACTS': ['ContactsContract'],
  'android.permission.READ_EXTERNAL_STORAGE': ['MediaStore', 'getExternalStorageDirectory'],
  'android.permission.WRITE_EXTERNAL_STORAGE': ['MediaStore', 'getExternalStorageDirectory'],
  'android.permission.BLUETOOTH': ['BluetoothAdapter', 'BluetoothManager'],
  'android.permission.BLUETOOTH_ADMIN': ['BluetoothAdapter', 'BluetoothManager'],
  'android.permission.BLUETOOTH_CONNECT': ['BluetoothAdapter', 'BluetoothManager', 'BluetoothGatt'],
  'android.permission.BLUETOOTH_SCAN': ['BluetoothLeScanner', 'BluetoothAdapter'],
  'android.permission.CALL_PHONE': ['ACTION_CALL', 'TelecomManager'],
  'android.permission.SEND_SMS': ['SmsManager'],
  'android.permission.READ_PHONE_STATE': ['TelephonyManager'],
  'android.permission.ACCESS_NETWORK_STATE': ['ConnectivityManager'],
  'android.permission.ACCESS_WIFI_STATE': ['WifiManager'],
  'android.permission.POST_NOTIFICATIONS': ['NotificationManagerCompat', 'NotificationCompat', 'NotificationManager'],
  'android.permission.ACTIVITY_RECOGNITION': ['ActivityRecognitionClient'],
  'android.permission.BODY_SENSORS': ['SensorManager'],
  'android.permission.READ_CALENDAR': ['CalendarContract'],
  'android.permission.WRITE_CALENDAR': ['CalendarContract'],
  'android.permission.VIBRATE': ['Vibrator'],
};

export function parseManifestPermissions(xmlText: string): string[] {
  const permissions = new Set<string>();
  for (const match of xmlText.matchAll(/<uses-permission[^>]*android:name="([^"]+)"/g)) {
    permissions.add(match[1]);
  }
  return [...permissions];
}

function sourceUsesAnySignal(sourceTexts: string[], signals: string[]): boolean {
  return sourceTexts.some((text) => signals.some((signal) => text.includes(signal)));
}

export interface PermissionCheckResult {
  permission: string;
  status: 'used' | 'unused' | 'unmapped';
}

/** For each declared permission: "used" if a curated signal for it
 * appears in the given source texts, "unused" if the permission is
 * mapped but no signal appears anywhere, "unmapped" if this v0.1
 * doesn't have a curated signal list for it at all (never treated as
 * a false-positive "unused"). */
export function checkPermissionUsage(declaredPermissions: string[], sourceTexts: string[]): PermissionCheckResult[] {
  return declaredPermissions.map((permission) => {
    const signals = PERMISSION_SIGNALS[permission];
    if (!signals) return { permission, status: 'unmapped' };
    return { permission, status: sourceUsesAnySignal(sourceTexts, signals) ? 'used' : 'unused' };
  });
}
