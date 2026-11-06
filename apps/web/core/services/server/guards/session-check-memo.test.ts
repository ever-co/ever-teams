import {
	resolveSessionCheckMemoTtl,
	SESSION_CHECK_MEMO_DEFAULT_TTL_MS,
	SESSION_CHECK_MEMO_MAX_TTL_MS,
	SessionCheckMemo
} from './session-check-memo';

type Check = { data: { id: string; statusCode?: number } | null };

const ok = (id: string): Check => ({ data: { id } });
const keepable = (check: Check) => !!check.data && check.data.statusCode !== 401;

describe('SessionCheckMemo', () => {
	let now: number;
	let memo: SessionCheckMemo<Check>;
	let check: jest.Mock<Promise<Check>, []>;

	beforeEach(() => {
		now = 1_000_000;
		memo = new SessionCheckMemo<Check>(5_000, 3, () => now);
		check = jest.fn(async () => ok('user-1'));
	});

	it('answers a second call for the same token from the first check', async () => {
		const first = await memo.answer('token-a', check, keepable);
		const second = await memo.answer('token-a', check, keepable);

		expect(check).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);
	});

	it('shares one check between concurrent calls for the same token', async () => {
		let release!: (check: Check) => void;
		check.mockImplementation(() => new Promise<Check>((resolve) => (release = resolve)));

		const calls = [memo.answer('token-a', check, keepable), memo.answer('token-a', check, keepable)];
		release(ok('user-1'));

		await expect(Promise.all(calls)).resolves.toEqual([ok('user-1'), ok('user-1')]);
		expect(check).toHaveBeenCalledTimes(1);
	});

	it('checks each token on its own', async () => {
		await memo.answer('token-a', check, keepable);
		await memo.answer('token-b', check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
	});

	it('checks again once the window has passed', async () => {
		await memo.answer('token-a', check, keepable);
		now += 5_000;
		await memo.answer('token-a', check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
	});

	it('keeps no refusal: a 401 is checked again on the next call', async () => {
		check.mockResolvedValueOnce({ data: { id: '', statusCode: 401 } });

		await memo.answer('token-a', check, keepable);
		await memo.answer('token-a', check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
		expect(memo.size).toBe(1);
	});

	it('keeps no empty answer', async () => {
		check.mockResolvedValueOnce({ data: null });

		await memo.answer('token-a', check, keepable);
		expect(memo.size).toBe(0);
	});

	it('keeps no failure, and every waiting caller sees it', async () => {
		check.mockRejectedValueOnce(new Error('upstream down'));

		const calls = [memo.answer('token-a', check, keepable), memo.answer('token-a', check, keepable)];
		await expect(calls[0]).rejects.toThrow('upstream down');
		await expect(calls[1]).rejects.toThrow('upstream down');
		expect(memo.size).toBe(0);

		await memo.answer('token-a', check, keepable);
		expect(check).toHaveBeenCalledTimes(2);
	});

	it('never holds a token: entries are keyed by a hash', async () => {
		await memo.answer('token-a', check, keepable);

		const keys = [...(memo as unknown as { entries: Map<string, unknown> }).entries.keys()];
		expect(keys).toHaveLength(1);
		expect(keys[0]).not.toContain('token-a');
	});

	it('forgets the oldest tokens past the bound', async () => {
		for (const token of ['a', 'b', 'c', 'd']) {
			await memo.answer(token, check, keepable);
		}
		expect(memo.size).toBe(3);

		await memo.answer('a', check, keepable);
		expect(check).toHaveBeenCalledTimes(5);
	});

	it('checks every call when the window is zero', async () => {
		const off = new SessionCheckMemo<Check>(0, 3, () => now);

		await off.answer('token-a', check, keepable);
		await off.answer('token-a', check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
		expect(off.size).toBe(0);
	});

	it('checks every call for an empty token', async () => {
		await memo.answer('', check, keepable);
		await memo.answer('', check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
	});
});

describe('resolveSessionCheckMemoTtl', () => {
	it.each([
		[undefined, SESSION_CHECK_MEMO_DEFAULT_TTL_MS],
		['', SESSION_CHECK_MEMO_DEFAULT_TTL_MS],
		['2500', 2_500],
		['0', 0],
		['false', 0],
		['-1', SESSION_CHECK_MEMO_DEFAULT_TTL_MS],
		['soon', SESSION_CHECK_MEMO_DEFAULT_TTL_MS],
		['600000', SESSION_CHECK_MEMO_MAX_TTL_MS]
	])('reads %p as %p ms', (raw, expected) => {
		expect(resolveSessionCheckMemoTtl(raw as string | undefined)).toBe(expected);
	});
});
