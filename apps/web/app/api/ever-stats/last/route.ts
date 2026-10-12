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
import { reporterAttempts } from '@/core/services/server/ever-stats/reporter-summary';
import { gauzyPassThrough } from '@/core/services/server/requests/ever-platform';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ever-stats/last: the exact bytes of the last reports, for the operator only.
 *
 * `api`: the paired API's last report as it answers it (or null when it has sent none yet);
 * `teams.last`: the last attempts of this web app process, newest first. The paired API decides who
 * the operator is (its `GET /ever-stats/status` must answer 200 to the person's own token); anyone
 * else gets 404 and none of this web app's data.
 */
export async function GET(req: Request) {
	if (!isEverStatsEnabled()) return notFound();
	const session = routeSession(req);
	if (!session) return unauthorized();

	const operator = await gauzyPassThrough({ path: '/ever-stats/status', method: 'GET', ...session });
	logProxyOutcome('stats_last_operator', operator.status);
	if (operator.status !== 200) return mirrorRefusal(operator.status, { withManagedBy: true });

	const last = await gauzyPassThrough({ path: '/ever-stats/last', method: 'GET', ...session });
	logProxyOutcome('stats_last', last.status);
	return jsonAnswer(200, {
		api: last.status === 200 && isPlainObject(last.data) ? last.data : null,
		teams: { last: reporterAttempts() }
	});
}
