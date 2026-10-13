import {
  type APIAttachment,
  type APIMessage,
  type Awaitable,
  type Channel,
  type Message,
  type Role,
  type User,
} from 'discord.js';
import { prerenderToNodeStream } from 'react-dom/static';
import React from 'react';
import { buildProfiles } from '../utils/buildProfiles';
import { revealSpoiler, scrollToMessage } from '../static/client';
import { prelude as clientPrelude } from '../static/prelude';
import { readFileSync } from 'fs';
import path from 'path';
import { renderToString } from '@derockdev/discord-components-core/hydrate';
import DiscordMessages from './transcript';
import type { ResolveImageCallback } from '../downloader/images';
import { serializeForScript, streamToString } from '../utils/utils';
import { activeFeatures, type ResolvedFeatures } from '../features';

// version of the component library the page loads from the CDN
let discordComponentsVersion = '^3.6.1';

try {
  const packagePath = path.join(__dirname, '..', '..', 'package.json');
  const packageJSON = JSON.parse(readFileSync(packagePath, 'utf8'));
  discordComponentsVersion = packageJSON.dependencies['@derockdev/discord-components-core'] ?? discordComponentsVersion;
  // eslint-disable-next-line no-empty
} catch {}

export type RenderMessageContext = {
  messages: Message[];
  channel: Channel;

  callbacks: {
    resolveImageSrc: ResolveImageCallback;
    resolveVoiceSrc: (attachment: APIAttachment, message: APIMessage) => Awaitable<string | null | undefined>;
    resolveChannel: (channelId: string) => Awaitable<Channel | null>;
    resolveUser: (userId: string) => Awaitable<User | null>;
    resolveRole: (roleId: string) => Awaitable<Role | null>;
  };

  poweredBy?: boolean;
  footerText?: string;
  features: ResolvedFeatures;
  favicon: 'guild' | string;
  hydrate: boolean;
  /** collected thread messages by parent message id; optional because `DiscordMessages` takes this type as its props */
  threads?: Map<string, Message[]>;
  /** a `filter` was in effect, so the collected thread messages cannot be compared with the thread's own count */
  filtered?: boolean;
};

export default async function render({ messages, channel, callbacks, ...options }: RenderMessageContext) {
  const profiles = buildProfiles(messages, options.features.threadMessages.enabled ? options.threads : undefined, {
    serverTags: options.features.uiServerTags.enabled,
  });
  const featureScripts = activeFeatures(options.features).flatMap((feature) => {
    const script = feature.clientScript?.(options.features);
    return script ? [{ key: feature.key, script }] : [];
  });

  const { prelude } = await prerenderToNodeStream(
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <link
          rel="icon"
          type="image/png"
          href={
            options.favicon === 'guild'
              ? channel.isDMBased()
                ? undefined
                : (channel.guild.iconURL({ size: 16, extension: 'png' }) ?? undefined)
              : options.favicon
          }
        />

        <title>{channel.isDMBased() ? 'Direct Messages' : channel.name}</title>

        <script
          dangerouslySetInnerHTML={{
            __html: scrollToMessage,
          }}
        />

        {/* scripts of the enabled features, after the prelude they share */}
        {featureScripts.length > 0 && <script dangerouslySetInnerHTML={{ __html: clientPrelude }} />}
        {featureScripts.map(({ key, script }) => (
          <script key={key} dangerouslySetInnerHTML={{ __html: script }} />
        ))}

        {!options.hydrate && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `window.$discordMessage={profiles:${serializeForScript(await profiles)}}`,
              }}
            ></script>
            <script
              type="module"
              src={`https://cdn.jsdelivr.net/npm/@derockdev/discord-components-core@${discordComponentsVersion}/dist/derockdev-discord-components-core/derockdev-discord-components-core.esm.js`}
            ></script>
          </>
        )}
      </head>

      <body
        style={{
          margin: 0,
          minHeight: '100vh',
        }}
      >
        <DiscordMessages messages={messages} channel={channel} callbacks={callbacks} {...options} />
      </body>

      {/* after the body, so the spoilers exist when the script runs */}
      {options.hydrate && <script dangerouslySetInnerHTML={{ __html: revealSpoiler }}></script>}
    </html>
  );

  const markup = await streamToString(prelude);

  if (options.hydrate) {
    const result = await renderToString(markup, {
      beforeHydrate: async (document) => {
        document.defaultView.$discordMessage = {
          profiles: await profiles,
        };
      },
    });

    return result.html;
  }

  return markup;
}
