import { userService } from './user.service';

/** Gauzy's profile route takes the new password in clear text as `hash` and hashes it itself. */
describe('UserService.updateUserPassword', () => {
	afterEach(() => jest.restoreAllMocks());

	const answer = (data: unknown) => ({ config: {}, data, headers: {}, status: 202, statusText: 'Accepted' }) as never;

	it("sends only the new password, as hash, to the account's profile route", async () => {
		const put = jest.spyOn(userService, 'put').mockResolvedValue(answer({ id: 'user-1' }));

		await userService.updateUserPassword({ userId: 'user-1', password: 'new-password' });

		expect(put).toHaveBeenCalledWith('/user/user-1', { hash: 'new-password' });
	});

	it("passes Gauzy's refusal on", async () => {
		jest.spyOn(userService, 'put').mockRejectedValue(new Error('Forbidden'));

		await expect(userService.updateUserPassword({ userId: 'user-1', password: 'new-password' })).rejects.toThrow(
			'Forbidden'
		);
	});
});
