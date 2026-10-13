import { ChannelType, type Channel } from 'discord.js';

const MAX_NAME_LENGTH = 100;

/**
 * Makes a string safe to use as a file name on any platform: characters that
 * Windows or POSIX reject, control characters and whitespace become dashes.
 */
export function sanitizeFilename(name: string): string {
  return (
    name
      // eslint-disable-next-line no-control-regex
      .replace(/[<>:"/\\|?*\u0000-\u001f\s]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, MAX_NAME_LENGTH)
  );
}

/** The name an attachment gets when the caller did not pick one. */
export function getDefaultFilename(channel: Channel): string {
  const name = channel.type === ChannelType.DM ? channel.recipient?.username : 'name' in channel ? channel.name : null;

  // a name made only of rejected characters sanitizes to nothing
  return `transcript-${sanitizeFilename(name ?? '') || channel.id}.html`;
}
