import {
  DiscordAttachments,
  DiscordCommand,
  DiscordMessage as DiscordMessageComponent,
  DiscordReaction,
  DiscordReactions,
  DiscordThread,
  DiscordThreadMessage,
  DiscordTime,
} from '../discordComponents';
import { MessageFlags, MessageReferenceType, type Message as MessageType } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '..';
import { displayName } from '../../utils/buildProfiles';
import { continuesGroup } from '../../utils/messageGroups';
import { hasFlag, parseDiscordEmoji } from '../../utils/utils';
import { Attachments } from './attachment';
import ComponentRow from './components';
import DiscordPoll from './poll';
import MessageContent, { RenderType } from './content';
import { DiscordEmbed } from './embed';
import MessageReply from './reply';
import { Stickers } from './sticker';
import DiscordSystemMessage from './systemMessage';
import { ThreadMessages } from './threadMessages';

// the part of a message that a forwarded snapshot carries as well
type MessageBodySource = Pick<MessageType, 'content' | 'attachments' | 'embeds' | 'components' | 'flags' | 'stickers'>;

/**
 * Renders content, attachments, embeds and components.
 * @param source - where the body comes from: the message itself, or the snapshot it forwards
 * @param inline - set when rendered inside another element, where slots would hide the children
 */
async function MessageBody({
  source,
  message,
  context,
  inline = false,
}: {
  source: MessageBodySource;
  message: MessageType;
  context: RenderMessageContext;
  inline?: boolean;
}) {
  const isComponentsV2 = hasFlag(source.flags, MessageFlags.IsComponentsV2);

  const components = source.components.map((component, id) => (
    <ComponentRow
      key={id}
      id={id}
      component={component}
      context={context}
      attachments={source.attachments}
      message={message}
    />
  ));

  return (
    <>
      {/* components V2 messages carry no content, attachments, stickers or embeds of their own */}
      {!isComponentsV2 && source.content && (
        <MessageContent
          content={source.content}
          context={{ ...context, type: message.webhookId ? RenderType.WEBHOOK : RenderType.NORMAL }}
        />
      )}

      {!isComponentsV2 && (
        <Attachments
          attachments={source.attachments}
          message={message}
          context={context}
          isVoiceMessage={hasFlag(source.flags, MessageFlags.IsVoiceMessage)}
          inline={inline}
        />
      )}

      {!isComponentsV2 && <Stickers stickers={source.stickers} message={message} context={context} />}

      {!isComponentsV2 &&
        source.embeds.map((embed, id) => (
          <DiscordEmbed embed={embed} context={{ ...context, index: id, message, inline }} key={id} />
        ))}

      {components.length > 0 &&
        (inline ? <div>{components}</div> : <DiscordAttachments slot="components">{components}</DiscordAttachments>)}
    </>
  );
}

export default async function DiscordMessage({
  message,
  context,
  previous,
}: {
  message: MessageType;
  context: RenderMessageContext;
  /** the message drawn right above this one in the same sequence, which decides whether they group */
  previous?: MessageType;
}) {
  if (message.system) return <DiscordSystemMessage message={message} context={context} />;

  // a forward has no content of its own; what it shows lives in the snapshot
  const forwarded =
    message.reference?.type === MessageReferenceType.Forward ? message.messageSnapshots?.first() : undefined;
  const threadMessages =
    context.features.threadMessages.enabled && message.hasThread ? context.threads?.get(message.id) : undefined;
  const edited = message.editedAt !== null;
  // the component prints its label after the text, which for a message without text is right under the name
  const trailingEdited = edited && !(message.content && !hasFlag(message.flags, MessageFlags.IsComponentsV2));
  const isCrosspost = !forwarded && message.reference && message.reference.guildId !== message.guild?.id;

  return (
    <DiscordMessageComponent
      id={`m-${message.id}`}
      timestamp={message.createdAt.toISOString()}
      key={message.id}
      className={continuesGroup(message, previous) ? 'discord-message-continuation' : undefined}
      edited={edited && !trailingEdited}
      server={isCrosspost ?? undefined}
      highlight={message.mentions.everyone}
      profile={message.author.id}
      data-author-id={message.author.id}
      data-author-name={displayName(message.member, message.author)}
      data-pinned={message.pinned ? 'true' : undefined}
      data-timestamp={message.createdAt.toISOString()}
    >
      <MessageReply message={message} context={context} />

      {message.interaction && (
        <DiscordCommand
          slot="reply"
          profile={message.interaction.user.id}
          command={'/' + message.interaction.commandName}
        />
      )}

      {forwarded ? (
        <div className="discord-forwarded">
          <div className="discord-forwarded-label">↪ Forwarded</div>
          <MessageBody source={forwarded} message={message} context={context} inline />
          {forwarded.createdTimestamp && (
            <div className="discord-forwarded-meta">
              <DiscordTime timestamp={forwarded.createdTimestamp} format="f" />
            </div>
          )}
        </div>
      ) : (
        <MessageBody source={message} message={message} context={context} />
      )}

      {message.poll && <DiscordPoll poll={message.poll} />}

      {message.reactions.cache.size > 0 && (
        <DiscordReactions slot="reactions">
          {message.reactions.cache.map((reaction, id) => (
            <DiscordReaction
              key={`${message.id}r${id}`}
              name={reaction.emoji.name!}
              emoji={parseDiscordEmoji(reaction.emoji)}
              count={reaction.count}
            />
          ))}
        </DiscordReactions>
      )}

      {/* the thread slot is the last one, which is where the client puts it */}
      {trailingEdited && (
        <span slot="thread" className="discord-message-edited">
          (edited)
        </span>
      )}

      {message.hasThread && message.thread && (
        <DiscordThread
          slot="thread"
          name={message.thread.name}
          cta={
            message.thread.messageCount
              ? `${message.thread.messageCount} Message${message.thread.messageCount > 1 ? 's' : ''}`
              : 'View Thread'
          }
        >
          {message.thread.lastMessage ? (
            <DiscordThreadMessage profile={message.thread.lastMessage.author.id}>
              <MessageContent
                content={
                  message.thread.lastMessage.content.length > 128
                    ? message.thread.lastMessage.content.substring(0, 125) + '...'
                    : message.thread.lastMessage.content
                }
                context={{ ...context, type: RenderType.REPLY }}
              />
            </DiscordThreadMessage>
          ) : (
            `Thread messages not saved.`
          )}
        </DiscordThread>
      )}

      {/* no slot: the component hides unknown slots, and this has to stay visible */}
      {threadMessages && (
        <ThreadMessages
          threadId={message.thread?.id ?? message.id}
          name={message.thread?.name}
          starter={{ member: message.member, user: message.author }}
          messages={threadMessages}
          total={message.thread?.messageCount}
          context={context}
        />
      )}
    </DiscordMessageComponent>
  );
}
