import {NativeModules, Platform} from 'react-native';

/**
 * Real CPU core count via Java's Runtime.availableProcessors(), exposed by
 * the small native DeviceCoresModule (android/app/src/main/java/com/
 * pocketpallite/DeviceCoresModule.kt) -- react-native-device-info has no
 * such API, and RN ships no JS-level way to read this. Returns null rather
 * than a guess when unavailable (iOS, or the module somehow isn't linked).
 */
export async function getCpuCoreCount(): Promise<number | null> {
  if (Platform.OS !== 'android' || !NativeModules.DeviceCores) {
    return null;
  }
  try {
    const count = await NativeModules.DeviceCores.getCoreCount();
    return typeof count === 'number' && count > 0 ? count : null;
  } catch {
    return null;
  }
}
