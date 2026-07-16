import { Injectable, Logger } from '@nestjs/common';
import { promises as dns } from 'node:dns';
import { isIP } from 'node:net';
import * as http from 'node:http';
import * as https from 'node:https';

const FETCH_TIMEOUT_MS = 5000;
const MAX_BYTES = 200_000;
const MAX_REDIRECTS = 3;
const MAX_TEXT_CHARS = 4000;
const USER_AGENT = 'badthingsforpets-verification-bot/1.0 (+https://badthingsforpets.com)';

function isPublicIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata endpoint
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a >= 224) return false; // multicast/reserved
  return true;
}

function isPublicIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return false;
  if (lower.startsWith('fe80:') || /^fe[89ab]/.test(lower)) return false; // link-local fe80::/10
  if (lower.startsWith('fc') || lower.startsWith('fd')) return false; // unique local fc00::/7
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPublicIpv4(mapped[1]);
  return true;
}

function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPublicIpv4(ip);
  if (version === 6) return isPublicIpv6(ip);
  return false;
}

async function resolvePublicAddress(hostname: string): Promise<string> {
  const addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  const publicAddr = addresses.find((a) => isPublicIp(a.address));
  if (!publicAddr) throw new Error(`${hostname} has no publicly-routable address`);
  return publicAddr.address;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches by IP (resolved and validated up front) rather than by hostname,
 * so a second DNS lookup at connect time can't rebind to a private address
 * after the check above passed (TOCTOU/DNS-rebinding).
 */
function fetchOnce(urlStr: string, redirectsLeft: number): Promise<string> {
  return (async () => {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      throw new Error(`unsupported protocol ${url.protocol}`);
    }
    const ip = await resolvePublicAddress(url.hostname);
    const lib = url.protocol === 'https:' ? https : http;

    return new Promise<string>((resolve, reject) => {
      const req = lib.request(
        {
          host: ip,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'GET',
          headers: { Host: url.hostname, 'User-Agent': USER_AGENT },
          servername: url.protocol === 'https:' ? url.hostname : undefined,
          timeout: FETCH_TIMEOUT_MS,
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            if (redirectsLeft <= 0) {
              reject(new Error('too many redirects'));
              return;
            }
            const nextUrl = new URL(res.headers.location, url);
            resolve(fetchOnce(nextUrl.toString(), redirectsLeft - 1));
            return;
          }
          if (status !== 200) {
            res.resume();
            reject(new Error(`unexpected status ${status}`));
            return;
          }

          let bytes = 0;
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > MAX_BYTES) {
              req.destroy();
              reject(new Error('response too large'));
              return;
            }
            chunks.push(chunk);
          });
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          res.on('error', reject);
        },
      );
      req.on('timeout', () => req.destroy(new Error('request timed out')));
      req.on('error', reject);
      req.end();
    });
  })();
}

/**
 * A signal for the human reviewer, not a gate — fetches a claimed domain's
 * own homepage so Bedrock can classify from real page content instead of
 * just guessing at the domain string. Failure (site down, blocks bots,
 * resolves privately) just means this signal is skipped; verification
 * proceeds without it, same as the Bedrock-unavailable case.
 */
@Injectable()
export class HomepageFetcherService {
  private readonly logger = new Logger(HomepageFetcherService.name);

  async fetchHomepageText(domain: string): Promise<string | null> {
    for (const candidate of [`https://${domain}`, `https://www.${domain}`]) {
      try {
        const html = await fetchOnce(candidate, MAX_REDIRECTS);
        const text = htmlToText(html);
        if (text.length > 0) return text.slice(0, MAX_TEXT_CHARS);
      } catch (err) {
        this.logger.debug(
          `Homepage fetch failed for ${candidate}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
    return null;
  }
}
