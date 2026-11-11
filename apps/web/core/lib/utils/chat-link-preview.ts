import { errorStatusOf } from '@/core/lib/utils/error-feedback';
import { EChatLinkPreviewStatus, type IChatLinkPreview } from '@/core/types/interfaces/common/chat';

/**
 * Link previews of chat messages: the links a message body carries, and the platform's answers for them
 * (`GET /chat/link-preview?url=`). The platform fetches the pages; the browser only asks, once per link, and shows
 * what came back as plain text.
 */

/** The most links of one message that get a preview card. */
const CHAT_LINK_PREVIEW_MAX_LINKS = 3;

/** The longest link the platform previews (its `CHAT_LINK_PREVIEW_URL_MAX_LENGTH`): a longer one is not asked for. */
const CHAT_LINK_PREVIEW_URL_MAX_LENGTH = 2048;

/** How long after a `pending` answer the link is asked for again. */
const CHAT_LINK_PREVIEW_POLL_MS = 2000;

/** How many times a `pending` link is asked for again before the message shows it plain. */
const CHAT_LINK_PREVIEW_MAX_POLLS = 3;

/** How many asks run at once: a long conversation full of links stays well under the platform's per-user limit. */
const CHAT_LINK_PREVIEW_CONCURRENCY = 4;

/** How many links are remembered as having no preview, at most (the oldest are forgotten first). */
const CHAT_LINK_PREVIEW_REMEMBERED = 500;

/** A link of a message that gets a preview. */
export interface ChatPreviewLink {
	/** The link as written (its fragment kept): what the card opens. */
	href: string;
	/** The link as the platform keys it (no fragment): what is asked for, and what two links share a preview by. */
	url: string;
}

/**
 * A link as the platform previews it: an absolute `http:` or `https:` address without credentials, its fragment left
 * out (it never reaches a server), in the URL parser's normal form; null when it is not one, or is too long.
 */
export function normalizePreviewUrl(raw: string): string | null {
	const text = raw.trim();
	if (!text || text.length > CHAT_LINK_PREVIEW_URL_MAX_LENGTH) return null;
	let url: URL;
	try {
		url = new URL(text);
	} catch {
		return null;
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
	if (url.username || url.password || !url.hostname) return null;
	url.hash = '';
	return url.href.length > CHAT_LINK_PREVIEW_URL_MAX_LENGTH ? null : url.href;
}

/** A fence line: up to three spaces, then three or more backticks or tildes (what opens or closes a code block). */
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

/** A line with its code spans (a run of backticks up to the next run of the same length) blanked out. */
function withoutCodeSpans(line: string): string {
	const runs = [...line.matchAll(/`+/g)];
	let result = '';
	let last = 0;
	for (let index = 0; index < runs.length; index += 1) {
		const open = runs[index];
		const closing = runs.findIndex((run, at) => at > index && run[0].length === open[0].length);
		// A run nobody closes is a literal backtick.
		if (closing < 0) continue;
		const close = runs[closing];
		result += `${line.slice(last, open.index)} `;
		last = (close.index ?? 0) + close[0].length;
		index = closing;
	}
	return result + line.slice(last);
}

/**
 * The body with its code blanked out: fenced blocks (``` or ~~~, closed by a fence of the same character at least as
 * long, or by the end of the body) and code spans. A link written as code is shown as code, not as a link.
 */
export function withoutCode(body: string): string {
	const lines: string[] = [];
	let fence: string | null = null;
	for (const line of body.split('\n')) {
		const match = FENCE.exec(line);
		if (fence) {
			if (match && match[1][0] === fence[0] && match[1].length >= fence.length && !match[2].trim()) fence = null;
			lines.push('');
			continue;
		}
		// A backtick fence cannot carry a backtick in its info string (that line is a code span instead).
		if (match && !(match[1][0] === '`' && match[2].includes('`'))) {
			fence = match[1];
			lines.push('');
			continue;
		}
		lines.push(withoutCodeSpans(line));
	}
	return lines.join('\n');
}

/**
 * A link in text: `http://`, `https://` or `www.` (what the renderer links, as GitHub-flavoured Markdown does), at the
 * start, after a space or after what opens or emphasizes a link (`(`, `<`, `[`, `*`, `_`, `~`, `>`), up to a space, a
 * quote, a bracket or an angle bracket.
 */
const LINK_CANDIDATE = /(^|[\s(<[*_~>])((?:https?:\/\/|www\.)[^\s<>"`[\]]+)/gi;

/** What ends a sentence or an emphasis after a link, and is not part of it. */
const TRAILING_PUNCTUATION = new Set(['?', '!', '.', ',', ':', ';', '*', '_', '~', "'", '"']);

/** The letters and digits of an entity reference's name. */
const ENTITY_NAME = /^[a-z0-9]+$/i;

function count(text: string, character: string): number {
	let found = 0;
	for (const each of text) if (each === character) found += 1;
	return found;
}

/** The link without an entity reference at its end (`&amp;`), which is not part of it. */
function withoutTrailingEntity(link: string): string {
	if (!link.endsWith(';')) return link;
	const at = link.lastIndexOf('&');
	return at >= 0 && ENTITY_NAME.test(link.slice(at + 1, -1)) ? link.slice(0, at) : link;
}

/**
 * A link candidate without what follows it in the sentence: trailing punctuation, an entity reference, and a `)` it
 * did not open. Character by character (no pattern anchored at the end), so a long run of punctuation costs nothing.
 */
function trimLinkEnd(candidate: string): string {
	let link = candidate;
	for (;;) {
		const before = link;
		link = withoutTrailingEntity(link);
		let end = link.length;
		while (end > 0 && TRAILING_PUNCTUATION.has(link[end - 1])) end -= 1;
		link = link.slice(0, end);
		if (link.endsWith(')') && count(link, ')') > count(link, '(')) link = link.slice(0, -1);
		if (link === before) return link;
	}
}

/**
 * The links of a message body that get a preview: up to `max` distinct `http(s)` links in the order written, the ones
 * inside code left out, and those of `ownOrigin` too (a link to this app opens its own page: a message, a task).
 */
export function previewLinksOf(
	body: string,
	options: { max?: number; ownOrigin?: string | null } = {}
): ChatPreviewLink[] {
	const max = options.max ?? CHAT_LINK_PREVIEW_MAX_LINKS;
	const links: ChatPreviewLink[] = [];
	if (!body || max <= 0) return links;
	const seen = new Set<string>();
	for (const match of withoutCode(body).matchAll(LINK_CANDIDATE)) {
		const written = trimLinkEnd(match[2]);
		const absolute = /^www\./i.test(written) ? `http://${written}` : written;
		const url = normalizePreviewUrl(absolute);
		if (!url || seen.has(url)) continue;
		if (options.ownOrigin && new URL(url).origin === options.ownOrigin) continue;
		seen.add(url);
		links.push({ href: new URL(absolute).href, url });
		if (links.length >= max) break;
	}
	return links;
}

/**
 * What a preview card shows: the page's text only. The platform also answers the page's picture and icon, but they sit
 * on the linked site's own hosts, and drawing them would make every reader's browser call that site (and hand it the
 * reader's address); they wait for a platform route that serves them through the platform.
 */
export interface ChatLinkPreviewCard {
	/** What the card opens: the link as written. */
	href: string;
	/** The site's name, or the link's host when the page names none. */
	site: string;
	title: string | null;
	description: string | null;
}

/** A text the platform answered, on one line, or null when there is none. */
function plainText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.replace(/\s+/g, ' ').trim();
	return text || null;
}

function hostOf(href: string): string {
	try {
		return new URL(href).hostname.replace(/^www\./i, '');
	} catch {
		return href;
	}
}

/**
 * The card of a link, from the platform's answer: only a `ready` preview with a title or a description gets one; a
 * link still `pending`, `unavailable`, or that says nothing about itself stays a plain link.
 */
export function linkPreviewCardOf(
	link: ChatPreviewLink,
	preview: IChatLinkPreview | null | undefined
): ChatLinkPreviewCard | null {
	if (preview?.status !== EChatLinkPreviewStatus.Ready) return null;
	const title = plainText(preview.title);
	const description = plainText(preview.description);
	if (!title && !description) return null;
	return { href: link.href, site: plainText(preview.siteName) ?? hostOf(link.href), title, description };
}

/** One ask of the platform for the preview of a (normalized) link. */
export type ChatLinkPreviewAsk = (url: string, signal?: AbortSignal) => Promise<IChatLinkPreview>;

interface ChatLinkPreviewSessionOptions {
	pollMs?: number;
	maxPolls?: number;
	concurrency?: number;
	remembered?: number;
}

/**
 * What the page remembers about link previews while it is open: whether the platform has the route at all (the first
 * ask is the probe; the others wait for its answer, so a platform without it gets one request, not one per link),
 * and the links that have no preview (never asked for again).
 */
export interface ChatLinkPreviewSession {
	/**
	 * The platform's answer for a link, asked again every few seconds while `pending` (a few times at most, then the
	 * last answer stands); null when it is not asked for: the platform has no route, or the link has no preview.
	 */
	load: (url: string, signal?: AbortSignal) => Promise<IChatLinkPreview | null>;
	/** Whether the platform answered that it has no preview route (404): nothing is asked for again. */
	routeMissing: () => boolean;
	/** Whether the link is known to have no preview. */
	isUnavailable: (url: string) => boolean;
	/** Called when the platform turns out to have no route. */
	subscribe: (listener: () => void) => () => void;
}

type RouteState = 'unknown' | 'probing' | 'present' | 'missing';

function abortError(signal: AbortSignal): unknown {
	return signal.reason ?? new DOMException('The ask was cancelled', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw abortError(signal);
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(abortError(signal));
			return;
		}
		const onAbort = () => {
			clearTimeout(timer);
			reject(abortError(signal as AbortSignal));
		};
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

export function createChatLinkPreviewSession(
	ask: ChatLinkPreviewAsk,
	options: ChatLinkPreviewSessionOptions = {}
): ChatLinkPreviewSession {
	const pollMs = options.pollMs ?? CHAT_LINK_PREVIEW_POLL_MS;
	const maxPolls = options.maxPolls ?? CHAT_LINK_PREVIEW_MAX_POLLS;
	const concurrency = Math.max(1, options.concurrency ?? CHAT_LINK_PREVIEW_CONCURRENCY);
	const rememberedMax = Math.max(1, options.remembered ?? CHAT_LINK_PREVIEW_REMEMBERED);
	const state: { route: RouteState; probe: Promise<void> } = { route: 'unknown', probe: Promise.resolve() };
	const unavailable = new Set<string>();
	const listeners = new Set<() => void>();
	const waiting: Array<() => void> = [];
	let running = 0;

	const remember = (url: string) => {
		unavailable.add(url);
		if (unavailable.size > rememberedMax) {
			const oldest = unavailable.values().next().value;
			if (oldest !== undefined) unavailable.delete(oldest);
		}
	};

	/** One ask, in turn: a few at once at most (an ask that ends hands its place to the next one waiting). */
	const askInTurn = async (url: string, signal?: AbortSignal): Promise<IChatLinkPreview> => {
		if (running < concurrency) running += 1;
		else await new Promise<void>((resolve) => waiting.push(resolve));
		try {
			throwIfAborted(signal);
			return await ask(url, signal);
		} finally {
			const next = waiting.shift();
			if (next) next();
			else running -= 1;
		}
	};

	const load = async (url: string, signal?: AbortSignal): Promise<IChatLinkPreview | null> => {
		while (state.route === 'probing') {
			await state.probe;
			throwIfAborted(signal);
		}
		if (state.route === 'missing' || unavailable.has(url)) return null;
		const probing = state.route === 'unknown';
		let settleProbe: () => void = () => undefined;
		if (probing) {
			state.route = 'probing';
			state.probe = new Promise<void>((resolve) => {
				settleProbe = resolve;
			});
		}
		try {
			let preview = await askInTurn(url, signal);
			if (probing) {
				// The route answered: the other links are asked for now, while this one waits for its page.
				state.route = 'present';
				settleProbe();
			}
			for (let polls = 0; preview?.status === EChatLinkPreviewStatus.Pending && polls < maxPolls; polls += 1) {
				await wait(pollMs, signal);
				preview = await askInTurn(url, signal);
			}
			if (preview?.status === EChatLinkPreviewStatus.Unavailable) remember(url);
			return preview ?? null;
		} catch (error) {
			const status = errorStatusOf(error);
			if (status === 404) {
				state.route = 'missing';
				for (const listener of listeners) listener();
				return null;
			}
			// A refusal of the link (400) or of the pace (429) is the route answering; an outage, a cancel or a
			// sign-out tells nothing, and the next link probes again.
			if (probing && state.route === 'probing')
				state.route = status === 400 || status === 429 ? 'present' : 'unknown';
			if (status === 400) {
				remember(url);
				return null;
			}
			throw error;
		} finally {
			if (probing) settleProbe();
		}
	};

	return {
		load,
		routeMissing: () => state.route === 'missing',
		isUnavailable: (url) => unavailable.has(url),
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		}
	};
}
