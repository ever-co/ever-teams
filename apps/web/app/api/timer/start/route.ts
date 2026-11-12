import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, readTodayRange, startTimerRequest } from '@/core/services/server/requests';
import { gauzyErrorResponse } from '@/core/services/server/gauzy-error-response';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import type { IUpdateTimerStatusParams } from '@/core/types/interfaces/timer/timer-status';
import { NextResponse } from 'next/server';

const PLAN_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Gauzy refuses a malformed plan day with a 400, while an absent one keeps its older rule: anything else is not sent.
function planDayOf(body: object): string | undefined {
	const planDay = (body as { planDay?: unknown }).planDay;
	if (typeof planDay !== 'string') {
		return undefined;
	}
	if (!PLAN_DAY_PATTERN.test(planDay)) {
		return undefined;
	}
	return planDay;
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const {
		$res,
		user,
		tenantId,
		access_token,
		organizationId,
		taskId: activeTaskIdCookie,
		teamId: activeTeamIdCookie
	} = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	// The caller names the task to start and its tab's team; the cookies are only a fallback for an older client that
	// sends neither. A malformed body is rejected rather than silently falling back to a cookie: every tab shares them,
	// so they may name another tab's task or team (#5120).
	const body: unknown = await req.json().catch(() => ({}));
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
	}

	const bodyIsBillable = (body as { isBillable?: unknown }).isBillable;
	const isBillableMalformed = bodyIsBillable !== undefined && typeof bodyIsBillable !== 'boolean';
	if (isBillableMalformed) {
		return NextResponse.json({ error: 'isBillable must be a boolean' }, { status: 400 });
	}
	const isBillable = bodyIsBillable === true;

	const bodyTaskId = (body as { taskId?: unknown }).taskId;
	const hasBodyTaskId = typeof bodyTaskId === 'string' && bodyTaskId.trim() !== '';
	if (bodyTaskId !== undefined && !hasBodyTaskId) {
		return NextResponse.json({ error: 'taskId must be a non-empty string' }, { status: 400 });
	}

	const bodyProjectId = (body as { projectId?: unknown }).projectId;
	const hasBodyProjectId = typeof bodyProjectId === 'string' && bodyProjectId.trim() !== '';
	if (bodyProjectId !== undefined && !hasBodyProjectId) {
		return NextResponse.json({ error: 'projectId must be a non-empty string' }, { status: 400 });
	}

	const bodyTeamId = (body as { organizationTeamId?: unknown }).organizationTeamId;
	const hasBodyTeamId = typeof bodyTeamId === 'string' && bodyTeamId.trim() !== '';
	if (bodyTeamId !== undefined && !hasBodyTeamId) {
		return NextResponse.json({ error: 'organizationTeamId must be a non-empty string' }, { status: 400 });
	}

	const taskId = hasBodyTaskId ? bodyTaskId : activeTaskIdCookie;
	const organizationTeamId = hasBodyTeamId ? bodyTeamId : activeTeamIdCookie;

	const startParams: IUpdateTimerStatusParams = {
		tenantId: tenantId || '',
		organizationId: organizationId || '',
		taskId: taskId || '',
		logType: 'TRACKED',
		source: ETimeLogSource.TEAMS,
		tags: [],
		isBillable,
		organizationTeamId,
		planDay: planDayOf(body)
	};

	// The project is the one of the task the body names: a start that falls back to the cookie's task sends none
	const forwardsProject = hasBodyTaskId && hasBodyProjectId;
	if (forwardsProject) {
		startParams.projectId = bodyProjectId;
	}

	try {
		await startTimerRequest(startParams, access_token || '');
	} catch (error) {
		// Gauzy's refusal goes back with its status and message (403 when tracking is off) instead of a 500, so the
		// timer can tell the user why
		return gauzyErrorResponse(error, 'The timer could not be started.');
	}

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId: tenantId || '', organizationId: organizationId || '', ...readTodayRange(req) },
		access_token || ''
	);

	return $res(timerStatus);
}
