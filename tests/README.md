# Tests

`npm test` runs everything that needs no bot and no network:

- `ssrf.ts` - the download guard: blocked addresses and schemes, and the size cap.
- `render.ts` - rendering, from raw API payloads turned into discord.js structures: messages, embeds, components,
  attachments, polls, threads, voice messages, the member request, and the page scripts run against a mock DOM.

Both print one `PASS` or `FAIL` line per check and exit with a non-zero code if any check fails.

The other two need a bot, and **post to a real channel**. Put `TOKEN` and `CHANNEL` in a `.env` file first:

- `npm run test:typescript` - generates a transcript of `CHANNEL` and posts it there.
- `npm run test:send-components-v2` - posts Components V2 samples to `CHANNEL`, to have something to export.

Before a release, also run `npm run build`, `npm run typecheck` and `npm run lint:check`.
