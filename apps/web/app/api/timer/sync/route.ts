import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { toTimeSlotDuration } from '@/core/lib/helpers/timer';
import { getTimerStatusRequest, readTodayRange, syncTimeSlotRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as {
		source: any;
		duration?: unknown;
		startedAt?: unknown;
		timeLogId?: unknown;
	};
	const { source, duration } = body;
	// A slot of time kept after the app could not follow the run starts in the past (#5123); any other starts now
	const startedAt =
		typeof body.startedAt === 'string' && !Number.isNaN(Date.parse(body.startedAt)) ? body.startedAt : undefined;
	const timeLogId = typeof body.timeLogId === 'string' && body.timeLogId ? body.timeLogId : undefined;
	await syncTimeSlotRequest(
		{
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source,
			employeeId: user.employee?.id,
			duration: toTimeSlotDuration(duration),
			...(startedAt ? { startedAt } : {}),
			...(timeLogId ? { timeLogId } : {})
		},
		access_token
	);

	// The time slot is recorded by now: a failed status read must not fail the sync, or the client
	// would restore its reference and the retry would credit this interval a second time.
	const timerStatus = await getTimerStatusRequest(
		{ tenantId, organizationId, ...readTodayRange(req) },
		access_token
	).then(
		({ data }) => data,
		() => null
	);

	return $res(timerStatus);
}
