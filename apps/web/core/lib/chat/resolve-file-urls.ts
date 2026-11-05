import { pipeline, Readable, Transform } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { constants, createBrotliDecompress, createGunzip, createInflate, createZstdDecompress } from 'node:zlib';
import type { Experimental_DownloadFunction, ModelMessage } from 'ai';
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
 * image URLs as they are, so the SDK does not download them. Anything else the SDK would still download goes
 * through `createGuardedDownload`.
 */

/** Above the file sizes OpenAI-compatible providers take in a request. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** The redirects the global fetch follows, and how many of them. */
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 20;

/** Sent like the global fetch sends them, for hosts that turn away a request without them. */
const DOWNLOAD_HEADERS = { accept: '*/*', 'user-agent': 'node' };

/** The content codings the global fetch decodes, set up the way it does, and how many it takes at most. */
const ZLIB_FLUSH = { flush: constants.Z_SYNC_FLUSH, finishFlush: constants.Z_SYNC_FLUSH };
const DECODERS = new Map<string, () => Transform>([
	['gzip', () => createGunzip(ZLIB_FLUSH)],
	['x-gzip', () => createGunzip(ZLIB_FLUSH)],
	['deflate', () => createInflate(ZLIB_FLUSH)],
	[
		'br',
		() =>
			createBrotliDecompress({
				flush: constants.BROTLI_OPERATION_FLUSH,
				finishFlush: constants.BROTLI_OPERATION_FLUSH
			})
	],
	['zstd', () => createZstdDecompress({ flush: constants.ZSTD_e_continue, finishFlush: constants.ZSTD_e_end })]
]);
const MAX_CODINGS = 5;

const NOT_PUBLIC = 'File URLs in chat messages must be valid http or https URLs of public addresses.';
const TOO_LARGE = `Files in chat messages must be ${MAX_FILE_BYTES / 1024 / 1024} MB or smaller.`;
const FAILED = 'A file in the chat messages could not be downloaded.';

export type FileUrlsResolution =
	| { ok: true; messages: ModelMessage[] }
	| { ok: false; status: 400 | 502; error: string };

class FileDownloadError extends Error {
	constructor(
		readonly status: 400 | 502,
		message: string
	) {
		super(message);
	}
}

function isHttpProtocol(protocol: string) {
	const isHttp = protocol === 'http:';
	const isHttps = protocol === 'https:';
	return isHttp || isHttps;
}

/** The URL a file part's data points to (a bare URL, an http(s) string or the tagged `{ type: 'url' }` shape). */
function httpUrlOf(data: unknown): string | null {
	if (data instanceof URL) {
		return httpHrefOf(data);
	}
	if (typeof data === 'string') {
		return httpStringOf(data);
	}
	if (typeof data !== 'object' || data === null) {
		return null;
	}
	const tagged = data as { type?: unknown; url?: unknown };
	if (tagged.type !== 'url') {
		return null;
	}
	return httpUrlOf(tagged.url);
}

function httpHrefOf(url: URL) {
	if (!isHttpProtocol(url.protocol)) {
		return null;
	}
	return url.href;
}

function httpStringOf(value: string) {
	const isHttp = value.startsWith('http:');
	const isHttps = value.startsWith('https:');
	if (isHttp || isHttps) {
		return value;
	}
	return null;
}

/** Passes the bytes through and fails once more than `MAX_FILE_BYTES` went by. */
function sizeLimit(): Transform {
	let size = 0;
	return new Transform({
		transform(chunk: Uint8Array, _encoding, callback) {
			size += chunk.byteLength;
			callback(size > MAX_FILE_BYTES ? new FileDownloadError(400, TOO_LARGE) : null, chunk);
		}
	});
}

/**
 * The guarded fetch asks for an uncompressed answer but does not decode one, and a host can send one all the
 * same (a file stored compressed): decoded here like the global fetch does, so the size limit applies to the
 * decoded bytes. A coding it does not know leaves the body as it came, as the global fetch does.
 */
async function decodedBody(response: Response): Promise<ReadableStream<Uint8Array> | null> {
	const contentEncoding = response.headers.get('content-encoding');
	if (!response.body || !contentEncoding) return response.body;
	const codings = contentEncoding
		.toLowerCase()
		.split(',')
		.map((coding) => coding.trim())
		.reverse();
	if (codings.length > MAX_CODINGS) {
		await response.body.cancel();
		throw new FileDownloadError(502, FAILED);
	}
	const decoders = codings.map((coding) => DECODERS.get(coding));
	if (!decoders.every((decoder) => decoder !== undefined)) return response.body;
	// Every stage is held to the size limit, not only the last: layered codings can blow up in between (a
	// small br body holding endless empty gzip members). An error in any stage destroys them all and reaches
	// the reader through the last one.
	const decoded = pipeline(
		[
			Readable.fromWeb(response.body as unknown as NodeReadableStream<Uint8Array>),
			...decoders.flatMap((decoder) => [decoder(), sizeLimit()])
		],
		() => undefined
	) as unknown as Readable;
	return Readable.toWeb(decoded) as unknown as ReadableStream<Uint8Array>;
}

async function readBody(response: Response): Promise<Uint8Array> {
	if (Number(response.headers.get('content-length')) > MAX_FILE_BYTES) {
		await response.body?.cancel();
		throw new FileDownloadError(400, TOO_LARGE);
	}
	const body = await decodedBody(response);
	if (!body) return new Uint8Array();
	const reader = body.getReader();
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

interface DownloadedFile {
	data: Uint8Array;
	mediaType: string | undefined;
}

function mediaTypeOf(response: Response) {
	const contentType = response.headers.get('content-type');
	if (!contentType) {
		return undefined;
	}
	const [mediaType] = contentType.split(';');
	return mediaType.trim() || undefined;
}

async function download(href: string, signal: AbortSignal | undefined): Promise<DownloadedFile> {
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
			if (response.ok) return { data: await readBody(response), mediaType: mediaTypeOf(response) };
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

function isImageFile(part: { mediaType?: string }) {
	return Boolean(part.mediaType?.startsWith('image/'));
}

/** The http(s) URLs of the non-image files of the user messages, the ones the SDK downloads. */
function fileUrls(prompt: ModelMessage[]): Set<string> {
	const urls = new Set<string>();
	for (const message of prompt) {
		if (message.role !== 'user' || !Array.isArray(message.content)) continue;
		for (const part of message.content) {
			if (part.type !== 'file' || isImageFile(part)) continue;
			const url = httpUrlOf(part.data);
			if (url) urls.add(url);
		}
	}
	return urls;
}

/** The prompt with the downloaded bytes in place of the file URLs. */
function withFileBytes(prompt: ModelMessage[], files: Map<string, DownloadedFile>): ModelMessage[] {
	return prompt.map((message) => {
		if (message.role !== 'user' || !Array.isArray(message.content)) return message;
		const content = message.content.map((part) => {
			if (part.type !== 'file') return part;
			const url = httpUrlOf(part.data);
			if (!url) return part;
			const file = files.get(url);
			if (!file) return part;
			return { ...part, data: file.data };
		});
		return { ...message, content };
	});
}

/**
 * The model the OpenAI provider builds for `gpt-3.5-turbo-instruct` is a completion model: it takes no image URL,
 * so the SDK would download every image URL of the prompt, and only then refuse images.
 */
const COMPLETION_MODEL_IDS: ReadonlySet<string> = new Set(['gpt-3.5-turbo-instruct']);

const NO_IMAGES = 'This model does not take images.';

function isImageUrlPart(part: { type: string; image?: unknown; data?: unknown; mediaType?: string }) {
	if (part.type === 'image') {
		const imageUrl = httpUrlOf(part.image);
		return imageUrl !== null;
	}
	const isFile = part.type === 'file';
	if (!isFile || !isImageFile(part)) {
		return false;
	}
	const fileUrl = httpUrlOf(part.data);
	return fileUrl !== null;
}

function userMessageHoldsImageUrl(message: ModelMessage) {
	const isUserMessage = message.role === 'user';
	if (!isUserMessage || !Array.isArray(message.content)) {
		return false;
	}
	return message.content.some(isImageUrlPart);
}

/** Whether the user messages carry an image given as an http(s) URL. */
function holdsImageUrl(prompt: ModelMessage[]): boolean {
	return prompt.some(userMessageHoldsImageUrl);
}

/** The 400 answer for image URLs sent to a model that takes no image (see {@link COMPLETION_MODEL_IDS}). */
export function refuseImageUrls(prompt: ModelMessage[], modelId: string): FileUrlsResolution | null {
	const isCompletionModel = COMPLETION_MODEL_IDS.has(modelId);
	if (!isCompletionModel) return null;
	if (!holdsImageUrl(prompt)) return null;
	return { ok: false, status: 400, error: NO_IMAGES };
}

/**
 * Downloads, through the guard, the files the SDK would download for this prompt, and returns the prompt with the
 * bytes in place of the URLs, or the 400/502 answer when a file cannot be had.
 */
export async function resolveFileUrls(prompt: ModelMessage[], signal?: AbortSignal): Promise<FileUrlsResolution> {
	const urls = fileUrls(prompt);
	if (urls.size === 0) return { ok: true, messages: prompt };

	// A file that cannot be had ends the other downloads too, instead of leaving them to finish for nothing.
	const failed = new AbortController();
	const downloadSignal = signal ? AbortSignal.any([signal, failed.signal]) : failed.signal;
	let files: Map<string, DownloadedFile>;
	try {
		files = new Map(
			await Promise.all([...urls].map(async (url) => [url, await download(url, downloadSignal)] as const))
		);
	} catch (error) {
		failed.abort();
		if (error instanceof FileDownloadError) return { ok: false, status: error.status, error: error.message };
		if ((error as { code?: unknown } | null)?.code === 'ERR_ADDRESS_NOT_PUBLIC') {
			return { ok: false, status: 400, error: NOT_PUBLIC };
		}
		return { ok: false, status: 502, error: FAILED };
	}

	return { ok: true, messages: withFileBytes(prompt, files) };
}

/**
 * The SDK's own downloads, through the same guard: a URL the model fetches itself is left to it, any other one is
 * downloaded here, public addresses only and within the size limit.
 */
export function createGuardedDownload(signal?: AbortSignal): Experimental_DownloadFunction {
	return (requests) =>
		Promise.all(
			requests.map(async ({ url, isUrlSupportedByModel }) => {
				if (isUrlSupportedByModel) return null;
				return download(url.href, signal);
			})
		);
}
