import { DiscordActionRow, DiscordSpoiler } from '../discordComponents';
import {
  ComponentType,
  type APIMessage,
  type Attachment as AttachmentType,
  type Message,
  type ThumbnailComponent,
  type MessageActionRowComponent,
  type TopLevelComponent,
} from 'discord.js';
import React from 'react';
import { formatBytes, parseDiscordEmoji } from '../../utils/utils';
import { FileCard } from './attachment';
import DiscordSelectMenu from './components/Select Menu';
import DiscordContainer from './components/Container';
import DiscordSection from './components/section/Section';
import DiscordMediaGallery from './components/Media Gallery';
import DiscordSeparator from './components/Spacing';
import DiscordButton from './components/Button';
import DiscordThumbnail from './components/Thumbnail';
import DiscordCheckbox from './components/Checkbox';
import DiscordRadioGroup from './components/RadioGroup';
import MessageContent from './content';
import { RenderType } from './content';
import { resolveImageUrl } from '../../utils/resolveImage';
import type { RenderMessageContext } from '..';
import { ButtonStyleMapping } from './components/styles';

/**
 * Resolves a URL that might be an `attachment://` reference to an actual CDN URL.
 */
function resolveMediaUrl(url: string, attachments: Map<string, AttachmentType>): string {
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

// the last path segment, for a file whose attachment was not part of the message
function fileNameOf(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '') || null;
  } catch {
    return null;
  }
}

export default function ComponentRow({
  component,
  id,
  context,
  attachments,
  message,
}: {
  component: TopLevelComponent;
  id: number;
  context: RenderMessageContext;
  attachments?: Map<string, AttachmentType>;
  message?: Message;
}) {
  switch (component.type) {
    case ComponentType.ActionRow:
      return (
        <div key={id} className="discord-component-row">
          <DiscordActionRow>
            <>
              {(component.components ?? []).map((nestedComponent, id) => (
                <Component component={nestedComponent} id={id} key={id} attachments={attachments} />
              ))}
            </>
          </DiscordActionRow>
        </div>
      );

    case ComponentType.Container:
      return (
        <DiscordContainer key={id} accentColor={component.accentColor} spoiler={component.spoiler}>
          <>
            {(component.components ?? []).map((nestedComponent, id) => (
              <ComponentRow
                component={nestedComponent as TopLevelComponent}
                id={id}
                key={id}
                context={context}
                attachments={attachments}
                message={message}
              />
            ))}
          </>
        </DiscordContainer>
      );

    case ComponentType.File: {
      const fileUrl = resolveMediaUrl(component.file.url, attachments ?? new Map());
      const source = [...(attachments?.values() ?? [])].find((attachment) => attachment.url === fileUrl);
      // the API echoes the name and size on the component, which covers a file that is not among the attachments
      const fileSize = source?.size ?? component.data.size;
      const card = (
        <FileCard
          url={fileUrl}
          name={source?.name ?? component.data.name ?? fileNameOf(fileUrl)}
          size={fileSize === undefined ? undefined : formatBytes(fileSize)}
          slotted={false}
        />
      );
      return component.spoiler ? (
        <DiscordSpoiler key={id}>{card}</DiscordSpoiler>
      ) : (
        <React.Fragment key={id}>{card}</React.Fragment>
      );
    }

    case ComponentType.MediaGallery:
      return (
        <DiscordMediaGallery
          component={component}
          key={id}
          attachments={attachments ?? new Map()}
          resolveImageSrc={context.callbacks.resolveImageSrc}
          message={message?.toJSON() as APIMessage}
        />
      );

    case ComponentType.Section:
      return (
        <DiscordSection
          key={id}
          accessory={component.accessory}
          id={id}
          attachments={attachments}
          context={context}
          message={message}
        >
          {(component.components ?? []).map((nestedComponent, id) => (
            <ComponentRow
              component={nestedComponent as TopLevelComponent}
              id={id}
              key={id}
              context={context}
              attachments={attachments}
              message={message}
            />
          ))}
        </DiscordSection>
      );

    case ComponentType.Separator:
      return <DiscordSeparator key={id} spacing={component.spacing} divider={component.divider} />;

    case ComponentType.TextDisplay:
      return (
        <div key={id} className="discord-text-display">
          <MessageContent content={component.content} context={{ ...context, type: RenderType.NORMAL }} />
        </div>
      );

    default:
      return null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function Component({
  component,
  id,
  attachments,
  context,
  message,
}: {
  component: MessageActionRowComponent | ThumbnailComponent | { type: number; [key: string]: any };
  id: number;
  attachments?: Map<string, AttachmentType>;
  context?: RenderMessageContext;
  message?: Message;
}) {
  switch (component.type) {
    case ComponentType.Button:
      return (
        <DiscordButton
          key={id}
          type={ButtonStyleMapping[(component as any).style as keyof typeof ButtonStyleMapping]}
          url={(component as any).url ?? undefined}
          disabled={!!(component as any).disabled}
          emoji={(component as any).emoji ? parseDiscordEmoji((component as any).emoji) : undefined}
        >
          {(component as any).label}
        </DiscordButton>
      );

    case ComponentType.StringSelect:
    case ComponentType.UserSelect:
    case ComponentType.RoleSelect:
    case ComponentType.MentionableSelect:
    case ComponentType.ChannelSelect:
      return <DiscordSelectMenu key={id} component={component as any} />;

    case ComponentType.Thumbnail: {
      const mediaUrl = resolveMediaUrl((component as any).media.url, attachments ?? new Map());
      const thumbUrl =
        context && message
          ? await resolveImageUrl(mediaUrl, context.callbacks.resolveImageSrc, message.toJSON() as APIMessage)
          : mediaUrl;
      if (thumbUrl === null) return undefined;
      return (
        <DiscordThumbnail
          key={id}
          url={thumbUrl}
          description={(component as any).description ?? undefined}
          spoiler={(component as any).spoiler}
        />
      );
    }

    case ComponentType.Checkbox:
      return <DiscordCheckbox key={id} label={(component as any).label} checked={(component as any).value} />;

    case ComponentType.RadioGroup:
      return (
        <DiscordRadioGroup
          key={id}
          options={(component as any).options.map((opt: any) => ({
            label: opt.label,
            value: opt.value,
            description: opt.description ?? undefined,
          }))}
          defaultValues={(component as any).defaultValues}
        />
      );

    default:
      return undefined;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
