import DeviceInfo from 'react-native-device-info';
import {MODEL_CATALOG} from '../data/models';
import {DeviceTier, ModelInfo, ModelTier} from '../types';

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

/** The app's single default recommendation, regardless of device tier --
 * a well-rounded model that's small enough to fit virtually any phone.
 * Only overridden by the tier-based "sweet spot" logic below when it
 * genuinely doesn't fit the device's free storage. */
export const DEFAULT_MODEL_ID = 'gemma3-1b';

function pickRecommendedModel(tier: ModelTier, freeStorageGB: number): string {
  const defaultModel = MODEL_CATALOG.find(m => m.id === DEFAULT_MODEL_ID);
  if (defaultModel && defaultModel.sizeBytes / GB < freeStorageGB - 0.5) {
    return defaultModel.id;
  }

  // Vision models are excluded from the general "what fits my phone"
  // recommendation -- a user tapping Analyze My Phone wants a general chat
  // model, not to be steered toward a (also larger) vision model.
  const candidates = MODEL_CATALOG.filter(
    m => m.tier === tier && (m.capability ?? 'text') === 'text',
  );
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

export type ModelCompatibility = 'excellent' | 'usable' | 'not-recommended';

/**
 * Per-model compatibility score (🟢/🟡/🔴), distinct from the whole-device
 * ModelTier above -- this answers "will THIS model run well on THIS
 * phone", not "what tier is this phone overall". Deliberately simple:
 * ratio of total RAM to the model's own minRamGB, plus a hard check that
 * the download actually fits in free storage.
 */
export function getModelCompatibility(
  model: Pick<ModelInfo, 'minRamGB' | 'sizeBytes' | 'mmprojSizeBytes'>,
  device: Pick<DeviceTier, 'totalRamGB' | 'freeStorageGB'>,
): ModelCompatibility {
  const totalSizeGB = (model.sizeBytes + (model.mmprojSizeBytes ?? 0)) / GB;
  if (device.freeStorageGB < totalSizeGB * 1.05) {
    return 'not-recommended'; // can't even fit the download
  }
  const ramRatio = device.totalRamGB / model.minRamGB;
  if (ramRatio >= 1.5) {
    return 'excellent';
  }
  if (ramRatio >= 1.0) {
    return 'usable';
  }
  return 'not-recommended';
}

function parseParamsToBillions(params: string): number {
  const match = params.match(/^([\d.]+)\s*([MB])$/i);
  if (!match) {
    return 1; // unrecognized format -- fall back to a mid-size assumption
  }
  const value = parseFloat(match[1]);
  return match[2].toUpperCase() === 'M' ? value / 1000 : value;
}

/**
 * Static, non-benchmarked tokens/sec estimate: mobile LLM decode is
 * memory-bandwidth-bound, so speed scales roughly as a constant divided by
 * parameter count. Not a real on-device benchmark -- see Models tab plan
 * decision #5 (no live benchmark harness this pass).
 */
export function estimatePerformance(
  model: Pick<ModelInfo, 'params'>,
  deviceTier: ModelTier,
): number {
  const paramsB = parseParamsToBillions(model.params);
  const base = 27.5 / Math.max(paramsB, 0.1);
  const tierMultiplier = deviceTier === 'strong' ? 1.4 : deviceTier === 'medium' ? 1.0 : 0.65;
  return Math.round(base * tierMultiplier);
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
