import RNFS from 'react-native-fs';

// A function, not a module-scope constant -- see downloadManager.ts's
// modelsDir() for why reading RNFS.DocumentDirectoryPath at import time is
// unsafe.
function chatImagesDir(): string {
  return `${RNFS.DocumentDirectoryPath}/chat-images`;
}

/**
 * Copies a picked image (typically a content:// SAF URI on Android) into
 * the app's own storage as a real file path. Required because llama.cpp's
 * native multimodal code opens media_paths as plain files -- it cannot
 * resolve a content:// URI the way RN's <Image> component can.
 */
export async function copyPickedImage(sourceUri: string): Promise<string> {
  const dir = chatImagesDir();
  const exists = await RNFS.exists(dir);
  if (!exists) {
    await RNFS.mkdir(dir);
  }
  const targetPath = `${dir}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  await RNFS.copyFile(sourceUri, targetPath);
  return targetPath;
}
