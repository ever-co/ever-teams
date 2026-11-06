import { NextResponse } from 'next/server';
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { hasServerLanguageModel, hasServerTranscription } from '@/core/lib/ai/server-providers';
import { rateLimitedResponse, takeAiCall, type AiRateLimit } from '@/core/lib/ai/rate-limit';
import { voiceFill } from '@/core/lib/ai/voice-fill';
import { readCappedJsonObject } from '@/core/lib/auth/ever-id/body';
import {
	voiceFillRequestSchema,
	type TVoiceFillAvailability,
	type TVoiceFillErrorCode
} from '@/core/types/schemas/ai/voice-fill.schema';

export const runtime = 'nodejs';

const VOICE_FILL_RATE_LIMIT: AiRateLimit = {
	surface: 'voice-fill',
	perUser: 30,
	perIp: 60,
	windowMs: 10 * 60 * 1000
};

/** Well above the largest form snapshot the schema allows in practice (choices and current values included). */
const MAX_BODY_BYTES = 1024 * 1024;

function errorResponse(code: TVoiceFillErrorCode, status: number) {
	return NextResponse.json({ error: code }, { status });
}

function canFillByVoice() {
	const canTranscribe = hasServerTranscription();
	const canUnderstand = hasServerLanguageModel();
	return canTranscribe && canUnderstand;
}

/** Tells a form whether it can offer to be filled by voice on this deployment. */
export async function GET(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	const availability: TVoiceFillAvailability = { available: canFillByVoice() };
	return NextResponse.json(availability);
}

/**
 * Turns a dictated transcript into the fields of a creation form. Nothing is saved: the fields go back to the form,
 * where the person reviews them before creating anything.
 */
export async function POST(req: Request) {
	const guard = await authenticatedGuard(req, new NextResponse());
	if (!guard.user) return guard.deny();

	if (!hasServerLanguageModel()) return errorResponse('not_configured', 503);

	const verdict = takeAiCall(VOICE_FILL_RATE_LIMIT, guard.user.id, req.headers);
	if (!verdict.allowed) return rateLimitedResponse(verdict);

	const body = await readCappedJsonObject(req, MAX_BODY_BYTES);
	const parsed = voiceFillRequestSchema.safeParse(body);
	if (!parsed.success) return errorResponse('invalid_request', 400);

	try {
		const fields = await voiceFill(parsed.data, req.signal);
		if (!fields) return errorResponse('provider_unavailable', 502);
		const hasFields = Object.keys(fields).length > 0;
		if (!hasFields) return errorResponse('nothing_understood', 422);
		return NextResponse.json({ fields });
	} catch {
		return errorResponse('provider_unavailable', 502);
	}
}
