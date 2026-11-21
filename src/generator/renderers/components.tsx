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
                <Component
                  component={nestedComponent}
                  id={id}
                  key={id}
                  attachments={attachments}
                  context={context}
                  message={message}
                />
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
      return (
        <Component
          component={component as { type: number }}
          id={id}
          key={id}
          attachments={attachments}
          context={context}
          message={message}
        />
      );
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
          type={ButtonStyleMapping[(component as any).style as keyof typeof ButtonStyleMapping] ?? 'secondary'}
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
      return <DiscordSelectMenu key={id} component={component as any} context={context} />;

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

    case ComponentType.Checkbox: {
      const data = (component as any).data ?? component;
      return (
        <DiscordCheckbox
          key={id}
          label={data.label ?? (component as any).label ?? undefined}
          checked={Boolean(data.default ?? data.value ?? (component as any).value)}
        />
      );
    }

    case ComponentType.CheckboxGroup: {
      const data = (component as any).data ?? component;
      const selected = new Set<string>(data.default_values ?? (component as any).defaultValues ?? []);
      return (
        <div
          key={id}
          className="discord-checkbox-group"
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}
        >
          {(data.options ?? (component as any).options ?? []).map((opt: any, idx: number) => (
            <DiscordCheckbox
              key={idx}
              label={opt.label}
              description={opt.description ?? undefined}
              checked={Boolean(opt.default || selected.has(opt.value))}
            />
          ))}
        </div>
      );
    }

    case ComponentType.RadioGroup: {
      const data = (component as any).data ?? component;
      const rawOptions = data.options ?? (component as any).options ?? [];
      const options = rawOptions.map((opt: any) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description ?? undefined,
      }));
      const defaultValues =
        data.default_values ??
        (component as any).defaultValues ??
        rawOptions.filter((opt: any) => opt.default).map((opt: any) => opt.value);
      return <DiscordRadioGroup key={id} options={options} defaultValues={defaultValues} />;
    }

    case ComponentType.Label: {
      const data = (component as any).data ?? component;
      const labelText = (component as any).label ?? data.label;
      const descriptionText = (component as any).description ?? data.description;
      const childComponent = (component as any).component ?? data.component;
      return (
        <div key={id} className="discord-label" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {labelText && (
            <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--dt-text-strong)' }}>{labelText}</div>
          )}
          {descriptionText && <div style={{ fontSize: '12px', color: 'var(--dt-text-muted)' }}>{descriptionText}</div>}
          {childComponent && (
            <Component
              component={childComponent}
              id={0}
              attachments={attachments}
              context={context}
              message={message}
            />
          )}
        </div>
      );
    }

    default:
      return undefined;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
