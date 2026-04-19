/**
 * Minimal Twilio REST wrapper. No SDK — we hit the Programmable Messaging
 * endpoint directly with Basic auth.
 *
 *   POST /2010-04-01/Accounts/{AccountSid}/Messages.json
 *   Auth: Basic base64(AccountSid:AuthToken)
 *   Body: application/x-www-form-urlencoded { To, From, Body }
 *
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource#create-a-message-resource
 *
 * Credentials are read at call time from Expo public env vars (baked into
 * the bundle at build). Missing-credential mode is first-class:
 * {@link isConfigured} returns false, {@link sendSms} returns a
 * disabled-status result so the UI can record the attempt without crashing.
 */

const ACCOUNT_SID = process.env.EXPO_PUBLIC_TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.EXPO_PUBLIC_TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.EXPO_PUBLIC_TWILIO_PHONE_NUMBER;

export type TwilioSendResult =
  | { kind: 'sent'; sid: string }
  | { kind: 'failed'; error: string }
  | { kind: 'disabled'; reason: string };

export function isConfigured(): boolean {
  return !!(ACCOUNT_SID && AUTH_TOKEN && FROM_NUMBER);
}

export function missingCredentialFields(): string[] {
  const missing: string[] = [];
  if (!ACCOUNT_SID) missing.push('EXPO_PUBLIC_TWILIO_ACCOUNT_SID');
  if (!AUTH_TOKEN) missing.push('EXPO_PUBLIC_TWILIO_AUTH_TOKEN');
  if (!FROM_NUMBER) missing.push('EXPO_PUBLIC_TWILIO_PHONE_NUMBER');
  return missing;
}

/**
 * Normalise a phone number to E.164. We do not auto-prepend a country
 * code — that's explicit at input time to avoid ambiguity.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim().replace(/[\s\-()]/g, '');
  if (trimmed.startsWith('+')) return trimmed;
  if (trimmed.startsWith('00')) return `+${trimmed.slice(2)}`;
  return trimmed; // Let Twilio return an error if malformed.
}

export async function sendSms(opts: {
  to: string;
  body: string;
}): Promise<TwilioSendResult> {
  if (!isConfigured()) {
    return {
      kind: 'disabled',
      reason: `Twilio credentials missing: ${missingCredentialFields().join(', ')}`,
    };
  }
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    // Narrowed for TS even though isConfigured() covers this at runtime.
    return { kind: 'disabled', reason: 'Twilio credentials missing' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`;
  const auth = base64Ascii(`${ACCOUNT_SID}:${AUTH_TOKEN}`);
  const form = new URLSearchParams();
  form.append('To', opts.to);
  form.append('From', FROM_NUMBER);
  form.append('Body', opts.body);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // keep raw text for error message
    }

    if (!res.ok) {
      const msg =
        json?.message ||
        json?.detail ||
        `HTTP ${res.status} ${res.statusText}`;
      return { kind: 'failed', error: msg };
    }
    if (!json?.sid) {
      return { kind: 'failed', error: `Twilio returned no sid: ${text.slice(0, 200)}` };
    }
    return { kind: 'sent', sid: json.sid };
  } catch (err: any) {
    return { kind: 'failed', error: err?.message ?? 'Network error' };
  }
}

/**
 * ASCII-only Base64 encoder. Twilio AccountSid and AuthToken are always
 * ASCII, so we can avoid pulling in a polyfill for `btoa` / the
 * `base-64` package.
 */
function base64Ascii(input: string): string {
  const table = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  let i = 0;
  while (i < input.length) {
    const c1 = input.charCodeAt(i++);
    const c2 = i < input.length ? input.charCodeAt(i++) : NaN;
    const c3 = i < input.length ? input.charCodeAt(i++) : NaN;
    const e1 = c1 >> 2;
    const e2 = ((c1 & 3) << 4) | ((isNaN(c2) ? 0 : c2) >> 4);
    const e3 = isNaN(c2) ? 64 : (((c2 & 15) << 2) | ((isNaN(c3) ? 0 : c3) >> 6));
    const e4 = isNaN(c3) ? 64 : (c3 & 63);
    out +=
      table.charAt(e1) +
      table.charAt(e2) +
      (e3 === 64 ? '=' : table.charAt(e3)) +
      (e4 === 64 ? '=' : table.charAt(e4));
  }
  return out;
}
