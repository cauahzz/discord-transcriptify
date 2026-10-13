# generateFromMessages

If you want to provide your own messages for finer control of what `discord-transcriptify` will save, use this function.

## Example

{% tabs %}
{% tab title="JavaScript" %}

```javascript
const discordTranscripts = require("discord-transcriptify");
const { Collection } = require("discord.js");

[...]

const messages = new Collection();
const channel  = /* somehow get this */;

// somehow fill the messages collection

const transcript = await discordTranscripts.generateFromMessages(
    messages, // the content in the transcript
    channel, // used for transcript title, etc
    { /* options */ }
);

// By default returns an AttachmentBuilder that can be sent in a channel.
channel.send({
    files: [transcript]
});
```

{% endtab %}

{% tab title="TypeScript" %}

```typescript
import * as discordTranscripts from "discord-transcriptify";
import { Collection, Message } from "discord.js";

[...]

const messages = new Collection<string, Message>();
const channel  = /* somehow get this */;

// somehow fill the messages collection

const transcript = await discordTranscripts.generateFromMessages(
    messages, // the content in the transcript
    channel, // used for transcript title, etc
    { /* options */ }
);

// By default returns an AttachmentBuilder that can be sent in a channel.
channel.send({
    files: [transcript]
});
```

{% endtab %}
{% endtabs %}

## Parameters

```javascript
generateFromMessages(messages, channel, (options = {}));
```

### `messages: Message[] | Collection<string, Message>`

These are the messages that will be used in the body of the transcript. Can either be an array of discord.js [Message](https://discord.js.org/#/docs/discord.js/main/class/Message) objects or a [Collection](https://discord.js.org/#/docs/collection/main/class/Collection) of Messages.

### `channel: TextBasedChannel`

Defined in [discord.js](https://discord.js.org/#/docs/discord.js/main/typedef/GuildTextBasedChannel) as `TextChannel | NewsChannel | ThreadChannel | VoiceChannel`\
``This is channel is used to grab information about the transcript, like guild name and icon, channel name, etc.

### `options: GenerateFromMessagesOptions`

An object with the discord-transcriptify configuration options.

<details>

<summary>TLDR: quick summary of everything below.</summary>

```javascript
const attachment = await discordTranscripts.generateFromMessages(messages, channel, {
    returnType: 'attachment', // Valid options: 'buffer' | 'string' | 'attachment' Default: 'attachment' OR use the enum ExportReturnType
    filename: 'transcript.html', // Only valid with returnType is 'attachment'. Name of attachment.
    saveImages: false, // Download all images and include the image data in the HTML (allows viewing the image even after it has been deleted) (! WILL INCREASE FILE SIZE !)
    saveVoiceMessages: false, // Download voice messages and include the audio data in the HTML (! WILL INCREASE FILE SIZE !)
    saveThreadMessages: false, // Fetch the messages of threads and show them under the preview (! EXTRA API REQUESTS !)
    fetchMembers: true, // Ask Discord for the members behind the authors so names show in their role colour (one gateway request per 100 authors)
    ui: true, // Interactive UI (JavaScript) in the file, `false` adds none. Also accepts an object to switch single features
    footerText: "Exported {number} message{s}.", // Change text at footer, don't forget to put {number} to show how much messages got exported, and {s} for plural
    callbacks: {
      // register custom callbacks for the following:
      resolveChannel: (channelId: string) => Awaitable<Channel | null>,
      resolveUser: (userId: string) => Awaitable<User | null>,
      resolveRole: (roleId: string) => Awaitable<Role | null>,
      resolveImageSrc: (
        attachment: APIAttachment,
        message: APIMessage
      ) => Awaitable<string | null | undefined>,
      resolveVoiceSrc: (
        attachment: APIAttachment,
        message: APIMessage
      ) => Awaitable<string | null | undefined>
    },
    poweredBy: true, // Whether to include the "Powered by discord-transcriptify" footer
    favicon: 'guild', // 'guild' uses the server icon; any other string is used as the icon URL
    hydrate: false // Whether to render the components on the server instead of in the browser
});
```

</details>

#### `options.returnType: 'buffer' | 'string' | 'attachment'`

It's recommended to use the `ExportReturnType` enum instead of passing in a string.\
This option determines what this function will return.&#x20;

- **buffer**: the HTML data as a buffer.
- string: the HTML data as a string.
- attachment: the HTML data as an `AttachmentBuilder`

The default value is `attachment`

#### `options.filename: string`

The name of the output file when the return type is `attachment`

The default value is `transcript-{channel name}.html`. Characters that are not safe in a file name are replaced with dashes; a channel without a usable name falls back to its id.

#### `options.saveImages: boolean | SaveImagesOptions`

Enabling this option will make discord-transcriptify download all images: attachments, embed images, thumbnails and icons, stickers, and Components V2 media galleries and thumbnails. This is useful in use cases where the channel will be deleted which will wipe all images off of Discord's CDN, which will break images that aren't downloaded.

When several images share a message they are shown as one grid. GIF and SVG images are embedded exactly as served, because re-encoding them would drop the animation or rasterise the vector.

**If you are uploading the transcript to discord,** enabling this option may cause issues. Your bot may hit the upload filesize limit since images take up a lot of space!&#x20;

Pass an object instead of `true` to change the limits: `{ maxSizeKb: 10240, maxTotalSizeKb: 51200, concurrency: 4, quality: 75, maxWidth: 800, maxHeight: 800 }` are the defaults, and any field you leave out keeps its default. `quality` applies to JPEG and WebP images; PNG images are resized but stay lossless.

`maxSizeKb` limits one image and `maxTotalSizeKb` limits all embedded images together, counted on what ends up in the file. Once the total is reached the remaining images keep their original URL, which bounds the memory a transcript with many images needs. `concurrency` is how many images are downloaded and processed at the same time. Zero or less turns the total or the concurrency limit off.

The default value is `false`

#### `options.saveThreadMessages: boolean | SaveThreadMessagesOptions`

Threads are always shown as a preview, whether they were started from an exported message or created on their own (the "started a thread" line). Enabling this option also fetches the messages inside each thread and renders them in a collapsible block under the preview, with a plain `<details>` element (no script).

Every thread costs one extra Discord API request per 100 messages, and at most 3 threads are fetched at the same time. Pass an object instead of `true` to change the limit: `{ limit: 500 }` is the default, per thread, and the newest messages are kept; a limit below 1 (such as `-1`) means no limit. When the transcript is made with `createTranscript`, its `filter` applies to thread messages too, and the limit counts the messages that pass it. When a thread has more messages than were collected, its summary reads `Last N of M messages in thread`; with a `filter` the counts are not comparable, so it reads `N messages in thread`. A thread that cannot be fetched is skipped and the transcript is still generated. This also works when you call `generateFromMessages` with your own messages.

#### `options.fetchMembers: boolean`

Messages fetched from a channel arrive without the member who wrote them, and an author's role colour lives on the member, so names would show without it. With this option on, the authors that are not cached yet are requested from Discord before the transcript is rendered: one gateway request per 100 authors, into the guild's member cache. It needs no privileged intent. Webhook authors are skipped, a failed request is ignored and only leaves those names uncoloured, and `false` makes no request at all. This also works when you call `generateFromMessages` with your own messages.

The default value is `true`

#### `options.saveVoiceMessages: boolean | SaveVoiceMessagesOptions`

Voice messages are always shown, with their waveform, duration and the browser's own audio controls. By default the audio is played from Discord's CDN, so it stops working once the message or channel is deleted. Enabling this option downloads each voice message and embeds it in the file as a base64 data url instead.

Pass an object instead of `true` to change the limits: `{ maxSizeKb: 25600, maxTotalSizeKb: 51200 }` are the defaults. Larger voice messages stay as links, and so do the remaining ones once the embedded voice messages add up to the total. Downloads go through the same internal-address protection as `saveImages`.

You can also provide your own `callbacks.resolveVoiceSrc(attachment, message)`; returning `undefined` or `null` keeps the original URL.

The default value is `false`

#### `options.ui: boolean | UiOptions`

Interactive features that need JavaScript inside the file. They are enabled by default; `false` removes all of them, giving the transcript with the least JavaScript. Pass an object to override single features, and the ones you leave out stay enabled:

- `imagePreview`: clicking an image in a message opens it full-screen over a dimmed backdrop; the close button, a click beside the image or Escape closes it. Images inside a spoiler that has not been revealed do not open.
- `search`: a search box in the header bar (a button on narrow screens). Type at least two characters to find messages containing the text (case-insensitive), or paste a message id or link to find that message. The matches are highlighted, Enter and Shift+Enter jump to the next and previous one, and Escape clears the query. Matches inside a closed thread open it. The browser's own find (Ctrl+F / Cmd+F) is left alone.
- `memberList`: a members button in the header bar that opens a panel listing every author with their avatar and the number of messages they wrote, most messages first. Messages inside exported threads are counted.
- `pinnedMessages`: a pin button in the header bar that opens a panel listing the pinned messages with their author, date and the start of their text; clicking an entry scrolls to the message, opening its thread if needed. The button is left out when no exported message is pinned.
- `voicePlayer`: a play button on voice messages, with the waveform and the duration beside it. Starting one message pauses the others. Without it (or with `ui: false`) a voice message shows the browser's own audio controls.
- `threadModal`: clicking a thread bar, or the preview under "started a thread", opens that thread in a panel beside the channel, as Discord's split view does: the thread's name, who started it, and its saved messages (Escape or the close button closes it; on a narrow screen the panel takes the whole width). Search and the pinned messages list open the panel when they go to a message of a thread. It also adds a threads button to the header bar, which lists the saved threads with their last message and opens the one you pick; the list has a box to filter by name. Without it the messages stay in the collapsible block under the thread. Only has an effect with `saveThreadMessages`.
- `serverTags`: the server tag an author wears (the short text and its badge) is shown next to their name, as Discord does. It needs a discord.js release that reports the user's primary guild, and is left out for authors without a tag. A transcript rendered with `hydrate: true` carries no profile data for the script to read, so it shows no server tags.
- `selectMenus`: a select menu with options opens on a click and lists them, with their emoji and descriptions; that part needs no script and works with `ui: false` too. This feature adds what Discord does around it: a click anywhere else, opening another menu, or Escape closes the open one. A disabled menu, and one whose options Discord fills in (users, roles, channels), does not open.

The members and pins panels close with Escape or a click outside, and only one is open at a time. The header bar only carries the buttons of the features that are enabled.

The scripts are self-contained: none is loaded from another site and none sends data anywhere. The server tag badge is an image served by Discord, like an avatar.

The default value is `true`

#### `options.footerText: string`

The text that will be used in the footer of the transcript. You can use the following placeholders:

- `{number}`: the total number of messages exported. Useful when you are using `createTranscript(...)`
- `{s}`: Adds an s if the number is >0, otherwise it is replaced with nothing

The default value is `Exported {number} message{s}.`

#### `options.poweredBy: boolean`

Disabling this will remove the `Powered by discord-transcriptify` in the footer.

The default value is `true`

#### `options.favicon: 'guild' | string`

The icon of the page. `guild` uses the icon of the server the channel belongs to; any other string is used as the URL of the icon.

The default value is `guild`

#### `options.hydrate: boolean`

With `true` the components are rendered on the server, so the file shows the messages without loading anything first. With `false` the file carries the messages as custom elements and loads the component scripts from a CDN when it is opened.

The default value is `false`

#### `options.callbacks.resolveImageSrc: (attachment: APIAttachment, message: APIMessage) => Awaitable<string | null | undefined>`

Called for every image the transcript shows: image attachments, embed images, thumbnails and icons, stickers, and Components V2 media. The return value decides what happens to that image:

- `undefined` keeps the original URL.
- `null` leaves the image out of the transcript.
- a string is used as the image URL (a remote URL or a base64 data url).

#### `options.callbacks.resolveChannel: (channelId: string) => Awaitable<Channel | null>`

A custom function that will be used by the module whenever it needs to resolve a channel (for example, if someone mentions a channel)

The default option uses `channel.client.channels.fetch(...)` function.

#### `options.callbacks.resolveUser: (userId: string) => Awaitable<User | null>`

A custom function that will be used by the module whenever it needs to resolve a user (for example, if a user is mentioned)

The default option uses `channel.client.users.fetch(...)`

#### `options.callbacks.resolveRole: (roleId: string) => Awaitable<Role | null>`

A custom function that will be used by the module whenever it needs to resolve a role (for example, if a role is mentioned)

The default option uses `channel.guild?.roles.fetch(...)`
