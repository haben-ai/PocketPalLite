import DeviceInfo from 'react-native-device-info';
import {MODEL_CATALOG} from '../data/models';
import {DeviceTier, ModelTier} from '../types';

const GB = 1024 * 1024 * 1024;

function tierFromRam(totalRamGB: number): ModelTier {
  if (totalRamGB < 4) {
    return 'weak';
  }
  if (totalRamGB < 7) {
    return 'medium';
  }
  return 'strong';
}

function pickRecommendedModel(tier: ModelTier, freeStorageGB: number): string {
  const candidates = MODEL_CATALOG.filter(m => m.tier === tier);
  // Prefer the model in the tier's "sweet spot" (middle of the list) that
  // still comfortably fits in free storage; fall back to the smallest.
  const sorted = [...candidates].sort((a, b) => a.sizeBytes - b.sizeBytes);
  const sweetSpot = sorted[Math.floor(sorted.length / 2)];
  if (sweetSpot.sizeBytes / GB < freeStorageGB - 0.5) {
    return sweetSpot.id;
  }
  const smallestThatFits = sorted.find(
    m => m.sizeBytes / GB < freeStorageGB - 0.5,
  );
  return (smallestThatFits ?? sorted[0]).id;
}

export async function analyzeDevice(): Promise<DeviceTier> {
  const totalMemoryBytes = await DeviceInfo.getTotalMemory();
  const freeStorageBytes = await DeviceInfo.getFreeDiskStorage();

  const totalRamGB = totalMemoryBytes / GB;
  const freeStorageGB = freeStorageBytes / GB;
  const tier = tierFromRam(totalRamGB);
  const recommendedModelId = pickRecommendedModel(tier, freeStorageGB);

  return {
    tier,
    totalRamGB,
    freeStorageGB,
    recommendedModelId,
  };
}
