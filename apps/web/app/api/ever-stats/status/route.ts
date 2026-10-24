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

/**
 * GET /api/ever-stats/status: the anonymous usage statistics of this installation, for its operator.
 *
 * The paired API decides who the operator is (`GET /ever-stats/status` with the person's own token).
 * Only after its 200 does this answer add the web app's own reporter state; anyone else gets 404 and
 * who manages the statistics. With EVER_STATS_ENABLED=false: 404, and no request is made.
 */
export async function GET(req: Request) {
	if (!isEverStatsEnabled()) return notFound();
	const session = routeSession(req);
	if (!session) return unauthorized();

	const answer = await gauzyPassThrough({ path: '/ever-stats/status', method: 'GET', ...session });
	logProxyOutcome('stats_status', answer.status);
	if (answer.status === 200 && isPlainObject(answer.data)) {
		return jsonAnswer(200, { ...answer.data, teams: reporterSummary() });
	}
	return mirrorRefusal(answer.status === 200 ? 502 : answer.status, { withManagedBy: true });
}
