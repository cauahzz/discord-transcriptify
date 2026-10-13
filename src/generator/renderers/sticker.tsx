import type { APIMessage, Collection, Message, Sticker } from 'discord.js';
import { StickerFormatType } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '..';
import { resolveImageUrl } from '../../utils/resolveImage';

const STICKER_SIZE = 160;

function stickerUrl(sticker: Sticker): string {
  const base = `https://media.discordapp.net/stickers/${sticker.id}`;
  return sticker.format === StickerFormatType.GIF ? `${base}.gif` : `${base}.png?size=${STICKER_SIZE}`;
}

async function StickerItem({
  sticker,
  message,
  context,
}: {
  sticker: Sticker;
  message: Message;
  context: RenderMessageContext;
}) {
  // Lottie needs a player script, and the transcript does not load third-party scripts
  if (sticker.format === StickerFormatType.Lottie) {
    return (
      <div className="discord-sticker discord-sticker--lottie">
        <span className="discord-sticker-name">{sticker.name}</span>
        <span className="discord-sticker-hint">Animated sticker</span>
      </div>
    );
  }

  const src = await resolveImageUrl(
    stickerUrl(sticker),
    context.callbacks.resolveImageSrc,
    message.toJSON() as APIMessage,
    {
      width: STICKER_SIZE,
      height: STICKER_SIZE,
      filename: sticker.name,
    }
  );

  if (src === null) return <></>;

  return <img className="discord-sticker" src={src} alt={sticker.name} width={STICKER_SIZE} height={STICKER_SIZE} />;
}

/**
 * Renders the stickers of a message or of a forwarded snapshot
 * @param stickers - may be missing on a snapshot built by an older discord.js
 */
export async function Stickers({
  stickers,
  message,
  context,
}: {
  stickers: Collection<string, Sticker> | undefined;
  message: Message;
  context: RenderMessageContext;
}) {
  if (!stickers || stickers.size === 0) return <></>;

  return (
    <>
      {stickers.map((sticker, id) => (
        <StickerItem sticker={sticker} message={message} context={context} key={id} />
      ))}
    </>
  );
}
