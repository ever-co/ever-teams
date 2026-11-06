import {
	VOICE_FILL_ERROR_CODES,
	type TVoiceFillErrorCode,
	type TVoiceFillFields,
	type TVoiceFillRequest
} from '@/core/types/schemas/ai/voice-fill.schema';

const VOICE_FILL_API = '/api/ai/voice-fill';

export type TVoiceFillFailure = TVoiceFillErrorCode | 'unauthorized' | 'service_unavailable' | 'network' | 'aborted';

export type TVoiceFillResult = { ok: true; fields: TVoiceFillFields } | { ok: false; reason: TVoiceFillFailure };

function isKnownErrorCode(value: unknown): value is TVoiceFillErrorCode {
	const codes: ReadonlyArray<unknown> = VOICE_FILL_ERROR_CODES;
	return codes.includes(value);
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

function failureOf(status: number, body: Record<string, unknown> | null): TVoiceFillFailure {
	const code = body?.error;
	if (isKnownErrorCode(code)) {
		return code;
	}
	if (status === 401) {
		return 'unauthorized';
	}
	if (status === 429) {
		return 'rate_limited';
	}
	return 'service_unavailable';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	return !Array.isArray(value);
}

function fieldsOf(body: Record<string, unknown> | null): TVoiceFillFields | null {
	const fields = body?.fields;
	if (!isPlainObject(fields)) {
		return null;
	}
	return fields as TVoiceFillFields;
}

/** Sends a dictated transcript to the app's own route, which turns it into the fields of the form. */
export async function requestVoiceFill(request: TVoiceFillRequest, signal?: AbortSignal): Promise<TVoiceFillResult> {
	let response: Response;
	try {
		response = await fetch(VOICE_FILL_API, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(request),
			signal
		});
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
	const fields = fieldsOf(body);
	if (!fields) {
		return { ok: false, reason: 'service_unavailable' };
	}
	return { ok: true, fields };
}

/** Whether the deployment can fill a form by voice; any failure reads as "no", so no control shows that cannot work. */
export async function fetchVoiceFillAvailability(): Promise<boolean> {
	try {
		const response = await fetch(VOICE_FILL_API, { method: 'GET' });
		const body = await readBody(response);
		const isAvailable = body?.available === true;
		return response.ok && isAvailable;
	} catch {
		return false;
	}
}
