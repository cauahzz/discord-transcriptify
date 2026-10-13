import type { APIAttachment, APIMessage, Awaitable } from 'discord.js';
import { fetchGuarded } from '../downloader/fetch';
import { ByteBudget } from '../downloader/budget';
import type { FeatureDescriptor } from './types';

export type VoiceFetcherOptions = {
  maxSizeKb: number;
  /** Ceiling for all embedded voice messages together, in kilobytes; zero or less means no limit. */
  maxTotalSizeKb?: number;
  allowPrivateNetwork?: boolean;
};

/**
 * Builds the callback that turns a voice message into a data url.
 * Anything that is not audio is refused, so a URL that serves something else
 * never ends up inside an `<audio>` source.
 */
export function buildVoiceFetcher({
  maxSizeKb,
  maxTotalSizeKb = 0,
  allowPrivateNetwork,
}: VoiceFetcherOptions): (attachment: APIAttachment, message: APIMessage) => Awaitable<string | undefined> {
  const budget = new ByteBudget(maxTotalSizeKb * 1024);

  return async (attachment) => {
    if (budget.exhausted) return undefined;

    const fetched = await fetchGuarded(attachment.url, { maxBytes: maxSizeKb * 1024, allowPrivateNetwork });
    if (!fetched) return undefined;

    const type = fetched.contentType?.split(';')[0].trim().toLowerCase();
    if (!type?.startsWith('audio/')) return undefined;

    const source = `data:${type};base64,${fetched.buffer.toString('base64')}`;
    return budget.take(source.length) ? source : undefined;
  };
}

export const voiceMessagesFeature: FeatureDescriptor = {
  key: 'voiceMessages',

  callbacks: ({ voiceMessages }) => ({
    resolveVoiceSrc: buildVoiceFetcher({
      maxSizeKb: voiceMessages.maxSizeKb,
      maxTotalSizeKb: voiceMessages.maxTotalSizeKb,
    }),
  }),
};
