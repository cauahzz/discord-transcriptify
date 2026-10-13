import { DiscordMessages as DiscordMessagesComponent } from './discordComponents';
import { ChannelType, type Channel } from 'discord.js';
import React from 'react';
import type { RenderMessageContext } from '.';
import MessageContent, { RenderType } from './renderers/content';
import DiscordMessage from './renderers/message';
import { globalStyles } from './renderers/components/styles';

const GLYPH_THREAD =
  'M12 2.81a1 1 0 0 1 0-1.41l.36-.36a1 1 0 0 1 1.41 0l9.2 9.2a1 1 0 0 1 0 1.4l-.7.7a1 1 0 0 1-1.3.13l-9.54-6.72a1 1 0 0 1-.08-1.58l1-1L12 2.8ZM12 21.2a1 1 0 0 1 0 1.41l-.35.35a1 1 0 0 1-1.41 0l-9.2-9.19a1 1 0 0 1 0-1.41l.7-.7a1 1 0 0 1 1.3-.12l9.54 6.72a1 1 0 0 1 .07 1.58l-1 1 .35.36ZM15.66 16.8a1 1 0 0 1-1.38.28l-8.49-5.66A1 1 0 1 1 6.9 9.76l8.49 5.65a1 1 0 0 1 .27 1.39ZM17.1 14.25a1 1 0 1 0 1.11-1.66L9.73 6.93a1 1 0 0 0-1.11 1.66l8.49 5.66Z';
const GLYPH_VOICE =
  'M12 3a1 1 0 0 1 1 1v10.38a3 3 0 1 1-2 2.83V8.62l-6 1.2v6.59a3 3 0 1 1-2 2.8V7a1 1 0 0 1 .8-.98l8-1.6A1 1 0 0 1 12 3Z';
const GLYPH_FORUM = 'M5 3h14a2 2 0 0 1 2 2v14l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 4v2h10V7H7Zm0 4v2h7v-2H7Z';
const GLYPH_OTHER =
  'M5.47 3.47a.75.75 0 0 1 1.06 0L8.06 5h4.88l1.53-1.53a.75.75 0 1 1 1.06 1.06L14.06 6h2.19a.75.75 0 0 1 0 1.5h-3.69L11.31 12h3.94a.75.75 0 0 1 0 1.5h-4.44l-.72 2.53a.75.75 0 0 1-1.44-.41l.6-2.12H4.75a.75.75 0 0 1 0-1.5h4.94l1.25-4.5H6.75a.75.75 0 0 1 0-1.5h4.6l.72-2.53a.75.75 0 0 1 .41-.5Z';
const TOOL_PINS =
  'M15.45 3.05a1 1 0 0 1 1.41 0l4.1 4.1a1 1 0 0 1 0 1.41l-1.28 1.28a3 3 0 0 0-.88 2.12v2.54a1 1 0 0 1-.3.71l-2.1 2.1a1 1 0 0 1-1.41 0l-3.7-3.7-5.58 5.58a1 1 0 1 1-1.41-1.41l5.58-5.58-3.7-3.7a1 1 0 0 1 0-1.41l2.1-2.1a1 1 0 0 1 .7-.3h2.55c.8 0 1.57-.32 2.12-.88l1.3-1.28Z';
const TOOL_MEMBERS =
  'M12 12.5a3.25 3.25 0 1 0 0-6.5a3.25 3.25 0 0 0 0 6.5Zm-6.25 0a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5Zm12.5 0a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 0 0 0 5.5ZM12 14c-3.37 0-6.25 1.7-6.25 4.13c0 .48.39.87.88.87h10.74c.49 0 .88-.39.88-.87C18.25 15.7 15.37 14 12 14Zm-8.93 1.32C1.78 15.87 1 16.7 1 17.66c0 .37.3.67.67.67h2.8c-.06-.27-.09-.56-.09-.85c0-.82.27-1.56.69-2.16Zm17.86 0c.42.6.69 1.34.69 2.16c0 .29-.03.58-.1.85h2.81c.37 0 .67-.3.67-.67c0-.96-.78-1.79-2.07-2.34Z';

function channelName(channel: Channel) {
  if (!channel.isDMBased()) return channel.name;
  return channel.type === ChannelType.DM ? (channel.recipient?.tag ?? 'Unknown Recipient') : 'Unknown Recipient';
}

function HeaderChannelGlyph({ channel }: { channel: Channel }) {
  if (channel.isDMBased() && channel.type === ChannelType.DM && channel.recipient) {
    return (
      <img
        src={channel.recipient.displayAvatarURL({ size: 64 })}
        alt={channel.recipient.username}
        className="discord-transcript-header-avatar"
      />
    );
  }

  if (!channel.isThread() && !channel.isVoiceBased() && channel.type !== ChannelType.GuildForum) {
    return (
      <span className="discord-transcript-header-glyph discord-transcript-header-glyph--hash" aria-hidden="true">
        #
      </span>
    );
  }

  const path = channel.isThread()
    ? GLYPH_THREAD
    : channel.isVoiceBased()
      ? GLYPH_VOICE
      : channel.type === ChannelType.GuildForum
        ? GLYPH_FORUM
        : GLYPH_OTHER;

  return (
    <span className="discord-transcript-header-glyph" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d={path} />
      </svg>
    </span>
  );
}

function HeaderServerIcon({ channel }: { channel: Channel }) {
  if (channel.isDMBased()) return null;
  const icon = channel.guild.iconURL({ size: 128 });
  if (!icon) return null;
  return <img src={icon} alt={channel.guild.name} className="discord-transcript-header-server-icon" />;
}

function HeaderTool({
  label,
  path,
  action,
  hideOnMobile = false,
}: {
  label: string;
  path: string;
  action: string;
  hideOnMobile?: boolean;
}) {
  return (
    <button
      type="button"
      className={`discord-transcript-header-tool${hideOnMobile ? ' discord-transcript-header-tool--hide-mobile' : ''}`}
      aria-label={label}
      title={label}
      aria-expanded="false"
      data-transcript-action={action}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d={path} />
      </svg>
    </button>
  );
}

/**
 * The core transcript component.
 * Expects window.$discordMessage.profiles to be set for profile information.
 */
export default async function DiscordMessages({ messages, channel, callbacks, ...options }: RenderMessageContext) {
  const { uiPinnedMessages, uiMemberList, uiSearch, uiThreadModal } = options.features;
  // the list of threads opens them in the dialog, so it needs both the script and something saved
  const showThreads = uiThreadModal.enabled && (options.threads?.size ?? 0) > 0;
  const name = channelName(channel);

  return (
    <DiscordMessagesComponent style={{ minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      {/* the search script reads the channel name from here for its placeholder */}
      <div className="discord-transcript-header-bar" data-channel-name={name}>
        <div className="discord-transcript-header-main">
          <HeaderServerIcon channel={channel} />
          <span className="discord-transcript-header-guild">
            {channel.isDMBased() ? 'Direct Messages' : channel.guild.name}
          </span>
          <HeaderChannelGlyph channel={channel} />
          <div className="discord-transcript-header-copy">
            <span className="discord-transcript-header-title">{name}</span>
            <span className="discord-transcript-header-separator" aria-hidden="true">
              -
            </span>
            <span className="discord-transcript-header-topic">
              {channel.isThread() ? (
                `Thread channel in ${channel.parent?.name ?? 'Unknown Channel'}`
              ) : channel.isDMBased() ? (
                `Direct Messages`
              ) : channel.isVoiceBased() ? (
                `Voice Text Channel for ${channel.name}`
              ) : channel.type === ChannelType.GuildCategory ? (
                `Category Channel`
              ) : 'topic' in channel && channel.topic ? (
                <MessageContent
                  content={channel.topic}
                  context={{ messages, channel, callbacks, type: RenderType.REPLY, ...options }}
                />
              ) : (
                `This is the start of #${channel.name} channel.`
              )}
            </span>
          </div>
        </div>
        {(showThreads || uiPinnedMessages.enabled || uiMemberList.enabled || uiSearch.enabled) && (
          <div className="discord-transcript-header-tools">
            {showThreads && (
              <div className="discord-transcript-threads-anchor">
                <HeaderTool label="Threads" action="threads" path={GLYPH_THREAD} />
              </div>
            )}
            {uiPinnedMessages.enabled && (
              <div className="discord-transcript-pins-anchor">
                <HeaderTool label="Pinned Messages" action="pins" path={TOOL_PINS} />
              </div>
            )}
            {uiMemberList.enabled && (
              <div className="discord-transcript-members-anchor">
                <HeaderTool label="Members" action="members" path={TOOL_MEMBERS} />
              </div>
            )}
            {uiSearch.enabled && <div className="discord-transcript-header-search-slot" />}
          </div>
        )}
      </div>
      {messages.map((message, index) => (
        <DiscordMessage
          message={message}
          context={{ messages, channel, callbacks, ...options }}
          previous={messages[index - 1]}
          key={message.id}
        />
      ))}
      <footer className="discord-transcript-footer">
        <span className="discord-transcript-footer-pill">
          {options.footerText
            ? options.footerText
                .replaceAll('{number}', messages.length.toString())
                .replaceAll('{s}', messages.length > 1 ? 's' : '')
            : `Exported ${messages.length} message${messages.length > 1 ? 's' : ''}.`}
          {options.poweredBy ? (
            <>
              <span className="discord-transcript-footer-pill-separator"> | </span>
              <span className="discord-transcript-footer-powered">
                Powered by <a href="https://github.com/cauahzz/discord-transcriptify">discord-transcriptify</a>.
              </span>
            </>
          ) : null}
        </span>
      </footer>
    </DiscordMessagesComponent>
  );
}
