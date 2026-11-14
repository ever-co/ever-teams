/**
 * Proxy mode twins of the platform's time goal routes (ever-co/ever-gauzy#11918). The platform decides who reads and
 * changes which goal (a member hers, a manager her members' and her team's), so each route hands the request on with
 * the session and answers the platform's own status, a refusal included.
 */
import {
	gauzyAnswers,
	gauzyUrl,
	idParams,
	restoreFetch,
	sentToGauzy,
	signedInRequest
} from '@/test/api/forward-to-gauzy';
import { GET as listGoals, POST as createGoal } from './route';
import { GET as readProgress } from './progress/route';
import { PUT as updateGoal } from './[id]/route';
import { PUT as archiveGoal } from './[id]/archive/route';
import { PUT as restoreGoal } from './[id]/restore/route';

const ORIGIN = 'https://app.ever.team';

function jsonAnswer(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

afterEach(restoreFetch);

describe('GET /api/time-goals', () => {
	it('lists the goals with the query the page sent', async () => {
		const fetchMock = gauzyAnswers(jsonAnswer({ items: [], total: 0 }));
		const query = '?organizationId=org-1&tenantId=tenant-1&includeArchived=true';

		const response = await listGoals(signedInRequest(`${ORIGIN}/api/time-goals${query}`));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl(`/time-goals${query}`));
		expect(sent.method).toBe('GET');
		await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
	});

	it('answers 404 where the platform has no goals, so the page knows', async () => {
		gauzyAnswers(jsonAnswer({ statusCode: 404, message: 'Cannot GET /api/time-goals' }, 404));

		const response = await listGoals(signedInRequest(`${ORIGIN}/api/time-goals?organizationId=org-1`));

		expect(response.status).toBe(404);
	});
});

describe('POST /api/time-goals', () => {
	it('creates the goal the page sent', async () => {
		const fetchMock = gauzyAnswers(jsonAnswer({ id: 'goal-1' }, 201));
		const body = { name: 'Client A', comparison: 'AT_LEAST', targetHours: 20, period: 'WEEK', scope: 'EMPLOYEE' };

		const response = await createGoal(signedInRequest(`${ORIGIN}/api/time-goals`, 'POST', body));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/time-goals'));
		expect(sent.method).toBe('POST');
		expect(sent.body).toEqual(body);
		expect(response.status).toBe(201);
	});

	it('passes on the platform’s refusal of a goal for someone the caller does not manage', async () => {
		const refusal = {
			statusCode: 403,
			message: 'You can set goals for yourself, for the members of the teams you manage, or for those teams.'
		};
		gauzyAnswers(jsonAnswer(refusal, 403));
		const body = { name: 'Support', scope: 'EMPLOYEE', employeeId: 'marie' };

		const response = await createGoal(signedInRequest(`${ORIGIN}/api/time-goals`, 'POST', body));

		expect(response.status).toBe(403);
		await expect(response.json()).resolves.toEqual(refusal);
	});
});

describe('GET /api/time-goals/progress', () => {
	it('reads the progress of the members of a team', async () => {
		const fetchMock = gauzyAnswers(jsonAnswer([]));
		const query = '?organizationId=org-1&tenantId=tenant-1&organizationTeamId=team-1';

		await readProgress(signedInRequest(`${ORIGIN}/api/time-goals/progress${query}`));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl(`/time-goals/progress${query}`));
	});
});

describe('PUT /api/time-goals/[id], /archive and /restore', () => {
	it('changes one goal', async () => {
		const fetchMock = gauzyAnswers(jsonAnswer({ id: 'goal-1' }));
		const body = { targetHours: 15, organizationId: 'org-1' };

		await updateGoal(signedInRequest(`${ORIGIN}/api/time-goals/goal-1`, 'PUT', body), idParams('goal-1'));

		const sent = sentToGauzy(fetchMock);
		expect(sent.url).toBe(gauzyUrl('/time-goals/goal-1'));
		expect(sent.method).toBe('PUT');
		expect(sent.body).toEqual(body);
	});

	it('archives and restores one goal', async () => {
		const archiveMock = gauzyAnswers(jsonAnswer({ id: 'goal-1', isArchived: true }));
		await archiveGoal(signedInRequest(`${ORIGIN}/api/time-goals/goal-1/archive`, 'PUT', {}), idParams('goal-1'));
		expect(sentToGauzy(archiveMock).url).toBe(gauzyUrl('/time-goals/goal-1/archive'));

		const restoreMock = gauzyAnswers(jsonAnswer({ id: 'goal-1', isArchived: false }));
		await restoreGoal(signedInRequest(`${ORIGIN}/api/time-goals/goal-1/restore`, 'PUT', {}), idParams('goal-1'));
		expect(sentToGauzy(restoreMock).url).toBe(gauzyUrl('/time-goals/goal-1/restore'));
	});

	it('keeps an id one path segment, so it cannot reach another route', async () => {
		const fetchMock = gauzyAnswers(jsonAnswer({}));

		await archiveGoal(signedInRequest(`${ORIGIN}/api/time-goals/x/archive`, 'PUT', {}), idParams('../../employee'));

		expect(sentToGauzy(fetchMock).url).toBe(gauzyUrl('/time-goals/..%2F..%2Femployee/archive'));
	});
});
