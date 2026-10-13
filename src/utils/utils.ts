import type { APIMessageComponentEmoji, Emoji } from 'discord.js';
import twemoji from 'twemoji';

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * `flags.has(undefined)` throws, and the constants for newer flags are undefined on older discord.js 14.x releases.
 */
export function hasFlag(flags: { has(flag: never): boolean } | null | undefined, flag: unknown): boolean {
  return flags != null && flag !== undefined && flags.has(flag as never);
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function parseDiscordEmoji(emoji: Emoji | APIMessageComponentEmoji) {
  if (emoji.id) {
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
  }

  const codepoints = twemoji.convert
    .toCodePoint(
      emoji.name!.indexOf(String.fromCharCode(0x200d)) < 0 ? emoji.name!.replace(/\uFE0F/g, '') : emoji.name!
    )
    .toLowerCase();

  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoints}.svg`;
}

/** Reads a stream to the end and returns its content as a UTF-8 string. */
export function streamToString(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];

  return new Promise<string>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

/**
 * JSON for embedding inside a `<script>` element. `JSON.stringify` leaves `<`
 * alone, so a string holding `</script>` would end the block and let whatever
 * follows run as page script; the escapes below are plain JSON, so
 * `JSON.parse` still returns the original value. U+2028/U+2029 are valid in
 * JSON but were line terminators in JavaScript source before ES2019.
 */
export function serializeForScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * A URL as it is safe to print. Discord CDN URLs carry signature parameters
 * (`ex`, `is`, `hm`) that grant access to the file, so the query string never
 * reaches a log; error output drops the path as well.
 */
export function describeUrl(url: string, { includePath = true } = {}) {
  try {
    const { host, pathname } = new URL(url);
    return includePath ? `${host}${pathname}` : host;
  } catch {
    return '[invalid url]';
  }
}
