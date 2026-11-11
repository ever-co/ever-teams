import {
	createChatLinkPreviewSession,
	linkPreviewCardOf,
	normalizePreviewUrl,
	previewLinksOf,
	withoutCode,
	type ChatLinkPreviewAsk
} from './chat-link-preview';
import { EChatLinkPreviewStatus, type IChatLinkPreview } from '@/core/types/interfaces/common/chat';

const urlsOf = (body: string, options?: Parameters<typeof previewLinksOf>[1]) => previewLinksOf(body, options).map((link) => link.url);

function answer(url: string, status: EChatLinkPreviewStatus, extra: Partial<IChatLinkPreview> = {}): IChatLinkPreview {
	return { url, status, ...extra };
}

function httpError(status: number): Error {
	return Object.assign(new Error(`HTTP ${status}`), { response: { status } });
}

/** A promise and the functions that settle it, for an ask the test answers when it wants. */
interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
}

function deferred<T>(): Deferred<T> {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((done, fail) => {
		resolve = done;
		reject = fail;
	});
	return { promise, resolve, reject };
}

describe('normalizePreviewUrl', () => {
	it('keeps an http(s) link in its normal form, without its fragment', () => {
		expect(normalizePreviewUrl(' https://Example.COM:443/a?b=1#part ')).toBe('https://example.com/a?b=1');
		expect(normalizePreviewUrl('http://example.com')).toBe('http://example.com/');
	});

	it('refuses what the platform refuses: another scheme, credentials, a link too long', () => {
		expect(normalizePreviewUrl('ftp://example.com/file')).toBeNull();
		expect(normalizePreviewUrl('javascript:alert(1)')).toBeNull();
		expect(normalizePreviewUrl('https://user:secret@example.com/')).toBeNull();
		expect(normalizePreviewUrl(`https://example.com/${'a'.repeat(2048)}`)).toBeNull();
		expect(normalizePreviewUrl('not a link')).toBeNull();
		expect(normalizePreviewUrl('')).toBeNull();
	});
});

describe('withoutCode', () => {
	it('blanks fenced blocks and code spans, and keeps the rest', () => {
		expect(withoutCode('a `https://x.io` b')).toBe('a   b');
		expect(withoutCode('see\n```\nhttps://x.io\n```\nafter')).toBe('see\n\n\n\nafter');
		expect(withoutCode('~~~js\nhttps://x.io\n~~~\nhttps://y.io')).toBe('\n\n\nhttps://y.io');
	});

	it('runs an unclosed fence to the end, and leaves a lone backtick as text', () => {
		expect(withoutCode('```\nhttps://x.io')).toBe('\n');
		expect(withoutCode('a ` https://x.io')).toBe('a ` https://x.io');
		// A run of another length does not close a span.
		expect(withoutCode('``a ` https://x.io``')).toBe(' ');
	});
});

describe('previewLinksOf', () => {
	it('finds bare links, Markdown links and autolinks, in the order written', () => {
		expect(urlsOf('Look https://a.io/x and [the doc](https://b.io/doc "Doc") or <https://c.io>')).toEqual([
			'https://a.io/x',
			'https://b.io/doc',
			'https://c.io/'
		]);
	});

	it('leaves out the punctuation and the brackets around a link, but keeps the parentheses it opens', () => {
		expect(urlsOf('Done (see https://a.io/page).')).toEqual(['https://a.io/page']);
		expect(urlsOf('https://en.wikipedia.org/wiki/Ada_(language), nice')).toEqual(['https://en.wikipedia.org/wiki/Ada_(language)']);
		expect(urlsOf('**https://a.io/bold** and _https://b.io/em_')).toEqual(['https://a.io/bold', 'https://b.io/em']);
		expect(urlsOf('Is it https://a.io/q?')).toEqual(['https://a.io/q']);
		expect(urlsOf('[https://a.io](https://a.io)')).toEqual(['https://a.io/']);
	});

	it('links www. addresses as http, the way the renderer does', () => {
		expect(previewLinksOf('at www.example.com/a.')).toEqual([{ href: 'http://www.example.com/a', url: 'http://www.example.com/a' }]);
	});

	it('asks once per link: the same page with another fragment is the same preview, the first fragment is opened', () => {
		expect(previewLinksOf('https://a.io/p#one https://a.io/p#two https://A.io/p')).toEqual([{ href: 'https://a.io/p#one', url: 'https://a.io/p' }]);
	});

	it('takes three links at most', () => {
		expect(urlsOf('https://a.io https://b.io https://c.io https://d.io')).toEqual(['https://a.io/', 'https://b.io/', 'https://c.io/']);
		expect(urlsOf('https://a.io https://b.io', { max: 1 })).toEqual(['https://a.io/']);
	});

	it('leaves out links inside code, other schemes, links with credentials, and those of this app', () => {
		expect(urlsOf('`https://a.io` and\n```\nhttps://b.io\n```')).toEqual([]);
		expect(urlsOf('mailto:x@y.io ftp://a.io https://u:p@b.io')).toEqual([]);
		expect(urlsOf('https://app.example.com/chat/c1?message=m1 https://b.io', { ownOrigin: 'https://app.example.com' })).toEqual(['https://b.io/']);
	});

	it('does not read a link glued to a word or to a mention token', () => {
		expect(urlsOf('xhttps://a.io <@employee-1> <!channel>')).toEqual([]);
		expect(urlsOf('')).toEqual([]);
	});
});

describe('linkPreviewCardOf', () => {
	const link = { href: 'https://www.a.io/p#x', url: 'https://www.a.io/p' };

	it('shows a ready preview with a title or a description, its text on one line', () => {
		const card = linkPreviewCardOf(
			link,
			answer(link.url, EChatLinkPreviewStatus.Ready, {
				title: '  The\n page ',
				description: 'What it is about',
				siteName: 'A',
				image: 'https://cdn.a.io/p.png',
				imageAlt: 'A picture',
				imageWidth: 1200,
				imageHeight: 600,
				icon: 'https://a.io/icon.png'
			})
		);
		expect(card).toEqual({
			href: 'https://www.a.io/p#x',
			site: 'A',
			title: 'The page',
			description: 'What it is about',
			image: { src: 'https://cdn.a.io/p.png', alt: 'A picture', ratio: 2 },
			icon: 'https://a.io/icon.png'
		});
	});

	it('names the host when the page names no site, and keeps a picture within the card proportions', () => {
		const card = linkPreviewCardOf(link, answer(link.url, EChatLinkPreviewStatus.Ready, { title: 'T', image: 'https://a.io/tall.png', imageWidth: 100, imageHeight: 900 }));
		expect(card?.site).toBe('a.io');
		expect(card?.image).toEqual({ src: 'https://a.io/tall.png', alt: '', ratio: 1 });
		// No stated size: the usual share picture's proportions.
		const unsized = linkPreviewCardOf(link, answer(link.url, EChatLinkPreviewStatus.Ready, { title: 'T', image: 'https://a.io/p.png' }));
		expect(unsized?.image?.ratio).toBeCloseTo(1200 / 630);
	});

	it('drops a picture that is not an https address', () => {
		const card = linkPreviewCardOf(
			link,
			answer(link.url, EChatLinkPreviewStatus.Ready, { title: 'T', image: 'http://a.io/p.png', icon: 'data:image/png;base64,AAAA' })
		);
		expect(card?.image).toBeNull();
		expect(card?.icon).toBeNull();
	});

	it('shows nothing while pending, when unavailable, or when the page says nothing', () => {
		expect(linkPreviewCardOf(link, answer(link.url, EChatLinkPreviewStatus.Pending))).toBeNull();
		expect(linkPreviewCardOf(link, answer(link.url, EChatLinkPreviewStatus.Unavailable, { title: 'T' }))).toBeNull();
		expect(linkPreviewCardOf(link, answer(link.url, EChatLinkPreviewStatus.Ready, { title: '  ', image: 'https://a.io/p.png' }))).toBeNull();
		expect(linkPreviewCardOf(link, null)).toBeNull();
	});
});

describe('createChatLinkPreviewSession', () => {
	afterEach(() => jest.useRealTimers());

	it('asks again every two seconds while pending, three times at most', async () => {
		jest.useFakeTimers();
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>()
			.mockResolvedValueOnce(answer('https://a.io/', EChatLinkPreviewStatus.Pending))
			.mockResolvedValueOnce(answer('https://a.io/', EChatLinkPreviewStatus.Pending))
			.mockResolvedValueOnce(answer('https://a.io/', EChatLinkPreviewStatus.Ready, { title: 'A' }));
		const session = createChatLinkPreviewSession(ask);
		const loading = session.load('https://a.io/');
		await jest.advanceTimersByTimeAsync(1999);
		expect(ask).toHaveBeenCalledTimes(1);
		await jest.advanceTimersByTimeAsync(1);
		expect(ask).toHaveBeenCalledTimes(2);
		await jest.advanceTimersByTimeAsync(2000);
		await expect(loading).resolves.toMatchObject({ status: EChatLinkPreviewStatus.Ready, title: 'A' });
		expect(ask).toHaveBeenCalledTimes(3);
	});

	it('gives up after three more asks, and leaves the last answer pending', async () => {
		jest.useFakeTimers();
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>().mockResolvedValue(answer('https://a.io/', EChatLinkPreviewStatus.Pending));
		const session = createChatLinkPreviewSession(ask);
		const loading = session.load('https://a.io/');
		await jest.advanceTimersByTimeAsync(20_000);
		await expect(loading).resolves.toMatchObject({ status: EChatLinkPreviewStatus.Pending });
		expect(ask).toHaveBeenCalledTimes(4);
		expect(session.isUnavailable('https://a.io/')).toBe(false);
	});

	it('remembers a link without a preview and never asks for it again', async () => {
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>().mockResolvedValue(answer('https://a.io/', EChatLinkPreviewStatus.Unavailable));
		const session = createChatLinkPreviewSession(ask);
		await expect(session.load('https://a.io/')).resolves.toMatchObject({ status: EChatLinkPreviewStatus.Unavailable });
		expect(session.isUnavailable('https://a.io/')).toBe(true);
		await expect(session.load('https://a.io/')).resolves.toBeNull();
		expect(ask).toHaveBeenCalledTimes(1);
	});

	it('remembers a link the platform refuses (400) as one without a preview', async () => {
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>().mockRejectedValue(httpError(400));
		const session = createChatLinkPreviewSession(ask);
		await expect(session.load('https://a.io/')).resolves.toBeNull();
		await expect(session.load('https://a.io/')).resolves.toBeNull();
		expect(ask).toHaveBeenCalledTimes(1);
		expect(session.routeMissing()).toBe(false);
	});

	it('forgets the oldest unavailable link past its limit', async () => {
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>((url) => Promise.resolve(answer(url, EChatLinkPreviewStatus.Unavailable)));
		const session = createChatLinkPreviewSession(ask, { remembered: 2 });
		for (const url of ['https://a.io/', 'https://b.io/', 'https://c.io/']) await session.load(url);
		expect(['https://a.io/', 'https://b.io/', 'https://c.io/'].map(session.isUnavailable)).toEqual([false, true, true]);
	});

	it('probes the route with one ask: on 404 the others are never sent, and the page hears it once', async () => {
		const probe = deferred<IChatLinkPreview>();
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>(() => probe.promise);
		const session = createChatLinkPreviewSession(ask);
		const heard = jest.fn();
		session.subscribe(heard);
		const loads = [session.load('https://a.io/'), session.load('https://b.io/'), session.load('https://c.io/')];
		await Promise.resolve();
		expect(ask).toHaveBeenCalledTimes(1);
		probe.reject(httpError(404));
		await expect(Promise.all(loads)).resolves.toEqual([null, null, null]);
		expect(ask).toHaveBeenCalledTimes(1);
		expect(session.routeMissing()).toBe(true);
		expect(heard).toHaveBeenCalledTimes(1);
		await expect(session.load('https://d.io/')).resolves.toBeNull();
		expect(ask).toHaveBeenCalledTimes(1);
	});

	it('asks for the other links once the probe answers, without waiting for its pending page', async () => {
		jest.useFakeTimers();
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>((url) =>
			Promise.resolve(answer(url, url === 'https://a.io/' ? EChatLinkPreviewStatus.Pending : EChatLinkPreviewStatus.Ready, { title: url }))
		);
		const session = createChatLinkPreviewSession(ask, { maxPolls: 1 });
		const first = session.load('https://a.io/');
		const second = session.load('https://b.io/');
		await expect(second).resolves.toMatchObject({ status: EChatLinkPreviewStatus.Ready });
		expect(ask.mock.calls.map(([url]) => url)).toEqual(['https://a.io/', 'https://b.io/']);
		await jest.advanceTimersByTimeAsync(2000);
		await expect(first).resolves.toMatchObject({ status: EChatLinkPreviewStatus.Pending });
	});

	it('probes again after an outage instead of taking it for a missing route', async () => {
		const ask = jest
			.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>()
			.mockRejectedValueOnce(httpError(502))
			.mockResolvedValue(answer('https://b.io/', EChatLinkPreviewStatus.Ready, { title: 'B' }));
		const session = createChatLinkPreviewSession(ask);
		const failed = session.load('https://a.io/');
		const waiting = session.load('https://b.io/');
		await expect(failed).rejects.toThrow('HTTP 502');
		await expect(waiting).resolves.toMatchObject({ title: 'B' });
		expect(session.routeMissing()).toBe(false);
		expect(ask).toHaveBeenCalledTimes(2);
	});

	it('runs a few asks at once at most', async () => {
		const pending: Array<Deferred<IChatLinkPreview>> = [];
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>(() => {
			const next = deferred<IChatLinkPreview>();
			pending.push(next);
			return next.promise;
		});
		const session = createChatLinkPreviewSession(ask, { concurrency: 2 });
		// The probe first.
		const probe = session.load('https://a.io/');
		await Promise.resolve();
		pending[0].resolve(answer('https://a.io/', EChatLinkPreviewStatus.Ready, { title: 'A' }));
		await probe;
		const loads = ['https://b.io/', 'https://c.io/', 'https://d.io/'].map((url) => session.load(url));
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(ask).toHaveBeenCalledTimes(3);
		pending[1].resolve(answer('https://b.io/', EChatLinkPreviewStatus.Ready, { title: 'B' }));
		await loads[0];
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(ask).toHaveBeenCalledTimes(4);
		pending[2].resolve(answer('https://c.io/', EChatLinkPreviewStatus.Ready, { title: 'C' }));
		pending[3].resolve(answer('https://d.io/', EChatLinkPreviewStatus.Ready, { title: 'D' }));
		await expect(Promise.all(loads)).resolves.toHaveLength(3);
	});

	it('stops asking for a link whose message left the screen', async () => {
		jest.useFakeTimers();
		const ask = jest.fn<ReturnType<ChatLinkPreviewAsk>, Parameters<ChatLinkPreviewAsk>>().mockResolvedValue(answer('https://a.io/', EChatLinkPreviewStatus.Pending));
		const session = createChatLinkPreviewSession(ask);
		const controller = new AbortController();
		const loading = session.load('https://a.io/', controller.signal);
		const settled = loading.catch((error: unknown) => error);
		await jest.advanceTimersByTimeAsync(500);
		controller.abort();
		await expect(settled).resolves.toBeDefined();
		await jest.advanceTimersByTimeAsync(10_000);
		expect(ask).toHaveBeenCalledTimes(1);
	});
});
