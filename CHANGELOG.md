# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/cauahzz/discord-transcriptify/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cauahzz/discord-transcriptify/releases/tag/v1.0.0
