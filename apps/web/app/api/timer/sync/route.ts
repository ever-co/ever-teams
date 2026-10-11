import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { toTimeSlotDuration } from '@/core/lib/helpers/timer';
import { getTimerStatusRequest, syncTimeSlotRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as { source: any; duration?: unknown };
	const { source, duration } = body;
	await syncTimeSlotRequest(
		{
			tenantId,
			organizationId,
			logType: 'TRACKED',
			source,
			employeeId: user.employee?.id,
			duration: toTimeSlotDuration(duration)
		},
		access_token
	);

	// The time slot is recorded by now: a failed status read must not fail the sync, or the client
	// would restore its reference and the retry would credit this interval a second time.
	const timerStatus = await getTimerStatusRequest({ tenantId, organizationId }, access_token).then(
		({ data }) => data,
		() => null
	);

	return $res(timerStatus);
}
