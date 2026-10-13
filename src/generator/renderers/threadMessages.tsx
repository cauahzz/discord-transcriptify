import type { GuildMember, Message, User } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '..';
import { DiscordMessages } from '../discordComponents';
import { displayName, roleColor } from '../../utils/buildProfiles';
import DiscordMessage from './message';

// the total is only comparable when nothing was filtered out; a thread reports it as null when unknown
function threadSummary(collected: number, total: number | null | undefined, filtered = false) {
  if (!filtered && typeof total === 'number' && total > collected) {
    return `Last ${collected} of ${total} messages in thread`;
  }
  return `${collected} message${collected > 1 ? 's' : ''} in thread`;
}

/**
 * The saved messages of a thread, as a collapsible block that needs no script.
 * The thread modal script finds it by `data-thread-id` and shows its messages
 * in a dialog instead.
 */
export function ThreadMessages({
  threadId,
  name,
  starter,
  messages,
  total,
  context,
}: {
  threadId: string;
  name?: string | null;
  /** whoever started the thread: the author of the message it hangs from */
  starter?: { member: GuildMember | null; user: User };
  messages: Message[];
  /** how many messages the thread itself reports, which can be more than were saved */
  total?: number | null;
  context: RenderMessageContext;
}) {
  const last = messages[messages.length - 1];
  const lastText = last.content || (last.attachments.size > 0 ? 'Attachment' : 'Message');

  // the page scripts read these to head the thread panel and to fill the list of threads
  return (
    <details
      className="discord-thread-messages"
      data-thread-id={threadId}
      data-thread-name={name ?? undefined}
      data-thread-starter={starter ? displayName(starter.member, starter.user) : undefined}
      data-thread-starter-color={roleColor(starter?.member)}
      data-thread-starter-avatar={starter?.user.displayAvatarURL({ size: 32, extension: 'png' })}
      data-last-author={displayName(last.member, last.author)}
      data-last-color={roleColor(last.member)}
      data-last-avatar={last.author.displayAvatarURL({ size: 16, extension: 'png' })}
      data-last-text={lastText.length > 100 ? lastText.substring(0, 97) + '...' : lastText}
      data-last-timestamp={last.createdAt.toISOString()}
    >
      <summary>{threadSummary(messages.length, total, context.filtered)}</summary>
      {/* a message only draws itself as a direct child of a message list */}
      <DiscordMessages className="discord-thread-message-list">
        {messages.map((message, index) => (
          <DiscordMessage key={message.id} message={message} context={context} previous={messages[index - 1]} />
        ))}
      </DiscordMessages>
    </details>
  );
}
