import type { TextChannel } from 'discord.js';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { createTranscript } from '../src';

import { config } from 'dotenv';
config();

const { GuildMessages, Guilds, MessageContent } = GatewayIntentBits;

const client = new Client({
  intents: [GuildMessages, Guilds, MessageContent],
});

client.on(Events.ClientReady, async () => {
  console.log('Fetching channel: ', process.env.CHANNEL!);
  const channel = await client.channels.fetch(process.env.CHANNEL!);

  if (!channel || !channel.isTextBased()) {
    console.error('Invalid channel provided.');
    process.exit(1);
  }

  console.time('transcript');

  const attachment = await createTranscript(channel);

  console.timeEnd('transcript');

  await (channel as TextChannel).send({
    content: 'Here is the transcript',
    files: [attachment],
  });

  client.destroy();
  process.exit(0);
});

client.login(process.env.TOKEN!);
