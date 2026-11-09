import { onSignOut, runSignOutCleanups } from './sign-out-cleanups';

describe('sign-out cleanups', () => {
	it('runs every registered cleanup, goes on past one that throws, and runs none once removed', () => {
		const first = jest.fn(() => {
			throw new Error('broken');
		});
		const second = jest.fn();
		const removeFirst = onSignOut(first);
		const removeSecond = onSignOut(second);

		expect(() => runSignOutCleanups()).not.toThrow();
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);

		removeFirst();
		removeSecond();
		runSignOutCleanups();
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
	});
});
