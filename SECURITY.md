# Security policy

## Supported versions

Only the latest release on npm gets security fixes.

## Reporting a vulnerability

Please do not open a public issue. Report it privately through
[GitHub's vulnerability reporting](https://github.com/cauahzz/discord-transcriptify/security/advisories/new)
instead, with the version you used, what an attacker can do, and the smallest message or options that
show it.

You will get an answer within a week. Once a fix is published, the advisory is made public and credits
you, unless you prefer otherwise.

## What counts

A transcript is built from content anyone in a channel can write, so these are in scope:

- HTML or script from a message, embed, component or name running in the transcript
- the built-in downloader reaching a private or loopback address, following a redirect, or going past
  its size limits
- a message that makes generation crash or use unbounded memory with the default limits

Code you pass in yourself, such as a custom `resolveImageSrc`, is outside the library's checks. The
[README](./README.md#security) describes what the library does and does not guard.
