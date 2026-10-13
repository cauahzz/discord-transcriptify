import React from 'react';
import type { APIMessage, Attachment as AttachmentType, MediaGalleryComponent } from 'discord.js';
import { DiscordSpoiler } from '../../discordComponents';
import { getGalleryLayout, getImageStyle } from './utils';
import type { ResolveImageCallback } from '../../../downloader/images';
import { resolveImageUrl } from '../../../utils/resolveImage';

/**
 * Resolves a URL that might be an `attachment://` reference to an actual CDN URL.
 */
function resolveUrl(url: string, attachments: Map<string, AttachmentType>): string {
  if (!url) return '';
  if (url.startsWith('attachment://')) {
    const filename = url.slice('attachment://'.length);
    for (const [, attachment] of attachments) {
      if (attachment.name === filename || attachment.url.includes(encodeURIComponent(filename))) {
        return attachment.url;
      }
    }
  }
  return url;
}

function getMediaUrl(item: { media?: { url?: string }; data?: { media?: { url?: string } } }): string {
  if (item.media?.url) return item.media.url;
  if (item.data?.media?.url) return item.data.media.url;
  return '';
}

interface MediaGalleryItemResolved {
  url: string | null;
  description: string | null;
  spoiler: boolean;
  width: number;
  height: number;
}

interface DiscordMediaGalleryProps {
  component: MediaGalleryComponent;
  attachments: Map<string, AttachmentType>;
  resolveImageSrc?: ResolveImageCallback;
  message?: APIMessage;
}

async function DiscordMediaGallery({ component, attachments, resolveImageSrc, message }: DiscordMediaGalleryProps) {
  if (!component.items || component.items.length === 0) {
    return null;
  }

  const total = component.items.length;
  const imagesToShow = component.items.slice(0, 10);
  const hasMore = total > 10;

  const resolved: MediaGalleryItemResolved[] = await Promise.all(
    imagesToShow.map(async (media) => {
      const rawUrl = getMediaUrl(media);
      const resolvedUrl = resolveUrl(rawUrl, attachments);
      const rawMedia = media.media?.data;
      const width = rawMedia?.width ?? 0;
      const height = rawMedia?.height ?? 0;

      const url =
        resolveImageSrc && message
          ? await resolveImageUrl(resolvedUrl, resolveImageSrc, message, {
              width,
              height,
              filename: media.description || 'media.png',
            })
          : resolvedUrl;

      return {
        url,
        description: media.description,
        spoiler: media.spoiler,
        width,
        height,
      };
    })
  );

  // the layout follows what is actually drawn, or a dropped image would leave a hole in the grid
  const resolvedItems = resolved.filter((item) => item.url);
  if (resolvedItems.length === 0) return null;
  const count = resolvedItems.length;

  return (
    <div
      className="discord-media-gallery"
      style={{
        ...getGalleryLayout(count),
      }}
    >
      {resolvedItems.map((item, idx) => {
        const imageElement = (
          <img
            src={item.url!}
            alt={item.description || 'Media content'}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        );

        return (
          <div key={idx} style={{ ...getImageStyle(idx, count), position: 'relative' }}>
            {item.spoiler ? <DiscordSpoiler>{imageElement}</DiscordSpoiler> : imageElement}
            {hasMore && idx === resolvedItems.length - 1 && (
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
                +{total - 10}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DiscordMediaGallery;
