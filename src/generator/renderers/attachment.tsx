import { DiscordAttachment, DiscordAttachments, DiscordSpoiler } from '../discordComponents';
import React from 'react';
import {
  type APIAttachment,
  type APIMessage,
  type Attachment as AttachmentType,
  type Collection,
  type Message,
} from 'discord.js';
import type { RenderMessageContext } from '..';
import type { AttachmentTypes } from '../../types';
import { formatBytes } from '../../utils/utils';
import { AttachmentGallery } from './components/AttachmentGallery';
import { VoiceMessage } from './voice';

/**
 * @param attachments - the attachments to render; a forwarded message passes its snapshot's
 * @param message - the message they are shown in
 * @param isVoiceMessage - read from the same source as the attachments: a forward carries the flag on its snapshot, not on the message
 * @param inline - set when not a direct child of the message element, where a slot would hide them
 */
export async function Attachments(props: {
  attachments: Collection<string, AttachmentType>;
  message: Message;
  context: RenderMessageContext;
  isVoiceMessage: boolean;
  inline?: boolean;
}) {
  if (props.attachments.size === 0) return <></>;

  const all = [...props.attachments.values()];
  if (
    all.length >= 2 &&
    !props.isVoiceMessage &&
    all.every((attachment) => getAttachmentType(attachment) === 'image')
  ) {
    return (
      <AttachmentGallery attachments={all} message={props.message} context={props.context} inline={props.inline} />
    );
  }

  return (
    <DiscordAttachments slot={props.inline ? undefined : 'attachments'}>
      {props.attachments.map((attachment, id) => (
        <Attachment
          attachment={attachment}
          message={props.message}
          context={props.context}
          isVoiceMessage={props.isVoiceMessage}
          key={id}
        />
      ))}
    </DiscordAttachments>
  );
}

function getAttachmentType(attachment: AttachmentType): AttachmentTypes {
  const type = attachment.contentType?.split('/')?.[0] ?? 'unknown';
  if (['audio', 'video', 'image'].includes(type)) return type as AttachmentTypes;
  return 'file';
}

export async function Attachment({
  attachment,
  context,
  message,
  isVoiceMessage,
}: {
  attachment: AttachmentType;
  context: RenderMessageContext;
  message: Message;
  isVoiceMessage: boolean;
}) {
  if (isVoiceMessage) {
    return <VoiceMessage attachment={attachment} context={context} message={message} />;
  }

  let url = attachment.url;
  const name = attachment.name;
  const width = attachment.width;
  const height = attachment.height;

  const type = getAttachmentType(attachment);

  if (type === 'image') {
    const downloaded = await context.callbacks.resolveImageSrc(
      attachment.toJSON() as APIAttachment,
      message.toJSON() as APIMessage
    );

    // null means the caller wants the image left out of the transcript
    if (downloaded === null) return <></>;
    url = downloaded ?? url;
  }

  const rendered =
    type === 'file' ? (
      <FileCard url={url} name={name} size={formatBytes(attachment.size)} />
    ) : (
      <DiscordAttachment
        type={type}
        size={formatBytes(attachment.size)}
        key={attachment.id}
        slot="attachment"
        url={url}
        alt={name ?? undefined}
        width={width ?? undefined}
        height={height ?? undefined}
      />
    );

  return attachment.spoiler ? (
    <DiscordSpoiler key={attachment.id} slot="attachment">
      {rendered}
    </DiscordSpoiler>
  ) : (
    rendered
  );
}

// the slot keeps the card in the attachments grid; the name is the link and the arrow downloads
export function FileCard({
  url,
  name,
  size,
  slotted = true,
}: {
  url: string;
  name: string | null;
  size?: string;
  /** off when the card sits inside another element, where a slot would hide it */
  slotted?: boolean;
}) {
  return (
    <div className="discord-custom-file-base" slot={slotted ? 'attachment' : undefined}>
      <div className="discord-custom-file-icon">
        <svg width="30" height="40" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M18 0H4C1.79086 0 0 1.79086 0 4V36C0 38.2091 1.79086 40 4 40H26C28.2091 40 30 38.2091 30 36V12L18 0Z"
            fill="#C9CDD3"
          />
          <path d="M18 0L30 12H18V0Z" fill="#88919E" />
        </svg>
      </div>
      <div className="discord-custom-file-inner">
        <a className="discord-custom-file-name" href={url} target="_blank" rel="noopener noreferrer">
          {name ?? 'file'}
        </a>
        {size && <div className="discord-custom-file-size">{size}</div>}
      </div>
      <a className="discord-custom-file-download" href={url} download={name ?? true} aria-label="Download">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M16.293 9.29289C16.6835 8.90237 17.3167 8.90237 17.7072 9.29289C18.0977 9.68342 18.0977 10.3166 17.7072 10.7071L12.7072 15.7071C12.3167 16.0976 11.6835 16.0976 11.293 15.7071L6.29297 10.7071C5.90244 10.3166 5.90244 9.68342 6.29297 9.29289C6.68349 8.90237 7.31666 8.90237 7.70718 9.29289L11.0001 12.5858V2C11.0001 1.44772 11.4478 1 12.0001 1C12.5524 1 13.0001 1.44772 13.0001 2V12.5858L16.293 9.29289ZM3 19C2.44772 19 2 19.4477 2 20C2 20.5523 2.44772 21 3 21H21C21.5523 21 22 20.5523 22 20C22 19.4477 21.5523 19 21 19H3Z"
          />
        </svg>
      </a>
    </div>
  );
}
