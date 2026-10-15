# Contributing

Bug reports, ideas and pull requests are welcome.

## Reporting a bug

Open an [issue](https://github.com/cauahzz/discord-transcriptify/issues/new/choose) with the versions
of discord-transcriptify, discord.js and Node, the options you passed, and what the transcript shows
compared with the Discord client. A screenshot of both helps a lot. Security problems go through
[SECURITY.md](./SECURITY.md) instead.

## Setting up

```shell
git clone https://github.com/cauahzz/discord-transcriptify.git
cd discord-transcriptify
npm install
npm run build
npm test
```

`npm test` needs no bot and no network. To look at a real transcript without a bot, run
`npm run demo` and open `demo/out/index.html`. [tests/README.md](./tests/README.md) lists the tests
that do need a bot.

## Pull requests

- Keep one change per pull request, and explain what it fixes or adds.
- Add a check to `tests/render.ts` for anything that changes the output.
- Before pushing, run `npm run build`, `npm run typecheck`, `npm run lint:check` and `npm test`. CI runs
  the same on Node 18, 20, 22 and 24.
- Update the README when an option or a rendered feature changes.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/), as in the
  existing history: `fix: ...`, `feat: ...`, `docs: ...`.

By contributing you agree that your work is licensed under Apache-2.0, like the rest of the project.
