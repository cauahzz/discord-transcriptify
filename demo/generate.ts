/**
 * Builds the live demo and the README screenshots from a made-up support
 * ticket, so neither needs a bot or a real server.
 * Run with: npm run demo -- [outDir]
 */
import { Client, Collection, SnowflakeUtil, type Message, type TextChannel, type ThreadChannel } from 'discord.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ExportReturnType, generateFromMessages, type GenerateFromMessagesOptions } from '../src';

const outDir = process.argv[2] ?? join(__dirname, 'out');

const GUILD_ID = '1291063402814373952';
const CHANNEL_ID = '1427001234567890123';
const THREAD_ID = '1427001234567890456';

// placeholder pictures drawn inline, so the demo loads nothing it does not carry
function picture(label: string, from: string, to: string, width = 800, height = 500) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" fill="url(#g)"/>` +
    `<text x="50%" y="52%" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(height / 9)}" font-weight="700" fill="rgba(255,255,255,0.92)">${label}</text>` +
    '</svg>';
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}

// a few seconds of a soft two-note chime, so the voice message actually plays
function chime(seconds: number) {
  const rate = 8000;
  const samples = Math.round(rate * seconds);
  const wav = Buffer.alloc(44 + samples);
  wav.write('RIFF', 0);
  wav.writeUInt32LE(36 + samples, 4);
  wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36);
  wav.writeUInt32LE(samples, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / rate;
    const note = t % 1 < 0.5 ? 523.25 : 659.25;
    const envelope = Math.exp(-4 * (t % 0.5));
    wav[44 + i] = Math.round(128 + 60 * envelope * Math.sin(2 * Math.PI * note * t));
  }
  return 'data:audio/wav;base64,' + wav.toString('base64');
}

const user = (id: string, username: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  username,
  discriminator: '0',
  global_name: name,
  avatar: null,
  ...extra,
});
const mia = user('1180000000000000011', 'mia', 'Mia');
const leo = user('1180000000000000012', 'leo', 'Leo');
const sam = user('1180000000000000013', 'sam', 'Sam');
const bot = user('1180000000000000014', 'acme-helper', 'Acme Helper', { bot: true });

const role = (id: string, name: string, color: number, position: number) => ({
  id,
  name,
  color,
  colors: { primary_color: color, secondary_color: null, tertiary_color: null },
  position,
  permissions: '0',
  hoist: true,
  managed: false,
  mentionable: true,
  flags: 0,
});
const member = (u: ReturnType<typeof user>, roles: string[]) => ({
  user: u,
  roles,
  joined_at: '2025-01-01T00:00:00.000Z',
  deaf: false,
  mute: false,
  flags: 0,
});

// `_add` is how discord.js itself turns gateway payloads into structures
/* eslint-disable @typescript-eslint/no-explicit-any */
const client = new Client({ intents: [] });
const guild = (client.guilds as any)._add({
  id: GUILD_ID,
  name: 'Acme Store',
  icon: null,
  features: [],
  owner_id: sam.id,
  roles: [
    role(GUILD_ID, '@everyone', 0, 0),
    role('1290000000000000021', 'Support', 0x2ecc71, 2),
    role('1290000000000000022', 'Manager', 0xe67e22, 3),
    role('1290000000000000023', 'Customer', 0x3498db, 1),
  ],
  members: [
    member(mia, ['1290000000000000023']),
    member(leo, ['1290000000000000021']),
    member(sam, ['1290000000000000022']),
    member(bot, []),
  ],
  channels: [],
  emojis: [],
  stickers: [],
});
const channel: TextChannel = (client.channels as any)._add(
  { id: CHANNEL_ID, type: 0, name: 'ticket-0042', topic: 'Order #4821 · damaged on arrival', guild_id: GUILD_ID },
  guild
);
const thread: ThreadChannel = (client.channels as any)._add(
  {
    id: THREAD_ID,
    type: 11,
    name: 'Refund paperwork',
    guild_id: GUILD_ID,
    parent_id: CHANNEL_ID,
    message_count: 3,
    member_count: 2,
    thread_metadata: { archived: false, auto_archive_duration: 1440, locked: false },
  },
  guild
);

let clock = Date.parse('2026-10-12T14:00:00.000Z');
const at = (minutes: number) => new Date((clock += minutes * 60_000)).toISOString();

function post(target: TextChannel | ThreadChannel, author: ReturnType<typeof user>, minutes: number, data = {}) {
  const timestamp = at(minutes);
  return (target.messages as any)._add({
    // discord.js reads the date of a message from its id, not from `timestamp`
    id: SnowflakeUtil.generate({ timestamp: Date.parse(timestamp) }).toString(),
    channel_id: target.id,
    guild_id: GUILD_ID,
    author,
    content: '',
    timestamp,
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
  }) as Message;
}
const add = (author: ReturnType<typeof user>, minutes: number, data = {}) => post(channel, author, minutes, data);

const image = (id: string, filename: string, url: string, width = 800, height = 500) => ({
  id,
  filename,
  size: 482_000,
  url,
  proxy_url: url,
  content_type: 'image/png',
  width,
  height,
});

const conversation: Message[] = [];
conversation.push(add(mia, 0, { type: 7 }));
const ticket = add(bot, 0, {
  pinned: true,
  interaction: { id: '900', type: 2, name: 'ticket open', user: mia },
  embeds: [
    {
      type: 'rich',
      title: 'Ticket opened',
      description: 'Thanks for reaching out! A member of the **support team** will be with you shortly.',
      color: 0x5865f2,
      fields: [
        { name: 'Order', value: '`#4821`', inline: true },
        { name: 'Category', value: 'Damaged item', inline: true },
        { name: 'Priority', value: 'Normal', inline: true },
      ],
      footer: { text: 'Acme Store · ticket-0042' },
    },
  ],
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Claim', custom_id: 'claim', emoji: { name: '🙋' } },
        { type: 2, style: 2, label: 'Add note', custom_id: 'note' },
        { type: 2, style: 4, label: 'Close ticket', custom_id: 'close' },
        { type: 2, style: 5, label: 'Order page', url: 'https://example.com/orders/4821' },
      ],
    },
    {
      type: 1,
      components: [
        {
          type: 3,
          custom_id: 'category',
          placeholder: 'Change category',
          options: [
            { label: 'Damaged item', value: 'damaged', emoji: { name: '📦' }, description: 'Arrived broken or dented' },
            {
              label: 'Missing item',
              value: 'missing',
              emoji: { name: '🔍' },
              description: 'Something was not in the box',
            },
            { label: 'Billing', value: 'billing', emoji: { name: '💳' }, description: 'Charges and refunds' },
          ],
        },
      ],
    },
  ],
});
conversation.push(ticket);
conversation.push(
  add(leo, 0, { type: 6, message_reference: { type: 0, message_id: ticket.id, channel_id: CHANNEL_ID } })
);
const first = add(mia, 1, {
  content: 'Hi! My order **#4821** arrived today, but the box was crushed and the mug inside is broken 😞',
});
conversation.push(first);
conversation.push(
  add(mia, 1, {
    content: 'Here is how it looked when I opened it:',
    attachments: [image('501', 'box.png', picture('box.png', '#f6a560', '#d9534f'))],
  })
);
conversation.push(
  add(leo, 3, {
    type: 19,
    message_reference: { type: 0, message_id: first.id, channel_id: CHANNEL_ID, guild_id: GUILD_ID },
    content: `Sorry about that, <@${mia.id}>! I've checked the order and you have two options:\n> **Replacement** — ships tomorrow, arrives in 2 to 3 days\n> **Refund** — back on your card within 5 business days\nEither way you can keep the broken one. Your reference is \`RMA-7731\`.`,
    mentions: [mia],
    reactions: [
      {
        count: 1,
        count_details: { burst: 0, normal: 1 },
        me: false,
        me_burst: false,
        burst_colors: [],
        emoji: { id: null, name: '❤️' },
      },
      {
        count: 2,
        count_details: { burst: 0, normal: 2 },
        me: false,
        me_burst: false,
        burst_colors: [],
        emoji: { id: null, name: '👍' },
      },
    ],
  })
);
conversation.push(
  add(mia, 2, {
    content: 'A replacement would be great, thank you! ||Honestly the old one was ugly anyway||',
    edited_timestamp: at(0),
  })
);
conversation.push(
  add(leo, 1, {
    content:
      'Done. <@&1290000000000000022> approved it, and this is what the warehouse received:\n```json\n{\n  "order": 4821,\n  "action": "replace",\n  "items": [{ "sku": "MUG-BLUE", "qty": 1 }]\n}\n```',
    mention_roles: ['1290000000000000022'],
  })
);
conversation.push(
  add(bot, 0, {
    content:
      '```ansi\n\u001b[1;32m✔\u001b[0m Replacement order \u001b[1m#4822\u001b[0m created\n\u001b[1;33m!\u001b[0m Old order \u001b[4m#4821\u001b[0m marked as \u001b[31mdamaged\u001b[0m\n\u001b[1;34mi\u001b[0m Customer notified by e-mail\n```',
  })
);
conversation.push(
  add(sam, 1, {
    message_reference: {
      type: 1,
      message_id: SnowflakeUtil.generate({ timestamp: Date.parse('2026-10-11T09:30:00.000Z') }).toString(),
      channel_id: '1427001234567890999',
      guild_id: GUILD_ID,
    },
    message_snapshots: [
      {
        message: {
          content: 'Shipping note: all mugs now go out in double-walled boxes. Fewer broken orders from today on.',
          timestamp: '2026-10-11T09:30:00.000Z',
          edited_timestamp: null,
          attachments: [],
          embeds: [],
          flags: 0,
          mentions: [],
          mention_roles: [],
          type: 0,
        },
      },
    ],
  })
);
conversation.push(
  add(sam, 3, {
    poll: {
      question: { text: 'How was the support today?' },
      answers: [
        { answer_id: 1, poll_media: { text: 'Great', emoji: { id: null, name: '🤩' } } },
        { answer_id: 2, poll_media: { text: 'Fine', emoji: { id: null, name: '🙂' } } },
        { answer_id: 3, poll_media: { text: 'Could be better', emoji: { id: null, name: '😕' } } },
      ],
      expiry: '2026-10-13T14:00:00.000Z',
      allow_multiselect: false,
      layout_type: 1,
      results: {
        is_finalized: true,
        answer_counts: [
          { id: 1, count: 7, me_voted: false },
          { id: 2, count: 2, me_voted: false },
          { id: 3, count: 1, me_voted: false },
        ],
      },
    },
  })
);

const components: Message[] = [];
components.push(
  add(bot, 6, {
    flags: 1 << 15,
    components: [
      {
        type: 17,
        accent_color: 0x2ecc71,
        components: [
          {
            type: 9,
            components: [
              {
                type: 10,
                content:
                  '### Replacement on its way\nYour new **Blue Mug** left the warehouse. Tracking: `ACME-99-2041`\n-# Estimated delivery: October 15',
              },
            ],
            accessory: {
              type: 11,
              media: { url: picture('mug', '#4facfe', '#2b5876', 300, 300), width: 300, height: 300 },
            },
          },
          { type: 14, divider: true, spacing: 1 },
          {
            type: 12,
            items: [
              { media: { url: picture('Packed', '#43cea2', '#185a9d', 600, 600), width: 600, height: 600 } },
              { media: { url: picture('Label', '#ff9966', '#ff5e62', 600, 600), width: 600, height: 600 } },
              { media: { url: picture('Shipped', '#7f7fd5', '#86a8e7', 600, 600), width: 600, height: 600 } },
            ],
          },
          {
            type: 1,
            components: [
              { type: 2, style: 1, label: 'Track package', custom_id: 'track' },
              { type: 2, style: 2, label: 'Change address', custom_id: 'address' },
              { type: 2, style: 5, label: 'Help centre', url: 'https://example.com/help' },
            ],
          },
        ],
      },
    ],
  })
);
components.push(
  add(mia, 2, {
    flags: 8192,
    attachments: [
      {
        id: '601',
        filename: 'voice-message.ogg',
        size: 9000,
        url: 'https://cdn.discordapp.com/attachments/1/601/voice-message.ogg',
        proxy_url: 'https://media.discordapp.net/attachments/1/601/voice-message.ogg',
        content_type: 'audio/ogg',
        duration_secs: 4,
        waveform: Buffer.from(
          Array.from({ length: 64 }, (_, i) => Math.round(120 + 110 * Math.sin(i / 3) * Math.cos(i / 7)))
        ).toString('base64'),
      },
    ],
  })
);
components.push(
  add(leo, 1, {
    content: 'In case you ever need it, here is the return label.',
    attachments: [
      {
        id: '602',
        filename: 'return-label.pdf',
        size: 184_320,
        url: 'https://cdn.discordapp.com/attachments/1/602/return-label.pdf',
        proxy_url: 'https://media.discordapp.net/attachments/1/602/return-label.pdf',
        content_type: 'application/pdf',
      },
    ],
  })
);
components.push(
  add(leo, 1, {
    type: 18,
    content: thread.name,
    message_reference: { type: 0, channel_id: THREAD_ID, guild_id: GUILD_ID },
  })
);

const threadMessages = [
  post(thread, leo, 1, { content: 'Opening this so the paperwork does not get lost in the ticket.' }),
  post(thread, leo, 1, {
    content: `Signed form attached. Nothing else is needed from you, <@${mia.id}>.`,
    mentions: [mia],
    attachments: [image('701', 'form.png', picture('form.png', '#bdc3c7', '#2c3e50'))],
  }),
  post(thread, mia, 2, { content: 'Perfect, thanks Leo!' }),
];
// stands in for the API, which the demo has no access to
thread.messages.fetch = (async () =>
  new Collection([...threadMessages].reverse().map((message) => [message.id, message]))) as any;

const voice = chime(4);
const options: GenerateFromMessagesOptions<ExportReturnType.String> = {
  returnType: ExportReturnType.String,
  fetchMembers: false,
  saveThreadMessages: true,
  footerText: 'Exported {number} message{s} · a demo of discord-transcriptify',
  poweredBy: true,
  callbacks: {
    resolveChannel: (id) => client.channels.cache.get(id) ?? null,
    resolveUser: (id) => client.users.cache.get(id) ?? null,
    resolveRole: (id) => guild.roles.cache.get(id) ?? null,
    resolveVoiceSrc: () => voice,
  },
};

async function main() {
  mkdirSync(outDir, { recursive: true });
  const pages = { index: [...conversation, ...components], conversation, components };
  for (const [name, messages] of Object.entries(pages)) {
    const html = await generateFromMessages(messages, channel, options);
    writeFileSync(join(outDir, `${name}.html`), html);
    console.log(`${name}.html  ${(html.length / 1024).toFixed(0)} kB`);
  }
  await client.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
