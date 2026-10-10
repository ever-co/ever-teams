/* eslint-disable no-mixed-spaces-and-tabs */
import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, stopTimerRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';

function toIsoDate(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : new Date(time).toISOString();
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as { source: any; startedAt?: unknown; stoppedAt?: unknown };
	const { source } = body;
	const startedAt = toIsoDate(body.startedAt);
	const stoppedAt = toIsoDate(body.stoppedAt);
	if ((body.startedAt != null && !startedAt) || (body.stoppedAt != null && !stoppedAt)) {
		return NextResponse.json({ message: 'startedAt and stoppedAt must be ISO dates' }, { status: 400 });
	}

	try {
		await stopTimerRequest(
			{
				tenantId,
				organizationId,
				logType: 'TRACKED',
				source: source,
				tags: [],
				// Task id is optional in case timer is already started in another source
				...(taskId
					? {
							taskId
						}
					: {}),
				...(startedAt ? { startedAt } : {}),
				...(stoppedAt ? { stoppedAt } : {})
			},
			access_token
		);
	} catch (error) {
		// serverFetch throws a rejected promise carrying Gauzy's error body. Pass a 406 (no running timer
		// left to stop) through so the client can tell it apart from a failure.
		const rejection: { statusCode?: number } | undefined = await Promise.resolve(error).then(
			() => undefined,
			(gauzyError) => gauzyError
		);
		if (rejection?.statusCode === 406) return NextResponse.json(rejection, { status: 406 });
		throw error;
	}

	const { data: timerStatus } = await getTimerStatusRequest({ tenantId, organizationId }, access_token);

	return $res(timerStatus);
}
