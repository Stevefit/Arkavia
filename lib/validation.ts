export function cleanName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 60 ? name : null;
}

export function cleanMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const message = value.trim();
  return message.length >= 1 && message.length <= 500 ? message : null;
}

export function cleanMusicUrl(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") return "";
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) && url.toString().length <= 2000 ? url.toString() : null;
  } catch {
    return null;
  }
}
