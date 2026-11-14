import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { discardTimerRequest, getTimerStatusRequest, readTodayRange } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

/** The run the member saw, when the body names one: undefined without one, null when it is not a string. */
function timeLogIdOf(body: unknown): string | undefined | null {
	if (typeof body !== 'object' || body === null) {
		return undefined;
	}
	const value = (body as { timeLogId?: unknown }).timeLogId;
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== 'string') {
		return null;
	}
	return value;
}

/**
 * Proxy-mode twin of Gauzy's POST /timesheet/timer/discard: discards the caller's running timer in the session's
 * tenant and organization, then answers the timer status. Gauzy decides who may discard (its timer permission and the
 * organization's settings): its refusals keep their status and body, so the client reads their code.
 */
export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body: unknown = await req.json().catch(() => undefined);
	const timeLogId = timeLogIdOf(body);
	if (timeLogId === null) {
		return NextResponse.json({ message: 'timeLogId must be a string' }, { status: 400 });
	}
	const timeLogField: { timeLogId?: string } = {};
	if (timeLogId) {
		timeLogField.timeLogId = timeLogId;
	}

	try {
		await discardTimerRequest({ tenantId, organizationId, ...timeLogField }, access_token);
	} catch (error) {
		return gauzyErrorResponse(error, 'The timer could not be discarded.');
	}

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId, organizationId, ...readTodayRange(req) },
		access_token
	);

	return $res(timerStatus);
}
