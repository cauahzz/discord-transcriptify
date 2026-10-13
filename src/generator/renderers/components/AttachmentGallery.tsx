import React from 'react';
import { DiscordSpoiler } from '../../discordComponents';
import type { APIAttachment, APIMessage, Attachment as AttachmentType, Message } from 'discord.js';
import type { RenderMessageContext } from '../..';
import { getGalleryLayout, getImageStyle } from './utils';

const MAX_VISIBLE = 10;

const image = (src: string, attachment: AttachmentType) => (
  <img
    src={src}
    alt={attachment.name ?? 'Image attachment'}
    loading="lazy"
    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
  />
);

/**
 * Renders several image attachments as one grid, laid out like Discord's own.
 * Each image still goes through `resolveImageSrc`, so embedding behaves exactly
 * as it does for a single attachment.
 */
export async function AttachmentGallery({
  attachments,
  message,
  context,
  inline,
}: {
  attachments: AttachmentType[];
  message: Message;
  context: RenderMessageContext;
  inline?: boolean;
}) {
  const visible = attachments.slice(0, MAX_VISIBLE);
  const overflow = attachments.length - visible.length;

  const sources = await Promise.all(
    visible.map(async (attachment) => {
      const downloaded = await context.callbacks.resolveImageSrc(
        attachment.toJSON() as APIAttachment,
        message.toJSON() as APIMessage
      );
      // null means the caller wants the image left out of the transcript
      return downloaded === null ? null : (downloaded ?? attachment.url);
    })
  );

  // the layout follows what is actually drawn, or a dropped image would leave a hole in the grid
  const shown = visible.flatMap((attachment, idx) => (sources[idx] ? [{ attachment, src: sources[idx] }] : []));
  if (shown.length === 0) return <></>;
  const count = shown.length;

  return (
    <div
      className="discord-attachment-gallery"
      slot={inline ? undefined : 'attachments'}
      style={{
        ...getGalleryLayout(count),
      }}
    >
      {shown.map(({ attachment, src }, idx) => {
        return (
          <div key={attachment.id} style={{ ...getImageStyle(idx, count), position: 'relative' }}>
            {attachment.spoiler ? <DiscordSpoiler>{image(src, attachment)}</DiscordSpoiler> : image(src, attachment)}
            {overflow > 0 && idx === count - 1 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  fontFamily: 'var(--dt-font)',
                }}
              >
                +{overflow}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
