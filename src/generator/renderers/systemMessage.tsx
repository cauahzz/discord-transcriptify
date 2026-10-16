import { DiscordReaction, DiscordReactions, DiscordSystemMessage } from '../discordComponents';
import { MessageType, type GuildMember, type Message, type User } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '..';
import { displayName, roleColor } from '../../utils/buildProfiles';
import MessageContent, { RenderType } from './content';
import { parseDiscordEmoji } from '../../utils/utils';
import { ThreadMessages } from './threadMessages';

export default async function SystemMessage({ message, context }: { message: Message; context: RenderMessageContext }) {
  switch (message.type) {
    case MessageType.RecipientAdd:
    case MessageType.UserJoin:
      return (
        <DiscordSystemMessage
          id={`m-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="join"
        >
          <JoinMessage member={message.member} fallbackUser={message.author} timestamp={message.createdTimestamp} />
        </DiscordSystemMessage>
      );

    case MessageType.ChannelPinnedMessage:
      return (
        <DiscordSystemMessage
          id={`m-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="pin"
        >
          <Highlight color={message.member?.roles.color?.hexColor}>
            {message.author.displayName ?? message.author.username}
          </Highlight>{' '}
          pinned <i data-goto={message.reference?.messageId}>a message</i> to this channel.
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
        </DiscordSystemMessage>
      );

    case MessageType.GuildBoost:
    case MessageType.GuildBoostTier1:
    case MessageType.GuildBoostTier2:
    case MessageType.GuildBoostTier3:
      return (
        <DiscordSystemMessage
          id={`m-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="boost"
        >
          <Highlight color={message.member?.roles.color?.hexColor}>
            {message.author.displayName ?? message.author.username}
          </Highlight>{' '}
          boosted the server!
        </DiscordSystemMessage>
      );

    case MessageType.ThreadCreated:
      return (
        <DiscordSystemMessage
          id={`m-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="thread"
        >
          <Highlight color={message.member?.roles.color?.hexColor}>
            {message.author.displayName ?? message.author.username}
          </Highlight>{' '}
          started a thread: <strong>{message.content}</strong>. See all <strong>threads</strong>.
          <ThreadPreviewBox message={message} context={context} />
        </DiscordSystemMessage>
      );

    case MessageType.ThreadStarterMessage:
      return (
        <DiscordSystemMessage
          id={`ms-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="thread"
        >
          <Highlight color={message.member?.roles.color?.hexColor}>
            {message.author.displayName ?? message.author.username}
          </Highlight>{' '}
          started a thread: <i data-goto={message.reference?.messageId}>{message.content}</i>
        </DiscordSystemMessage>
      );

    case MessageType.PollResult: {
      const fields = new Map((message.embeds[0]?.fields ?? []).map((field) => [field.name, field.value] as const));
      const question = fields.get('poll_question_text');
      const winner = fields.get('victor_answer_text');
      const winnerVotes = fields.get('victor_answer_votes');
      const totalVotes = fields.get('total_votes');

      return (
        <DiscordSystemMessage
          id={`m-${message.id}`}
          key={message.id}
          timestamp={message.createdAt.toISOString()}
          type="thread"
        >
          <Highlight color={message.member?.roles.color?.hexColor}>
            {message.author.displayName ?? message.author.username}
          </Highlight>
          {"'s poll "}
          {question && <strong>{question}</strong>}
          {question && ' '}
          has closed.
          {winner && (
            <>
              {' '}
              Winner: <strong>{winner}</strong>
              {winnerVotes && ` with ${winnerVotes} ${winnerVotes === '1' ? 'vote' : 'votes'}`}
              {totalVotes && ` (${totalVotes} total)`}.
            </>
          )}
        </DiscordSystemMessage>
      );
    }

    // these types have no rendering of their own
    case MessageType.Default:
    case MessageType.RecipientRemove:
    case MessageType.Call:
    case MessageType.ChannelNameChange:
    case MessageType.ChannelIconChange:
    case MessageType.ChannelFollowAdd:
    case MessageType.GuildDiscoveryDisqualified:
    case MessageType.GuildDiscoveryRequalified:
    case MessageType.GuildDiscoveryGracePeriodInitialWarning:
    case MessageType.GuildDiscoveryGracePeriodFinalWarning:
    case MessageType.Reply:
    case MessageType.ChatInputCommand:
    case MessageType.GuildInviteReminder:
    case MessageType.ContextMenuCommand:
    case MessageType.AutoModerationAction:
    case MessageType.RoleSubscriptionPurchase:
    case MessageType.InteractionPremiumUpsell:
    case MessageType.StageStart:
    case MessageType.StageEnd:
    case MessageType.StageSpeaker:
    case MessageType.StageRaiseHand:
    case MessageType.StageTopic:
    case MessageType.GuildApplicationPremiumSubscription:
    case MessageType.GuildIncidentAlertModeEnabled:
    case MessageType.GuildIncidentAlertModeDisabled:
    case MessageType.GuildIncidentReportRaid:
    case MessageType.GuildIncidentReportFalseAlarm:
    case MessageType.PurchaseNotification:
      return undefined;

    default:
      return undefined;
  }
}

/**
 * The card under "started a thread": the thread's name and size, and the last
 * message in it. The thread is looked up by the id its system message points
 * at, which is also what the thread's own message block is labelled with, so
 * the modal script can open it from here.
 */
export async function ThreadPreviewBox({ message, context }: { message: Message; context: RenderMessageContext }) {
  const threadId = message.reference?.channelId;
  const thread = threadId ? message.guild?.channels.cache.get(threadId) : undefined;
  const saved = threadId ? context.threads?.get(threadId) : undefined;
  // what was collected is the newest message even when the cache holds an older one
  const last = saved?.at(-1) ?? (thread?.isThread() ? thread.lastMessage : null);
  // the thread knows its own size; the collected messages only know what was kept
  const count = thread?.isThread() && typeof thread.messageCount === 'number' ? thread.messageCount : saved?.length;
  const color = roleColor(last?.member);
  // a thread started from a message has that message's id, and the message shows the thread's messages itself
  const startedFromExported = context.messages.some(
    (other) => other.id === threadId && other.hasThread && !other.system
  );

  return (
    // the slot puts the card after the sentence and its timestamp instead of between them
    <div className="discord-thread-preview-container" slot="thread">
      <div className="discord-thread-preview-box" data-thread-id={threadId} data-thread-name={message.content}>
        <div className="discord-thread-preview-header">
          {message.content}
          {count ? <span>{`${count} message${count > 1 ? 's' : ''} ›`}</span> : null}
        </div>
        {last && (
          <div className="discord-thread-preview-message">
            <img src={last.author.displayAvatarURL({ size: 16, extension: 'png' })} alt="" />
            <strong style={color ? { color } : undefined}>{displayName(last.member, last.author)}</strong>
            <span>
              {last.content ? (
                <MessageContent
                  content={last.content.length > 128 ? last.content.substring(0, 125) + '...' : last.content}
                  context={{ ...context, type: RenderType.REPLY }}
                />
              ) : (
                <em>{last.attachments.size > 0 ? 'Attachment' : 'Message'}</em>
              )}
            </span>
          </div>
        )}
      </div>
      {threadId && saved && context.features.threadMessages.enabled && !startedFromExported && (
        <ThreadMessages
          threadId={threadId}
          name={message.content}
          starter={{ member: message.member, user: message.author }}
          messages={saved}
          total={thread?.isThread() ? thread.messageCount : undefined}
          context={context}
        />
      )}
    </div>
  );
}

function Highlight({ children, color }: { children: React.ReactNode; color?: string }) {
  return <i style={color ? { color } : undefined}>{children}</i>;
}

const allJoinMessages = [
  '{user} just joined the server - glhf!',
  '{user} just joined. Everyone, look busy!',
  '{user} just joined. Can I get a heal?',
  '{user} joined your party.',
  '{user} joined. You must construct additional pylons.',
  'Ermagherd. {user} is here.',
  'Welcome, {user}. Stay awhile and listen.',
  'Welcome, {user}. We were expecting you ( ͡° ͜ʖ ͡°)',
  'Welcome, {user}. We hope you brought pizza.',
  'Welcome {user}. Leave your weapons by the door.',
  'A wild {user} appeared.',
  'Swoooosh. {user} just landed.',
  'Brace yourselves {user} just joined the server.',
  '{user} just joined. Hide your bananas.',
  '{user} just arrived. Seems OP - please nerf.',
  '{user} just slid into the server.',
  'A {user} has spawned in the server.',
  'Big {user} showed up!',
  "Where's {user}? In the server!",
  '{user} hopped into the server. Kangaroo!!',
  '{user} just showed up. Hold my beer.',
  'Challenger approaching - {user} has appeared!',
  "It's a bird! It's a plane! Nevermind, it's just {user}.",
  "It's {user}! Praise the sun! \\\\[T]/",
  'Never gonna give {user} up. Never gonna let {user} down.',
  'Ha! {user} has joined! You activated my trap card!',
  'Cheers, love! {user} is here!',
  'Hey! Listen! {user} has joined!',
  "We've been expecting you {user}",
  "It's dangerous to go alone, take {user}!",
  "{user} has joined the server! It's super effective!",
  'Cheers, love! {user} is here!',
  '{user} is here, as the prophecy foretold.',
  "{user} has arrived. Party's over.",
  'Ready player {user}',
  '{user} is here to kick butt and chew bubblegum. And {user} is all out of gum.',
  "Hello. Is it {user} you're looking for?",
];

export function JoinMessage({
  member,
  fallbackUser,
  timestamp,
}: {
  member: GuildMember | null;
  fallbackUser: User;
  timestamp: number;
}) {
  // picked from the date, so exporting the same channel twice gives the same text
  const template = allJoinMessages[timestamp % allJoinMessages.length];

  return template
    .split('{user}')
    .flatMap((item, i) => [
      item,
      <Highlight color={member?.roles.color?.hexColor} key={i}>
        {member?.nickname ?? fallbackUser.displayName ?? fallbackUser.username}
      </Highlight>,
    ])
    .slice(0, -1);
}
