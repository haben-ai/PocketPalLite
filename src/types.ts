export type ModelTier = 'weak' | 'medium' | 'strong';

export type ModelInfo = {
  id: string;
  name: string;
  tier: ModelTier;
  params: string;
  quant: string;
  sizeBytes: number;
  fileName: string;
  description: string;
  repoUrl: string;
  downloadUrl: string;
  minRamGB: number;
};

export type DownloadedModel = {
  modelId: string;
  filePath: string;
  sizeBytes: number;
  downloadedAt: number;
  isCustomImport: boolean;
  displayName: string;
};

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

export type Conversation = {
  id: string;
  modelId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

export type DeviceTier = {
  tier: ModelTier;
  totalRamGB: number;
  freeStorageGB: number;
  recommendedModelId: string;
};
