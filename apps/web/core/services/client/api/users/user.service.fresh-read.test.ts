/**
 * #5728: in proxy mode the read of the user that follows a profile save asks the web app's server for a session
 * check made anew, so no instance of that server answers the user as they were before the save.
 */
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined },
	IS_DEMO_MODE: false
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { forgetProfileSave } from '@/core/lib/utils/fresh-user-read';
import { userService } from './user.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };
const USER_ID = '44444444-4444-4444-8444-111111111111';
const USER = { id: USER_ID, email: 'marta@example.com' };
const answer = (data: unknown) => ({ config: {}, data, headers: {}, status: 200, statusText: 'OK' }) as never;

function readUrlOf(get: jest.SpyInstance): URL {
	const path = String(get.mock.calls.at(-1)?.[0]);
	return new URL(path, 'http://localhost:3030/api');
}

describe('UserService, the user read after a profile save', () => {
	beforeEach(() => {
		forgetProfileSave();
		publishedApiOrigin.value = undefined;
	});

	afterEach(() => jest.restoreAllMocks());

	it('is an ordinary read before any save', async () => {
		const get = jest.spyOn(userService, 'get').mockResolvedValue(answer(USER));

		await userService.getAuthenticatedUserData();

		expect(readUrlOf(get).searchParams.has('fresh')).toBe(false);
	});

	it('asks for a check made anew after the profile was saved, in proxy mode', async () => {
		jest.spyOn(userService, 'put').mockResolvedValue(answer(USER));
		const get = jest.spyOn(userService, 'get').mockResolvedValue(answer(USER));

		await userService.updateUserAvatar({ userId: USER_ID, body: { timeZone: 'Europe/Lisbon' } });
		await userService.getAuthenticatedUserData();

		expect(readUrlOf(get).searchParams.get('fresh')).toBe('1');
	});

	it('never sends the parameter to the API itself, in direct mode', async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		jest.spyOn(userService, 'put').mockResolvedValue(answer(USER));
		const get = jest.spyOn(userService, 'get').mockResolvedValue(answer(USER));

		await userService.updateUserAvatar({ userId: USER_ID, body: { timeZone: 'Europe/Lisbon' } });
		await userService.getAuthenticatedUserData();

		expect(readUrlOf(get).searchParams.has('fresh')).toBe(false);
	});

	it('stays an ordinary read when the save was refused', async () => {
		jest.spyOn(userService, 'put').mockRejectedValue(new Error('Bad Request'));
		const get = jest.spyOn(userService, 'get').mockResolvedValue(answer(USER));

		await userService.updateUserAvatar({ userId: USER_ID, body: { timeZone: 'Nowhere' } }).catch(() => undefined);
		await userService.getAuthenticatedUserData();

		expect(readUrlOf(get).searchParams.has('fresh')).toBe(false);
	});
});
