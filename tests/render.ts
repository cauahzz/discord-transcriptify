/**
 * Render tests that need no bot and no network.
 *
 * Messages are built from raw API payloads through discord.js' own structures,
 * so the renderers see the same objects they would get from a live channel.
 * Run with: npm test
 */
import type * as MockDoc from '@stencil/core/mock-doc' with { 'resolution-mode': 'import' };
import debug from 'debug';
import {
  Client,
  Collection,
  MessageFlags,
  SnowflakeUtil,
  type APIAttachment,
  type Channel,
  type Message,
  type TextChannel,
} from 'discord.js';
import { createRequire } from 'node:module';
import { ExportReturnType, generateFromMessages } from '../src';
import { activeFeatures, resolveFeatures, type FeatureDescriptor } from '../src/features';
import { uiImagePreviewFeature } from '../src/features/ui/imagePreview';
import { uiMemberListFeature } from '../src/features/ui/memberList';
import { uiPinnedMessagesFeature } from '../src/features/ui/pinnedMessages';
import { uiSearchFeature } from '../src/features/ui/search';
import { uiServerTagsFeature } from '../src/features/ui/serverTags';
import { uiThreadModalFeature } from '../src/features/ui/threadModal';
import { uiVoicePlayerFeature } from '../src/features/ui/voicePlayer';
import { applyServerTags, enableVoicePlayback } from '../src/static/client';
import { prelude } from '../src/static/prelude';
import type { UiOptions } from '../src/types';
import { sanitizeFilename } from '../src/utils/filename';
import { hasFlag } from '../src/utils/utils';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} -> got ${actual}, expected ${expected}`);
}

const GUILD_ID = '100';
const CHANNEL_ID = '200';

// `_add` is how discord.js itself turns gateway payloads into structures
/* eslint-disable @typescript-eslint/no-explicit-any */
const client = new Client({ intents: [] });
const guild = (client.guilds as any)._add({
  id: GUILD_ID,
  name: 'Test Guild',
  icon: null,
  features: [],
  roles: [],
  channels: [],
  members: [],
  emojis: [],
  stickers: [],
  owner_id: '1',
});
const channel: TextChannel = (client.channels as any)._add(
  { id: CHANNEL_ID, type: 0, name: 'tickets', guild_id: GUILD_ID },
  guild
);

let nextId = 1000;
function message(data: Record<string, unknown>): Message {
  return (channel.messages as any)._add({
    id: String(nextId++),
    channel_id: CHANNEL_ID,
    guild_id: GUILD_ID,
    author: { id: '1', username: 'alice', discriminator: '0', global_name: 'Alice', avatar: null },
    content: '',
    timestamp: new Date(0).toISOString(),
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
    flags: 0,
    ...data,
  });
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function render(messages: Message[], resolveImageSrc?: (attachment: APIAttachment) => string | null | undefined) {
  return generateFromMessages(messages, channel, {
    returnType: ExportReturnType.String,
    callbacks: {
      // keep the mention resolvers off the network
      resolveChannel: () => null,
      resolveUser: () => null,
      resolveRole: () => null,
      ...(resolveImageSrc ? { resolveImageSrc } : {}),
    },
  });
}

/* eslint-disable @typescript-eslint/no-explicit-any */
// thread messages live in the thread, not in the main channel
function threadMessage(thread: any, data: Record<string, unknown>): Message {
  return (thread.messages as any)._add({
    id: String(nextId++),
    channel_id: thread.id,
    guild_id: GUILD_ID,
    author: { id: '1', username: 'alice', discriminator: '0', global_name: 'Alice', avatar: null },
    content: '',
    timestamp: new Date(0).toISOString(),
    edited_timestamp: null,
    tts: false,
    mention_everyone: false,
    mentions: [],
    mention_roles: [],
    attachments: [],
    embeds: [],
    pinned: false,
    type: 0,
    flags: 0,
    ...data,
  });
}

type ThreadStub = { calls: number; inFlight: number; maxInFlight: number; limits: number[] };

// builds a parent message whose thread offers `total` messages through a counting `messages.fetch`
function messageWithThread(total: number, options: { fail?: boolean; delay?: boolean; carol?: boolean } = {}) {
  const id = String(nextId++);
  const payload = {
    id,
    type: 11,
    name: `thread-${id}`,
    guild_id: GUILD_ID,
    parent_id: CHANNEL_ID,
    thread_metadata: { archived: false, auto_archive_duration: 60, archive_timestamp: new Date(0).toISOString() },
    message_count: total,
  };
  const thread = (client.channels as any)._add(payload, guild);
  const parent = message({ id, content: 'parent', flags: 32, thread: payload });
  const stub: ThreadStub = { calls: 0, inFlight: 0, maxInFlight: 0, limits: [] };
  const all = Array.from({ length: total }, (_, i) =>
    threadMessage(thread, {
      content: `thread message ${i}`,
      author:
        options.carol && i % 2
          ? { id: '3', username: 'carol', discriminator: '0', global_name: 'Carol', avatar: null }
          : { id: '2', username: 'bob', discriminator: '0', global_name: 'Bob', avatar: null },
    })
  ).reverse(); // newest first, like Discord
  thread.messages.fetch = async (opts: { limit: number; before?: string }) => {
    stub.calls++;
    stub.limits.push(opts.limit);
    stub.inFlight++;
    stub.maxInFlight = Math.max(stub.maxInFlight, stub.inFlight);
    if (options.delay) await new Promise((resolve) => setTimeout(resolve, 10));
    stub.inFlight--;
    if (options.fail) throw new Error('Missing Access');
    const start = opts.before ? all.findIndex((m) => m.id === opts.before) + 1 : 0;
    return new Collection(all.slice(start, start + opts.limit).map((m) => [m.id, m] as [string, Message]));
  };
  return { parent, stub, thread };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

const INLINED = 'data:image/png;base64,INLINED';

async function main() {
  console.log('\n== plain message ==');
  const plain = await render([message({ content: 'hello **world**' })]);
  check('content rendered', plain.includes('world'), true);
  check('not marked as forwarded', plain.includes('class="discord-forwarded"'), false);

  console.log('\n== ansi code block ==');
  const ansi = await render([
    message({ content: '```ansi\n\u001b[1;31mError\u001b[0m plain \u001b[4;32;40mok\u001b[0m\n```' }),
  ]);
  check('rendered as an ansi block', ansi.includes('class="discord-code-block-pre discord-ansi"'), true);
  check('bold and colour combine', ansi.includes('<span class="ansi-31 ansi-bold">Error</span>'), true);
  check('reset drops the style', ansi.includes('</span> plain <span'), true);
  check('background and underline', ansi.includes('<span class="ansi-32 ansi-40 ansi-underline">ok</span>'), true);
  check('no escape characters left', ansi.includes('\u001b'), false);
  const plainCode = await render([message({ content: '```js\nconst a = 1;\n```' })]);
  check('other languages keep the regular block', plainCode.includes('<discord-code-block language="js"'), true);

  console.log('\n== join message ==');
  const joinText = async (timestamp: number) => {
    const html = await render([message({ id: SnowflakeUtil.generate({ timestamp }).toString(), type: 7 })]);
    return (html.match(/type="join"[^>]*>([\s\S]*?)<\/discord-system-message>/)?.[1] ?? '').replace(/<[^>]+>/g, '');
  };
  const joinedAt = Date.parse('2026-01-01T00:00:00Z');
  check('the same join message always gets the same text', await joinText(joinedAt), await joinText(joinedAt));
  check('another date can get another text', (await joinText(joinedAt)) !== (await joinText(joinedAt + 1)), true);

  console.log('\n== forwarded message ==');
  const forwarded = await render([
    message({
      message_reference: { type: 1, message_id: '999', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
      message_snapshots: [
        {
          message: {
            content: 'snapshot text',
            timestamp: new Date(1000).toISOString(),
            edited_timestamp: null,
            attachments: [
              {
                id: '5',
                filename: 'report.pdf',
                size: 2048,
                url: 'https://cdn.discordapp.com/attachments/1/5/report.pdf',
                proxy_url: 'https://media.discordapp.net/attachments/1/5/report.pdf',
                content_type: 'application/pdf',
              },
            ],
            embeds: [{ type: 'rich', title: 'Snapshot embed' }],
            flags: 0,
            mentions: [],
            mention_roles: [],
            type: 0,
          },
        },
      ],
    }),
  ]);
  check('forward wrapper rendered', forwarded.includes('class="discord-forwarded"'), true);
  check('snapshot content rendered', forwarded.includes('snapshot text'), true);
  check('snapshot attachment rendered', forwarded.includes('report.pdf'), true);
  check('snapshot embed rendered', forwarded.includes('Snapshot embed'), true);
  check('forward not treated as a failed reply', forwarded.includes('Message could not be loaded'), false);

  console.log('\n== reply to a message outside the transcript ==');
  const reply = await render([
    message({
      content: 'a reply',
      type: 19,
      message_reference: { type: 0, message_id: '999', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
    }),
  ]);
  check('missing reply target still reported', reply.includes('Message could not be loaded'), true);

  console.log('\n== thread created system message ==');
  const thread = await render([message({ type: 18, content: 'Billing question' })]);
  check('thread created rendered', thread.includes('started a thread'), true);
  check(
    'a system message carries the time it was sent, not the time of the export',
    /<discord-system-message\b[^>]*\stimestamp="\d{4}-\d\d-\d\dT/.test(thread),
    true
  );
  check('thread name rendered', thread.includes('Billing question'), true);

  console.log('\n== images outside attachments go through resolveImageSrc ==');
  const embed = {
    type: 'rich',
    title: 'With image',
    author: { name: 'Author', icon_url: 'https://example.com/author.png' },
    image: {
      url: 'https://example.com/image.png',
      proxy_url: 'https://media.example/image.png',
      width: 10,
      height: 10,
    },
    thumbnail: { url: 'https://example.com/thumb.png', width: 10, height: 10 },
    footer: { text: 'Footer', icon_url: 'https://example.com/footer.png' },
  };
  const seen: string[] = [];
  const inlinedEmbed = await render([message({ embeds: [embed] })], (attachment) => {
    seen.push(attachment.url);
    return INLINED;
  });
  check('embed image, thumbnail and icons all offered', seen.length, 4);
  check('proxy url preferred for the download', seen.includes('https://media.example/image.png'), true);
  check('embed image inlined', inlinedEmbed.includes(`image="${INLINED}"`), true);
  check('embed remote url gone', inlinedEmbed.includes('https://media.example/image.png'), false);

  const remoteEmbed = await render([message({ embeds: [embed] })]);
  check('embed image stays remote by default', remoteEmbed.includes('image="https://media.example/image.png"'), true);

  const declined = await render([message({ embeds: [embed] })], () => undefined);
  check('declined download keeps the url', declined.includes('image="https://media.example/image.png"'), true);

  const section = message({
    flags: 1 << 15, // IsComponentsV2
    components: [
      {
        type: 9,
        id: 1,
        components: [{ type: 10, id: 2, content: 'section text' }],
        accessory: { type: 11, id: 3, media: { url: 'https://example.com/accessory.png' } },
      },
    ],
  });
  const inlinedSection = await render([section], () => INLINED);
  check('section text rendered', inlinedSection.includes('section text'), true);
  check('section thumbnail inlined', inlinedSection.includes(`src="${INLINED}"`), true);
  check('section thumbnail remote url gone', inlinedSection.includes('https://example.com/accessory.png'), false);

  console.log('\n== markdown ==');
  const subtext = await render([message({ content: 'first\n-# small print\nlast' })]);
  check(
    'subtext is a block, so the next line does not join it',
    /display:\s*block[^>]*>small print/.test(subtext),
    true
  );

  console.log('\n== buttons and select menus ==');
  const buttonRows = await render([
    message({
      components: [
        {
          type: 1,
          components: [
            { type: 2, style: 5, label: 'Docs', url: 'https://example.com/docs', emoji: { id: null, name: '📖' } },
            { type: 2, style: 1, label: 'Go', custom_id: 'go' },
            { type: 2, style: 4, label: 'Locked', custom_id: 'locked', disabled: true },
            { type: 2, style: 5, label: 'Gone', url: 'https://example.com/gone', disabled: true },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'pick',
              placeholder: 'Pick one',
              options: [
                { label: 'Custom', value: 'a', emoji: { id: '555', name: 'wow', animated: false } },
                { label: 'Plain', value: 'b' },
              ],
            },
          ],
        },
        { type: 1, components: [{ type: 3, custom_id: 'off', disabled: true, options: [{ label: 'X', value: 'x' }] }] },
      ],
    }),
  ]);
  check(
    'link button is an anchor that opens safely',
    buttonRows.includes(
      '<a href="https://example.com/docs" target="_blank" rel="noopener noreferrer" class="discord-button discord-button-link"'
    ),
    true
  );
  check('link button carries the launch icon', buttonRows.includes('discord-button-launch'), true);
  check(
    'button emoji is an image with empty alt',
    /<img src="[^"]*1f4d6\.svg" alt="" class="discord-button-emoji"/.test(buttonRows),
    true
  );
  check(
    'button without a url is not an anchor',
    buttonRows.includes('<span class="discord-button discord-button-primary"'),
    true
  );
  check(
    'disabled button is marked',
    buttonRows.includes('discord-button discord-button-destructive discord-button-disabled'),
    true
  );
  check('disabled link button is not clickable', buttonRows.includes('href="https://example.com/gone"'), false);
  check('select menu shows the placeholder', buttonRows.includes('Pick one</div>'), true);
  check(
    'a select menu with options opens without a script',
    /<details class="discord-select-menu"><summary class="discord-select-menu-control">/.test(buttonRows),
    true
  );
  check('and lists them as options', buttonRows.split('role="option"').length - 1 > 0, true);
  check(
    'a disabled one stays closed',
    /<details class="discord-select-menu discord-select-menu-disabled"/.test(buttonRows),
    false
  );
  check(
    'select option emoji is an image',
    /<img src="https:\/\/cdn\.discordapp\.com\/emojis\/555\.png" alt="wow" class="discord-select-menu-option-emoji"/.test(
      buttonRows
    ),
    true
  );
  check(
    'select option without an emoji has no image',
    buttonRows.split('discord-select-menu-option-emoji"').length - 1,
    1
  );
  check('select menu without a placeholder gets the type label', buttonRows.includes('Make a Selection'), true);
  check(
    'disabled select menu is marked',
    buttonRows.includes('discord-select-menu discord-select-menu-disabled'),
    true
  );

  console.log('\n== poll ==');
  const poll = await render([
    message({
      poll: {
        question: { text: 'Lunch?' },
        answers: [
          { answer_id: 1, poll_media: { text: 'Pizza', emoji: { id: null, name: '🍕' } } },
          { answer_id: 2, poll_media: { text: 'Sushi' } },
        ],
        expiry: new Date(0).toISOString(),
        allow_multiselect: false,
        layout_type: 1,
        results: {
          is_finalized: true,
          answer_counts: [
            { id: 1, count: 3, me_voted: false },
            { id: 2, count: 1, me_voted: false },
          ],
        },
      },
    }),
  ]);
  check('poll question rendered', poll.includes('Lunch?'), true);
  check('poll answers rendered', poll.includes('Pizza') && poll.includes('Sushi'), true);
  check('poll shares computed from the counts', poll.includes('75%') && poll.includes('25%'), true);
  check('poll total rendered', />4<!-- --> vote<!-- -->s|>4 votes/.test(poll), true);
  check('finalized poll says so', poll.includes('Final results'), true);
  check('message without a poll has no poll markup', plain.includes('class="discord-poll"'), false);
  const openPoll = await render([
    message({
      poll: {
        question: { text: 'Open?' },
        answers: [{ answer_id: 1, poll_media: { text: 'Yes' } }],
        expiry: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
        allow_multiselect: true,
        layout_type: 1,
        results: { is_finalized: false, answer_counts: [{ id: 1, count: 2, me_voted: false }] },
      },
    }),
  ]);
  check('an open poll shows its counts too', openPoll.replace(/<!-- -->/g, '').includes('100% (2)'), true);
  check('an open poll shows the absolute closing time', openPoll.includes('Closes'), true);
  check(
    'and no time computed at render',
    / left|ended/i.test(/class="discord-poll-footer"[\s\S]*?<\/div><\/div>/.exec(openPoll)?.[0] ?? ' left'),
    false
  );
  check('multiselect says so', openPoll.includes('Select one or more answers'), true);

  console.log('\n== voice message ==');
  const waveform = Buffer.from(Array.from({ length: 64 }, (_, i) => Math.min(255, i * 5))).toString('base64');
  const voiceFile = (extra: Record<string, unknown> = {}) => ({
    id: '7',
    filename: 'voice-message.ogg',
    size: 4096,
    url: 'https://cdn.discordapp.com/attachments/1/7/voice-message.ogg',
    proxy_url: 'https://media.discordapp.net/attachments/1/7/voice-message.ogg',
    content_type: 'audio/ogg',
    duration_secs: 65.4,
    waveform,
    ...extra,
  });
  const renderVoice = (resolveVoiceSrc?: () => string | undefined) =>
    generateFromMessages([message({ flags: 8192, attachments: [voiceFile()] })], channel, {
      returnType: ExportReturnType.String,
      callbacks: {
        resolveChannel: () => null,
        resolveUser: () => null,
        resolveRole: () => null,
        ...(resolveVoiceSrc ? { resolveVoiceSrc } : {}),
      },
    });
  const voice = await renderVoice();
  check('voice container rendered', voice.includes('discord-voice-message"'), true);
  check(
    'native audio element',
    /<audio controls="" preload="none" src="https:\/\/cdn\.discordapp\.com/.test(voice),
    true
  );
  check('duration as m:ss', voice.includes('>1:05<'), true);
  check('32 waveform bars', voice.split('discord-voice-waveform-bar"').length - 1, 32);
  check('tallest bar is capped at 24px', voice.includes('height:24px'), true);

  check('the play button is in the markup', voice.includes('class="discord-voice-play-button"'), true);
  const voiceWithoutScript = await generateFromMessages(
    [message({ flags: 8192, attachments: [voiceFile()] })],
    channel,
    {
      returnType: ExportReturnType.String,
      ui: false,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
    }
  );
  check(
    'without the script the audio keeps its native controls',
    /<audio controls="" preload="none" src="https:\/\/cdn\.discordapp\.com/.test(voiceWithoutScript),
    true
  );
  check('and the voice player script is absent', voiceWithoutScript.includes(enableVoicePlayback), false);
  check('with the script the page carries it', voice.includes(enableVoicePlayback), true);

  const flat = await render([message({ flags: 8192, attachments: [voiceFile({ waveform: undefined })] })]);
  check('missing waveform gives 32 minimum bars', flat.split('height:4px').length - 1, 32);

  const embedded = await renderVoice(() => 'data:audio/ogg;base64,VOICE');
  check('resolveVoiceSrc result becomes the audio src', embedded.includes('src="data:audio/ogg;base64,VOICE"'), true);
  check('original voice url gone', embedded.includes('voice-message.ogg"'), false);

  const voiceKept = await renderVoice(() => undefined);
  check(
    'undefined keeps the original url',
    voiceKept.includes('src="https://cdn.discordapp.com/attachments/1/7/'),
    true
  );

  const song = await render([message({ attachments: [voiceFile({ filename: 'song.ogg' })] })]);
  check('audio file without the voice flag is a normal attachment', song.includes('discord-voice-message"'), false);

  const forwardOf = (snapshot: Record<string, unknown>) =>
    message({
      message_reference: { type: 1, message_id: '999', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
      message_snapshots: [
        {
          message: {
            content: '',
            timestamp: new Date(1000).toISOString(),
            edited_timestamp: null,
            attachments: [],
            embeds: [],
            flags: 0,
            mentions: [],
            mention_roles: [],
            type: 0,
            ...snapshot,
          },
        },
      ],
    });
  const offeredVoice: string[] = [];
  const forwardedVoice = await generateFromMessages([forwardOf({ flags: 8192, attachments: [voiceFile()] })], channel, {
    returnType: ExportReturnType.String,
    callbacks: {
      resolveChannel: () => null,
      resolveUser: () => null,
      resolveRole: () => null,
      resolveVoiceSrc: (attachment) => {
        offeredVoice.push(attachment.id);
        return 'data:audio/ogg;base64,FORWARDED';
      },
    },
  });
  check('forwarded voice message renders as one', forwardedVoice.includes('discord-voice-message"'), true);
  check('forwarded voice message is offered to resolveVoiceSrc', offeredVoice.join(), '7');
  check('and uses what it returns', forwardedVoice.includes('src="data:audio/ogg;base64,FORWARDED"'), true);

  const refusals: string[] = [];
  const originalDebugLog = debug.log;
  const traceFetch = async (extra: Record<string, unknown>) => {
    refusals.length = 0;
    debug.log = (...args: unknown[]) => refusals.push(args.join(' '));
    debug.enable('discord-transcriptify:fetch');
    try {
      return await generateFromMessages(
        [message({ flags: 8192, attachments: [voiceFile({ url: 'http://127.0.0.1:9/voice.ogg' })] })],
        channel,
        {
          returnType: ExportReturnType.String,
          callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
          ...extra,
        }
      );
    } finally {
      debug.disable();
      debug.log = originalDebugLog;
    }
  };
  const savedVoice = await traceFetch({ saveVoiceMessages: true });
  check(
    'saveVoiceMessages puts the feature in the active list',
    activeFeatures(resolveFeatures({ saveVoiceMessages: true }))
      .map((feature) => feature.key)
      .includes('voiceMessages'),
    true
  );
  check(
    'the built-in fetcher is what the renderer uses',
    refusals.join().includes('Refusing to fetch 127.0.0.1'),
    true
  );
  check('a refused download keeps the original url', savedVoice.includes('src="http://127.0.0.1:9/voice.ogg"'), true);
  await traceFetch({});
  check('without the option nothing is fetched', refusals.length, 0);

  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (text: string) => warnings.push(text);
  await traceFetch({ saveVoiceMessages: true, callbacks: { resolveVoiceSrc: () => 'data:audio/ogg;base64,CUSTOM' } });
  const customWins = refusals.length === 0;
  await render([message({ content: 'hi' })]);
  console.warn = originalWarn;
  check(
    'saveVoiceMessages with resolveVoiceSrc warns',
    warnings.some((text) => text.includes('resolveVoiceSrc')),
    true
  );
  check('and the custom callback wins', customWins, true);
  check('the voice warning is emitted once and nothing else warns', warnings.length, 1);

  console.log('\n== file attachment card ==');
  const docFile = (extra: Record<string, unknown> = {}) => ({
    id: '60',
    filename: 'report <1>.pdf',
    size: 2048,
    url: 'https://cdn.discordapp.com/attachments/1/60/report.pdf',
    proxy_url: 'https://media.discordapp.net/attachments/1/60/report.pdf',
    content_type: 'application/pdf',
    ...extra,
  });
  const fileCard = await render([message({ attachments: [docFile()] })]);
  check('file attachment renders as a card', fileCard.includes('class="discord-custom-file-base"'), true);
  check(
    'card name links to the file and opens safely',
    fileCard.includes(
      '<a class="discord-custom-file-name" href="https://cdn.discordapp.com/attachments/1/60/report.pdf" target="_blank" rel="noopener noreferrer">report &lt;1&gt;.pdf</a>'
    ),
    true
  );
  check('card shows the size', fileCard.includes('class="discord-custom-file-size">2 KB<'), true);
  check(
    'card has a download link',
    /class="discord-custom-file-download" href="[^"]*report\.pdf" download=/.test(fileCard),
    true
  );
  const spoilerCard = await render([message({ attachments: [docFile({ filename: 'SPOILER_report.pdf', flags: 8 })] })]);
  check(
    'a spoiler file keeps its wrapper',
    /<discord-spoiler[^>]*>(?:(?!<\/discord-spoiler>).)*class="discord-custom-file-base/.test(spoilerCard),
    true
  );
  const imageCard = await render([
    message({ attachments: [docFile({ filename: 'a.png', content_type: 'image/png' })] }),
  ]);
  check('an image is not a card', imageCard.includes('class="discord-custom-file-base"'), false);
  const audioCard = await render([
    message({ attachments: [docFile({ filename: 'a.mp3', content_type: 'audio/mpeg' })] }),
  ]);
  check('audio is not a card', audioCard.includes('class="discord-custom-file-base"'), false);

  console.log('\n== attachment gallery ==');
  const imageFile = (n: number, extra: Record<string, unknown> = {}) => ({
    id: String(900 + n),
    filename: `pic${n}.png`,
    size: 1024,
    url: `https://cdn.discordapp.com/attachments/1/${900 + n}/pic${n}.png`,
    proxy_url: `https://media.discordapp.net/attachments/1/${900 + n}/pic${n}.png`,
    content_type: 'image/png',
    width: 10,
    height: 10,
    ...extra,
  });
  const images = (n: number) => Array.from({ length: n }, (_, i) => imageFile(i + 1));
  const galleryMarkup = 'class="discord-attachment-gallery"';
  const imgCount = (html: string) => (html.match(/<img[^>]*pic\d+\.png/g) ?? []).length;

  const two = await render([message({ attachments: images(2) })]);
  check('two images render one gallery', two.split(galleryMarkup).length - 1, 1);
  check('gallery holds both images', imgCount(two), 2);

  const one = await render([message({ attachments: images(1) })]);
  check('one image renders no gallery', one.includes(galleryMarkup), false);

  const mixed = await render([
    message({
      attachments: [imageFile(1), imageFile(2, { filename: 'doc.pdf', content_type: 'application/pdf' })],
    }),
  ]);
  check('image plus pdf renders no gallery', mixed.includes(galleryMarkup), false);

  const twelve = await render([message({ attachments: images(12) })]);
  check('twelve images show ten', imgCount(twelve), 10);
  check('overflow overlay counts the rest', twelve.includes('+<!-- -->2'), true);
  const ten = await render([message({ attachments: images(10) })]);
  check('ten images show no overlay', ten.includes('+<!-- -->'), false);

  const galleryOffered: string[] = [];
  const galleryInlined = await render([message({ attachments: images(2) })], (attachment) => {
    galleryOffered.push(attachment.id);
    return INLINED;
  });
  check('gallery images go through resolveImageSrc', galleryOffered.join(','), '901,902');
  check('gallery uses the resolved source', galleryInlined.split(`src="${INLINED}"`).length - 1, 2);

  const voiceGallery = await render([message({ flags: 8192, attachments: images(2) })]);
  check('voice message is never a gallery', voiceGallery.includes(galleryMarkup), false);

  const dropSecond = (attachment: APIAttachment) => (attachment.id === '902' ? null : undefined);
  const dropped = await render([message({ attachments: images(3) })], dropSecond);
  check('a dropped image is left out of the gallery', imgCount(dropped), 2);
  check('and the grid is laid out for two', dropped.includes('grid-template-rows:auto'), true);
  const allDropped = await render([message({ attachments: images(3) })], () => null);
  check('a gallery whose images are all dropped renders nothing', allDropped.includes(galleryMarkup), false);
  check('and leaves no image behind', imgCount(allDropped), 0);
  const droppedOverflow = await render([message({ attachments: images(12) })], (attachment) =>
    attachment.id === '901' ? null : undefined
  );
  check('twelve images with one dropped show nine', imgCount(droppedOverflow), 9);
  check('the overflow overlay counts only what was cut off', droppedOverflow.includes('+<!-- -->2'), true);

  const forwardedGallery = await render([forwardOf({ attachments: images(2) })]);
  check('a forwarded message with two images renders a gallery', forwardedGallery.split(galleryMarkup).length - 1, 1);
  check('and holds both images', imgCount(forwardedGallery), 2);
  check(
    'the forwarded gallery is inline, so no slot hides it',
    /<div class="discord-attachment-gallery"[^>]*slot=/.test(forwardedGallery),
    false
  );

  console.log('\n== poll result ==');
  const pollResult = (fields: { name: string; value: string }[]) =>
    render([message({ type: 46, embeds: [{ type: 'poll_result', fields }] })]);
  const plainText = (html: string) => html.replace(/<!-- -->/g, '').replace(/&#x27;/g, "'");
  const closed = plainText(
    await pollResult([
      { name: 'poll_question_text', value: 'Lunch?' },
      { name: 'victor_answer_text', value: 'Pizza' },
      { name: 'victor_answer_votes', value: '3' },
      { name: 'total_votes', value: '4' },
    ])
  );
  check('poll result names the question', closed.includes("'s poll <strong>Lunch?</strong> has closed."), true);
  check('poll result names the winner', closed.includes('<strong>Pizza</strong>'), true);
  check('poll result shows the votes', closed.includes('with 3 votes (4 total)'), true);

  const noWinner = plainText(await pollResult([{ name: 'poll_question_text', value: 'Lunch?' }]));
  check('poll result without a winner still renders', noWinner.includes('has closed.'), true);
  check('poll result without a winner omits the winner line', noWinner.includes('Winner'), false);

  const noQuestion = plainText(await pollResult([]));
  check('poll result without a question', noQuestion.includes("'s poll has closed."), true);

  console.log('\n== stickers ==');
  const sticker = (id: string, name: string, format_type: number) => ({ id, name, format_type });
  const png = await render([message({ sticker_items: [sticker('301', 'wave', 1)] })]);
  check(
    'png sticker renders an img with the sized url',
    /<img[^>]*src="https:\/\/media\.discordapp\.net\/stickers\/301\.png\?size=160"/.test(png),
    true
  );
  check('sticker alt is its name', png.includes('alt="wave"'), true);

  const gif = await render([message({ sticker_items: [sticker('302', 'dance', 4)] })]);
  check('gif sticker uses the gif url', gif.includes('https://media.discordapp.net/stickers/302.gif'), true);

  const lottie = await render([message({ sticker_items: [sticker('303', 'spin', 3)] })]);
  check('lottie placeholder rendered', lottie.includes('discord-sticker discord-sticker--lottie'), true);
  check('lottie placeholder names the sticker', lottie.includes('spin') && lottie.includes('Animated sticker'), true);
  check('lottie sticker has no img', lottie.includes('stickers/303'), false);

  const inlinedSticker = await render([message({ sticker_items: [sticker('304', 'wave', 2)] })], () => INLINED);
  check('sticker inlined through resolveImageSrc', inlinedSticker.includes(`src="${INLINED}"`), true);
  check('sticker remote url gone', inlinedSticker.includes('stickers/304'), false);

  const forwardedSticker = await render([
    message({
      message_reference: { type: 1, message_id: '999', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
      message_snapshots: [
        {
          message: {
            content: '',
            timestamp: new Date(1000).toISOString(),
            edited_timestamp: null,
            attachments: [],
            embeds: [],
            sticker_items: [sticker('305', 'fwd', 1)],
            flags: 0,
            mentions: [],
            mention_roles: [],
            type: 0,
          },
        },
      ],
    }),
  ]);
  check('forwarded sticker rendered', forwardedSticker.includes('stickers/305.png'), true);

  const stickerTarget = message({ sticker_items: [sticker('306', 'hi', 1)] });
  const stickerReply = await render([
    stickerTarget,
    message({
      content: 'a reply',
      type: 19,
      message_reference: { type: 0, message_id: stickerTarget.id, channel_id: CHANNEL_ID, guild_id: GUILD_ID },
    }),
  ]);
  check('reply to a sticker says so', stickerReply.includes('Click to see sticker.'), true);
  check('reply to a sticker is not an attachment', stickerReply.includes('Click to see attachment.'), false);

  console.log('\n== default file name ==');
  const attachment = await generateFromMessages([message({ content: 'hi' })], channel, {
    callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
  });
  check('named after the channel', attachment.name, 'transcript-tickets.html');
  check('unsafe characters replaced', sanitizeFilename('a/b\\c: d*?"<e>|f'), 'a-b-c-d-e-f');
  check('dashes and dots trimmed from the ends', sanitizeFilename('  ..name..  '), 'name');
  check('long names cut', sanitizeFilename('x'.repeat(300)).length, 100);
  check('nothing usable left', sanitizeFilename('///'), '');

  console.log('\n== features ==');
  const off = resolveFeatures({});
  check('saveImages off by default', off.images.enabled, false);
  check('defaults present even when off', off.images.maxSizeKb, 10240);
  check('saveImages: false stays off', resolveFeatures({ saveImages: false }).images.enabled, false);

  const on = resolveFeatures({ saveImages: true });
  check('saveImages: true enables it', on.images.enabled, true);
  check('true keeps the defaults', `${on.images.maxWidth}x${on.images.maxHeight}@${on.images.quality}`, '800x800@75');

  const custom = resolveFeatures({ saveImages: { maxSizeKb: 512, quality: 60 } });
  check('an object enables it', custom.images.enabled, true);
  check('an object overrides its fields', `${custom.images.maxSizeKb}/${custom.images.quality}`, '512/60');
  check('an object keeps the other defaults', custom.images.maxWidth, 800);
  check('webp off by default', on.images.webp, false);
  check('sharp cache kept by default', on.images.sharpCache, true);
  const webpNoCache = resolveFeatures({ saveImages: { webp: true, sharpCache: false } }).images;
  check('webp and sharpCache can be set', `${webpNoCache.webp}/${webpNoCache.sharpCache}`, 'true/false');

  check('saveVoiceMessages off by default', off.voiceMessages.enabled, false);
  check('voice defaults present even when off', off.voiceMessages.maxSizeKb, 25600);
  check(
    'saveVoiceMessages: false stays off',
    resolveFeatures({ saveVoiceMessages: false }).voiceMessages.enabled,
    false
  );
  const voiceOn = resolveFeatures({ saveVoiceMessages: true });
  check('saveVoiceMessages: true enables it', voiceOn.voiceMessages.enabled, true);
  check('true keeps the default limit', voiceOn.voiceMessages.maxSizeKb, 25600);
  const voiceCustom = resolveFeatures({ saveVoiceMessages: { maxSizeKb: 100 } });
  check(
    'an object enables voice and sets the limit',
    `${voiceCustom.voiceMessages.enabled}/${voiceCustom.voiceMessages.maxSizeKb}`,
    'true/100'
  );
  check('voice does not enable images', voiceOn.images.enabled, false);

  check(
    'features that are off are not active',
    activeFeatures(off)
      .map((feature) => feature.key)
      .join(),
    'members,uiImagePreview,uiSearch,uiMemberList,uiPinnedMessages,uiVoicePlayer,uiThreadModal,uiServerTags,uiSelectMenus'
  );
  check('saveThreadMessages off by default', off.threadMessages.enabled, false);
  check('thread limit defaults to 500', off.threadMessages.limit, 500);
  check(
    'saveThreadMessages: true keeps the limit',
    resolveFeatures({ saveThreadMessages: true }).threadMessages.limit,
    500
  );
  check(
    'saveThreadMessages object sets the limit',
    `${resolveFeatures({ saveThreadMessages: { limit: 5 } }).threadMessages.enabled}/${resolveFeatures({ saveThreadMessages: { limit: 5 } }).threadMessages.limit}`,
    'true/5'
  );
  check(
    'enabled feature is active',
    activeFeatures(on)
      .map((feature) => feature.key)
      .join(),
    'images,members,uiImagePreview,uiSearch,uiMemberList,uiPinnedMessages,uiVoicePlayer,uiThreadModal,uiServerTags,uiSelectMenus'
  );

  // `requires` has no real user yet, so it is exercised against a made up registry
  const dependent: FeatureDescriptor = { key: 'images', requires: ['images'] };
  check('feature with its dependency enabled is kept', activeFeatures(on, [dependent]).length, 1);
  const warn = console.warn;
  let warned = '';
  console.warn = (text: string) => (warned = text);
  const orphan = [{ key: 'images', requires: ['missing'] } as unknown as FeatureDescriptor];
  const kept = activeFeatures({ ...on, missing: { enabled: false } } as never, orphan);
  console.warn = warn;
  check('feature with a disabled dependency is skipped', kept.length, 0);
  check('and the skip is reported', warned.includes('"images" needs missing'), true);

  check('ui on by default', off.uiImagePreview.enabled, true);
  check('ui: true enables every key', resolveFeatures({ ui: true }).uiImagePreview.enabled, true);
  check('ui: false disables every key', resolveFeatures({ ui: false }).uiImagePreview.enabled, false);
  check(
    'ui: { imagePreview: false } disables that key',
    resolveFeatures({ ui: { imagePreview: false } }).uiImagePreview.enabled,
    false
  );
  check('ui: {} keeps the default', resolveFeatures({ ui: {} }).uiImagePreview.enabled, true);

  const nulls = resolveFeatures({
    saveImages: null,
    saveVoiceMessages: null,
    saveThreadMessages: null,
    ui: null,
  } as never);
  check('null saveImages stays off', nulls.images.enabled, false);
  check('null saveVoiceMessages stays off', nulls.voiceMessages.enabled, false);
  check('null saveThreadMessages stays off', nulls.threadMessages.enabled, false);
  check('null ui keeps the default', `${nulls.uiImagePreview.enabled}/${nulls.uiSearch.enabled}`, 'true/true');
  check('search on by default', off.uiSearch.enabled, true);
  check('ui: false disables search', resolveFeatures({ ui: false }).uiSearch.enabled, false);
  const searchOff = resolveFeatures({ ui: { search: false } });
  check(
    'ui: { search: false } disables only search',
    `${searchOff.uiSearch.enabled}/${searchOff.uiImagePreview.enabled}`,
    'false/true'
  );
  const membersOff = resolveFeatures({ ui: { memberList: false } });
  const pinsOff = resolveFeatures({ ui: { pinnedMessages: false } });
  const panelsOff = resolveFeatures({ ui: false });
  check('both panels on by default', `${off.uiMemberList.enabled}/${off.uiPinnedMessages.enabled}`, 'true/true');
  check(
    'ui: false disables both panels',
    `${panelsOff.uiMemberList.enabled}/${panelsOff.uiPinnedMessages.enabled}`,
    'false/false'
  );
  check(
    'ui: { memberList: false } disables only the member list',
    `${membersOff.uiMemberList.enabled}/${membersOff.uiPinnedMessages.enabled}/${membersOff.uiSearch.enabled}`,
    'false/true/true'
  );
  check(
    'ui: { pinnedMessages: false } disables only the pins',
    `${pinsOff.uiPinnedMessages.enabled}/${pinsOff.uiMemberList.enabled}/${pinsOff.uiSearch.enabled}`,
    'false/true/true'
  );
  check('null ui keeps both panels', `${nulls.uiMemberList.enabled}/${nulls.uiPinnedMessages.enabled}`, 'true/true');
  check(
    'ui: { imagePreview: false } keeps search',
    resolveFeatures({ ui: { imagePreview: false } }).uiSearch.enabled,
    true
  );

  console.log('\n== message data attributes ==');
  const attributed = await render([
    message({ content: 'plain' }),
    message({
      content: 'pinned one',
      pinned: true,
      author: {
        id: '7',
        username: 'mallory',
        discriminator: '0',
        global_name: '"><script>alert(1)</script>',
        avatar: null,
      },
    }),
  ]);
  check('the author id is an attribute', attributed.includes('data-author-id="1"'), true);
  check('the author name is an attribute', attributed.includes('data-author-name="Alice"'), true);
  check('a pinned message is marked', attributed.split('data-pinned="true"').length - 1, 1);
  check(
    'a hostile author name is escaped in the attribute',
    attributed.includes('data-author-name="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'),
    true
  );
  check('and never reaches the page as markup', attributed.includes('<script>alert(1)'), false);

  const hydrated = await generateFromMessages([message({ content: 'pinned body', pinned: true })], channel, {
    returnType: ExportReturnType.String,
    hydrate: true,
    callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
  });
  // the pins preview reads the message body from this class when the component renders its own DOM
  check(
    'a hydrated message renders its body in .discord-message-body',
    /class="discord-message-body"[^>]*><span class="discord-message-markup"[^>]*>(<!--[^>]*-->)*pinned body/.test(
      hydrated
    ),
    true
  );

  console.log('\n== server tags ==');
  const taggedAuthor = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    username: `tagged${id}`,
    discriminator: '0',
    global_name: `Tagged ${id}`,
    avatar: null,
    primary_guild: { identity_guild_id: '777', identity_enabled: true, tag: 'ABC', badge: 'abcdef0123', ...extra },
  });
  const profilesOf = (html: string) =>
    JSON.parse(/window\.\$discordMessage=\{profiles:(.*?)\}<\/script>/.exec(html)?.[1] ?? '{}') as Record<
      string,
      Record<string, unknown>
    >;
  const tagged = profilesOf(await render([message({ author: taggedAuthor('41') })]));
  check('a server tag reaches the profile', tagged['41']?.serverTagText, 'ABC');
  check(
    'with its badge',
    tagged['41']?.serverTagBadge,
    'https://cdn.discordapp.com/guild-tag-badges/777/abcdef0123.png?size=32'
  );
  check('and its guild', tagged['41']?.serverTagGuildId, '777');
  const notWorn = profilesOf(
    await render([
      message({ author: taggedAuthor('42', { identity_enabled: false }) }),
      message({ author: taggedAuthor('43', { tag: '  ' }) }),
      message({ author: { id: '44', username: 'plain', discriminator: '0', global_name: 'Plain', avatar: null } }),
    ])
  );
  check(
    'a tag that is not worn, an empty one and none at all add nothing',
    ['42', '43', '44']
      .map((id) => Object.keys(notWorn[id] ?? {}).filter((key) => key.startsWith('serverTag')).length)
      .join(),
    '0,0,0'
  );
  const noBadge = profilesOf(await render([message({ author: taggedAuthor('45', { badge: null }) })]));
  check(
    'a tag without a badge keeps the text only',
    `${noBadge['45']?.serverTagText}/${noBadge['45']?.serverTagBadge}`,
    'ABC/undefined'
  );
  const older = message({ author: taggedAuthor('46') });
  // what an older discord.js leaves on the user
  delete (older.author as unknown as Record<string, unknown>).primaryGuild;
  (older.author as unknown as Record<string, unknown>).guildTagBadgeURL = undefined;
  const olderProfiles = profilesOf(await render([older]));
  check('a discord.js without primaryGuild still renders', olderProfiles['46']?.author, 'Tagged 46');
  const hostileTag = profilesOf(await render([message({ author: taggedAuthor('47', { tag: '</script><b>' }) })]));
  check('a hostile tag survives the blob as text', hostileTag['47']?.serverTagText, '</script><b>');
  const tagsOffHtml = await generateFromMessages([message({ author: taggedAuthor('48') })], channel, {
    returnType: ExportReturnType.String,
    ui: { serverTags: false },
    callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
  });
  check('with the script off the profile carries no tag', tagsOffHtml.includes('serverTagText'), false);
  check('and the script is absent', tagsOffHtml.includes(applyServerTags), false);

  console.log('\n== interactive ui ==');
  const withUi = await render([message({ content: 'hi' })]);
  // the stylesheet names the same classes as the scripts, so the scripts are looked for by their source
  const scriptsOf = [
    ['image preview', uiImagePreviewFeature],
    ['search', uiSearchFeature],
    ['member list', uiMemberListFeature],
    ['pinned messages', uiPinnedMessagesFeature],
    ['voice player', uiVoicePlayerFeature],
    ['thread modal', uiThreadModalFeature],
    ['server tags', uiServerTagsFeature],
  ] as const;
  const source = (feature: FeatureDescriptor) => feature.clientScript?.(off) ?? '';
  const hasScripts = (html: string) => scriptsOf.map(([, feature]) => html.includes(source(feature))).join('/');

  check('default output has the prelude', withUi.includes('window.__transcript'), true);
  check('default output has every script', hasScripts(withUi), 'true/true/true/true/true/true/true');
  check(
    'prelude comes before the feature script',
    withUi.indexOf('window.__transcript =') < withUi.indexOf(source(uiImagePreviewFeature)),
    true
  );
  check('prelude is emitted once', withUi.split('window.__transcript =').length - 1, 1);

  const renderUi = (ui: boolean | UiOptions) =>
    generateFromMessages([message({ content: 'hi' })], channel, {
      returnType: ExportReturnType.String,
      ui,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
    });
  const controls = (html: string) =>
    [
      html.includes('data-transcript-action="pins"'),
      html.includes('data-transcript-action="members"'),
      html.includes('class="discord-transcript-header-search-slot"'),
    ].join('/');

  check('default output has all three header tools', controls(withUi), 'true/true/true');
  const withoutUi = [
    ['ui: false', await renderUi(false)],
    [
      'ui: every key false',
      await renderUi({
        imagePreview: false,
        search: false,
        memberList: false,
        pinnedMessages: false,
        voicePlayer: false,
        threadModal: false,
        serverTags: false,
        selectMenus: false,
      }),
    ],
  ];
  for (const [name, html] of withoutUi) {
    check(`${name} has no prelude`, html.includes('__transcript'), false);
    check(`${name} has no script`, hasScripts(html), 'false/false/false/false/false/false/false');
    check(`${name} has no header tool`, controls(html), 'false/false/false');
    check(`${name} has no tools container`, html.includes('class="discord-transcript-header-tools"'), false);
    check(`${name} still has the header`, html.includes('class="discord-transcript-header-bar"'), true);
    check(`${name} still shows the message`, html.includes('>hi<'), true);
  }

  check(
    'ui: { search: false } keeps the rest',
    hasScripts(await renderUi({ search: false })),
    'true/false/true/true/true/true/true'
  );
  check(
    'ui: { imagePreview: false } keeps the rest',
    hasScripts(await renderUi({ imagePreview: false })),
    'false/true/true/true/true/true/true'
  );
  check(
    'ui: { search: false } removes only the search slot',
    controls(await renderUi({ search: false })),
    'true/true/false'
  );
  check(
    'ui: { memberList: false } removes only the members tool',
    controls(await renderUi({ memberList: false })),
    'true/false/true'
  );
  check(
    'ui: { pinnedMessages: false } removes only the pins tool',
    controls(await renderUi({ pinnedMessages: false })),
    'false/true/true'
  );
  const searchOnly = await renderUi({ imagePreview: false, memberList: false, pinnedMessages: false });
  check('search alone is the only tool left', controls(searchOnly), 'false/false/true');

  check('prelude has no http(s) url', /https?:\/\//.test(prelude), false);
  for (const [name, feature] of scriptsOf) {
    check(`${name} script is not empty`, source(feature).length > 0, true);
    check(`${name} script has no http(s) url`, /https?:\/\//.test(source(feature)), false);
    check(
      `${name} script makes no request and evaluates nothing`,
      /\beval\b|new Function|fetch\(|XMLHttpRequest/.test(source(feature)),
      false
    );
  }
  check('search script does not intercept Ctrl+F', /ctrlKey|metaKey/.test(source(uiSearchFeature)), false);
  check(
    'image preview dialog is labelled',
    source(uiImagePreviewFeature).includes("'aria-label', 'Image preview'"),
    true
  );
  // modal only because Tab is held on the close button; drop aria-modal if that trap goes
  check('and is modal', source(uiImagePreviewFeature).includes("'aria-modal', 'true'"), true);
  check('with Tab held inside', source(uiImagePreviewFeature).includes("event.key === 'Tab'"), true);

  // the DOM tests below run the scripts, but a syntax error would surface there as a crash rather than a failed check
  for (const [name, script] of [['prelude', prelude], ...scriptsOf.map(([name, feature]) => [name, source(feature)])]) {
    let valid = true;
    try {
      new Function(script);
    } catch {
      valid = false;
    }
    check(`${name} is syntactically valid`, valid, true);
  }

  console.log('\n== header and footer ==');
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const iconGuild = (client.guilds as any)._add({
    id: '101',
    name: 'Icon Guild',
    icon: 'abc123',
    features: [],
    roles: [],
    channels: [],
    members: [],
    emojis: [],
    stickers: [],
    owner_id: '1',
  });
  const topicChannel = (client.channels as any)._add(
    { id: '201', type: 0, name: 'news', topic: 'the **bold** topic', guild_id: '101' },
    iconGuild
  );
  const voiceChannel = (client.channels as any)._add(
    { id: '202', type: 2, name: 'lounge', guild_id: '101', bitrate: 64000 },
    iconGuild
  );
  const threadChannel = (client.channels as any)._add(
    {
      id: '203',
      type: 11,
      name: 'a thread',
      guild_id: '101',
      parent_id: '201',
      thread_metadata: { archived: false, auto_archive_duration: 60, archive_timestamp: new Date(0).toISOString() },
    },
    iconGuild
  );
  const dmChannel = (client.channels as any)._add({
    id: '301',
    type: 1,
    recipients: [{ id: '9', username: 'zed', discriminator: '0', global_name: 'Zed', avatar: null }],
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const renderIn = (target: Channel, extra: Record<string, unknown> = {}) =>
    generateFromMessages([message({ content: 'hi' })], target, {
      returnType: ExportReturnType.String,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
      ...extra,
    });

  const topicHtml = await renderIn(topicChannel, { ui: false });
  check('the header shows the server name', topicHtml.includes('header-guild">Icon Guild<'), true);
  check('and the server icon', topicHtml.includes('class="discord-transcript-header-server-icon"'), true);
  check('and the channel name', topicHtml.includes('header-title">news<'), true);
  check(
    'and the topic, formatted by the message renderer',
    /header-topic">.*<discord-bold[^>]*>bold</.test(topicHtml),
    true
  );
  check(
    'a guild without an icon has no icon element',
    withUi.includes('class="discord-transcript-header-server-icon"'),
    false
  );
  check(
    'a channel without a topic shows the default line',
    withUi.includes('This is the start of #tickets channel.'),
    true
  );
  check('a voice channel says so', (await renderIn(voiceChannel)).includes('Voice Text Channel for lounge'), true);
  check('a thread names its parent', (await renderIn(threadChannel)).includes('Thread channel in news'), true);
  // a direct message channel tells the recipient from the bot by the client's own user
  (client as any).user = { id: '0' }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const dmHtml = await renderIn(dmChannel);
  (client as any).user = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  check('a direct message shows the recipient', dmHtml.includes('header-title">zed<'), true);
  check('and says Direct Messages', dmHtml.includes('header-guild">Direct Messages<'), true);
  check('and has no server icon', dmHtml.includes('class="discord-transcript-header-server-icon"'), false);

  check('the footer counts the messages', withUi.includes('Exported 1 message.'), true);
  check(
    'and credits this package with its link',
    withUi.includes('Powered by <a href="https://github.com/cauahzz/discord-transcriptify">discord-transcriptify</a>.'),
    true
  );
  const unpowered = await renderIn(channel, { poweredBy: false, footerText: 'Saved {number} message{s}' });
  check('footerText is honoured', unpowered.includes('Saved 1 message<'), true);
  check('poweredBy: false drops the credit', unpowered.includes('Powered by'), false);
  check('and the separator', unpowered.includes('class="discord-transcript-footer-pill-separator"'), false);

  console.log('\n== thread messages ==');
  const renderWith = (messages: Message[], extra: Record<string, unknown>) =>
    generateFromMessages(messages, channel, {
      returnType: ExportReturnType.String,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
      ...extra,
    });

  const enabledCase = messageWithThread(3);
  const enabledHtml = await renderWith([enabledCase.parent], { saveThreadMessages: true });
  check(
    'thread messages rendered in the details block',
    /discord-thread-messages[\s\S]*thread message 2/.test(enabledHtml),
    true
  );
  check('summary counts the messages', enabledHtml.includes('3 messages in thread'), true);
  check(
    'the thread block is labelled with its thread',
    enabledHtml.includes(`<details class="discord-thread-messages" data-thread-id="${enabledCase.thread.id}"`),
    true
  );

  const createdMessage = (threadId: string, content: string) =>
    message({
      type: 18,
      content,
      message_reference: { type: 0, channel_id: threadId, guild_id: GUILD_ID },
    });
  const previewed = await renderWith([enabledCase.parent, createdMessage(enabledCase.thread.id, 'Billing <b>q</b>')], {
    saveThreadMessages: true,
  });
  const previewBox =
    /<div class="discord-thread-preview-container"[\s\S]*?<\/span><\/div><\/div><\/div>/.exec(previewed)?.[0] ?? '';
  check('the thread-created message carries a preview box', previewBox.length > 0, true);
  check('which points at the thread', previewBox.includes(`data-thread-id="${enabledCase.thread.id}"`), true);
  check(
    'names the thread, escaped',
    previewBox.includes('Billing &lt;b&gt;q&lt;/b&gt;') && !previewBox.includes('<b>q'),
    true
  );
  check('counts the messages of the thread', previewBox.includes('3 messages ›'), true);
  check(
    'shows the last message with its author',
    /<strong[^>]*>Bob<\/strong>[\s\S]*thread message 2/.test(previewBox),
    true
  );
  check('the card goes into the thread slot, after the sentence', previewBox.includes('slot="thread"'), true);
  check(
    'the sentence ends with the link to all threads',
    previewed
      .replace(/<!-- -->/g, '')
      .includes('started a thread: <strong>Billing &lt;b&gt;q&lt;/b&gt;</strong>. See all <strong>threads</strong>.'),
    true
  );
  const standalone = messageWithThread(2);
  // as Discord sends it: the system message has the id of the thread and carries the thread flag itself
  const standaloneMessage = () =>
    message({
      id: standalone.thread.id,
      type: 18,
      flags: 32,
      content: 'On its own',
      message_reference: { type: 0, channel_id: standalone.thread.id, guild_id: GUILD_ID },
    });
  const standaloneHtml = await renderWith([standaloneMessage()], { saveThreadMessages: true });
  check('a thread created on its own is fetched from its system message', standalone.stub.calls, 1);
  check(
    'and its messages are rendered under the preview',
    new RegExp(
      `<details class="discord-thread-messages" data-thread-id="${standalone.thread.id}"[\\s\\S]*thread message 1`
    ).test(standaloneHtml),
    true
  );
  check(
    'inside a message list of their own, where a message can draw itself',
    /<details class="discord-thread-messages"[^>]*><summary>[^<]*<\/summary><discord-messages class="discord-thread-message-list">/.test(
      standaloneHtml
    ),
    true
  );
  const threadsTool = 'class="discord-transcript-threads-anchor"';
  check('the header offers the list of threads', standaloneHtml.includes(threadsTool), true);
  check('but not when no thread was saved', (await render([standaloneMessage()])).includes(threadsTool), false);
  check(
    'nor without the script that opens them',
    (await renderWith([standaloneMessage()], { saveThreadMessages: true, ui: { threadModal: false } })).includes(
      threadsTool
    ),
    false
  );

  const both = messageWithThread(2);
  const bothHtml = await renderWith([createdMessage(both.thread.id, 'From a message'), both.parent], {
    saveThreadMessages: true,
  });
  check('a thread reachable from its message and its system message is fetched once', both.stub.calls, 1);
  check('and rendered once', bothHtml.split('<details class="discord-thread-messages"').length - 1, 1);

  const previewWithoutThreads = await render([createdMessage(enabledCase.thread.id, 'Billing')]);
  check(
    'without saved thread messages the count still comes from the thread itself',
    previewWithoutThreads.includes('3 messages ›'),
    true
  );
  check(
    'oldest thread message comes first',
    // the block also names its last message in an attribute, so the order is read where the messages are drawn
    enabledHtml.indexOf('>thread message 0<') < enabledHtml.indexOf('>thread message 2<'),
    true
  );
  check('thread authors are in the profiles', enabledHtml.includes('"2":{"author":"Bob"'), true);
  check('no script or modal added for it', enabledHtml.includes('<dialog'), false);

  for (const [label, extra] of [
    ['false', { saveThreadMessages: false }],
    ['omitted', {}],
  ] as const) {
    const disabledCase = messageWithThread(3);
    const disabledHtml = await renderWith([disabledCase.parent], extra);
    check(`${label}: the thread is never fetched`, disabledCase.stub.calls, 0);
    check(
      `${label}: no thread messages block`,
      disabledHtml.includes('<details class="discord-thread-messages"'),
      false
    );
    check(`${label}: preview still rendered`, disabledHtml.includes('Thread messages not saved'), true);
  }

  const limited = messageWithThread(250);
  const limitedHtml = await renderWith([limited.parent], { saveThreadMessages: { limit: 120 } });
  check('limit is respected', limitedHtml.includes('Last 120 of 250 messages in thread'), true);
  check(
    'limit keeps the newest messages',
    limitedHtml.includes('thread message 249') && !limitedHtml.includes('thread message 129<'),
    true
  );
  check('limit stops paginating early', limited.stub.calls, 2);

  const unlimited = messageWithThread(250);
  const unlimitedHtml = await renderWith([unlimited.parent], { saveThreadMessages: { limit: -1 } });
  check('limit -1 collects every message', unlimitedHtml.includes('250 messages in thread'), true);
  check('limit -1 pages through the thread', unlimited.stub.calls, 3);
  const zero = messageWithThread(150);
  const zeroHtml = await renderWith([zero.parent], { saveThreadMessages: { limit: 0 } });
  check('limit 0 also means no limit', zeroHtml.includes('150 messages in thread'), true);

  const small = messageWithThread(50);
  const smallHtml = await renderWith([small.parent], { saveThreadMessages: { limit: 5 } });
  check('limit 5 asks the thread for 5 messages', small.stub.limits.join(), '5');
  check('limit 5 keeps 5', smallHtml.includes('Last 5 of 50 messages in thread'), true);
  check('the last page asks only for what is left', limited.stub.limits.join(), '100,20');

  const mixedThread = messageWithThread(4, { carol: true });
  const filteredHtml = await renderWith([mixedThread.parent], {
    saveThreadMessages: true,
    filter: (candidate: Message) => candidate.author.id !== '3',
  });
  check('filtered author is absent from the thread', /thread message [13]</.test(filteredHtml), false);
  check('other authors stay', /thread message 0</.test(filteredHtml) && /thread message 2</.test(filteredHtml), true);
  check('filtered thread is counted without them', filteredHtml.includes('2 messages in thread'), true);
  check('filtered author gets no profile', filteredHtml.includes('"author":"Carol"'), false);

  const many = Array.from({ length: 7 }, () => messageWithThread(2, { delay: true }));
  const shared = { inFlight: 0, max: 0 };
  for (const { thread } of many) {
    const original = thread.messages.fetch;
    thread.messages.fetch = async (opts: unknown) => {
      shared.inFlight++;
      shared.max = Math.max(shared.max, shared.inFlight);
      try {
        return await original(opts);
      } finally {
        shared.inFlight--;
      }
    };
  }
  await renderWith(
    many.map((entry) => entry.parent),
    { saveThreadMessages: true }
  );
  check('at most 3 threads fetched at once', shared.max, 3);
  check(
    'every thread was fetched',
    many.every((entry) => entry.stub.calls === 1),
    true
  );

  const failing = messageWithThread(2, { fail: true });
  const survivor = messageWithThread(2);
  const failedHtml = await renderWith([failing.parent, survivor.parent], { saveThreadMessages: true });
  check('a failing thread does not fail the transcript', failedHtml.includes('<html'), true);
  check('the other thread is still collected', failedHtml.includes('2 messages in thread'), true);
  check(
    'only the readable thread shows a block',
    failedHtml.split('<details class="discord-thread-messages"').length - 1,
    1
  );

  const skipLines: string[] = [];
  const previousLog = debug.log;
  debug.log = (...args: unknown[]) => skipLines.push(args.join(' '));
  debug.enable('discord-transcriptify:threads');
  await renderWith([failing.parent], { saveThreadMessages: true });
  debug.disable();
  debug.log = previousLog;
  check('a skipped thread leaves one debug line', skipLines.length, 1);
  check(
    'the line names the thread and the error',
    skipLines[0]?.includes(`Skipping thread ${failing.parent.id}: Missing Access`),
    true
  );

  const reused = messageWithThread(2);
  const reusedOn = await renderWith([reused.parent], { saveThreadMessages: true });
  check('reused parent: collected when on', reusedOn.includes('<details class="discord-thread-messages"'), true);
  const reusedOff = await renderWith([reused.parent], { saveThreadMessages: false });
  check('reused parent: no block when off', reusedOff.includes('<details class="discord-thread-messages"'), false);
  check('reused parent: no thread-only author when off', reusedOff.includes('"author":"Bob"'), false);

  const stale = messageWithThread(2);
  await renderWith([stale.parent], { saveThreadMessages: true });
  stale.thread.messages.fetch = async () => {
    throw new Error('Missing Access');
  };
  const staleHtml = await renderWith([stale.parent], { saveThreadMessages: true });
  check('failed rerun does not show the earlier thread messages', staleHtml.includes('thread message'), false);

  console.log('\n== hostile strings ==');
  const HOSTILE = '</script><script>window.PWNED=1</script>';
  const hostileAuthor = (id: string, name: string) => ({
    id,
    username: 'mallory' + id,
    discriminator: '0',
    global_name: name,
    avatar: null,
  });
  const hostileThread = messageWithThread(1);
  const hostileReply = threadMessage(hostileThread.thread, {
    content: 'hostile thread message',
    author: hostileAuthor('77', HOSTILE),
  });
  hostileThread.thread.messages.fetch = async () => new Collection([[hostileReply.id, hostileReply]]);
  const hostileHtml = await renderWith(
    [
      message({ content: 'hi', author: hostileAuthor('66', HOSTILE) }),
      message({ sticker_items: [{ id: '401', name: '"><img src=x onerror=alert(1)>', format_type: 1 }] }),
      hostileThread.parent,
    ],
    { saveThreadMessages: true }
  );
  check('hostile name does not open a script', hostileHtml.includes('<script>window.PWNED=1'), false);
  check('hostile sticker name does not become markup', hostileHtml.includes('<img src=x onerror'), false);
  const profilesJson = /window\.\$discordMessage=\{profiles:(.*?)\}<\/script>/.exec(hostileHtml)?.[1] ?? '{}';
  const parsedProfiles = JSON.parse(profilesJson);
  check('profiles blob still parses to the original name', parsedProfiles['66']?.author, HOSTILE);
  check('thread author name survives the escaping too', parsedProfiles['77']?.author, HOSTILE);

  console.log('\n== null from resolveImageSrc leaves the image out ==');
  const dropAll = () => null;
  const singleDropped = await render([message({ attachments: images(1) })], dropAll);
  check('a single dropped image attachment is not rendered', singleDropped.includes('pic1.png'), false);
  const singleKept = await render([message({ attachments: images(1) })], () => undefined);
  check('undefined keeps the single attachment url', singleKept.includes('pic1.png'), true);
  const singleReplaced = await render([message({ attachments: images(1) })], () => INLINED);
  check('a string replaces the single attachment url', singleReplaced.includes(INLINED), true);

  const droppedEmbed = await render([message({ embeds: [embed] })], dropAll);
  check(
    'a dropped embed leaves no image, thumbnail or icons',
    /example\.com\/(image|thumb|author|footer)\.png|media\.example/.test(droppedEmbed),
    false
  );
  check('and keeps the embed text', droppedEmbed.includes('With image') && droppedEmbed.includes('Footer'), true);

  const droppedSticker = await render([message({ sticker_items: [sticker('305', 'wave', 1)] })], dropAll);
  check('a dropped sticker is not rendered', droppedSticker.includes('stickers/305'), false);

  const droppedSection = await render([section], dropAll);
  check('a dropped section thumbnail is omitted', droppedSection.includes('accessory.png'), false);
  check('and the section text stays', droppedSection.includes('section text'), true);

  const mediaGallery = message({
    flags: 1 << 15,
    components: [
      {
        type: 12,
        id: 1,
        items: [
          { media: { url: 'https://example.com/m1.png', width: 10, height: 10 } },
          { media: { url: 'https://example.com/m2.png', width: 10, height: 10 } },
          { media: { url: 'https://example.com/m3.png', width: 10, height: 10 } },
        ],
      },
    ],
  });
  const droppedMedia = await render([mediaGallery], (attachment) =>
    attachment.url.endsWith('m2.png') ? null : undefined
  );
  check('a dropped media gallery item is omitted', droppedMedia.includes('m2.png'), false);
  check('the others stay', droppedMedia.includes('m1.png') && droppedMedia.includes('m3.png'), true);
  check('and the grid is laid out for two', droppedMedia.includes('grid-template-rows:auto'), true);

  console.log('\n== components v2 file and container ==');
  const v2File = await render([
    message({
      flags: 1 << 15,
      attachments: [
        {
          id: '70',
          filename: 'notes.txt',
          size: 2048,
          url: 'https://cdn.discordapp.com/attachments/1/70/notes.txt',
          proxy_url: 'https://media.discordapp.net/attachments/1/70/notes.txt',
          content_type: 'text/plain',
        },
      ],
      components: [
        {
          type: 17,
          id: 1,
          accent_color: 0x5865f2,
          components: [{ type: 13, id: 2, file: { url: 'attachment://notes.txt' } }],
        },
      ],
    }),
  ]);
  const v2Card = /class="discord-custom-file-base"[\s\S]*?discord-custom-file-download/.exec(v2File)?.[0] ?? '';
  check('a file component shows the attachment name', v2Card.includes('>notes.txt</a>'), true);
  check('and its size', v2Card.includes('>2 KB</div>'), true);
  check(
    'and links to the attachment',
    v2Card.includes('href="https://cdn.discordapp.com/attachments/1/70/notes.txt"'),
    true
  );
  check(
    'a container with an accent colour carries it as a variable, not as inline layout',
    v2File.includes('class="discord-v2-container has-accent" style="--dt-accent:#5865f2"'),
    true
  );

  const v2Echoed = await render([
    message({
      flags: 1 << 15,
      components: [
        {
          type: 13,
          id: 1,
          file: { url: 'https://cdn.discordapp.com/attachments/1/71/blob' },
          name: 'report.csv',
          size: 50,
        },
      ],
    }),
  ]);
  check(
    'a file that is not among the attachments takes its name from the component',
    v2Echoed.includes('>report.csv</a>'),
    true
  );
  check('and its size too', v2Echoed.includes('>50 Bytes</div>'), true);

  const galleryOf = (count: number) =>
    message({
      flags: 1 << 15,
      components: [
        {
          type: 12,
          id: 1,
          items: Array.from({ length: count }, (_, index) => ({
            media: { url: `https://example.com/g${index}.png`, width: 10, height: 10 },
          })),
        },
      ],
    });
  const wideCells = async (count: number) => (await render([galleryOf(count)])).split('aspect-ratio:2 / 1').length - 1;
  check('the image leading a gallery of seven is drawn wide', await wideCells(7), 1);
  check('and so is the one leading a gallery of ten', await wideCells(10), 1);
  check('a gallery of four has no leading image', await wideCells(4), 0);

  console.log('\n== edited label ==');
  const editedAt = new Date(5000).toISOString();
  const editedText = await render([message({ content: 'with text', edited_timestamp: editedAt })]);
  check(
    'a message with text leaves the label to the component',
    /<discord-message\b[^>]*\sedited/.test(editedText),
    true
  );
  check('and adds none of its own', editedText.includes('class="discord-message-edited"'), false);
  const editedEmbed = await render([
    message({ embeds: [{ type: 'rich', title: 'Only an embed' }], edited_timestamp: editedAt }),
  ]);
  check('a message without text prints it after its content instead', editedEmbed.includes('slot="thread"'), true);
  check('and not twice', /<discord-message\b[^>]*\sedited/.test(editedEmbed), false);

  console.log('\n== thread store is per run ==');
  const sharedThread = messageWithThread(3);
  const [withThreads, withoutThreads] = await Promise.all([
    renderWith([sharedThread.parent], { saveThreadMessages: true }),
    renderWith([sharedThread.parent], { saveThreadMessages: false }),
  ]);
  check('the run with the option on has the thread messages', withThreads.includes('thread message 2'), true);
  check('the concurrent run with it off does not', withoutThreads.includes('thread message 2'), false);
  check('nor the details block', withoutThreads.includes('<details class="discord-thread-messages"'), false);

  console.log('\n== truncated thread summary ==');
  const everything = messageWithThread(10);
  check(
    'a thread collected in full says N messages',
    (await renderWith([everything.parent], { saveThreadMessages: true })).includes('>10 messages in thread<'),
    true
  );
  const truncated = messageWithThread(10);
  const truncatedHtml = await renderWith([truncated.parent], { saveThreadMessages: { limit: 4 } });
  check('a truncated thread says so', truncatedHtml.includes('>Last 4 of 10 messages in thread<'), true);
  const filteredTruncated = messageWithThread(10);
  const filteredTruncatedHtml = await renderWith([filteredTruncated.parent], {
    saveThreadMessages: { limit: 4 },
    filter: () => true,
  });
  check('with a filter the plain form is kept', filteredTruncatedHtml.includes('>4 messages in thread<'), true);

  console.log('\n== spoilered attachments ==');
  const spoilerImage = (n: number) =>
    imageFile(n, {
      filename: `SPOILER_pic${n}.png`,
      flags: 8, // IsSpoiler, which is what discord.js reads
      url: `https://cdn.discordapp.com/attachments/1/${900 + n}/SPOILER_pic${n}.png`,
    });
  const spoilerSingle = await render([message({ attachments: [spoilerImage(1)] })]);
  check('a spoilered attachment is wrapped', /<discord-spoiler[^>]*>\s*<discord-attachment/.test(spoilerSingle), true);
  const plainSingle = await render([message({ attachments: images(1) })]);
  check('a plain attachment is not', plainSingle.includes('<discord-spoiler'), false);
  const spoilerGallery = await render([message({ attachments: [spoilerImage(1), imageFile(2)] })]);
  check('only the spoilered gallery cell is wrapped', spoilerGallery.split('<discord-spoiler').length - 1, 1);
  check(
    'and the wrapper sits inside the cell, around the image',
    /<div[^>]*position:relative[^>]*><discord-spoiler[^>]*><img[^>]*SPOILER_pic1/.test(spoilerGallery),
    true
  );
  check('both images are still in the gallery', imgCount(spoilerGallery), 2);

  console.log('\n== interactive scripts in a DOM ==');
  // the page that is rendered, parsed by a stand-in DOM, with the real scripts run against it
  const hostileName = '<img src=x onerror=alert(1)>';
  const threadCase = messageWithThread(3);
  threadCase.parent.pinned = true;
  threadCase.thread.messages.cache.forEach((m: Message) => {
    if (m.content === 'thread message 1') m.pinned = true;
  });
  const domPage = await renderWith(
    [
      message({ content: 'first alpha' }),
      message({
        content: `long ${'x'.repeat(150)}`,
        pinned: true,
        author: { id: '2', username: 'bob', discriminator: '0', global_name: 'Bob', avatar: null },
      }),
      message({
        content: 'third alpha',
        author: { id: '3', username: 'carol', discriminator: '0', global_name: 'Carol', avatar: null },
      }),
      message({
        content: 'fourth',
        author: { id: '3', username: 'carol', discriminator: '0', global_name: 'Carol', avatar: null },
      }),
      threadCase.parent,
      message({
        content: 'hostile body',
        pinned: true,
        author: { id: '7', username: 'mallory', discriminator: '0', global_name: hostileName, avatar: null },
      }),
      message({ id: '123456789012345678', content: 'with a snowflake' }),
      message({ attachments: [imageFile(3), imageFile(4)] }),
      message({ attachments: [spoilerImage(5), imageFile(6)] }),
    ],
    { saveThreadMessages: true }
  );

  // @stencil/core is a transitive dependency of the component library; its mock-doc entry is used here only as a DOM
  // for these tests, and nothing in src/ depends on it
  const loadMockDoc = () => {
    try {
      return createRequire(__filename)('@stencil/core/mock-doc') as typeof MockDoc;
    } catch (error) {
      throw new Error(
        `The DOM tests need the module "@stencil/core/mock-doc" (installed with @derockdev/discord-components-core), which could not be loaded: ${error}`,
        { cause: error }
      );
    }
  };
  const { MockElement, MockHTMLElement, MockWindow } = loadMockDoc();
  type DomElement = InstanceType<typeof MockHTMLElement>;
  const dom = (html: string, profiles: Record<string, unknown> = {}) => {
    const win = new MockWindow(html);
    const doc = win.document;
    const scrolled: string[] = [];
    const timers = new Map<number, () => void>();
    const observers: Array<(records: unknown[]) => void> = [];
    let nextTimer = 1;
    // the stand-in ignores the second argument of toggle, which the scripts rely on
    const classListPrototype = Object.getPrototypeOf(doc.createElement('div').classList);
    classListPrototype.toggle = function (this: DOMTokenList, name: string, force?: boolean) {
      const on = force ?? !this.contains(name);
      if (on) this.add(name);
      else this.remove(name);
      return on;
    };
    MockElement.prototype.scrollIntoView = function (this: { id?: string }) {
      scrolled.push(this.id ?? '');
    };
    (win as unknown as Record<string, unknown>).matchMedia = () => ({ matches: true, addEventListener() {} });
    (win as unknown as Record<string, unknown>).$discordMessage = { profiles };
    const run = (script: string) =>
      new Function(
        'window',
        'document',
        'Element',
        'HTMLElement',
        'MutationObserver',
        'requestAnimationFrame',
        'setTimeout',
        'clearTimeout',
        script
      )(
        win,
        doc,
        MockElement,
        MockHTMLElement,
        class {
          constructor(callback: (records: unknown[]) => void) {
            observers.push(callback);
          }
          observe() {}
        },
        (fn: () => void) => fn(),
        (fn: () => void) => {
          timers.set(nextTimer, fn);
          return nextTimer++;
        },
        (id: number) => timers.delete(id)
      );
    run(prelude);
    return {
      doc,
      scrolled,
      run,
      // what a MutationObserver would report
      mutated: (...targets: unknown[]) =>
        observers.forEach((callback) => callback(targets.map((target) => ({ target })))),
      // the timers that are pending, such as the search debounce
      settle: () => {
        const pending = [...timers.values()];
        timers.clear();
        pending.forEach((fn) => fn());
      },
      fire: (target: unknown, type: string, init: Record<string, unknown> = {}) => {
        const event = type === 'keydown' ? new win.KeyboardEvent(type, init) : new win.MouseEvent(type, init);
        (target as { dispatchEvent: (e: unknown) => void }).dispatchEvent(event);
        return event;
      },
      one: (selector: string) => doc.querySelector(selector) as unknown as DomElement,
      all: (selector: string) => Array.from(doc.querySelectorAll(selector)) as unknown as DomElement[],
    };
  };
  const clickInit = { bubbles: true, cancelable: true };
  const keyInit = (key: string, extra: Record<string, unknown> = {}) => ({
    key,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  const rowsOf = (panel: DomElement) =>
    Array.from(panel.querySelectorAll('.discord-transcript-members-row')).map(
      (row) =>
        `${row.querySelector('.discord-transcript-members-name')?.textContent}:${row.querySelector('.discord-transcript-members-count')?.textContent}`
    );

  // the member list
  const memberDom = dom(domPage, {
    '2': { author: 'Bob', avatar: 'https://cdn.discordapp.com/b.png', roleColor: '#ff0000' },
  });
  memberDom.run(source(uiMemberListFeature));
  const membersButton = memberDom.one('[data-transcript-action="members"]');
  const membersPanel = memberDom.one('.discord-transcript-members-panel');
  check('the members panel is created under its tool', membersPanel !== null, true);
  check('and starts closed', membersPanel.classList.contains('is-open'), false);
  memberDom.fire(membersButton, 'click', clickInit);
  check('the Members tool opens it', membersPanel.classList.contains('is-open'), true);
  check('and marks the tool expanded', membersButton.getAttribute('aria-expanded'), 'true');
  check(
    'authors are counted most first, the thread messages included',
    rowsOf(membersPanel).join(),
    `Alice:5 messages,Bob:4 messages,Carol:2 messages,${hostileName}:1 message`
  );
  check('the heading counts the members', membersPanel.textContent?.includes('Members · 4'), true);
  check(
    'a role colour is applied',
    /#ff0000/.test(membersPanel.querySelector('.discord-transcript-members-name[style]')?.getAttribute('style') ?? ''),
    true
  );
  check('a known avatar is used', membersPanel.innerHTML.includes('src="https://cdn.discordapp.com/b.png"'), true);
  check(
    'an author without one gets an initial',
    membersPanel.querySelectorAll('.discord-transcript-members-avatar--fallback').length,
    3
  );
  check('a hostile name is text, not markup', membersPanel.querySelector('img[onerror]'), null);
  check('and is escaped in the markup', membersPanel.innerHTML.includes('&lt;img src=x onerror=alert(1)&gt;'), true);
  memberDom.fire(memberDom.doc, 'keydown', keyInit('Escape'));
  check('Escape closes it', membersPanel.classList.contains('is-open'), false);
  memberDom.fire(membersButton, 'click', clickInit);
  memberDom.fire(membersPanel.querySelector('.discord-transcript-members-row'), 'click', clickInit);
  check('a click inside keeps it open', membersPanel.classList.contains('is-open'), true);
  memberDom.fire(memberDom.one('discord-message'), 'click', clickInit);
  check('a click outside closes it', membersPanel.classList.contains('is-open'), false);

  const hostileColor = dom(domPage, {
    '2': { author: 'Bob', avatar: 'x" onerror="alert(1)', roleColor: 'red;background:url(x)' },
  });
  hostileColor.run(source(uiMemberListFeature));
  hostileColor.fire(hostileColor.one('[data-transcript-action="members"]'), 'click', clickInit);
  const hostilePanel = hostileColor.one('.discord-transcript-members-panel');
  check('a hostile colour is dropped', hostilePanel.innerHTML.includes('background:url'), false);
  check('a hostile avatar url cannot leave its attribute', hostilePanel.querySelector('[onerror]'), null);

  // the pinned messages
  const pinsDom = dom(domPage);
  pinsDom.run(source(uiPinnedMessagesFeature));
  const pinsButton = pinsDom.one('[data-transcript-action="pins"]');
  const pinsPanel = pinsDom.one('.discord-transcript-pins-panel');
  pinsDom.fire(pinsButton, 'click', clickInit);
  check('the Pins tool opens its panel', pinsPanel.classList.contains('is-open'), true);
  const pinRows = Array.from(pinsPanel.querySelectorAll('.discord-transcript-pins-row'));
  const pinText = (row: Element) =>
    `${row.querySelector('.discord-transcript-pins-author')?.textContent}:${row.querySelector('.discord-transcript-pins-preview')?.textContent}`;
  check(
    'only the messages marked data-pinned are listed, in page order',
    pinRows.map(pinText).join('|'),
    `Bob:long ${'x'.repeat(112)}...|Alice:parent|Bob:thread message 1|${hostileName}:hostile body`
  );
  check('the heading counts them', pinsPanel.textContent?.includes('Pinned Messages · 4'), true);
  check(
    'a thread message is listed when it is pinned',
    pinRows.some((row) => pinText(row).includes('thread message 1')),
    true
  );
  check(
    'the parent of a thread does not show the thread text',
    pinRows.some((row) => pinText(row).includes('thread message 0')),
    false
  );
  check('a hostile name is text, not markup', pinsPanel.querySelector('img[onerror]'), null);
  check('and the row targets the message', pinRows[1].getAttribute('href')?.startsWith('#m-'), true);

  const pinnedThreadMessage = pinsDom.all('.discord-thread-messages discord-message[data-pinned]')[0];
  const threadDetails = pinsDom.one('.discord-thread-messages') as unknown as { open?: boolean };
  const threadIsOpen = () => threadDetails.open === true;
  check('the thread is closed to begin with', threadIsOpen(), false);
  const goingTo = pinRows[2] as unknown as DomElement;
  const goneTo = pinsDom.fire(goingTo, 'click', clickInit);
  check('clicking an entry does not follow the link', goneTo.defaultPrevented, true);
  check('it scrolls to the message', pinsDom.scrolled[pinsDom.scrolled.length - 1], pinnedThreadMessage.id);
  check('opens the thread around it', threadDetails.open, true);
  check('and closes the panel', pinsPanel.classList.contains('is-open'), false);

  pinsDom.fire(pinsButton, 'click', clickInit);
  pinsDom.run(source(uiMemberListFeature));
  const secondMembers = pinsDom.one('.discord-transcript-members-panel');
  pinsDom.fire(pinsDom.one('[data-transcript-action="members"]'), 'click', clickInit);
  check(
    'opening the members closes the pins',
    `${secondMembers.classList.contains('is-open')}/${pinsPanel.classList.contains('is-open')}`,
    'true/false'
  );

  const noPins = dom(domPage.replaceAll('data-pinned="true"', ''));
  noPins.run(source(uiPinnedMessagesFeature));
  check('without pinned messages the tool is removed', noPins.one('[data-transcript-action="pins"]'), null);

  // the search
  const searchDom = dom(domPage);
  searchDom.run(source(uiSearchFeature));
  const searchInput = searchDom.one('.discord-transcript-search-input') as unknown as DomElement & {
    value: string;
    placeholder: string;
  };
  const searchCount = searchDom.one('.discord-transcript-search-count');
  check(
    'the search box sits in the header slot',
    searchDom.one('.discord-transcript-header-search-slot .discord-transcript-search-shell') !== null,
    true
  );
  check('and names the channel', searchInput.placeholder, 'Search tickets');
  const type = (query: string) => {
    searchInput.value = query;
    searchDom.fire(searchInput, 'input');
    searchDom.settle();
  };
  const press = (key: string, extra: Record<string, unknown> = {}) =>
    searchDom.fire(searchInput, 'keydown', keyInit(key, extra));

  type('alpha');
  check('typing finds the matches', searchCount.textContent, '1 of 2');
  check('and marks them', searchDom.all('.discord-search-match').length, 2);
  check('typing alone does not move the page', searchDom.scrolled.length, 0);
  press('Enter');
  check(
    'the first Enter lands on the first match',
    `${searchCount.textContent}/${searchDom.scrolled.length}`,
    '1 of 2/1'
  );
  press('Enter');
  check('the next Enter moves on', searchCount.textContent, '2 of 2');
  press('Enter');
  check('and wraps around', searchCount.textContent, '1 of 2');
  type('alpha');
  press('Enter', { shiftKey: true });
  check('Shift+Enter first lands on the last match', searchCount.textContent, '2 of 2');
  type('a');
  check('a query under 2 characters matches nothing', searchCount.textContent, 'No matches');

  type('thread message 1');
  press('Enter');
  check('a hit inside a thread is counted once', searchCount.textContent, '1 of 1');
  check('and the thread is opened to show it', threadDetails.open, true);
  check(
    'and scrolled to',
    searchDom.scrolled[searchDom.scrolled.length - 1],
    searchDom.all('.discord-thread-messages discord-message')[1].id
  );
  threadDetails.open = false;
  type('parent');
  press('Enter');
  check('the parent matches its own text once', searchCount.textContent, '1 of 1');
  check('a parent hit leaves the thread closed', threadIsOpen(), false);
  type('thread message 2');
  check('the thread text is not counted for the parent too', searchCount.textContent, '1 of 1');
  type('messages in thread');
  check('the thread summary is not searchable', searchCount.textContent, 'No matches');

  type(`https://discord.com/channels/${GUILD_ID}/${CHANNEL_ID}/123456789012345678`);
  check('a message link finds that message', searchCount.textContent, '1 of 1');
  type('12345678');
  check('a part of an id is not a hit', searchCount.textContent, 'No matches');
  type('alpha');
  press('Escape');
  check('Escape clears the query', `${searchInput.value}/${searchDom.all('.discord-search-match').length}`, '/0');

  const findEvent = searchDom.fire(searchDom.doc, 'keydown', keyInit('f', { ctrlKey: true }));
  check('Ctrl+F is left to the browser', findEvent.defaultPrevented, false);

  // stepping through the matches, with the page changing under the search as it does in a browser
  const stepDom = dom(
    '<body><discord-messages><div class="discord-transcript-header-bar" data-channel-name="c"><div class="discord-transcript-header-search-slot"></div><div class="panel"></div></div>' +
      '<discord-message id="m-1">alpha one</discord-message><discord-message id="m-2">beta</discord-message>' +
      '<discord-message id="m-3">alpha two</discord-message><discord-message id="m-4">alpha three</discord-message>' +
      '<discord-system-message id="ms-5">alpha sys</discord-system-message></discord-messages></body>'
  );
  stepDom.run(source(uiSearchFeature));
  const stepInput = stepDom.one('.discord-transcript-search-input') as unknown as DomElement & { value: string };
  const stepCount = stepDom.one('.discord-transcript-search-count');
  const activeId = () =>
    stepDom
      .all('.discord-search-match--active')
      .map((node) => node.id)
      .join();
  const stepKey = (extra: Record<string, unknown> = {}) => {
    stepDom.fire(stepInput, 'keydown', keyInit('Enter', extra));
    // writing the counter is itself a change inside the observed element
    stepDom.mutated(stepCount);
    return `${stepCount.textContent}/${activeId()}/${stepDom.scrolled[stepDom.scrolled.length - 1]}`;
  };
  stepInput.value = 'alpha';
  stepDom.fire(stepInput, 'input');
  stepDom.settle();
  check('the system message is found whatever its id', stepCount.textContent, '1 of 4');
  check('and every match is marked', stepDom.all('.discord-search-match').length, 4);
  check('the first Enter after the debounce lands on the first match', stepKey(), '1 of 4/m-1/m-1');
  check('Enter goes to the second', stepKey(), '2 of 4/m-3/m-3');
  check('and the third', stepKey(), '3 of 4/m-4/m-4');
  check('and the last, a system message', stepKey(), '4 of 4/ms-5/ms-5');
  check('then wraps to the first', stepKey(), '1 of 4/m-1/m-1');
  check('Shift+Enter wraps backwards', stepKey({ shiftKey: true }), '4 of 4/ms-5/ms-5');
  check('and steps back', stepKey({ shiftKey: true }), '3 of 4/m-4/m-4');
  stepDom.fire(stepDom.one('.discord-transcript-search-button[data-action="next"]'), 'click', clickInit);
  check('the next button advances too', stepCount.textContent, '4 of 4');
  stepDom.fire(stepDom.one('.discord-transcript-search-button[data-action="prev"]'), 'click', clickInit);
  check('and the previous button goes back', stepCount.textContent, '3 of 4');
  stepDom.mutated(stepDom.one('.panel'));
  check(
    'a panel opening in the header does not move the search',
    `${stepCount.textContent}/${activeId()}`,
    '3 of 4/m-4'
  );
  stepDom.mutated(stepDom.one('#m-2'));
  check('a change in the messages keeps the current match', `${stepCount.textContent}/${activeId()}`, '3 of 4/m-4');

  // the image preview
  const previewDom = dom(domPage);
  previewDom.run(source(uiImagePreviewFeature));
  const overlay = previewDom.one('.discord-image-preview-overlay');
  const plainImage = previewDom.one('img[src*="pic3.png"]');
  check('the overlay is mounted closed', `${overlay !== null}/${overlay.classList.contains('is-open')}`, 'true/false');
  previewDom.fire(plainImage, 'click', clickInit);
  check('clicking an image opens it', overlay.classList.contains('is-open'), true);
  check(
    'with that image',
    previewDom.one('.discord-image-preview-image').getAttribute('src'),
    plainImage.getAttribute('src')
  );
  previewDom.fire(previewDom.doc, 'keydown', keyInit('Escape'));
  check('Escape closes it', overlay.classList.contains('is-open'), false);
  previewDom.fire(plainImage, 'click', clickInit);
  previewDom.fire(previewDom.one('.discord-image-preview-close'), 'click', clickInit);
  check('so does the close button', overlay.classList.contains('is-open'), false);
  previewDom.fire(plainImage, 'click', clickInit);
  previewDom.fire(previewDom.one('.discord-image-preview-stage'), 'click', clickInit);
  check('and a click beside the image', overlay.classList.contains('is-open'), false);

  // the component puts this class on its wrapper once it has rendered, which a static page has not
  const spoilered = previewDom.one('discord-spoiler img');
  (spoilered.closest('discord-spoiler') as unknown as DomElement).classList.add('discord-spoiler');
  previewDom.fire(spoilered, 'click', clickInit);
  check('an image in an unrevealed spoiler is refused', overlay.classList.contains('is-open'), false);
  const spoiler = spoilered.closest('discord-spoiler') as unknown as DomElement;
  spoiler.classList.remove('discord-spoiler');
  spoiler.classList.add('discord-spoiler--revealed');
  previewDom.fire(spoilered, 'click', clickInit);
  check('and opens once revealed', overlay.classList.contains('is-open'), true);

  const avatarDom = dom(`<body><div class="discord-author-avatar"><img src="a.png"></div></body>`);
  avatarDom.run(source(uiImagePreviewFeature));
  avatarDom.fire(avatarDom.one('img'), 'click', clickInit);
  check(
    'an avatar is not previewable',
    avatarDom.one('.discord-image-preview-overlay').classList.contains('is-open'),
    false
  );

  // the voice player
  const voiceMarkup = (n: number) =>
    `<div class="discord-voice-message" id="v${n}"><button type="button" class="discord-voice-play-button"></button><audio controls="" src="a${n}.ogg"></audio></div>`;
  const voiceDom = dom(`<body>${voiceMarkup(1)}${voiceMarkup(2)}</body>`);
  voiceDom.run(source(uiVoicePlayerFeature));
  const voiceAudio = voiceDom.all('audio');
  // media events do not bubble in a browser and the script listens in the capture phase; the stand-in only knows bubbling
  const mediaInit = { bubbles: true };
  const played: string[] = [];
  voiceAudio.forEach((audio, index) => {
    const state = audio as unknown as { paused: boolean; play: () => Promise<void>; pause: () => void };
    state.paused = true;
    state.play = () => {
      played.push(`play${index + 1}`);
      state.paused = false;
      voiceDom.fire(audio, 'play', mediaInit);
      return Promise.resolve();
    };
    state.pause = () => {
      played.push(`pause${index + 1}`);
      state.paused = true;
      voiceDom.fire(audio, 'pause', mediaInit);
    };
  });
  check(
    'the native controls are hidden once the script runs',
    voiceAudio.map((audio) => audio.hasAttribute('controls')).join(),
    'false,false'
  );
  check('and each message is marked as enhanced', voiceDom.all('.discord-voice-message.is-enhanced').length, 2);
  const voiceButtons = voiceDom.all('.discord-voice-play-button');
  voiceDom.fire(voiceButtons[0], 'click', clickInit);
  check('the play button plays its message', played.join(), 'play1');
  check('and shows the playing state', voiceButtons[0].classList.contains('is-playing'), true);
  voiceDom.fire(voiceButtons[1], 'click', clickInit);
  check('starting another message pauses the first', played.join(), 'play1,play2,pause1');
  check(
    'the first button leaves the playing state',
    `${voiceButtons[0].classList.contains('is-playing')}/${voiceButtons[1].classList.contains('is-playing')}`,
    'false/true'
  );
  voiceDom.fire(voiceButtons[1], 'click', clickInit);
  check('the button pauses what is playing', played.join(), 'play1,play2,pause1,pause2');
  voiceDom.fire(voiceButtons[0], 'click', clickInit);
  voiceDom.fire(voiceAudio[0], 'ended', mediaInit);
  check('the end of a message resets its button', voiceButtons[0].classList.contains('is-playing'), false);

  // the thread modal
  const modalDom = dom(domPage);
  modalDom.run(source(uiThreadModalFeature));
  const modalDetails = modalDom.one('.discord-thread-messages') as unknown as DomElement;
  const threadBar = modalDom.one('discord-thread');
  const modalOverlay = modalDom.one('.discord-thread-modal-overlay');
  const modalMessages = () => modalOverlay.querySelectorAll('discord-messages > discord-message').length;
  const detailsMessages = () => modalDetails.querySelectorAll('discord-message').length;
  check('the overlay is mounted on the body, closed', modalOverlay.parentElement?.nodeName, 'BODY');
  check('and starts closed', modalOverlay.classList.contains('is-open'), false);
  check('the details block is hidden once a bar can open it', modalDetails.classList.contains('is-modal-backed'), true);
  check('the thread bar becomes a button', threadBar.getAttribute('role'), 'button');
  check('with a key stop', threadBar.getAttribute('tabindex'), '0');
  modalDom.fire(threadBar, 'click', clickInit);
  check('clicking the bar opens the modal', modalOverlay.classList.contains('is-open'), true);
  check(
    'with the thread name',
    modalOverlay.querySelector('.discord-thread-modal-name')?.textContent,
    threadBar.getAttribute('name')
  );
  check(
    'and the count',
    modalOverlay.querySelector('.discord-thread-modal-count')?.textContent,
    '3 messages in thread'
  );
  check('the messages moved into it', `${modalMessages()}/${detailsMessages()}`, '3/0');
  modalDom.fire(modalDom.doc, 'keydown', keyInit('Escape'));
  check('Escape closes it', modalOverlay.classList.contains('is-open'), false);
  check('the messages go back where they were', `${modalMessages()}/${detailsMessages()}`, '0/3');

  modalDom.fire(threadBar, 'keydown', keyInit('Enter'));
  check('Enter on the bar opens it too', modalOverlay.classList.contains('is-open'), true);
  modalDom.fire(modalDom.one('.discord-thread-modal-close'), 'click', clickInit);
  check('the close button closes it', modalOverlay.classList.contains('is-open'), false);
  modalDom.fire(threadBar, 'click', clickInit);
  check(
    'the page makes room for the panel while it is open',
    modalDom.doc.body.classList.contains('has-thread-panel'),
    true
  );
  modalDom.fire(modalDom.doc, 'keydown', keyInit('Escape'));
  check('and takes it back when it closes', modalDom.doc.body.classList.contains('has-thread-panel'), false);

  // search and the pins list scroll to a message of a thread through the modal
  modalDom.run(source(uiPinnedMessagesFeature));
  const modalPinRows = () => modalDom.all('.discord-transcript-pins-row');
  modalDom.fire(modalDom.one('[data-transcript-action="pins"]'), 'click', clickInit);
  const threadPin = modalPinRows().find((row) => row.textContent?.includes('thread message 1')) as DomElement;
  modalDom.fire(threadPin, 'click', clickInit);
  check('a pinned thread message opens the modal', modalOverlay.classList.contains('is-open'), true);
  check(
    'and is scrolled to inside it',
    modalDom.scrolled[modalDom.scrolled.length - 1],
    modalDom.all('.discord-thread-modal-body discord-message[data-pinned]')[0].id
  );
  check('the thread block itself stays closed', (modalDetails as unknown as { open?: boolean }).open === true, false);
  modalDom.fire(modalDom.one('[data-transcript-action="pins"]'), 'click', clickInit);
  const outsideRow = modalPinRows().find((row) => row.textContent?.includes('long xxx')) as DomElement;
  modalDom.fire(outsideRow, 'click', clickInit);
  check('going to a message of the page closes the modal', modalOverlay.classList.contains('is-open'), false);
  check('and puts the thread back', `${modalMessages()}/${detailsMessages()}`, '0/3');

  // nothing to open it from: the plain block stays
  const loneDom = dom(
    '<body><discord-message id="m-1"><details class="discord-thread-messages" data-thread-id="9"><summary>1 message in thread</summary><discord-message id="m-2"></discord-message></details></discord-message></body>'
  );
  loneDom.run(source(uiThreadModalFeature));
  check(
    'a thread block without a bar or a preview stays visible',
    loneDom.one('.discord-thread-messages').classList.contains('is-modal-backed'),
    false
  );
  const previewDomHtml =
    '<body><discord-message id="m-1"><details class="discord-thread-messages" data-thread-id="9"><summary>1 message in thread</summary><discord-message id="m-2"></discord-message></details></discord-message>' +
    '<div class="discord-thread-preview-box" data-thread-id="9" data-thread-name="&lt;b&gt;Hostile&lt;/b&gt;"></div>' +
    '<div class="discord-thread-preview-box" data-thread-id="10" data-thread-name="Empty"></div></body>';
  const boxDom = dom(previewDomHtml);
  boxDom.run(source(uiThreadModalFeature));
  const boxes = boxDom.all('.discord-thread-preview-box');
  check(
    'a preview box with saved messages becomes openable, one without does not',
    boxes.map((box) => box.classList.contains('is-openable')).join(),
    'true,false'
  );
  boxDom.fire(boxes[0], 'click', clickInit);
  const boxOverlay = boxDom.one('.discord-thread-modal-overlay');
  check('clicking the box opens the modal', boxOverlay.classList.contains('is-open'), true);
  check(
    'the thread name is text, not markup',
    `${boxOverlay.querySelector('.discord-thread-modal-name')?.textContent}/${boxOverlay.querySelector('b')}`,
    '<b>Hostile</b>/null'
  );
  boxDom.fire(boxDom.doc, 'keydown', keyInit('Escape'));
  boxDom.fire(boxes[1], 'click', clickInit);
  check('a box without messages does nothing', boxOverlay.classList.contains('is-open'), false);

  // the server tags
  const tagHtml = (profile: string, name: string) =>
    `<discord-message profile="${profile}"><span class="discord-author-username">${name}</span></discord-message>`;
  const tagPage = `<body><discord-message profile="41"><span class="discord-author-username">Tagged</span><details class="discord-thread-messages">${tagHtml('2', 'Bob')}</details></discord-message>${tagHtml('2', 'Bob again')}</body>`;
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const withRegistry = (page: string, profiles: Record<string, unknown>) => {
    const tagDom = dom(page, profiles);
    (tagDom.doc.defaultView as unknown as Record<string, unknown>).customElements = {
      whenDefined: () => Promise.resolve(),
    };
    return tagDom;
  };
  const tagDom = withRegistry(tagPage, {
    '41': { serverTagText: ' ABC ', serverTagBadge: 'https://cdn.discordapp.com/badge.png', serverTagGuildId: '777' },
    '2': { author: 'Bob' },
  });
  tagDom.run(source(uiServerTagsFeature));
  await settle();
  const addedTags = tagDom.all('.discord-server-tag');
  check('only the author with a tag gets one', addedTags.length, 1);
  check(
    'it sits right after the name',
    (tagDom.one('.discord-author-username').nextElementSibling as unknown as DomElement).classList.contains(
      'discord-server-tag'
    ),
    true
  );
  check('the text is trimmed', addedTags[0].querySelector('.discord-server-tag-text')?.textContent, 'ABC');
  check(
    'the badge is an image',
    addedTags[0].querySelector('img.discord-server-tag-badge')?.getAttribute('src'),
    'https://cdn.discordapp.com/badge.png'
  );
  check(
    'a thread message inside is not given its parent tag',
    tagDom.all('.discord-thread-messages .discord-server-tag').length,
    0
  );
  const hostileTagDom = withRegistry(tagHtml('41', 'Tagged'), {
    '41': { serverTagText: '<img src=x onerror=alert(1)>', serverTagBadge: 'javascript:alert(1)' },
  });
  hostileTagDom.run(source(uiServerTagsFeature));
  await settle();
  check(
    'a hostile tag is text',
    `${hostileTagDom.one('.discord-server-tag-text').textContent}/${hostileTagDom.one('img')}`,
    '<img src=x onerror=alert(1)>/null'
  );
  const hydratedTagDom = dom(tagHtml('41', 'Tagged'));
  (hydratedTagDom.doc.defaultView as unknown as Record<string, unknown>).$discordMessage = undefined;
  hydratedTagDom.run(source(uiServerTagsFeature));
  await settle();
  check('without a profiles blob nothing is added', hydratedTagDom.all('.discord-server-tag').length, 0);

  // a forwarded message is one element, whose author is whoever forwarded it
  const forwardedDom = dom(
    '<body><div class="discord-transcript-members-anchor"><button data-transcript-action="members" aria-label="Members"></button></div>' +
      '<discord-message id="m-1" data-author-id="1" data-author-name="Alice"><div class="discord-forwarded"><discord-attachment><img src="f.png"></discord-attachment></div></discord-message></body>'
  );
  forwardedDom.run(source(uiImagePreviewFeature));
  forwardedDom.run(source(uiMemberListFeature));
  forwardedDom.fire(forwardedDom.one('img'), 'click', clickInit);
  check(
    'an image in a forwarded block opens',
    forwardedDom.one('.discord-image-preview-overlay').classList.contains('is-open'),
    true
  );
  forwardedDom.fire(forwardedDom.one('[data-transcript-action="members"]'), 'click', clickInit);
  check(
    'a forwarded message is counted once, for the forwarder',
    rowsOf(forwardedDom.one('.discord-transcript-members-panel')).join(),
    'Alice:1 message'
  );

  console.log('\n== hasFlag ==');
  const fakeFlags = { has: (flag: number) => flag === 4 };
  check('hasFlag reads a flag that is set', hasFlag(fakeFlags, 4), true);
  check('hasFlag reads a flag that is not', hasFlag(fakeFlags, 8), false);
  check('hasFlag with an undefined flag is false instead of throwing', hasFlag(fakeFlags, undefined), false);
  check('hasFlag with missing flags is false', hasFlag(undefined, 4) || hasFlag(null, 4), false);
  check(
    'hasFlag works on a real flags field',
    hasFlag(message({ flags: 1 << 15 }).flags, MessageFlags.IsComponentsV2),
    true
  );
  const undefinedFlagMessage = await render([message({ content: 'plain text', flags: 0 })]);
  check('a message renders when the flag constants are missing', undefinedFlagMessage.includes('plain text'), true);

  console.log('\n== poll answers without a text ==');
  const emojiPoll = await render([
    message({
      poll: {
        question: { text: 'Mood?' },
        answers: [{ answer_id: 1, poll_media: { emoji: { id: null, name: '🍕' } } }],
        expiry: new Date(0).toISOString(),
        allow_multiselect: false,
        layout_type: 1,
        results: { is_finalized: false, answer_counts: [{ id: 1, count: 1, me_voted: false }] },
      },
    }),
  ]);
  check('an emoji-only answer still shows the emoji', emojiPoll.includes('class="discord-poll-emoji"'), true);
  const emojiPollBlock = /class="discord-poll"[\s\S]*?discord-poll-footer/.exec(emojiPoll)?.[0] ?? '';
  check('and prints no text', emojiPollBlock.includes('class="discord-poll-text"'), false);
  check('and no "null"', emojiPollBlock.includes('null'), false);
  check('the poll block was found', emojiPollBlock.length > 0, true);

  console.log('\n== message grouping ==');
  const GROUP_BASE = Date.UTC(2026, 0, 1);
  const bobAuthor = { id: '2', username: 'bob', discriminator: '0', global_name: 'Bob', avatar: null };
  const sentAt = (minutes: number, data: Record<string, unknown> = {}) =>
    message({ id: SnowflakeUtil.generate({ timestamp: GROUP_BASE + minutes * 60_000 }).toString(), ...data });
  // one flag per rendered message, in page order: true when it carries no header of its own
  const continuations = (html: string) =>
    (html.match(/<discord-message\b[^>]*>/g) ?? []).map((tag) => tag.includes('discord-message-continuation'));

  const grouped = await render([
    sentAt(0, { content: 'first' }),
    sentAt(3, { content: 'second' }),
    sentAt(9, { content: 'third' }),
    sentAt(30, { content: 'after a gap' }),
    sentAt(31, { content: 'by bob', author: bobAuthor }),
    sentAt(32, { content: 'alice again' }),
  ]);
  check(
    'same author within the window continues the group, a gap or another author starts one',
    continuations(grouped).join(),
    'false,true,true,false,false,false'
  );
  check(
    'every message keeps the attributes the page scripts read',
    (grouped.match(/<discord-message\b[^>]*data-author-id="[^"]+"[^>]*data-author-name="[^"]+"/g) ?? []).length,
    6
  );
  check('and its id', (grouped.match(/<discord-message\b[^>]*\sid="m-\d+"/g) ?? []).length, 6);

  const afterReply = await render([
    sentAt(0, { id: '5000', content: 'target' }),
    sentAt(1, {
      content: 'reply',
      message_reference: { type: 0, message_id: '5000', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
    }),
    sentAt(2, { content: 'follow-up' }),
  ]);
  check('a reply starts a group and what follows it joins', continuations(afterReply).join(), 'false,false,true');

  const afterSystem = await render([
    sentAt(0, { content: 'before' }),
    sentAt(1, { type: 18, content: 'a thread', message_reference: { type: 0, channel_id: '300', guild_id: GUILD_ID } }),
    sentAt(2, { content: 'after' }),
  ]);
  check('a system message in between starts a new group', continuations(afterSystem).join(), 'false,false');

  const forwardedGroup = await render([
    sentAt(0, { content: 'before' }),
    sentAt(1, {
      message_reference: { type: 1, message_id: '999', channel_id: CHANNEL_ID, guild_id: GUILD_ID },
      message_snapshots: [
        { message: { content: 'snapshot', timestamp: new Date(0).toISOString(), type: 0, flags: 0 } },
      ],
    }),
  ]);
  check('a forward starts a group', continuations(forwardedGroup).join(), 'false,false');

  const webhookGroup = await render([
    sentAt(0, { webhook_id: '77', author: { ...bobAuthor, id: '77', username: 'Hook A', bot: true } }),
    sentAt(1, { webhook_id: '77', author: { ...bobAuthor, id: '77', username: 'Hook A', bot: true } }),
    sentAt(2, { webhook_id: '77', author: { ...bobAuthor, id: '77', username: 'Hook B', bot: true } }),
  ]);
  check('one webhook under two names is two senders', continuations(webhookGroup).join(), 'false,true,false');

  const threaded = messageWithThread(2);
  const threadedHtml = await generateFromMessages([threaded.parent], channel, {
    returnType: ExportReturnType.String,
    saveThreadMessages: true,
    callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
  });
  check(
    'thread messages are a sequence of their own: the parent never joins them',
    continuations(threadedHtml).join(),
    'false,false,true'
  );

  console.log('\n== author colours and mentions ==');
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const hydratedMentions = await generateFromMessages(
    [message({ content: '@everyone and @here', mention_everyone: true })],
    channel,
    {
      returnType: ExportReturnType.String,
      hydrate: true,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
    }
  );
  const mentionHtml = hydratedMentions.replace(/<!--[^>]*-->/g, '');
  check(
    'everyone and here show a single @',
    ['@everyone</discord-mention>', '@here</discord-mention>'].every((text) => mentionHtml.includes(text)) &&
      !mentionHtml.includes('@@'),
    true
  );

  const COLOURED_ROLE = '555000000000000050';
  const PLAIN_ROLE = '555000000000000051';
  const roleOf = (id: string, color: number) =>
    (guild.roles as any)._add({
      id,
      name: `role-${id}`,
      color,
      colors: { primary_color: color, secondary_color: null, tertiary_color: null },
      position: 1,
      permissions: '0',
      hoist: false,
      managed: false,
      mentionable: true,
      flags: 0,
    });
  roleOf(GUILD_ID, 0); // @everyone: member role lookups read it
  const coloured = roleOf(COLOURED_ROLE, 0x2ecc71);
  const plainRole = roleOf(PLAIN_ROLE, 0);
  const roleMention = async (role: unknown) =>
    generateFromMessages([message({ content: `<@&${COLOURED_ROLE}>`, mention_roles: [COLOURED_ROLE] })], channel, {
      returnType: ExportReturnType.String,
      callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => role as never },
    });
  check('a coloured role tints its mention', (await roleMention(coloured)).includes('color="#2ecc71"'), true);
  check('a role without a colour does not paint it black', (await roleMention(plainRole)).includes('color='), false);

  const memberOf = (id: string, roles: string[], extra: Record<string, unknown> = {}) =>
    (guild.members as any)._add({
      user: { id, username: `user${id}`, discriminator: '0', global_name: `User ${id}`, avatar: null },
      roles,
      joined_at: new Date(0).toISOString(),
      deaf: false,
      mute: false,
      flags: 0,
      ...extra,
    });
  const authorOf = (id: string) => ({
    id,
    username: `user${id}`,
    discriminator: '0',
    global_name: `User ${id}`,
    avatar: null,
  });
  memberOf('61', [COLOURED_ROLE]);
  memberOf('62', [PLAIN_ROLE]);
  const profileOf = (html: string, id: string) =>
    (JSON.parse(/\$discordMessage=\{profiles:(\{.*?\})\}<\/script>/.exec(html)?.[1] ?? '{}') as Record<string, object>)[
      id
    ];
  const colouredHtml = await render([
    message({ content: 'a', author: authorOf('61') }),
    message({ content: 'b', author: authorOf('62') }),
  ]);
  check(
    'an author with a coloured role has it in the profile',
    (profileOf(colouredHtml, '61') as { roleColor?: string }).roleColor,
    '#2ecc71'
  );
  check(
    'an author whose roles have no colour has none, not black',
    'roleColor' in (profileOf(colouredHtml, '62') as object),
    false
  );

  const iconRole = (id: string, extra: Record<string, unknown>) =>
    (guild.roles as any)._add({ ...coloured.toJSON(), id, name: `icon-${id}`, position: 2, ...extra });
  iconRole('555000000000000052', { icon: 'abcdef0123456789' });
  iconRole('555000000000000053', { unicode_emoji: '⭐' });
  memberOf('63', ['555000000000000052']);
  memberOf('64', ['555000000000000053']);
  const iconHtml = await render([
    message({ content: 'a', author: authorOf('63') }),
    message({ content: 'b', author: authorOf('64') }),
  ]);
  const imageIcon = profileOf(iconHtml, '63') as { roleIcon?: string; roleName?: string };
  const emojiIcon = profileOf(iconHtml, '64') as { roleIcon?: string; roleName?: string };
  check(
    'an uploaded role icon is in the profile',
    imageIcon.roleIcon?.includes('/role-icons/555000000000000052/'),
    true
  );
  check('with the name of the role it belongs to', imageIcon.roleName, 'icon-555000000000000052');
  check('a unicode emoji role icon becomes its twemoji', emojiIcon.roleIcon?.endsWith('/2b50.svg'), true);
  check('no icon, no role name', 'roleName' in (profileOf(colouredHtml, '61') as object), false);

  const memberRequests: string[][] = [];
  const originalFetch = guild.members.fetch.bind(guild.members);
  let failRequests = false;
  (guild.members as any).fetch = async (options: { user: string[] }) => {
    memberRequests.push(options.user);
    if (failRequests) throw new Error("Members didn't arrive in time.");
    for (const id of options.user) memberOf(id, [COLOURED_ROLE]);
    return new Collection();
  };
  const strangers = (from: number, count: number) =>
    Array.from({ length: count }, (_, i) => message({ content: `s${i}`, author: authorOf(String(from + i)) }));

  const fetchedHtml = await render([
    ...strangers(700, 3),
    message({ content: 'repeat', author: authorOf('700') }),
    message({ content: 'cached', author: authorOf('61') }),
    message({
      content: 'hook',
      webhook_id: '9000',
      author: { ...authorOf('9000'), bot: true },
    }),
  ]);
  check('the members of the authors are asked for in one request', memberRequests.length, 1);
  check('only the ones that are neither cached nor webhooks, once each', memberRequests[0]?.join(), '700,701,702');
  check(
    'and their role colour reaches the profile',
    (profileOf(fetchedHtml, '700') as { roleColor?: string }).roleColor,
    '#2ecc71'
  );

  memberRequests.length = 0;
  await render(strangers(800, 150));
  check('requests are split at 100 authors', memberRequests.map((ids) => ids.length).join(), '100,50');

  memberRequests.length = 0;
  failRequests = true;
  const failedMembersHtml = await render(strangers(1000, 2));
  check('a failed request does not sink the transcript', failedMembersHtml.includes('>s1<'), true);

  memberRequests.length = 0;
  await render(strangers(1100, 150));
  check('and no further batch is sent after a failure', memberRequests.length, 1);
  failRequests = false;

  memberRequests.length = 0;
  await generateFromMessages(strangers(1100, 2), channel, {
    returnType: ExportReturnType.String,
    fetchMembers: false,
    callbacks: { resolveChannel: () => null, resolveUser: () => null, resolveRole: () => null },
  });
  check('fetchMembers: false asks for nothing', memberRequests.length, 0);
  check('fetchMembers is on by default', resolveFeatures({}).members.enabled, true);
  (guild.members as any).fetch = originalFetch;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  await client.destroy();

  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
