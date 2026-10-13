# createTranscript

Will fetch (by default, all) the messages from the provided channel and can return either a `Buffer`, `string`, or `AttachmentBuilder`

## Example&#x20;

{% tabs %}
{% tab title="JavaScript" %}
{% code lineNumbers="true" %}

```javascript
const discordTranscripts = require("discord-transcriptify");

[...]

// Notice the async here    ⤵️
client.on('messageCreate', async (message) => {
    if (message.content === "!transcript") {
        // Use the following to fetch the transcript.
        const transcript = await discordTranscripts.createTranscript(
            message.channel,
            {
                // options go here
                // for example
                saveImages: true,
                footerText: "Saved {number} message{s}"
            }
        );

        // and by default, createTranscript will return an AttachmentBuilder
        // which you can directly send to discord.js
        message.reply({
            content: "Here's your transcript!",
            files: [transcript]
        });
    }
});
```

{% endcode %}
{% endtab %}

{% tab title="TypeScript" %}
{% code lineNumbers="true" %}

```typescript
import * as discordTranscripts from "discord-transcriptify";

[...]

// Notice the async here    ⤵️
client.on('messageCreate', async (message) => {
    if (message.content === "!transcript") {
        // Use the following to fetch the transcript.
        const transcript = await discordTranscripts.createTranscript(
            message.channel,
            {
                // options go here
                // for example
                saveImages: true,
                footerText: "Saved {number} message{s}"
            }
        );

        // and by default, createTranscript will return an AttachmentBuilder
        // which you can directly send to discord.js
        message.reply({
            content: "Here's your transcript!",
            files: [transcript]
        });
    }
});
```

{% endcode %}
{% endtab %}
{% endtabs %}

## Parameters

```javascript
createTranscript(channel, (options = {}));
```

### `channel: TextBasedChannel`

Defined in [discord.js](https://discord.js.org/#/docs/discord.js/main/typedef/GuildTextBasedChannel) as `TextChannel | NewsChannel | ThreadChannel | VoiceChannel`\
``This is the channel discord-transcriptify will fetch messages from.&#x20;

### `options: CreateTranscriptOptions`

The same options as [generatefrommessages.md](generatefrommessages.md 'mention') plus `limit` and `filter`, which decide which messages are fetched.

### `options.limit: number`

The number of messages to fetch. `-1`, the default, fetches every message in the channel.

### `options.filter: (message: Message<boolean>) => boolean`

A function that will be called for each message to determine if it should be included in the transcript. If false, the message will not be included. With `saveThreadMessages` enabled, the function is also applied to the messages fetched from threads.
