import { z } from 'zod';
import { isEverStatsEnabled } from '@/core/lib/ever-platform/env';
import {
	isPlainObject,
	jsonAnswer,
	mirrorRefusal,
	notFound,
	routeSession,
	unauthorized
} from '@/core/services/server/ever-platform/route-helpers';
import { logProxyOutcome } from '@/core/services/server/ever-platform/log';
import { reporterSummary } from '@/core/services/server/ever-stats/reporter-summary';
import { gauzyPassThrough } from '@/core/services/server/requests/ever-platform';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 1024;
const enabledBody = z.object({ enabled: z.boolean() }).strict();

/**
 * PUT /api/ever-stats/enabled `{ "enabled": true | false }`: the operator's switch of the anonymous
 * usage statistics. It is stored in the paired API (`PUT /ever-stats/enabled`, with the person's own
 * token), which decides who the operator is and records who switched it; the web app's own reporter
 * follows it before every send. Only the boolean is forwarded.
 */
export async function PUT(req: Request) {
	if (!isEverStatsEnabled()) return notFound();
	const session = routeSession(req);
	if (!session) return unauthorized();

	const text = await req.text();
	if (text.length > MAX_BODY_BYTES) return jsonAnswer(400, { statusCode: 400, message: 'Bad Request' });
	let parsed: z.infer<typeof enabledBody>;
	try {
		parsed = enabledBody.parse(JSON.parse(text));
	} catch {
		return jsonAnswer(400, { statusCode: 400, message: 'enabled must be true or false' });
	}

	const answer = await gauzyPassThrough({
		path: '/ever-stats/enabled',
		method: 'PUT',
		...session,
		body: { enabled: parsed.enabled }
	});
	logProxyOutcome('stats_enabled', answer.status);
	if (answer.status === 200 && isPlainObject(answer.data)) {
		return jsonAnswer(200, { ...answer.data, teams: reporterSummary() });
	}
	return mirrorRefusal(answer.status === 200 ? 502 : answer.status, { withManagedBy: true });
}
