/**
 * Proxy mode twins of the platform's comment withdraw / recover, comment reactions and task trash routes (#5069):
 * without NEXT_PUBLIC_GAUZY_API_SERVER_URL the browser calls these, and each hands the request to the same Gauzy path.
 */
const mockForward = jest.fn((_req: Request, path: string) => Promise.resolve(Response.json({ path })));

jest.mock('@/core/services/server/forward-to-gauzy', () => ({
	forwardToGauzy: (req: Request, path: string) => mockForward(req, path)
}));

import { POST as postReaction } from '@/app/api/reaction/route';
import { GET as getCommentReactions } from '@/app/api/reaction/comments/route';
import { DELETE as softDeleteComment } from '@/app/api/comment/[id]/soft/route';
import { PUT as recoverComment } from '@/app/api/comment/[id]/recover/route';
import { GET as getTrash } from '@/app/api/tasks/trash/route';
import { DELETE as softDeleteTask } from '@/app/api/tasks/[id]/soft/route';
import { PUT as recoverTask } from '@/app/api/tasks/[id]/recover/route';
import { DELETE as deleteTask } from '@/app/api/tasks/[id]/route';

const request = (method: string) => new Request('https://app.ever.team/api/x?tenantId=t&organizationId=o', { method });
const id = (value: string) => ({ params: Promise.resolve({ id: value }) });

async function forwardedPath(response: Promise<Response>): Promise<string> {
	return ((await (await response).json()) as { path: string }).path;
}

describe('comment and trash proxy routes', () => {
	beforeEach(() => mockForward.mockClear());

	it('forward each request to its Gauzy path', async () => {
		expect(await forwardedPath(postReaction(request('POST')))).toBe('/reaction');
		expect(await forwardedPath(getCommentReactions(request('GET')))).toBe('/reaction/comments');
		expect(await forwardedPath(softDeleteComment(request('DELETE'), id('c1')))).toBe('/comment/c1/soft');
		expect(await forwardedPath(recoverComment(request('PUT'), id('c1')))).toBe('/comment/c1/recover');
		expect(await forwardedPath(getTrash(request('GET')))).toBe('/tasks/trash');
		expect(await forwardedPath(softDeleteTask(request('DELETE'), id('t1')))).toBe('/tasks/t1/soft');
		expect(await forwardedPath(recoverTask(request('PUT'), id('t1')))).toBe('/tasks/t1/recover');
		expect(await forwardedPath(deleteTask(request('DELETE'), id('t1')))).toBe('/tasks/t1');
	});

	it('keep an id one path segment, so it cannot reach another endpoint', async () => {
		expect(await forwardedPath(softDeleteComment(request('DELETE'), id('../x')))).toBe('/comment/..%2Fx/soft');
		expect(await forwardedPath(recoverTask(request('PUT'), id('a/b')))).toBe('/tasks/a%2Fb/recover');
	});
});
