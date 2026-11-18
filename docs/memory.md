---
description: Where the memory of a transcript goes, why a process can keep it after the transcript is done, and how to tune a host with little memory.
---

# Memory in depth

The README's [Memory use](../README.md#memory-use) section covers the options most bots need. This page is
for when you are watching the memory graph of a small host and want to know what the numbers mean.

## Where the memory goes

A transcript is built in one pass, in memory. With `saveImages` on, each image goes through three
steps:

1. The download is read into a buffer, up to `maxSizeKb`.
2. With `sharp`, the image is decoded into raw pixels, resized and encoded again. The decoded image
   is several times larger than the file.
3. The result becomes a base64 data URL, a third larger than the bytes, and stays in memory until the
   page is rendered.

`concurrency` limits how many images are in steps 1 and 2 at the same time, and `maxTotalSizeKb`
limits how much is held after step 3.

Then the page is rendered. React writes it in chunks, which are joined into one buffer, so for a
moment the page exists twice. What comes after depends on `returnType`:

| Output                       | Extra copies of the page                                                      |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `'attachment'` or `'buffer'` | None: you get the buffer the chunks were joined into.                         |
| `'string'`                   | One, the string.                                                              |
| Any of them, with `hydrate`  | A string to parse, a DOM built from it, and the string the DOM is written to. |

So the peak of one transcript is roughly the images in flight, plus the embedded data URLs, plus
twice the finished file.

## Why the memory can stay up afterwards

On Linux with glibc, which covers Debian, Ubuntu and most Docker images that are not Alpine, a
process can keep tens of megabytes after a transcript is done. Nothing is leaking.

The memory that stays is native memory: buffers and the work memory of `sharp`. They are freed when
the transcript is done, and `heapUsed` returns to where it was. But glibc's `malloc` keeps freed
memory for reuse instead of giving it back to the system, and the rules it follows make that likely
after a large transcript:

- An allocation above a threshold, 128 KB by default, gets its own `mmap` and goes back to the system
  as soon as it is freed.
- Each time such a block is freed, glibc raises the threshold to the size of that block, up to 32 MB
  on 64-bit systems.
- After the first large transcript, buffers of that size come from the regular heap instead. Memory
  freed there only goes back to the system when it sits at the top of the heap, which the other
  allocations in between usually prevent.

The result is a plateau. The resident memory grows to about the peak of the largest transcript so
far and stays there, and later transcripts reuse it. It only grows again when a transcript needs
more than any before it. If it keeps climbing across transcripts of a similar size, that is
something else, and worth [an issue](https://github.com/cauahzz/discord-transcriptify/issues).

To tell the two apart, log `process.memoryUsage()` after each transcript (see
[Measuring](#measuring)). A plateau shows a stable `heapUsed` and `external` next to a higher `rss`.

## Tuning a host with little memory

### The glibc threshold

```shell
MALLOC_MMAP_THRESHOLD_=131072
```

This fixes the threshold at 128 KB and turns off the adjustment, so large buffers go back to the
system when they are freed. The cost is one system call per large allocation, which a transcript does
not notice. The trailing underscore is part of the name. Recent glibc versions also accept
`GLIBC_TUNABLES=glibc.malloc.mmap_threshold=131072`.

In one measurement (Linux, glibc, Node 24, a transcript with ten large images), the memory the
process kept afterwards went from about 115 MB to about 53 MB with this variable, and stayed there
over repeated transcripts.

`MALLOC_ARENA_MAX=2`, often recommended for Node on small hosts, limits how many separate heaps
`malloc` keeps. Lowering it to `1` made no clear difference in the same measurement; the threshold
is what did.

glibc reads these variables when the process starts, so setting them through `process.env` in your
code has no effect. Set them where the process is launched: the environment settings of your host,
an `ENV` line in a Dockerfile, or the start command:

```shell
MALLOC_MMAP_THRESHOLD_=131072 node index.js
```

They only apply to glibc. On Alpine (musl), Windows and macOS they are ignored.

### Library options

| Option                             | What it bounds                                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `saveImages.concurrency`           | Images downloaded and decoded at the same time. `1` gives the lowest peak, at the cost of time.       |
| `saveImages.maxSizeKb`             | The largest download.                                                                                 |
| `saveImages.maxWidth`, `maxHeight` | The size of each image once it is embedded.                                                           |
| `saveImages.maxTotalSizeKb`        | The data URLs held until the render, and with them the size of the page.                              |
| `saveImages.sharpCache: false`     | sharp's cache of decoded images, up to 50 MB.                                                         |
| `returnType`                       | See the table above. `'attachment'` and `'buffer'` cost less than `'string'`, and `hydrate` the most. |

For a host with around 256 MB:

```js
await createTranscript(channel, {
  saveImages: { concurrency: 1, maxTotalSizeKb: 10240, maxSizeKb: 2048, sharpCache: false },
});
```

### In your own code

Make one transcript at a time. Two at once add up their peaks.

If you queue them, do not let the queue keep the last result. A queue built as
`queue = queue.then(() => createTranscript(channel))` holds the whole page until the next transcript
replaces it. Keep the order without the value:

```js
let queue = Promise.resolve();

function serialized(task) {
  const run = queue.then(task);
  queue = run.then(
    () => {},
    () => {}
  );
  return run;
}
```

The same goes for anything else that outlives the upload, such as a cache or a log of results: keep
the message or the URL Discord returns, not the attachment.

## Measuring

Read the numbers after a garbage collection, or the comparison mixes in garbage that was simply not
collected yet. Start Node with `--expose-gc`:

```js
const { readFileSync } = require('node:fs');

function memory() {
  global.gc?.();
  const mb = (bytes) => Math.round(bytes / 1048576);
  const { heapUsed, external, rss } = process.memoryUsage();
  const result = { heapUsed: mb(heapUsed), external: mb(external), rss: mb(rss) };
  if (process.platform === 'linux') {
    // resident memory without the code mapped from files, which rss includes
    const kb = /RssAnon:\s+(\d+)/.exec(readFileSync('/proc/self/status', 'utf8'))?.[1];
    if (kb) result.rssAnon = mb(Number(kb) * 1024);
  }
  return result;
}
```

Log it before and after each transcript. One run varies by several megabytes, so compare a few
transcripts of the same channel rather than a single pair.
