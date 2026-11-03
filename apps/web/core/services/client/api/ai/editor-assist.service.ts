import {
	EDITOR_ASSIST_ERROR_CODES,
	type TEditorAssistAnswer,
	type TEditorAssistAvailability,
	type TEditorAssistErrorCode,
	type TEditorAssistRequest
} from '@/core/types/schemas/ai/editor-assist.schema';

const EDITOR_ASSIST_API = '/api/editor-assist';

export type TEditorAssistFailure =
	| TEditorAssistErrorCode
	| 'unauthorized'
	| 'service_unavailable'
	| 'network'
	| 'aborted';

export type TEditorAssistResult = { ok: true; data: TEditorAssistAnswer } | { ok: false; reason: TEditorAssistFailure };

function isKnownErrorCode(value: unknown): value is TEditorAssistErrorCode {
	const codes: ReadonlyArray<unknown> = EDITOR_ASSIST_ERROR_CODES;
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

function answerOf(body: Record<string, unknown> | null): TEditorAssistAnswer | null {
	const text = body?.text;
	if (typeof text !== 'string') {
		return null;
	}
	const note = body?.note;
	if (typeof note === 'string') {
		return { text, note };
	}
	return { text, note: null };
}

/** The guard's own refusals carry no editor code: a refused session is 401, an unreachable Gauzy 503. */
function failureOf(status: number, body: Record<string, unknown> | null): TEditorAssistFailure {
	const code = body?.error;
	if (isKnownErrorCode(code)) {
		return code;
	}
	if (status === 401) {
		return 'unauthorized';
	}
	return 'service_unavailable';
}

/** Sends one writing-help operation to the app's own route, which calls the user's AI provider. */
export async function requestEditorAssist(
	request: TEditorAssistRequest,
	signal?: AbortSignal
): Promise<TEditorAssistResult> {
	let response: Response;
	try {
		response = await fetch(EDITOR_ASSIST_API, {
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
	const answer = answerOf(body);
	if (!answer) {
		return { ok: false, reason: 'empty_result' };
	}
	return { ok: true, data: answer };
}

/** Whether the deployment holds its own AI key; any failure reads as "no", so the user's own key stays usable. */
export async function fetchEditorAssistAvailability(): Promise<TEditorAssistAvailability> {
	try {
		const response = await fetch(EDITOR_ASSIST_API, { method: 'GET' });
		const body = await readBody(response);
		const server = response.ok && body?.server === true;
		return { server };
	} catch {
		return { server: false };
	}
}
