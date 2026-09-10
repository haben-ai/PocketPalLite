import {NativeModules, Platform} from 'react-native';

const {GenerationService} = NativeModules;

/**
 * Starts GenerationForegroundService (android/.../GenerationForegroundService.kt)
 * so Android doesn't throttle or kill the app process while a response is
 * still generating and the app is minimized. iOS has no equivalent concept
 * here (no build target for it in this project) -- guarded so this is a
 * safe no-op if ever run there. Call stopGeneratingInBackground() in a
 * finally block covering every exit path of the completion call this
 * wraps, not just the success path.
 */
export function startGeneratingInBackground(): void {
  if (Platform.OS === 'android') {
    GenerationService?.startGenerating();
  }
}

export function stopGeneratingInBackground(): void {
  if (Platform.OS === 'android') {
    GenerationService?.stopGenerating();
  }
}
