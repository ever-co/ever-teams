/**
 * A workspace role is given through Gauzy's `PUT /user/:id` with the role alone. The proxy's `PUT /api/user/:id`
 * writes the signed-in account whatever the id, so in proxy mode the role goes to a route of its own.
 */
// apps/web/.env sets NEXT_PUBLIC_GAUZY_API_SERVER_URL, which would otherwise decide the API mode of every case.
jest.mock('@/core/constants/config/constants', () => ({
	...jest.requireActual('@/core/constants/config/constants'),
	GAUZY_API_BASE_SERVER_URL: { value: undefined }
}));

import { GAUZY_API_BASE_SERVER_URL } from '@/core/constants/config/constants';
import { userService } from './user.service';

const publishedApiOrigin = GAUZY_API_BASE_SERVER_URL as { value: string | undefined };

const answer = (data: unknown) => ({ config: {}, data, headers: {}, status: 202, statusText: 'Accepted' }) as never;

afterEach(() => {
	jest.restoreAllMocks();
	publishedApiOrigin.value = undefined;
});

describe('UserService.assignUserRole', () => {
	it("sends only the role to the member's account in direct mode", async () => {
		publishedApiOrigin.value = 'https://api.example.test';
		const put = jest.spyOn(userService, 'put').mockResolvedValue(answer({ id: 'user-2' }));

		await userService.assignUserRole({ userId: 'user-2', roleId: 'role-admin' });

		expect(put).toHaveBeenCalledWith('/user/user-2', { roleId: 'role-admin' });
	});

	it('goes through the role route in proxy mode, never through the route of the signed-in account', async () => {
		const put = jest.spyOn(userService, 'put').mockResolvedValue(answer({ id: 'user-2' }));

		await userService.assignUserRole({ userId: 'user-2', roleId: 'role-admin' });

		expect(put).toHaveBeenCalledWith('/user/user-2/role', { roleId: 'role-admin' });
	});

	it("passes Gauzy's refusal on", async () => {
		jest.spyOn(userService, 'put').mockRejectedValue(new Error('Forbidden'));

		await expect(userService.assignUserRole({ userId: 'user-2', roleId: 'role-admin' })).rejects.toThrow(
			'Forbidden'
		);
	});
});
