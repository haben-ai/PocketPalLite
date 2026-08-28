import {DownloadedTranslationModel} from '../types';
import {getJSON, setJSON} from './asyncStore';

const KEY = 'pocketpal:downloaded_translation_models';

export async function getDownloadedTranslationModels(): Promise<
  DownloadedTranslationModel[]
> {
  return getJSON<DownloadedTranslationModel[]>(KEY, []);
}

export async function registerDownloadedTranslationModel(
  entry: DownloadedTranslationModel,
): Promise<void> {
  const all = await getDownloadedTranslationModels();
  const next = [...all.filter(m => m.modelId !== entry.modelId), entry];
  await setJSON(KEY, next);
}

export async function getDownloadedTranslationModel(
  modelId: string,
): Promise<DownloadedTranslationModel | undefined> {
  const all = await getDownloadedTranslationModels();
  return all.find(m => m.modelId === modelId);
}

export async function removeDownloadedTranslationModel(
  modelId: string,
): Promise<void> {
  const all = await getDownloadedTranslationModels();
  await setJSON(
    KEY,
    all.filter(m => m.modelId !== modelId),
  );
}
