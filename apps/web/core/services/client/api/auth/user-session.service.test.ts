import { userSessionService } from './user-session.service';

const SESSION = {
	id: 'session-1',
	current: true,
	app: 'WEB',
	browser: 'Chrome 131',
	os: 'Windows',
	userAgent: null,
	ipAddress: null,
	signedInAt: '2026-11-10T08:00:00.000Z',
	lastActiveAt: '2026-11-14T09:00:00.000Z'
};

describe('userSessionService', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	it("lists the signed-in user's sessions from GET /auth/sessions", async () => {
		const get = jest.spyOn(userSessionService, 'get').mockResolvedValue({ data: [SESSION] } as never);
		const controller = new AbortController();

		const sessions = await userSessionService.list(controller.signal);

		expect(get).toHaveBeenCalledWith('/auth/sessions', { signal: controller.signal });
		expect(sessions).toEqual([SESSION]);
	});

	it('signs the other sessions out with the proof the person gave, and answers how many went', async () => {
		const post = jest.spyOn(userSessionService, 'post').mockResolvedValue({ data: { signedOut: 2 } } as never);

		const answer = await userSessionService.signOutOthers({ password: 'secret-1' });

		expect(post).toHaveBeenCalledWith('/auth/sessions/sign-out-others', { password: 'secret-1' });
		expect(answer).toEqual({ signedOut: 2 });
	});

	it('signs one session out by its id, kept as one path segment', async () => {
		const remove = jest.spyOn(userSessionService, 'delete').mockResolvedValue({ data: undefined } as never);

		await userSessionService.signOut('session/../2');

		expect(remove).toHaveBeenCalledWith('/auth/sessions/session%2F..%2F2');
	});
});
