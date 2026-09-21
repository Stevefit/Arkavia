export const MAX_MUSIC_FILE_SIZE = 50 * 1024 * 1024;
export const MUSIC_BLOB_PREFIX = "arkavia-music/";

export function musicBlobPath(fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-100) || "audio";
  return `${MUSIC_BLOB_PREFIX}${safeName}`;
}
