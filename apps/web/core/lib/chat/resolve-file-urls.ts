import { convertToCoreMessages, coreMessageSchema, type CoreMessage, type Message } from 'ai';
import { createGuardedFetch } from './guarded-fetch';

/**
 * A file part of a user message can carry an http(s) URL instead of the file, and the AI SDK then
 * downloads that URL on this server (global fetch, redirects followed, no size limit) to send the bytes to
 * the provider. The caller picks that URL, so the chat route downloads those files first, the way
 * `createGuardedFetch` reaches a custom provider: public addresses only, checked at connect time, each
 * redirect followed by hand through a new guard, and at most `MAX_FILE_BYTES`. The SDK then gets the bytes
 * and downloads nothing (SSRF).
 *
 * Messages without such a file come back unchanged. Image parts are left as they are: the chat models take
 * image URLs as they are, so the SDK does not download them.
 */

/** Above the file sizes OpenAI-compatible providers take in a request. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** The redirects the global fetch follows, and how many of them. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;

/** Sent like the global fetch sends them, for hosts that turn away a request without them. */
const DOWNLOAD_HEADERS = { accept: '*/*', 'user-agent': 'node' };

const NOT_PUBLIC = 'File URLs in chat messages must be valid http or https URLs of public addresses.';
const TOO_LARGE = `Files in chat messages must be ${MAX_FILE_BYTES / 1024 / 1024} MB or smaller.`;
const FAILED = 'A file in the chat messages could not be downloaded.';

export type FileUrlsResolution<T> =
	| { ok: true; messages: T | CoreMessage[] }
	| { ok: false; status: 400 | 502; error: string };

class FileDownloadError extends Error {
	constructor(
		readonly status: 400 | 502,
		message: string
	) {
		super(message);
	}
}

/** The SDK's test for file data it downloads (a URL object only comes from an http(s) attachment). */
function isHttpUrl(data: unknown): data is string | URL {
	if (typeof data === 'string') return data.startsWith('http:') || data.startsWith('https:');
	return data instanceof URL && (data.protocol === 'http:' || data.protocol === 'https:');
}

/** A quick test that lets messages without any file or attachment through untouched. */
function mayHoldFileUrl(message: unknown): boolean {
	if (typeof message !== 'object' || message === null) return false;
	const { content, experimental_attachments: attachments } = message as {
		content?: unknown;
		experimental_attachments?: unknown;
	};
	return (
		(Array.isArray(content) && content.some((part) => part?.type === 'file')) ||
		(Array.isArray(attachments) && attachments.length > 0)
	);
}

/** The SDK's test for UI messages (`useChat`), which it converts to core messages. */
function isUiMessage(message: unknown): boolean {
	if (typeof message !== 'object' || message === null) return false;
	const { role } = message as { role?: unknown };
	return (
		role === 'function' ||
		role === 'data' ||
		'toolInvocations' in message ||
		'parts' in message ||
		'experimental_attachments' in message
	);
}

async function readBody(response: Response): Promise<Uint8Array> {
	if (Number(response.headers.get('content-length')) > MAX_FILE_BYTES) {
		await response.body?.cancel();
		throw new FileDownloadError(400, TOO_LARGE);
	}
	if (!response.body) return new Uint8Array();
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return Buffer.concat(chunks, size);
		size += value.byteLength;
		if (size > MAX_FILE_BYTES) {
			await reader.cancel();
			throw new FileDownloadError(400, TOO_LARGE);
		}
		chunks.push(value);
	}
}

async function download(href: string, signal: AbortSignal | undefined): Promise<Uint8Array> {
	let url: URL;
	try {
		url = new URL(href);
	} catch {
		throw new FileDownloadError(400, NOT_PUBLIC);
	}
	for (let redirects = 0; ; redirects++) {
		const guardedFetch = createGuardedFetch({
			baseURL: url.href,
			allowLoopback: process.env.NODE_ENV === 'development'
		});
		const response = await guardedFetch(url, { headers: DOWNLOAD_HEADERS, signal });
		const location = response.headers.get('location');
		if (!REDIRECT_STATUSES.has(response.status) || location === null) {
			if (response.ok) return readBody(response);
			await response.body?.cancel();
			throw new FileDownloadError(502, FAILED);
		}
		await response.body?.cancel();
		url = new URL(location, url);
		if (redirects === MAX_REDIRECTS || (url.protocol !== 'http:' && url.protocol !== 'https:')) {
			throw new FileDownloadError(502, FAILED);
		}
	}
}

/**
 * Downloads, through the guard, the files the SDK would download for these messages, and returns the
 * messages with the bytes in place of the URLs, or the 400/502 answer when a file cannot be had.
 */
export async function resolveFileUrls<T>(messages: T, signal?: AbortSignal): Promise<FileUrlsResolution<T>> {
	if (!Array.isArray(messages) || !messages.some(mayHoldFileUrl)) return { ok: true, messages };

	// The prompt streamText builds (the route passes no tools). One it refuses is left to it: it refuses
	// before downloading anything.
	let prompt: CoreMessage[];
	try {
		prompt = messages.some(isUiMessage)
			? convertToCoreMessages(messages as Array<Omit<Message, 'id'>>)
			: (messages as CoreMessage[]);
	} catch {
		return { ok: true, messages };
	}
	if (!coreMessageSchema.array().safeParse(prompt).success) return { ok: true, messages };

	const urls = new Set<string>();
	for (const message of prompt) {
		if (message.role !== 'user' || !Array.isArray(message.content)) continue;
		for (const part of message.content) {
			if (part.type === 'file' && isHttpUrl(part.data)) urls.add(String(part.data));
		}
	}
	if (urls.size === 0) return { ok: true, messages };

	let files: Map<string, Uint8Array>;
	try {
		files = new Map(await Promise.all([...urls].map(async (url) => [url, await download(url, signal)] as const)));
	} catch (error) {
		if (error instanceof FileDownloadError) return { ok: false, status: error.status, error: error.message };
		if ((error as { code?: unknown } | null)?.code === 'ERR_ADDRESS_NOT_PUBLIC') {
			return { ok: false, status: 400, error: NOT_PUBLIC };
		}
		return { ok: false, status: 502, error: FAILED };
	}

	return {
		ok: true,
		messages: prompt.map((message) =>
			message.role === 'user' && Array.isArray(message.content)
				? {
						...message,
						content: message.content.map((part) =>
							part.type === 'file' && isHttpUrl(part.data)
								? { ...part, data: files.get(String(part.data)) ?? part.data }
								: part
						)
					}
				: message
		)
	};
}
