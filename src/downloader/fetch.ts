import type { LookupFunction } from 'node:net';
import { lookup as dnsLookup } from 'node:dns';
import type { Dispatcher } from 'undici';
import { Agent, request } from 'undici';
import debug from 'debug';
import { describeUrl } from '../utils/utils';
import { isAllowedProtocol, isBlockedAddress, isSafeRequestUrl } from '../utils/ssrf';

const log = debug('discord-transcriptify:fetch');

export type GuardedFetchOptions = {
  /** Largest body to accept, in bytes. */
  maxBytes: number;
  /** Lifts the internal-address rule; the protocol check always applies. @default false */
  allowPrivateNetwork?: boolean;
  /** Time to wait for response headers, in milliseconds. @default 10000 */
  headersTimeout?: number;
  /** Time to wait for the response body, in milliseconds. @default 30000 */
  bodyTimeout?: number;
};

export type GuardedFetchResult = { buffer: Buffer; contentType: string | undefined };

/**
 * A `dns.lookup` drop-in that refuses to hand back an address pointing at the
 * local machine or a private network.
 *
 * This runs at connect time rather than before the request, so a hostname that
 * resolves to a public address on the first lookup and an internal one on the
 * second (DNS rebinding) is still rejected.
 */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, options, (err, address, family) => {
    if (err) {
      callback(err, address, family);
      return;
    }

    if (Array.isArray(address)) {
      const safe = address.filter((entry) => !isBlockedAddress(entry.address));
      if (safe.length === 0) {
        callback(new Error(`Refusing to connect to internal address for host "${hostname}"`), []);
        return;
      }
      callback(null, safe);
      return;
    }

    if (isBlockedAddress(address)) {
      callback(new Error(`Refusing to connect to internal address ${address} for host "${hostname}"`), address, family);
      return;
    }

    callback(null, address, family);
  });
};

let guardedAgent: Agent | undefined;

/** Built on first use so importing the module opens nothing. */
function getGuardedAgent(): Agent {
  guardedAgent ??= new Agent({ connect: { lookup: guardedLookup } });
  return guardedAgent;
}

/** Reads the response body, aborting as soon as it goes over the limit. */
async function readCapped(
  body: Dispatcher.ResponseData['body'],
  maxBytes: number,
  url: string
): Promise<Buffer | null> {
  const chunks: Buffer[] = [];
  let received = 0;

  for await (const chunk of body) {
    received += chunk.length;
    if (received > maxBytes) {
      log(`Skipping ${describeUrl(url)}: response exceeded ${Math.round(maxBytes / 1024)}KB`);
      body.destroy();
      return null;
    }
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

/**
 * Downloads a URL with the SSRF guard and a size cap that holds regardless of
 * what the server (or the message) claims. Every network fetch in this package
 * goes through here.
 *
 * Resolves to null whenever the download is refused, fails or is too big.
 */
export async function fetchGuarded(url: string, options: GuardedFetchOptions): Promise<GuardedFetchResult | null> {
  const { maxBytes, allowPrivateNetwork = false, headersTimeout = 10_000, bodyTimeout = 30_000 } = options;

  // URLs come from the message, so they can be any string the sender wants; the scheme is
  // never negotiable, the internal-address rule is what allowPrivateNetwork relaxes
  const urlIsSafe = allowPrivateNetwork ? isAllowedProtocol(url) : isSafeRequestUrl(url);
  if (!urlIsSafe) {
    log(`Refusing to fetch ${describeUrl(url)}`);
    return null;
  }

  // undici does not follow redirects unless asked to, so a redirect to an internal host cannot slip past the guard
  log(`Fetching ${describeUrl(url)}`);
  const response = await request(url, {
    dispatcher: allowPrivateNetwork ? undefined : getGuardedAgent(),
    headersTimeout,
    bodyTimeout,
  }).catch((err) => {
    console.error(
      `[discord-transcriptify] Failed to download from ${describeUrl(url, { includePath: false })} for transcript: `,
      err
    );
    return null;
  });

  if (!response) return null;

  if (response.statusCode >= 400) {
    log(`Skipping ${describeUrl(url)}: server responded ${response.statusCode}`);
    response.body.dump().catch(() => undefined);
    return null;
  }

  // the declared length is only trusted to bail out early; the real limit is enforced while reading
  const declaredLength = Number(response.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    log(`Skipping ${describeUrl(url)}: Content-Length ${declaredLength} exceeds limit`);
    response.body.dump().catch(() => undefined);
    return null;
  }

  const buffer = await readCapped(response.body, maxBytes, url);
  if (!buffer) return null;

  log(`Finished fetching ${describeUrl(url)} (${buffer.length} bytes)`);

  const contentType = response.headers['content-type'];
  return { buffer, contentType: Array.isArray(contentType) ? contentType[0] : contentType };
}
