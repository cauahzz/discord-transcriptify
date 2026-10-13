import type { Message } from 'discord.js';

// Discord starts a new group once the previous message is this old
export const GROUP_WINDOW_MS = 7 * 60 * 1000;

/**
 * Whether the message is drawn as a continuation of the group that `previous`
 * belongs to: no avatar, name or timestamp of its own. Only the messages of one
 * sequence compare with each other, so the thread messages of a thread are
 * passed their own neighbour, never the main channel's.
 */
export function continuesGroup(message: Message, previous: Message | undefined): boolean {
  if (!previous || message.system || previous.system) return false;
  if (message.author.id !== previous.author.id) return false;
  // a reply, a forward and a slash command response all carry a header line of their own
  if (message.reference || message.interaction || message.interactionMetadata) return false;
  // one webhook posts under any number of names and avatars, and each of those is a sender of its own
  if (message.webhookId || previous.webhookId) {
    if (message.author.username !== previous.author.username || message.author.avatar !== previous.author.avatar) {
      return false;
    }
  }

  return Math.abs(message.createdTimestamp - previous.createdTimestamp) < GROUP_WINDOW_MS;
}
