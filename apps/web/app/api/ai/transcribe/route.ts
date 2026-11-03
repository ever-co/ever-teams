import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { hasServerTranscription } from '@/core/lib/ai/server-providers';
import { transcribeDictation } from '@/core/lib/ai/transcription';
import { rateLimitedResponse, takeAiCall, type AiRateLimit } from '@/core/lib/ai/rate-limit';
import { readCappedFormData } from '@/core/lib/auth/ever-id/body';
import type { TDictationAvailability, TDictationErrorCode } from '@/core/types/schemas/ai/dictation.schema';

export const runtime = 'nodejs';

/** About three minutes of Opus speech, well above the two minutes the recorder allows. */
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

/** Below this a recording holds no word: it is refused before any model runs. */
const MIN_AUDIO_BYTES = 2 * 1024;

const ALLOWED_AUDIO_TYPES = new Set([
	'audio/webm',
	'audio/ogg',
	'audio/mp4',
	'audio/mpeg',
	'audio/wav',
	'audio/x-wav',
	'audio/aac'
]);

const DICTATION_RATE_LIMIT: AiRateLimit = {
	surface: 'dictation',
	perUser: 30,
	perIp: 60,
	windowMs: 10 * 60 * 1000
};

function errorResponse(code: TDictationErrorCode, status: number) {
	return NextResponse.json({ error: code }, { status });
}

/** `audio/webm;codecs=opus` reads as `audio/webm`. */
function baseMediaTypeOf(type: string) {
	const [base] = type.split(';');
	return base.trim().toLowerCase();
}

async function audioFileOf(req: Request) {
	const form = await readCappedFormData(req, MAX_AUDIO_BYTES);
	const audio = form?.get('audio');
	if (audio instanceof File) {
		return audio;
	}
	return null;
}

/** Tells the composer whether this deployment can turn speech into text, so it shows the microphone only then. */
export async function GET(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const availability: TDictationAvailability = { available: hasServerTranscription() };
	return NextResponse.json(availability);
}

/**
 * Turns one dictated recording into text. The audio stays in memory and is only sent to providers that do not
 * train on it; nothing is stored. The text goes back to the field it was dictated into.
 */
export async function POST(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	if (!hasServerTranscription()) return errorResponse('not_configured', 503);

	const verdict = takeAiCall(DICTATION_RATE_LIMIT, guard.user.id, req.headers);
	if (!verdict.allowed) return rateLimitedResponse(verdict);

	const declaredLength = Number(req.headers.get('content-length'));
	if (declaredLength > MAX_AUDIO_BYTES) return errorResponse('too_large', 413);

	const audio = await audioFileOf(req);
	if (!audio) return errorResponse('invalid_request', 400);

	const mediaType = baseMediaTypeOf(audio.type);
	if (!ALLOWED_AUDIO_TYPES.has(mediaType)) return errorResponse('unsupported_format', 415);
	if (audio.size > MAX_AUDIO_BYTES) return errorResponse('too_large', 413);
	if (audio.size < MIN_AUDIO_BYTES) return errorResponse('too_short', 400);

	const bytes = new Uint8Array(await audio.arrayBuffer());
	try {
		const result = await transcribeDictation({ bytes, mediaType }, req.signal);
		if (!result) return errorResponse('provider_unavailable', 502);
		if (result.isSilent) return errorResponse('no_speech', 422);
		return NextResponse.json({ text: result.text });
	} catch {
		return errorResponse('provider_unavailable', 502);
	}
}
