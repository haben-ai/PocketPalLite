import RNFS from 'react-native-fs';

const CHAT_IMAGES_DIR = `${RNFS.DocumentDirectoryPath}/chat-images`;

/**
 * Copies a picked image (typically a content:// SAF URI on Android) into
 * the app's own storage as a real file path. Required because llama.cpp's
 * native multimodal code opens media_paths as plain files -- it cannot
 * resolve a content:// URI the way RN's <Image> component can.
 */
export async function copyPickedImage(sourceUri: string): Promise<string> {
  const exists = await RNFS.exists(CHAT_IMAGES_DIR);
  if (!exists) {
    await RNFS.mkdir(CHAT_IMAGES_DIR);
  }
  const targetPath = `${CHAT_IMAGES_DIR}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.jpg`;
  await RNFS.copyFile(sourceUri, targetPath);
  return targetPath;
}
