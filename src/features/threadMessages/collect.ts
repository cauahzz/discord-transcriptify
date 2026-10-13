import debug from 'debug';
import { MessageType, type Message, type ThreadChannel } from 'discord.js';
import type { CollectContext } from '../types';

const log = debug('discord-transcriptify:threads');

const PAGE_SIZE = 100;

// Each thread is a series of requests of its own, so a handful in parallel is
// enough to be fast without hammering Discord's rate limits.
const MAX_CONCURRENT_THREADS = 3;

async function fetchThreadMessages(
  thread: ThreadChannel,
  limit: number,
  filter: CollectContext['filter']
): Promise<Message[]> {
  // below 1 means no limit, as -1 does for the main channel
  const max = limit >= 1 ? limit : Infinity;
  const kept: Message[] = [];
  let before: string | undefined;

  while (kept.length < max) {
    const size = Math.min(PAGE_SIZE, max - kept.length);
    const page = await thread.messages.fetch(before ? { limit: size, before } : { limit: size });
    kept.push(...(filter ? page.filter(filter) : page).values());
    // paginate on the unfiltered page, or the same messages would be fetched again
    before = page.lastKey();

    if (page.size < size) break;
  }

  // pages come newest first
  return kept.slice(0, max).reverse();
}

async function runPool<T>(items: T[], concurrency: number, task: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await task(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

/**
 * A thread hangs off the channel in one of two ways: started from a message,
 * which then carries it, or created on its own, which leaves a "started a
 * thread" system message pointing at it. An archived thread is not in the
 * cache, so the second kind may need a request to be found.
 */
async function findThread(message: Message): Promise<ThreadChannel | null> {
  // the system message carries the thread flag as well, but its thread is the one it points at
  if (message.type !== MessageType.ThreadCreated) return message.hasThread ? message.thread : null;

  const id = message.reference?.channelId;
  if (!id) return null;

  const channel = message.client.channels.cache.get(id) ?? (await message.client.channels.fetch(id).catch(() => null));
  return channel?.isThread() ? channel : null;
}

export async function collectThreadMessages(messages: Message[], { features, filter, threads }: CollectContext) {
  const { limit } = features.threadMessages;
  // a thread started from a message is reachable from that message and from its system message
  const claimed = new Set<string>();

  // the message that carries a thread goes first, so the thread is filed under it
  const carries = (message: Message) => Number(message.hasThread && message.type !== MessageType.ThreadCreated);
  const ordered = [...messages].sort((a, b) => carries(b) - carries(a));

  await runPool(ordered, MAX_CONCURRENT_THREADS, async (message) => {
    const thread = await findThread(message);
    if (!thread || claimed.has(thread.id)) return;
    claimed.add(thread.id);

    try {
      const threadMessages = await fetchThreadMessages(thread, limit, filter);
      // a message's own thread is looked up by the message, a system message's by the thread it points at
      if (threadMessages.length > 0)
        threads.set(message.type === MessageType.ThreadCreated ? thread.id : message.id, threadMessages);
    } catch (err) {
      // a thread we cannot read (permissions, deleted) must not sink the whole transcript
      log(`Skipping thread ${thread.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
}
