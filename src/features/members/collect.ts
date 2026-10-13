import debug from 'debug';
import type { Message } from 'discord.js';
import type { CollectContext } from '../types';

const log = debug('discord-transcriptify:members');

// the most user ids one gateway member request takes
const REQUEST_SIZE = 100;
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Messages fetched over REST arrive without their member, and the role colour
 * of an author lives on it. This asks for the missing ones in batches of
 * `REQUEST_SIZE`, into the guild's member cache, which is where `message.member`
 * reads from.
 */
export async function collectMembers(messages: Message[], { channel, threads }: CollectContext) {
  if (channel.isDMBased()) return;
  const { guild } = channel;

  // the card under "started a thread" shows the last message of the thread
  const threadPreviews = messages.flatMap((message) => {
    const thread =
      message.thread ?? (message.reference?.channelId ? guild.channels.cache.get(message.reference.channelId) : null);
    return thread?.isThread() && thread.lastMessage ? [thread.lastMessage] : [];
  });

  const missing = new Set<string>();
  for (const message of [...messages, ...threadPreviews, ...[...threads.values()].flat()]) {
    // a webhook author is not a member, and asking for one would only waste a slot
    if (message.webhookId || message.member || guild.members.cache.has(message.author.id)) continue;
    missing.add(message.author.id);
  }

  const ids = [...missing];
  for (let start = 0; start < ids.length; start += REQUEST_SIZE) {
    try {
      await guild.members.fetch({ user: ids.slice(start, start + REQUEST_SIZE), time: REQUEST_TIMEOUT_MS });
    } catch (err) {
      // names without a role colour are a better transcript than none
      log(`Could not fetch members: ${err instanceof Error ? err.message : String(err)}`);
      // a gateway that is not answering would cost one timeout per batch
      break;
    }
  }
}
