import { DICTATION_ERROR_CODES, type TDictationErrorCode } from '@/core/types/schemas/ai/dictation.schema';

const DICTATION_API = '/api/ai/transcribe';

export type TDictationFailure = TDictationErrorCode | 'unauthorized' | 'service_unavailable' | 'network' | 'aborted';

export type TDictationResult = { ok: true; text: string } | { ok: false; reason: TDictationFailure };

function isKnownErrorCode(value: unknown): value is TDictationErrorCode {
	return DICTATION_ERROR_CODES.some((code) => code === value);
}

function isAbort(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError';
}

async function readBody(response: Response): Promise<Record<string, unknown> | null> {
	try {
		const body: unknown = await response.json();
		if (body && typeof body === 'object') {
			return body as Record<string, unknown>;
		}
		return null;
	} catch {
		return null;
	}
}

function failureOf(status: number, body: Record<string, unknown> | null): TDictationFailure {
	const code = body?.error;
	if (isKnownErrorCode(code)) {
		return code;
	}
	if (status === 401) {
		return 'unauthorized';
	}
	return 'service_unavailable';
}

function fileNameOf(mediaType: string) {
	const subtype = mediaType.split('/')[1] ?? 'webm';
	const extension = subtype.split(';')[0];
	return `dictation.${extension}`;
}

/** Sends one recording to the app's own route, which turns it into text through the deployment's providers. */
export async function requestDictation(audio: Blob, signal?: AbortSignal): Promise<TDictationResult> {
	const form = new FormData();
	form.append('audio', audio, fileNameOf(audio.type));
	let response: Response;
	try {
		response = await fetch(DICTATION_API, { method: 'POST', body: form, signal });
	} catch (error) {
		if (isAbort(error)) {
			return { ok: false, reason: 'aborted' };
		}
		return { ok: false, reason: 'network' };
	}
	const body = await readBody(response);
	if (!response.ok) {
		return { ok: false, reason: failureOf(response.status, body) };
	}
	const text = body?.text;
	if (typeof text !== 'string') {
		return { ok: false, reason: 'service_unavailable' };
	}
	return { ok: true, text };
}

/** Whether the deployment can transcribe; any failure reads as "no", so no microphone shows that cannot work. */
export async function fetchDictationAvailability(): Promise<boolean> {
	try {
		const response = await fetch(DICTATION_API, { method: 'GET' });
		const body = await readBody(response);
		const isAvailable = body?.available === true;
		return response.ok && isAvailable;
	} catch {
		return false;
	}
}
