import { AttachmentBuilder, version, Collection, type Channel, type Message, type TextBasedChannel } from 'discord.js';
import DiscordMessages from './generator';
import {
  ExportReturnType,
  type CreateTranscriptOptions,
  type GenerateFromMessagesOptions,
  type ObjectType,
} from './types';
import { activeFeatures, resolveFeatures, type CollectContext } from './features';
import { getDefaultFilename } from './utils/filename';

export { default as DiscordMessages } from './generator/transcript';
export { TranscriptImageDownloader } from './downloader/images';

const versionPrefix = version.split('.')[0];

if (versionPrefix !== '14' && versionPrefix !== '15') {
  // throw rather than exit: this runs at import time, and a library must not take down the host process
  throw new Error(
    `[discord-transcriptify] discord-transcriptify is only compatible with discord.js v14.x.x and v15.x.x, and you are using v${version}.`
  );
}

/**
 * Generates a transcript from messages you already have.
 *
 * @param messages The messages to generate a transcript from
 * @param channel  The channel the messages are from (used for header and guild name)
 * @param options  The options to use when generating the transcript
 * @returns        The generated transcript
 */
export async function generateFromMessages<T extends ExportReturnType = ExportReturnType.Attachment>(
  messages: Message[] | Collection<string, Message>,
  channel: Channel,
  options: GenerateFromMessagesOptions<T> = {}
): Promise<ObjectType<T>> {
  const transformedMessages = messages instanceof Collection ? Array.from(messages.values()) : messages;

  const features = resolveFeatures(options);
  const enabledFeatures = activeFeatures(features);
  // createTranscript passes its whole options object, so the filter is present at runtime
  // although GenerateFromMessagesOptions does not declare it
  const { filter } = options as { filter?: unknown };
  const collectContext: CollectContext = {
    channel,
    features,
    filter: typeof filter === 'function' ? (filter as CollectContext['filter']) : undefined,
    // discord.js reuses Message objects across calls, so this lives in the run, not on the message
    threads: new Map(),
  };

  if (features.images.enabled && options.callbacks?.resolveImageSrc) {
    console.warn(
      `[discord-transcriptify] You have specified both saveImages and resolveImageSrc, please only specify one. resolveImageSrc will be used.`
    );
  }

  if (features.voiceMessages.enabled && options.callbacks?.resolveVoiceSrc) {
    console.warn(
      `[discord-transcriptify] You have specified both saveVoiceMessages and resolveVoiceSrc, please only specify one. resolveVoiceSrc will be used.`
    );
  }

  // collection lives here, not in createTranscript, so callers who bring their own messages get the same
  // transcript; one feature at a time, because each paces its own requests and running them together
  // would multiply the pressure on Discord's rate limits
  for (const feature of enabledFeatures) {
    await feature.collect?.(transformedMessages, collectContext);
  }

  const html = await DiscordMessages({
    messages: transformedMessages,
    channel,
    features,
    threads: collectContext.threads,
    filtered: collectContext.filter !== undefined,
    callbacks: {
      resolveImageSrc: (attachment) => attachment.url,
      resolveVoiceSrc: (attachment) => attachment.url,
      resolveChannel: async (id) => channel.client.channels.fetch(id).catch(() => null),
      resolveUser: async (id) => channel.client.users.fetch(id).catch(() => null),
      resolveRole: channel.isDMBased() ? () => null : async (id) => channel.guild?.roles.fetch(id).catch(() => null),

      ...Object.assign({}, ...enabledFeatures.map((feature) => feature.callbacks?.(features, collectContext))),
      ...(options.callbacks ?? {}),
    },
    poweredBy: options.poweredBy ?? true,
    footerText: options.footerText ?? 'Exported {number} message{s}.',
    favicon: options.favicon ?? 'guild',
    hydrate: options.hydrate ?? false,
  });

  if (options.returnType === ExportReturnType.Buffer) {
    return Buffer.from(html) as unknown as ObjectType<T>;
  }

  if (options.returnType === ExportReturnType.String) {
    return html as unknown as ObjectType<T>;
  }

  return new AttachmentBuilder(Buffer.from(html), {
    name: options.filename ?? getDefaultFilename(channel),
  }) as unknown as ObjectType<T>;
}

/**
 * Fetches the messages of a channel and generates a transcript from them.
 *
 * @param channel The channel to create a transcript from
 * @param options The options to use when creating the transcript
 * @returns       The generated transcript
 */
export async function createTranscript<T extends ExportReturnType = ExportReturnType.Attachment>(
  channel: TextBasedChannel,
  options: CreateTranscriptOptions<T> = {}
): Promise<ObjectType<T>> {
  if (!channel.isTextBased()) {
    // @ts-expect-error(2339): run-time check
    throw new TypeError(`Provided channel must be text-based, received ${channel.type}`);
  }

  let allMessages: Message[] = [];
  let lastMessageId: string | undefined;
  const { limit, filter } = options;
  const resolvedLimit = typeof limit === 'undefined' || limit === -1 ? Infinity : limit;

  while (true) {
    const fetchLimitOptions = { limit: 100, before: lastMessageId };
    if (!lastMessageId) delete fetchLimitOptions.before;

    const messages = await channel.messages.fetch(fetchLimitOptions);
    const filteredMessages = typeof filter === 'function' ? messages.filter(filter) : messages;

    allMessages.push(...filteredMessages.values());
    // paginate on the unfiltered page, or the same messages would be fetched again
    lastMessageId = messages.lastKey();

    if (messages.size < 100) break;

    if (allMessages.length >= resolvedLimit) break;
  }

  if (resolvedLimit < allMessages.length) allMessages = allMessages.slice(0, limit);

  return generateFromMessages<T>(allMessages.reverse(), channel, options);
}

export default {
  createTranscript,
  generateFromMessages,
};
export * from './types';
