import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, startTimerRequest } from '@/core/services/server/requests';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const {
		$res,
		user,
		tenantId,
		access_token,
		organizationId,
		taskId: activeTaskIdCookie,
		teamId: organizationTeamId
	} = await authenticatedGuard(req, res);

	if (!user) return $res('Unauthorized');

	// The caller names the task to start; the cookie is only a fallback for an older client that sends no body.
	// A malformed body is rejected rather than silently falling back to the cookie, which may name another task.
	const body: unknown = await req.json().catch(() => ({}));
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
	}

	const bodyTaskId = (body as { taskId?: unknown }).taskId;
	const hasBodyTaskId = typeof bodyTaskId === 'string' && bodyTaskId.trim() !== '';
	if (bodyTaskId !== undefined && !hasBodyTaskId) {
		return NextResponse.json({ error: 'taskId must be a non-empty string' }, { status: 400 });
	}

	const taskId = hasBodyTaskId ? bodyTaskId : activeTaskIdCookie;

	await startTimerRequest(
		{
			tenantId: tenantId || '',
			organizationId: organizationId || '',
			taskId: taskId || '',
			logType: 'TRACKED',
			source: ETimeLogSource.TEAMS,
			tags: [],
			organizationTeamId
		},
		access_token || ''
	);

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId: tenantId || '', organizationId: organizationId || '' },
		access_token || ''
	);

	return $res(timerStatus);
}
