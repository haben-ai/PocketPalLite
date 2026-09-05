/**
 * Hand-rolled screen state -- there is no persistent tab bar any more
 * (ChatGPT-style: a hamburger-opened sidebar is the only way to reach
 * Models/AIPals/Discover/Settings, Chat is the sole default surface).
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
  | {name: 'appInfo'};
