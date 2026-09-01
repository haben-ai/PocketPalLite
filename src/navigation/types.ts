export type RootTabParamList = {
  Chat: {
    modelId?: string;
    conversationId?: string;
    personaId?: string;
    prefillText?: string;
  } | undefined;
  Models: {highlightModelId?: string} | undefined;
  AIPals: undefined;
  Discover: undefined;
  Settings: undefined;
};
