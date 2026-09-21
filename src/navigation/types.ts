/**
 * Hand-rolled screen state. All app-section navigation (Chat/Models/AIPals/
 * Discover/Benchmark/Settings/App Info) is reached through the hamburger
 * drawer rather than a bottom tab bar -- a custom bottom bar overlapped the
 * system navigation bar on some Android devices (e.g. Samsung S20-series
 * gesture/3-button nav), so it was removed outright rather than patched.
 * Each variant carries only the params that screen actually needs.
 */
export type AppScreen =
  | {
      name: 'chat';
      modelId?: string;
      conversationId?: string;
      personaId?: string;
      prefillText?: string;
    }
  | {name: 'models'; highlightModelId?: string}
  | {name: 'aipals'}
  | {name: 'discover'}
  | {name: 'settings'}
  | {name: 'benchmark'}
  | {name: 'appInfo'}
  | {name: 'openSourceLicenses'};
