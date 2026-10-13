import type { APIAttachment, APIMessage } from 'discord.js';
import type { ResolveImageCallback } from '../downloader/images';

/**
 * Runs an image that is not a real attachment (embed image, gallery item,
 * thumbnail) through the image callback, so `saveImages` covers it as well.
 * Returns `null` when the callback asks for the image to be left out, so the
 * caller must omit it; falls back to the original URL when the callback
 * returns `undefined` or fails.
 */
export async function resolveImageUrl(
  url: string,
  resolveImageSrc: ResolveImageCallback,
  message: APIMessage,
  details: { width?: number | null; height?: number | null; filename?: string | null } = {}
): Promise<string | null> {
  if (!url) return url;

  const fakeAttachment = {
    id: '0',
    filename: details.filename || 'image.png',
    url,
    proxy_url: url,
    size: 0,
    // the built in downloader skips anything without dimensions as "not an image"
    width: details.width || 1,
    height: details.height || 1,
  } as APIAttachment;

  try {
    const resolved = await resolveImageSrc(fakeAttachment, message);
    return resolved === undefined ? url : resolved;
  } catch {
    return url;
  }
}
