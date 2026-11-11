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

/** How many asks a minute, at most: the platform allows about 120 per person, the pending asks again included. */
const CHAT_LINK_PREVIEW_PER_MINUTE = 100;

/** How many times an ask the platform refused for its pace (429) is made again, after a pause. */
const CHAT_LINK_PREVIEW_PACE_RETRIES = 2;

/**
 * How long every ask of the page pauses after a 429, then doubled for each refusal in a row of the same ask, 60 s at
 * most (the platform counts a minute). The answer's `Retry-After` does not reach here: the client's errors keep the
 * status only, and the proxy passes on the body's type only.
 */
const CHAT_LINK_PREVIEW_PACE_PAUSE_MS = 15_000;
const CHAT_LINK_PREVIEW_PACE_PAUSE_MAX_MS = 60_000;

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

/** A fence: three or more backticks or tildes at the start of a line's content (what opens or closes a code block). */
const FENCE = /^(`{3,}|~{3,})(.*)$/;

/** A list item's marker at the start of a line's content (`-`, `*`, `+`, `1.`, `1)`), with the space after it. */
const LIST_MARKER = /^(?:[-*+]|\d{1,9}[.)])[ \t]/;

/** A line indented as code (four spaces or a tab). */
const CODE_INDENT = /^(?: {4}|\t)/;

/**
 * A line's content inside its quotes and list items (`> - ```` opens a fence too), and how many quotes it is in. Any
 * indent is let through, so an indented fence counts as one: a line taken for code when it is not only costs a
 * preview, never the other way.
 */
function contentOf(line: string): { content: string; quotes: number } {
	let rest = line.trimStart();
	let quotes = 0;
	for (;;) {
		if (rest.startsWith('>')) {
			rest = rest.slice(1).trimStart();
			quotes += 1;
			continue;
		}
		const marker = LIST_MARKER.exec(rest);
		if (!marker) return { content: rest, quotes };
		rest = rest.slice(marker[0].length).trimStart();
	}
}

/**
 * A line of an open fence, inside the quotes the fence opened in and no further: a `>` or a list marker past them is
 * code, so `> ```` does not close a fence opened outside any quote. Null when the line has fewer quotes.
 */
function insideQuotes(line: string, quotes: number): string | null {
	let rest = line.trimStart();
	for (let depth = 0; depth < quotes; depth += 1) {
		if (!rest.startsWith('>')) return null;
		rest = rest.slice(1).trimStart();
	}
	return rest;
}

/**
 * A paragraph with its code spans (a run of backticks up to the next run of the same length, on the same line or a
 * following one) blanked out.
 */
function withoutCodeSpans(line: string): string {
	const runs = [...line.matchAll(/`+/g)];
	// The next run of the same length after each run, found in one pass from the end (so many spans cost no more).
	const nextOfLength = new Map<number, number>();
	const closingOf: number[] = new Array<number>(runs.length);
	for (let index = runs.length - 1; index >= 0; index -= 1) {
		const length = runs[index][0].length;
		closingOf[index] = nextOfLength.get(length) ?? -1;
		nextOfLength.set(length, index);
	}
	let result = '';
	let last = 0;
	for (let index = 0; index < runs.length; index += 1) {
		const open = runs[index];
		const closing = closingOf[index];
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
 * The body with its code blanked out: fenced blocks (``` or ~~~, also in a quote or a list item, closed by a fence of
 * the same character at least as long, or by the end of the body), indented code (outside a paragraph) and code
 * spans, which run on over the lines of their paragraph. A link written as code is shown as code, not as a link.
 */
export function withoutCode(body: string): string {
	const lines: string[] = [];
	let fence: { marker: string; quotes: number } | null = null;
	let paragraph: string[] = [];
	const endParagraph = () => {
		if (paragraph.length) lines.push(withoutCodeSpans(paragraph.join('\n')));
		paragraph = [];
	};
	for (const line of body.split('\n')) {
		if (fence) {
			// A line with fewer quotes than the fence would end the quote and the fence with it; it stays code here,
			// which can only cost a preview.
			const inner = insideQuotes(line, fence.quotes);
			const close = inner === null ? null : FENCE.exec(inner);
			const { marker } = fence;
			if (close && close[1][0] === marker[0] && close[1].length >= marker.length && !close[2].trim())
				fence = null;
			lines.push('');
			continue;
		}
		const { content, quotes } = contentOf(line);
		const match = FENCE.exec(content);
		// A backtick fence cannot carry a backtick in its info string (that line is a code span instead).
		if (match && !(match[1][0] === '`' && match[2].includes('`'))) {
			endParagraph();
			fence = { marker: match[1], quotes };
			lines.push('');
			continue;
		}
		// Indented code cannot interrupt a paragraph: there, the indent only continues it.
		if (!paragraph.length && CODE_INDENT.test(line) && line.trim()) {
			lines.push('');
			continue;
		}
		if (line.trim()) {
			paragraph.push(line);
			continue;
		}
		// A blank line ends the paragraph: a code span never runs past it.
		endParagraph();
		lines.push(line);
	}
	endParagraph();
	return lines.join('\n');
}

/**
 * The `]` that closes each `[` of the text, by the index of the `[`: nested brackets and escapes counted, within a
 * line. One pass, so a body full of brackets costs no more than its length.
 */
function closingBrackets(text: string): Map<number, number> {
	const closes = new Map<number, number>();
	const opens: number[] = [];
	for (let at = 0; at < text.length; at += 1) {
		const character = text[at];
		if (character === '\\') at += 1;
		else if (character === '\n') opens.length = 0;
		else if (character === '[') opens.push(at);
		else if (character === ']') {
			const open = opens.pop();
			if (open !== undefined) closes.set(open, at);
		}
	}
	return closes;
}

/** Where a Markdown address that starts at `from` ends: after its `)`, or at the end of the line when none closes it. */
function addressEndOf(text: string, from: number): number {
	const end = text.indexOf(')', from);
	const lineEnd = text.indexOf('\n', from);
	if (end >= 0 && (lineEnd < 0 || end < lineEnd)) return end + 1;
	return lineEnd < 0 ? text.length : lineEnd;
}

/**
 * The text with the labels of its Markdown links left out (`[label](address)` keeps ` (address)`), nested brackets in
 * a label included: the label is the link's words, not where it goes. A picture (`![alt](address)`) is left out whole:
 * the renderer shows its words only, so its address is no link.
 */
function withoutLinkLabels(text: string): string {
	const closes = closingBrackets(text);
	let result = '';
	let index = 0;
	for (let open = text.indexOf('[', index); open >= 0; open = text.indexOf('[', index)) {
		const close = closes.get(open);
		if (close === undefined || text[close + 1] !== '(') {
			result += text.slice(index, open + 1);
			index = open + 1;
			continue;
		}
		const picture = open > index && text[open - 1] === '!';
		result += `${text.slice(index, picture ? open - 1 : open)} `;
		if (picture) {
			index = addressEndOf(text, close + 2);
		} else {
			result += '(';
			index = close + 2;
		}
	}
	return result + text.slice(index);
}

/** The text a link is read in: no code, no picture, and only the addresses of Markdown links (not their labels). */
function linkText(body: string): string {
	return withoutLinkLabels(withoutCode(body));
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

/** The longest entity reference looked for at the end of a link (`&` and `;` included). */
const ENTITY_MAX_LENGTH = 34;

/** How many times `character` occurs in `text`. */
function count(text: string, character: string): number {
	let found = 0;
	for (const each of text) if (each === character) found += 1;
	return found;
}

/** Where the link ends without an entity reference at its end (`&amp;`, not part of it), looked for near the end only. */
function endWithoutEntity(link: string, end: number): number {
	if (link[end - 1] !== ';') return end;
	const from = Math.max(0, end - ENTITY_MAX_LENGTH);
	const near = link.slice(from, end - 1).lastIndexOf('&');
	if (near < 0) return end;
	const at = from + near;
	return ENTITY_NAME.test(link.slice(at + 1, end - 1)) ? at : end;
}

/** The named character references a link may carry (`&amp;` in a query), as the renderer decodes them. */
const NAMED_REFERENCES: Readonly<Record<string, string>> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** A character reference: `&amp;`, `&#38;` or `&#x26;`. */
const CHARACTER_REFERENCE = /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi;

/** A link with its character references decoded, as the address of the rendered link has them. */
function decodeReferences(link: string): string {
	return link.replace(CHARACTER_REFERENCE, (reference: string, name: string) => {
		if (!name.startsWith('#')) return NAMED_REFERENCES[name.toLowerCase()] ?? reference;
		const hex = name[1] === 'x' || name[1] === 'X';
		const code = hex ? Number.parseInt(name.slice(2), 16) : Number.parseInt(name.slice(1), 10);
		return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : reference;
	});
}

/**
 * A link candidate without what follows it in the sentence: trailing punctuation, an entity reference, and a `)` it
 * did not open. Character by character (no pattern anchored at the end), so a long run of punctuation costs nothing.
 */
function trimLinkEnd(candidate: string): string {
	// The parentheses are counted once: what is trimmed below is never one, except the `)` counted off as it goes.
	const opens = count(candidate, '(');
	let closes = count(candidate, ')');
	let end = candidate.length;
	for (;;) {
		const before = end;
		end = endWithoutEntity(candidate, end);
		while (end > 0 && TRAILING_PUNCTUATION.has(candidate[end - 1])) end -= 1;
		if (candidate[end - 1] === ')' && closes > opens) {
			end -= 1;
			closes -= 1;
		}
		if (end === before) return candidate.slice(0, end);
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
	for (const match of linkText(body).matchAll(LINK_CANDIDATE)) {
		const written = decodeReferences(trimLinkEnd(match[2]));
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
	/**
	 * The host the card opens (`www.` left out). Always shown, and what the card is named by: the page names its site
	 * as it likes, so its name alone could pass for another site's.
	 */
	host: string;
	/** The name the page gives its site, when it gives one other than its host. */
	siteName: string | null;
	title: string | null;
	description: string | null;
}

/** A text the platform answered, on one line, or null when there is none. */
function plainText(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const text = value.replace(/\s+/g, ' ').trim();
	return text || null;
}

/** The host of a link without its `www.`, as the card shows it (the link itself when it does not parse). */
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
	const host = hostOf(link.href);
	const siteName = plainText(preview.siteName);
	return {
		href: link.href,
		host,
		siteName: siteName && siteName.toLowerCase() !== host.toLowerCase() ? siteName : null,
		title,
		description
	};
}

/** One ask of the platform for the preview of a (normalized) link. */
export type ChatLinkPreviewAsk = (url: string, signal?: AbortSignal) => Promise<IChatLinkPreview>;

interface ChatLinkPreviewSessionOptions {
	pollMs?: number;
	maxPolls?: number;
	concurrency?: number;
	remembered?: number;
	perMinute?: number;
	paceRetries?: number;
	pacePauseMs?: number;
}

/**
 * What the page remembers about link previews while it is open, to ask the platform as little as it can: whether the
 * platform has the route at all (the first ask is the probe; the others wait for its answer, so a platform without it
 * gets one request, not one per link), the links that have no preview (never asked for again), and the pace of the
 * asks. A fetch coordinator only: it holds no state anything renders from (a card shows what its query answered).
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
}

type RouteState = 'unknown' | 'probing' | 'present' | 'missing';

/** A minute, the window the platform counts its asks in. */
const PACE_WINDOW_MS = 60_000;

/** What a cancelled ask rejects with: the signal's own reason, else an `AbortError`. */
function abortError(signal: AbortSignal): unknown {
	return signal.reason ?? new DOMException('The ask was cancelled', 'AbortError');
}

/** Stops a load whose message left the screen (its query was cancelled). */
function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw abortError(signal);
}

/** A pause of `ms`, cut short (rejected) when the signal aborts. */
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

/**
 * The session of a page: `ask` is one request to the platform's `/chat/link-preview`; the options are for tests (the
 * defaults are the platform's pace).
 */
export function createChatLinkPreviewSession(
	ask: ChatLinkPreviewAsk,
	options: ChatLinkPreviewSessionOptions = {}
): ChatLinkPreviewSession {
	const pollMs = options.pollMs ?? CHAT_LINK_PREVIEW_POLL_MS;
	const maxPolls = options.maxPolls ?? CHAT_LINK_PREVIEW_MAX_POLLS;
	const concurrency = Math.max(1, options.concurrency ?? CHAT_LINK_PREVIEW_CONCURRENCY);
	const rememberedMax = Math.max(1, options.remembered ?? CHAT_LINK_PREVIEW_REMEMBERED);
	const perMinute = Math.max(1, options.perMinute ?? CHAT_LINK_PREVIEW_PER_MINUTE);
	const paceRetries = Math.max(0, options.paceRetries ?? CHAT_LINK_PREVIEW_PACE_RETRIES);
	const pacePauseMs = Math.max(0, options.pacePauseMs ?? CHAT_LINK_PREVIEW_PACE_PAUSE_MS);
	/** `pausedUntil`: no ask leaves before then (set by a 429, for every link of the page). */
	const state: { route: RouteState; probe: Promise<void>; pausedUntil: number } = {
		route: 'unknown',
		probe: Promise.resolve(),
		pausedUntil: 0
	};
	const unavailable = new Set<string>();
	const waiting: Array<() => void> = [];
	/** When each ask of the last minute was sent, oldest first. */
	const sent: number[] = [];
	let running = 0;

	/** Remembers a link without a preview, forgetting the oldest past the limit. */
	const remember = (url: string) => {
		unavailable.add(url);
		if (unavailable.size > rememberedMax) {
			const oldest = unavailable.values().next().value;
			if (oldest !== undefined) unavailable.delete(oldest);
		}
	};

	/** Waits out a pause after a 429, then until an ask fits in the minute's allowance, then counts it. */
	const paced = async (signal?: AbortSignal): Promise<void> => {
		for (;;) {
			const now = Date.now();
			if (now < state.pausedUntil) {
				await wait(state.pausedUntil - now, signal);
				continue;
			}
			while (sent.length && now - sent[0] >= PACE_WINDOW_MS) sent.shift();
			if (sent.length < perMinute) {
				sent.push(now);
				return;
			}
			await wait(PACE_WINDOW_MS - (now - sent[0]), signal);
		}
	};

	/** One ask, in turn and at the pace: a few at once at most (one that ends hands its place to the next waiting). */
	const askInTurn = async (url: string, signal?: AbortSignal): Promise<IChatLinkPreview> => {
		if (running < concurrency) running += 1;
		else await new Promise<void>((resolve) => waiting.push(resolve));
		try {
			throwIfAborted(signal);
			await paced(signal);
			return await ask(url, signal);
		} finally {
			const next = waiting.shift();
			if (next) next();
			else running -= 1;
		}
	};

	/**
	 * One ask, made again when the platform refuses it for its pace (429), a couple of times at most. A refusal pauses
	 * every ask of the page, not only this one: the others would be refused too. `answered` hears that the route
	 * answered, even with a refusal.
	 */
	const askPaced = async (
		url: string,
		signal: AbortSignal | undefined,
		answered: () => void
	): Promise<IChatLinkPreview> => {
		for (let attempt = 0; ; attempt += 1) {
			try {
				return await askInTurn(url, signal);
			} catch (error) {
				if (errorStatusOf(error) !== 429) throw error;
				const pause = Math.min(CHAT_LINK_PREVIEW_PACE_PAUSE_MAX_MS, pacePauseMs * 2 ** attempt);
				state.pausedUntil = Math.max(state.pausedUntil, Date.now() + pause);
				if (attempt >= paceRetries) throw error;
				answered();
			}
		}
	};

	/** See {@link ChatLinkPreviewSession.load}: waits for the probe, probes when nobody has, then asks and polls. */
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
		// The route answered: the other links are asked for now, while this one waits for its page.
		const answered = () => {
			if (!probing || state.route !== 'probing') return;
			state.route = 'present';
			settleProbe();
		};
		try {
			let preview = await askPaced(url, signal, answered);
			answered();
			for (let polls = 0; preview?.status === EChatLinkPreviewStatus.Pending && polls < maxPolls; polls += 1) {
				await wait(pollMs, signal);
				preview = await askPaced(url, signal, answered);
			}
			if (preview?.status === EChatLinkPreviewStatus.Unavailable) remember(url);
			return preview ?? null;
		} catch (error) {
			const status = errorStatusOf(error);
			if (status === 404) {
				state.route = 'missing';
				return null;
			}
			// A refusal of the link (400) or of the pace (429) is the route answering; an outage, a cancel or a
			// sign-out tells nothing, and the next link probes again.
			if (status === 400 || status === 429) answered();
			else if (probing && state.route === 'probing') state.route = 'unknown';
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
		isUnavailable: (url) => unavailable.has(url)
	};
}
