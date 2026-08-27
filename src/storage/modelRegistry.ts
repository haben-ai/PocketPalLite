import {DownloadedModel} from '../types';
import {getJSON, setJSON, KEYS} from './asyncStore';

export async function getDownloadedModels(): Promise<DownloadedModel[]> {
  return getJSON<DownloadedModel[]>(KEYS.downloadedModels, []);
}

export async function registerDownloadedModel(
  entry: DownloadedModel,
): Promise<void> {
  const all = await getDownloadedModels();
  const next = [...all.filter(m => m.modelId !== entry.modelId), entry];
  await setJSON(KEYS.downloadedModels, next);
}

export async function removeDownloadedModel(modelId: string): Promise<void> {
  const all = await getDownloadedModels();
  await setJSON(
    KEYS.downloadedModels,
    all.filter(m => m.modelId !== modelId),
  );
}

export async function getDownloadedModel(
  modelId: string,
): Promise<DownloadedModel | undefined> {
  const all = await getDownloadedModels();
  return all.find(m => m.modelId === modelId);
}
