/**
 * Minimal ntfy.sh client. No SDK — we hit the publish endpoint directly.
 *
 *   POST https://ntfy.sh/<topic>
 *   Headers: Title, Priority (1-5), Tags (comma list), optional Authorization
 *   Body:    raw text (UTF-8), the notification body
 *
 * Docs: https://docs.ntfy.sh/publish/
 *
 * Why ntfy for clinician alerts:
 *  - No account, no SDK, no trial restrictions.
 *  - The "topic" is just a shared secret — the clinician installs the
 *    ntfy iOS/Android app and subscribes to ntfy.sh/<topic>.
 *  - Works offline-first from the phone's perspective: the app opportunistically
 *    POSTs; if the user has connectivity, delivery is near-instant.
 *
 * The default server is the public ntfy.sh instance. Self-hosters can point
 * at their own instance via EXPO_PUBLIC_NTFY_SERVER. An access token may be
 * supplied via EXPO_PUBLIC_NTFY_TOKEN for ACL-protected topics.
 */

const DEFAULT_SERVER = 'https://ntfy.sh';
const SERVER = (process.env.EXPO_PUBLIC_NTFY_SERVER || DEFAULT_SERVER).replace(/\/$/, '');
const TOKEN = process.env.EXPO_PUBLIC_NTFY_TOKEN;

/** ntfy priority levels, mapping to the standard urgency scale. */
export type NtfyPriority = 1 | 2 | 3 | 4 | 5;

export type NtfySendResult =
  | { kind: 'sent'; messageId: string }
  | { kind: 'failed'; error: string };

export type NtfyPublishOptions = {
  topic: string;
  message: string;
  /** Notification title (shown in the push). ASCII-safe; non-ASCII is sanitized. */
  title?: string;
  /** 5 = urgent, 4 = high, 3 = default, 2 = low, 1 = min. Defaults to 5. */
  priority?: NtfyPriority;
  /** Comma-separated tags or emojis (e.g. 'warning,rotating_light'). */
  tags?: string[];
};

export type NtfyAttachmentOptions = {
  topic: string;
  /** Local `file://` URI to upload (e.g. from expo-image-picker). */
  fileUri: string;
  /** Filename the clinician's app should display. Extension drives mime type. */
  filename: string;
  /** Short caption shown under the attachment. Defaults to the filename. */
  message?: string;
  /** Push headline. ASCII-safe; non-ASCII is sanitized. */
  title?: string;
  priority?: NtfyPriority;
  tags?: string[];
};

/**
 * Validate that the topic is publishable. ntfy topic rules are permissive
 * but we enforce the same basic hygiene as the server would to fail fast
 * on the client (e.g. empty strings, whitespace, forbidden characters).
 */
export function isValidTopic(topic: string): boolean {
  const t = topic.trim();
  if (t.length === 0 || t.length > 64) return false;
  return /^[A-Za-z0-9_-]+$/.test(t);
}

/**
 * Generate a random, hard-to-guess topic for a new onboarding user. The
 * topic acts as a shared secret between the patient's phone and their
 * clinician's ntfy app, so entropy matters.
 */
export function generateRandomTopic(prefix = 'diseasex'): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 12; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Publish a message to the given ntfy topic. Returns a tagged union so
 * callers can persist the outcome (sent vs failed) without throwing.
 */
export async function publishNtfy(
  opts: NtfyPublishOptions,
): Promise<NtfySendResult> {
  if (!isValidTopic(opts.topic)) {
    return { kind: 'failed', error: `Invalid ntfy topic: "${opts.topic}"` };
  }

  const url = `${SERVER}/${encodeURIComponent(opts.topic)}`;
  const headers: Record<string, string> = {
    'Content-Type': 'text/plain; charset=utf-8',
    Accept: 'application/json',
  };
  if (opts.title) {
    // ntfy rejects raw non-ASCII in header values; strip to keep things simple.
    // The full message body (below) carries any UTF-8 content safely.
    const safe = opts.title.replace(/[^\x20-\x7E]/g, '');
    if (safe) headers['Title'] = safe;
  }
  const priority = opts.priority ?? 5;
  headers['Priority'] = String(priority);
  if (opts.tags && opts.tags.length > 0) {
    headers['Tags'] = opts.tags.join(',');
  }
  if (TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: opts.message,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON body (typically only on error pages). Keep raw text.
    }

    if (!res.ok) {
      const msg =
        json?.error ||
        json?.message ||
        `HTTP ${res.status} ${res.statusText}`;
      return { kind: 'failed', error: String(msg) };
    }
    const id = typeof json?.id === 'string' && json.id.length > 0 ? json.id : null;
    if (!id) {
      return {
        kind: 'failed',
        error: `ntfy returned no message id: ${text.slice(0, 200)}`,
      };
    }
    return { kind: 'sent', messageId: id };
  } catch (err: any) {
    return { kind: 'failed', error: err?.message ?? 'Network error' };
  }
}

/**
 * Upload a local file as a ntfy attachment. Per the ntfy docs, a PUT with a
 * binary body and a `Filename` header delivers the file inline to every
 * subscriber of the topic.
 *
 * Docs: https://docs.ntfy.sh/publish/#attach-local-file
 *
 * On the public ntfy.sh instance, attachments are capped at 15 MB and stored
 * for 3 hours. That is sufficient for clinician triage: they will see (and
 * can save) the photo on their phone within seconds of the alert landing.
 */
export async function publishNtfyAttachment(
  opts: NtfyAttachmentOptions,
): Promise<NtfySendResult> {
  if (!isValidTopic(opts.topic)) {
    return { kind: 'failed', error: `Invalid ntfy topic: "${opts.topic}"` };
  }

  // React Native's fetch can read `file://` URIs directly into a Blob.
  let body: Blob;
  try {
    const fileRes = await fetch(opts.fileUri);
    if (!fileRes.ok) {
      return {
        kind: 'failed',
        error: `Could not read local file (${fileRes.status}): ${opts.fileUri}`,
      };
    }
    body = await fileRes.blob();
  } catch (err: any) {
    return {
      kind: 'failed',
      error: `Failed to read ${opts.fileUri}: ${err?.message ?? 'read error'}`,
    };
  }

  const contentType = body.type || inferMimeType(opts.filename);
  const url = `${SERVER}/${encodeURIComponent(opts.topic)}`;

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    Accept: 'application/json',
    Filename: safeAscii(opts.filename) || 'attachment.bin',
  };
  if (opts.title) {
    const safe = safeAscii(opts.title);
    if (safe) headers['Title'] = safe;
  }
  if (opts.message) {
    // The Message header is ASCII-only; ntfy strips anything else. This is
    // just a short caption under the attachment, so that is acceptable.
    const safe = safeAscii(opts.message);
    if (safe) headers['Message'] = safe;
  }
  const priority = opts.priority ?? 5;
  headers['Priority'] = String(priority);
  if (opts.tags && opts.tags.length > 0) {
    headers['Tags'] = opts.tags.join(',');
  }
  if (TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }

  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers,
      body,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      // Non-JSON response, typically only on HTML error pages.
    }

    if (!res.ok) {
      const msg =
        json?.error ||
        json?.message ||
        `HTTP ${res.status} ${res.statusText}`;
      return { kind: 'failed', error: String(msg) };
    }
    const id = typeof json?.id === 'string' && json.id.length > 0 ? json.id : null;
    if (!id) {
      return {
        kind: 'failed',
        error: `ntfy returned no message id: ${text.slice(0, 200)}`,
      };
    }
    return { kind: 'sent', messageId: id };
  } catch (err: any) {
    return { kind: 'failed', error: err?.message ?? 'Network error' };
  }
}

/** Strip characters that ntfy rejects in header values. */
function safeAscii(s: string): string {
  return s.replace(/[^\x20-\x7E]/g, '').trim();
}

function inferMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

/** Human-readable URL the clinician should subscribe to in the ntfy app. */
export function subscribeUrlFor(topic: string): string {
  return `${SERVER}/${encodeURIComponent(topic)}`;
}
