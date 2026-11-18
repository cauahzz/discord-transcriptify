# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Embedded images and voice messages are kept as bytes while the page is rendered and written into it
  at the end, instead of going through the renderer as base64. This also covers a `resolveImageSrc`
  or `resolveVoiceSrc` of your own that returns base64 data URLs. The file is byte for byte the same.
  With a 47 MB page, the peak went down by about a fifth and the memory kept afterwards by about a
  third. With `hydrate`, the peak went from about 2.4 GB to 0.5 GB, and the time from about 15
  seconds to 2.

### Fixed

- Without compression, an image whose server sends no content type keeps its URL instead of being
  embedded as `data:undefined`, and an embedded original carries only its media type, without
  parameters such as `charset`.

## [1.1.1] - 2026-11-18

### Changed

- `saveImages` downloads and processes two images at a time instead of four, which lowers the memory
  peak of a transcript with many images. `TranscriptImageDownloader` has the same new default. Pass
  `concurrency: 4` or `.withConcurrency(4)` to keep the old pace.
- `returnType: 'buffer'` and `'attachment'` no longer turn the page into a string and back, which kept
  two extra copies of it in memory. The file is byte for byte the same.

### Added

- [Memory in depth](./docs/memory.md), a guide to the memory a transcript uses and how to tune a host
  with little of it.

## [1.1.0] - 2026-10-16

### Changed

- discord.js 14.19 or newer is required (the peer range was `^14.0.0`). Components V2 only exist from
  14.19, and older versions rendered those messages without their components.

### Added

- `saveImages.webp` converts embedded images to WebP.
- `saveImages.sharpCache` and `TranscriptImageDownloader.withSharpCache()` turn off sharp's cache of
  decoded images. Calling `sharp.cache(false)` in your own code does not stick, because the copy of
  sharp the library imports turns the cache back on when it loads.
- Code blocks tagged `ansi` are rendered with the colours, bold and underline Discord supports.

### Fixed

- Transcripts no longer scroll sideways on a phone: select menus, file cards and the collapsed search
  fit the screen, and an open search takes the whole header.
- Role icons that are a unicode emoji are shown next to the author's name.
- The pinned and thread lists date entries in the reader's locale. Outside en-US the pinned list
  swapped day and month.
- A join message keeps the same welcome text every time the channel is exported.
- The image preview keeps keyboard focus inside it while open.

## [1.0.0] - 2026-10-13

First release.

[Unreleased]: https://github.com/cauahzz/discord-transcriptify/compare/v1.1.1...HEAD
[1.1.1]: https://github.com/cauahzz/discord-transcriptify/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/cauahzz/discord-transcriptify/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/cauahzz/discord-transcriptify/releases/tag/v1.0.0
