let consumed = false;

/**
 * True only the first time this is called after the JS engine starts up --
 * i.e. a genuine cold start where the process was not already running.
 * Backgrounding/resuming the app (Android's normal "home button" flow)
 * keeps this JS module alive, so it does NOT re-run module-level code and
 * this keeps returning false for the rest of the process's lifetime after
 * the first call.
 */
export function consumeIsColdStart(): boolean {
  if (consumed) {
    return false;
  }
  consumed = true;
  return true;
}
