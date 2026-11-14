import { authenticatedGuard } from '@/core/services/server/guards/authenticated-guard-app';
import { getTimerStatusRequest, readTodayRange, stopTimerRequest } from '@/core/services/server/requests';
import { NextResponse } from 'next/server';
import { TIMER_NOTES_MAX_LENGTH, readTimerNotes } from '@/core/lib/utils/timer/timer-notes';

const NOTES_REFUSAL = `description must be a string of at most ${TIMER_NOTES_MAX_LENGTH} characters`;

function toIsoDate(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const time = Date.parse(value);
	return Number.isNaN(time) ? null : new Date(time).toISOString();
}

interface StopBody {
	source: any;
	startedAt?: unknown;
	stoppedAt?: unknown;
	description?: unknown;
	timeLogId?: unknown;
}

interface StopFields {
	startedAt?: string;
	stoppedAt?: string;
	timeLogId?: string;
	description?: string;
}

type StopReading = { fields: StopFields; refusal: null } | { fields: null; refusal: string };

const refused = (refusal: string): StopReading => ({ fields: null, refusal });

/** The fields of a stop the route hands on to Gauzy, or why it refuses the body (a 400). */
function stopFieldsOf(body: StopBody): StopReading {
	const startedAt = toIsoDate(body.startedAt);
	const stoppedAt = toIsoDate(body.stoppedAt);
	if ((body.startedAt != null && !startedAt) || (body.stoppedAt != null && !stoppedAt)) {
		return refused('startedAt and stoppedAt must be ISO dates');
	}
	// A stop is only ever back-dated (to a closed tab's last heartbeat), never set in the future, which would
	// credit time not worked. One minute of slack covers clock skew.
	if (stoppedAt && Date.parse(stoppedAt) > Date.now() + 60_000) {
		return refused('stoppedAt cannot be in the future');
	}
	// The time log the stop is for, when it names one. A stop that names one badly is refused: sent without it, it
	// would end whatever runs, which is what naming the log is there to prevent
	const namesTimeLog = body.timeLogId !== undefined && body.timeLogId !== null;
	if (namesTimeLog && (typeof body.timeLogId !== 'string' || !body.timeLogId)) {
		return refused('timeLogId must be the id of a time log');
	}
	const notes = readTimerNotes(body.description);
	if (!notes.isValid) {
		return refused(NOTES_REFUSAL);
	}
	const fields: StopFields = {};
	if (startedAt) fields.startedAt = startedAt;
	if (stoppedAt) fields.stoppedAt = stoppedAt;
	if (namesTimeLog) fields.timeLogId = body.timeLogId as string;
	if (notes.description !== undefined) fields.description = notes.description;
	return { fields, refusal: null };
}

/**
 * Gauzy's refusal the route passes through, read from serverFetch's rejection (a rejected promise carrying Gauzy's
 * error body): a 406 (no running timer left to stop), which the client tells apart from a failure, and a 409 (the
 * stop names a time log that is not the running one, and nothing was stopped). Null for any other failure.
 */
async function passedRefusalOf(error: unknown): Promise<{ statusCode: 406 | 409 } | null> {
	const rejection: { statusCode?: number } | undefined = await Promise.resolve(error).then(
		() => undefined,
		(gauzyError) => gauzyError
	);
	const statusCode = rejection?.statusCode;
	if (statusCode === 406 || statusCode === 409) {
		return { ...rejection, statusCode };
	}
	return null;
}

export async function POST(req: Request) {
	const res = new NextResponse();
	const { $res, user, tenantId, access_token, organizationId, taskId } = await authenticatedGuard(req, res);
	if (!user) return $res('Unauthorized');

	const body = (await req.json()) as unknown as StopBody;
	const { fields, refusal } = stopFieldsOf(body);
	if (refusal !== null) {
		return NextResponse.json({ message: refusal }, { status: 400 });
	}

	try {
		await stopTimerRequest(
			{
				tenantId,
				organizationId,
				logType: 'TRACKED',
				source: body.source,
				tags: [],
				// Task id is optional in case timer is already started in another source
				...(taskId ? { taskId } : {}),
				...fields
			},
			access_token
		);
	} catch (error) {
		const passed = await passedRefusalOf(error);
		if (passed) return NextResponse.json(passed, { status: passed.statusCode });
		throw error;
	}

	const { data: timerStatus } = await getTimerStatusRequest(
		{ tenantId, organizationId, ...readTodayRange(req) },
		access_token
	);

	return $res(timerStatus);
}
