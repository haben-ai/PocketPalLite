/**
 * Hand-rolled screen state. A persistent bottom tab bar (Chat/Models/AIPals/
 * More, plus a center New Chat action) covers the app's primary sections;
 * "More" is its own screen listing the remaining destinations (Discover/
 * Benchmark/Settings/App Info) that don't get their own tab slot. Each
 * variant carries only the params that screen actually needs.
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
  | {name: 'more'}
  | {name: 'discover'}
  | {name: 'settings'}
  | {name: 'benchmark'}
  | {name: 'appInfo'}
  | {name: 'openSourceLicenses'};
