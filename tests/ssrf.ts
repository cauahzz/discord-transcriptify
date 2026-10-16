/**
 * Regression tests for the SSRF guard and the download size cap.
 *
 * Message components can carry arbitrary URLs, so the default downloader must
 * refuse internal addresses and must not trust a component-declared size.
 * Run with: npm test
 */
import http from 'node:http';
import { inspect } from 'node:util';
import { TranscriptImageDownloader } from '../src/downloader/images';
import { buildVoiceFetcher } from '../src/features/voiceMessages';
import { isAllowedProtocol, isBlockedAddress } from '../src/utils/ssrf';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} -> got ${actual}, expected ${expected}`);
}

// --- unit: address classification ---
console.log('\n== isBlockedAddress ==');
for (const ip of [
  '127.0.0.1',
  '10.1.2.3',
  '172.16.0.1',
  '172.31.255.255',
  '192.168.1.1',
  '169.254.169.254', // cloud metadata
  '100.64.0.1',
  '0.0.0.0',
  '::1',
  '::',
  'fd00::1',
  'fe80::1',
  '::ffff:127.0.0.1',
  'not-an-ip',
]) {
  check(`blocked ${ip}`, isBlockedAddress(ip), true);
}
for (const ip of ['1.1.1.1', '8.8.8.8', '162.159.128.233', '2606:4700::1111', '172.32.0.1', '172.15.255.255']) {
  check(`allowed ${ip}`, isBlockedAddress(ip), false);
}

console.log('\n== isAllowedProtocol ==');
check('https', isAllowedProtocol('https://example.com/a.png'), true);
check('http', isAllowedProtocol('http://example.com/a.png'), true);
check('file', isAllowedProtocol('file:///etc/passwd'), false);
check('data', isAllowedProtocol('data:text/html,hi'), false);
check('garbage', isAllowedProtocol('attachment://x.png'), false);

// --- integration: real local server must be refused ---
async function main() {
  const secret = 'INTERNAL-SECRET-PAYLOAD';
  const server = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'image/png' });
    res.end(secret);
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;

  const download = new TranscriptImageDownloader().build();
  const fake = (url: string, size = 0) =>
    ({ id: 'test', url, size, width: 10, height: 10, filename: 'x.png', proxy_url: url }) as never;

  console.log('\n== SSRF integration ==');

  const loopback = await download(fake(`http://127.0.0.1:${port}/x.png`), {} as never);
  check('loopback refused', loopback === undefined, true);
  const decode = (v: unknown) => {
    const str = String(v);
    return str.includes('base64,') ? Buffer.from(str.split('base64,')[1], 'base64').toString() : str;
  };
  check('secret not leaked (decoded)', decode(loopback).includes(secret), false);

  // signed CDN urls grant access to the file, so a failure must not print the query string; localhost gets past the
  // url check and is refused at connect time, which is the path that reports through console.error
  const signed = 'ex=65a0b1c2&is=65a0b1c2&hm=deadbeefsignature';
  const originalError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => logged.push(args.map((arg) => inspect(arg)).join(' '));
  try {
    await download(fake(`http://localhost:${port}/x.png?${signed}`), {} as never);
  } finally {
    console.error = originalError;
  }
  check('the failure is still reported', logged.length > 0, true);
  check('the logged failure has no query string', logged.join('\n').includes('deadbeefsignature'), false);

  const fileScheme = await download(fake('file:///etc/passwd'), {} as never);
  check('file:// refused', fileScheme === undefined, true);

  const rebind = await download(fake('http://localhost:' + port + '/x.png'), {} as never);
  check('localhost hostname refused', rebind === undefined, true);
  check('localhost secret not leaked', decode(rebind).includes(secret), false);

  const bracketed = await download(fake('http://[::1]:' + port + '/x.png'), {} as never);
  check('ipv6 literal refused', bracketed === undefined, true);

  const metadata = await download(fake('http://169.254.169.254/latest/meta-data/'), {} as never);
  check('metadata IP refused', metadata === undefined, true);

  // escape hatch must still work
  const permissive = new TranscriptImageDownloader().withAllowPrivateNetwork().build();
  const allowed = await permissive(fake(`http://127.0.0.1:${port}/x.png`), {} as never);
  check('escape hatch allows loopback', String(allowed).startsWith('data:image/png;base64,'), true);
  check('escape hatch returns body', Buffer.from(String(allowed).split(',')[1], 'base64').toString() === secret, true);

  const permissiveFile = await permissive(fake('file:///etc/passwd'), {} as never);
  check('escape hatch still rejects file://', permissiveFile === undefined, true);

  // --- size cap must hold even when attachment.size lies (size: 0) ---
  console.log('\n== size cap ==');
  const big = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'image/png' });
    // 5 MB, no content-length (chunked)
    const chunk = Buffer.alloc(64 * 1024, 0x41);
    let sent = 0;
    const push = () => {
      while (sent < 5 * 1024 * 1024) {
        sent += chunk.length;
        if (!res.write(chunk)) {
          res.once('drain', push);
          return;
        }
      }
      res.end();
    };
    push();
  });
  await new Promise<void>((r) => big.listen(0, '127.0.0.1', r));
  const bigPort = (big.address() as { port: number }).port;

  // 100 KB cap, attachment claims size 0 (the media-gallery case)
  const capped = new TranscriptImageDownloader().withAllowPrivateNetwork().withMaxSize(100).build();
  const over = await capped(fake(`http://127.0.0.1:${bigPort}/big.png`, 0), {} as never);
  check('oversized chunked body refused despite size:0', over === undefined, true);

  // --- voice messages share the guard, and only accept audio ---
  console.log('\n== voice fetcher ==');
  const audio = http.createServer((req, res) => {
    const big = req.url === '/big.ogg';
    res.writeHead(200, { 'content-type': req.url === '/page.html' ? 'text/html' : 'audio/ogg; codecs=opus' });
    res.end(big ? Buffer.alloc(100 * 1024, 0x41) : 'OGG-BYTES');
  });
  await new Promise<void>((r) => audio.listen(0, '127.0.0.1', r));
  const audioPort = (audio.address() as { port: number }).port;
  const voice = (path: string) => ({ id: 'v', url: `http://127.0.0.1:${audioPort}/${path}` }) as never;

  const guardedVoice = buildVoiceFetcher({ maxSizeKb: 64 });
  check('voice loopback refused', (await guardedVoice(voice('a.ogg'), {} as never)) === undefined, true);

  const openVoice = buildVoiceFetcher({ maxSizeKb: 64, allowPrivateNetwork: true });
  const voiceOk = await openVoice(voice('a.ogg'), {} as never);
  check('audio response accepted', String(voiceOk).startsWith('data:audio/ogg;base64,'), true);
  check('audio body embedded', Buffer.from(String(voiceOk).split(',')[1], 'base64').toString() === 'OGG-BYTES', true);
  check('voice body over the cap refused', (await openVoice(voice('big.ogg'), {} as never)) === undefined, true);
  check('non-audio content type refused', (await openVoice(voice('page.html'), {} as never)) === undefined, true);
  check(
    'voice file:// refused',
    (await openVoice({ id: 'v', url: 'file:///etc/passwd' } as never, {} as never)) === undefined,
    true
  );

  // --- GIF and SVG skip sharp so the animation survives ---
  // --- the quality setting has to reach the format the image is kept in ---
  console.log('\n== compression quality ==');
  // sharp is a development dependency here and its current release needs a newer Node than this package does
  const sharp = await import('sharp').then(
    (module) => module.default,
    () => null
  );
  if (!sharp) {
    console.log('SKIP  sharp does not load on this Node version');
  } else {
    const noise = Buffer.from(Array.from({ length: 200 * 200 * 3 }, (_, i) => (i * 37 + (i >> 5) * 11) & 255));
    const jpegBytes = await sharp(noise, { raw: { width: 200, height: 200, channels: 3 } })
      .jpeg({ quality: 95 })
      .toBuffer();
    const jpegServer = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'image/jpeg' });
      res.end(jpegBytes);
    });
    await new Promise<void>((r) => jpegServer.listen(0, '127.0.0.1', r));
    const jpegUrl = `http://127.0.0.1:${(jpegServer.address() as { port: number }).port}/a.jpg`;
    const atQuality = async (quality: number) =>
      String(
        await new TranscriptImageDownloader().withCompression(quality).withAllowPrivateNetwork().build()(
          fake(jpegUrl),
          {} as never
        )
      );
    const lowQuality = await atQuality(10);
    const highQuality = await atQuality(90);
    check('a jpeg stays a jpeg', lowQuality.startsWith('data:image/jpeg;base64,'), true);
    check('and a lower quality makes it smaller', lowQuality.length < highQuality.length, true);

    const webp = String(
      await new TranscriptImageDownloader().withCompression(75, true).withAllowPrivateNetwork().build()(
        fake(jpegUrl),
        {} as never
      )
    );
    check('convertToWebP turns a jpeg into webp', webp.startsWith('data:image/webp;base64,'), true);

    // last in this block: the cache setting is global to the process
    check('the sharp cache is on by default', sharp.cache().items.max > 0, true);
    await new TranscriptImageDownloader()
      .withCompression(75)
      .withSharpCache(false)
      .withAllowPrivateNetwork()
      .build()(fake(jpegUrl), {} as never);
    check('withSharpCache(false) turns it off', sharp.cache().items.max, 0);
    jpegServer.close();
  }

  console.log('\n== gif passthrough ==');
  const gifBytes = Buffer.from('GIF89a-not-really-a-gif');
  const gifServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'Image/GIF; charset=binary' });
    res.end(gifBytes);
  });
  await new Promise<void>((r) => gifServer.listen(0, '127.0.0.1', r));
  const gifPort = (gifServer.address() as { port: number }).port;

  const compressing = new TranscriptImageDownloader().withCompression(50, true).withAllowPrivateNetwork().build();
  const gif = String(await compressing(fake(`http://127.0.0.1:${gifPort}/a.gif`), {} as never));
  check('gif becomes a gif data uri', gif.startsWith('data:image/gif;base64,'), true);
  check('gif bytes are exactly what was served', Buffer.from(gif.split(',')[1], 'base64').equals(gifBytes), true);

  const svgBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  const svgServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'image/svg+xml' });
    res.end(svgBytes);
  });
  await new Promise<void>((r) => svgServer.listen(0, '127.0.0.1', r));
  const svgPort = (svgServer.address() as { port: number }).port;
  const svg = String(await compressing(fake(`http://127.0.0.1:${svgPort}/a.svg`), {} as never));
  check('svg becomes an svg data uri', svg.startsWith('data:image/svg+xml;base64,'), true);
  check('svg bytes are exactly what was served', Buffer.from(svg.split(',')[1], 'base64').equals(svgBytes), true);

  // --- the total and the concurrency are what keep a transcript with many images inside the memory it has ---
  console.log('\n== total size and concurrency ==');
  let inFlight = 0;
  let mostInFlight = 0;
  let served = 0;
  const kilobyte = Buffer.alloc(1024, 'a');
  const slowServer = http.createServer((_req, res) => {
    served++;
    mostInFlight = Math.max(mostInFlight, ++inFlight);
    setTimeout(() => {
      inFlight--;
      res.writeHead(200, { 'content-type': 'image/png' });
      res.end(kilobyte);
    }, 30);
  });
  await new Promise<void>((r) => slowServer.listen(0, '127.0.0.1', r));
  const slowUrl = `http://127.0.0.1:${(slowServer.address() as { port: number }).port}/a.png`;
  const embedded = (results: unknown[]) => results.filter((result) => typeof result === 'string').length;

  // a kilobyte is 1391 characters as a data url, so 3 KB holds two of them
  const totalCapped = new TranscriptImageDownloader().withMaxTotalSize(3).withAllowPrivateNetwork().build();
  const cappedResults = await Promise.all(Array.from({ length: 8 }, () => totalCapped(fake(slowUrl), {} as never)));
  check('images stop being embedded at the total size', embedded(cappedResults), 2);
  check('the ones left out keep their url', cappedResults.filter((result) => result === undefined).length, 6);

  served = 0;
  check('nothing more is embedded afterwards', await totalCapped(fake(slowUrl), {} as never), undefined);
  check('and nothing more is downloaded', served, 0);

  const other = new TranscriptImageDownloader().withMaxTotalSize(3).withAllowPrivateNetwork().build();
  check('each built callback has a total of its own', typeof (await other(fake(slowUrl), {} as never)), 'string');

  mostInFlight = 0;
  const two = new TranscriptImageDownloader().withConcurrency(2).withAllowPrivateNetwork().build();
  const twoResults = await Promise.all(Array.from({ length: 6 }, () => two(fake(slowUrl), {} as never)));
  check('every image is still embedded under a concurrency limit', embedded(twoResults), 6);
  check('and no more than the limit are in flight at once', mostInFlight, 2);

  mostInFlight = 0;
  const unlimited = new TranscriptImageDownloader().withConcurrency(0).withAllowPrivateNetwork().build();
  await Promise.all(Array.from({ length: 6 }, () => unlimited(fake(slowUrl), {} as never)));
  check('a limit of zero runs them all together', mostInFlight, 6);

  const cappedVoice = buildVoiceFetcher({ maxSizeKb: 64, maxTotalSizeKb: 0.05, allowPrivateNetwork: true });
  check('the first voice message fits the total', typeof (await cappedVoice(voice('a.ogg'), {} as never)), 'string');
  check('the next one does not', await cappedVoice(voice('a.ogg'), {} as never), undefined);

  slowServer.close();
  server.close();
  svgServer.close();
  gifServer.close();
  big.close();
  audio.close();

  console.log(`\n${failures === 0 ? 'ALL PASSED' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
