/**
 * Thin wrapper over Hugging Face's public Hub API -- used by the Models
 * screen's "Add from Hugging Face" flow to search GGUF repos and list their
 * files, so the user can download any GGUF on the Hub, not just the fixed
 * MODEL_CATALOG. Same resolve-URL shape (`{repo}/resolve/main/{path}`) the
 * app's own catalog entries already use, so downloads go through the exact
 * same downloadRemoteModel() path as a pasted "Add Remote Model" URL.
 */

export type HfRepoResult = {
  id: string;
  downloads?: number;
  gated?: boolean;
};

export type HfFileEntry = {
  path: string;
  size?: number;
};

export async function searchHfGgufModels(query: string): Promise<HfRepoResult[]> {
  const trimmed = query.trim();
  const url = `https://huggingface.co/api/models?search=${encodeURIComponent(
    trimmed,
  )}&filter=gguf&sort=downloads&direction=-1&limit=25`;

  const response = await fetch(url, {headers: {Accept: 'application/json'}});
  if (!response.ok) {
    throw new Error(`Hugging Face search failed with status ${response.status}`);
  }
  const data = await response.json();
  const results: any[] = Array.isArray(data) ? data : [];
  return results
    .map(r => ({id: String(r.id ?? r.modelId ?? ''), downloads: r.downloads, gated: !!r.gated}))
    .filter(r => r.id.length > 0);
}

export async function listHfGgufFiles(
  repoId: string,
  headers?: Record<string, string>,
): Promise<HfFileEntry[]> {
  // repoId is "org/model" -- its "/" is a real path separator in the API
  // URL, not data to escape, so each segment is encoded individually
  // rather than running encodeURIComponent over the whole id (which would
  // turn the separator into a literal "%2F" and make the Hub API 400).
  const encodedRepoId = repoId.split('/').map(encodeURIComponent).join('/');
  const url = `https://huggingface.co/api/models/${encodedRepoId}/tree/main`;
  const response = await fetch(url, {headers: {Accept: 'application/json', ...headers}});
  if (!response.ok) {
    throw new Error(`Could not list files for ${repoId} (status ${response.status})`);
  }
  const data = await response.json();
  const entries: any[] = Array.isArray(data) ? data : [];
  return entries
    .filter(
      e => e.type === 'file' && typeof e.path === 'string' && e.path.toLowerCase().endsWith('.gguf'),
    )
    .map(e => ({path: e.path, size: typeof e.size === 'number' ? e.size : undefined}));
}

export function hfResolveDownloadUrl(repoId: string, path: string): string {
  const encodedRepoId = repoId.split('/').map(encodeURIComponent).join('/');
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `https://huggingface.co/${encodedRepoId}/resolve/main/${encodedPath}`;
}
