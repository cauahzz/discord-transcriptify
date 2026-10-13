import { isIP } from 'node:net';

/**
 * Checks whether an IPv4 address falls inside a range that should never be
 * reachable from a transcript download (loopback, private, link-local, etc).
 */
function isBlockedIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    // not something we can reason about, so refuse it
    return true;
  }

  const [a, b] = parts;

  return (
    a === 0 || // 0.0.0.0/8 - "this network"
    a === 10 || // 10.0.0.0/8 - private
    a === 127 || // 127.0.0.0/8 - loopback
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 - carrier NAT
    (a === 169 && b === 254) || // 169.254.0.0/16 - link-local (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 - private
    (a === 192 && b === 0) || // 192.0.0.0/24 - IETF protocol assignments
    (a === 192 && b === 168) || // 192.168.0.0/16 - private
    (a === 198 && (b === 18 || b === 19)) || // 198.18.0.0/15 - benchmarking
    a >= 224 // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved
  );
}

/** Same as `isBlockedIPv4`, for IPv6. */
function isBlockedIPv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];

  // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible addresses reach the same hosts as the v4 form,
  // so unwrap them and apply the v4 rules
  const mapped = /^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/.exec(normalized);
  if (mapped) return isBlockedIPv4(mapped[1]);

  if (normalized === '::' || normalized === '::1') return true; // unspecified + loopback

  const firstHextet = normalized.split(':')[0];
  if (!firstHextet) return true; // leading "::" of an address we did not match above

  const value = parseInt(firstHextet, 16);
  if (!Number.isFinite(value)) return true;

  const top7 = value >>> 9; // fc00::/7 - unique local
  const top10 = value >>> 6; // fe80::/10 - link local

  return top7 === 0b1111110 || top10 === 0b1111111010 || (value & 0xff00) === 0xff00; // ff00::/8 multicast
}

/**
 * Whether the IP literal points somewhere internal and must not be fetched.
 * Input that is not a valid IP counts as blocked.
 */
export function isBlockedAddress(address: string): boolean {
  switch (isIP(address)) {
    case 4:
      return isBlockedIPv4(address);
    case 6:
      return isBlockedIPv6(address);
    default:
      return true;
  }
}

/**
 * Whether the URL is a plain http(s) one, so `file://`, `data:` and friends
 * never reach the HTTP client.
 */
export function isAllowedProtocol(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Decides whether a URL is safe to fetch.
 *
 * Two separate things have to be checked, because they are enforced at
 * different layers:
 *
 *  - the scheme, so `file://` and `data:` never reach the HTTP client, and
 *  - the host, when it is already an IP literal. Node skips `dns.lookup`
 *    entirely for those, so the connect-time guard never sees them and
 *    `http://127.0.0.1/` would otherwise sail straight through.
 *
 * Hostnames that need DNS are handled by the lookup guard instead, which also
 * covers rebinding.
 */
export function isSafeRequestUrl(url: string): boolean {
  if (!isAllowedProtocol(url)) return false;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return false;
  }

  // URL keeps IPv6 hosts wrapped in brackets; isIP needs them stripped
  const host = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

  // only literals are judged here; hostnames are checked once resolved
  if (isIP(host) !== 0) return !isBlockedAddress(host);

  return true;
}
