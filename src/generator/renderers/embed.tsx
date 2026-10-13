import {
  DiscordEmbed as DiscordEmbedComponent,
  DiscordEmbedDescription,
  DiscordEmbedField,
  DiscordEmbedFields,
  DiscordEmbedFooter,
} from '../discordComponents';
import type { APIMessage, Embed, Message } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '..';
import { calculateInlineIndex } from '../../utils/embeds';
import { resolveImageUrl } from '../../utils/resolveImage';
import MessageContent, { RenderType } from './content';

type RenderEmbedContext = RenderMessageContext & {
  index: number;
  message: Message;
  /** set when the embed is not a direct child of the message element, where a slot would hide it */
  inline?: boolean;
};

export async function DiscordEmbed({ embed, context }: { embed: Embed; context: RenderEmbedContext }) {
  const message = context.message.toJSON() as APIMessage;
  const resolve = async (url: string | undefined, size?: { width?: number; height?: number }) =>
    url ? ((await resolveImageUrl(url, context.callbacks.resolveImageSrc, message, size)) ?? undefined) : undefined;

  const [authorImage, image, thumbnail, footerImage] = await Promise.all([
    resolve(embed.author?.proxyIconURL ?? embed.author?.iconURL),
    resolve(embed.image?.proxyURL ?? embed.image?.url, embed.image ?? undefined),
    resolve(embed.thumbnail?.proxyURL ?? embed.thumbnail?.url, embed.thumbnail ?? undefined),
    resolve(embed.footer?.proxyIconURL ?? embed.footer?.iconURL),
  ]);

  return (
    <DiscordEmbedComponent
      embedTitle={embed.title ?? undefined}
      slot={context.inline ? undefined : 'embeds'}
      key={`${context.message.id}-e-${context.index}`}
      authorImage={authorImage}
      authorName={embed.author?.name}
      authorUrl={embed.author?.url}
      color={embed.hexColor ?? undefined}
      image={image}
      thumbnail={thumbnail}
      url={embed.url ?? undefined}
    >
      {embed.description && (
        <DiscordEmbedDescription slot="description">
          <MessageContent content={embed.description} context={{ ...context, type: RenderType.EMBED }} />
        </DiscordEmbedDescription>
      )}

      {embed.fields.length > 0 && (
        <DiscordEmbedFields slot="fields">
          {embed.fields.map(async (field, id) => (
            <DiscordEmbedField
              key={`${context.message.id}-e-${context.index}-f-${id}`}
              fieldTitle={field.name}
              inline={field.inline}
              inlineIndex={calculateInlineIndex(embed.fields, id)}
            >
              <MessageContent content={field.value} context={{ ...context, type: RenderType.EMBED }} />
            </DiscordEmbedField>
          ))}
        </DiscordEmbedFields>
      )}

      {embed.footer && (
        <DiscordEmbedFooter slot="footer" footerImage={footerImage} timestamp={embed.timestamp ?? undefined}>
          {embed.footer.text}
        </DiscordEmbedFooter>
      )}
    </DiscordEmbedComponent>
  );
}
