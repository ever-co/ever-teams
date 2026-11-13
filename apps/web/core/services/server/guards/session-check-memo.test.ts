import {
	resolveSessionCheckMemoTtl,
	SESSION_CHECK_MEMO_DEFAULT_TTL_MS,
	SESSION_CHECK_MEMO_MAX_TTL_MS,
	SessionCheckMemo,
	tokenExpiresAt
} from './session-check-memo';

type Check = { data: { id: string; statusCode?: number } | null };

const ok = (id: string): Check => ({ data: { id } });
const keepable = (check: Check) => !!check.data && check.data.statusCode !== 401;

/** A JWT-shaped token (unsigned) whose payload states `exp`, in seconds. */
const jwtExpiring = (expSeconds: number) =>
	`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({ id: 'u', exp: expSeconds })).toString('base64url')}.sig`;

describe('SessionCheckMemo', () => {
	let now: number;
	let memo: SessionCheckMemo<Check>;
	let check: jest.Mock<Promise<Check>, [signal: AbortSignal]>;

	beforeEach(() => {
		now = 1_000_000;
		memo = new SessionCheckMemo<Check>(5_000, 3, () => now);
		check = jest.fn<Promise<Check>, [signal: AbortSignal]>(async () => ok('user-1'));
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

	it('checks a token again once its answer was dropped, and keeps the others', async () => {
		await memo.answer('token-a', check, keepable);
		await memo.answer('token-b', check, keepable);

		memo.drop('token-a');
		await memo.answer('token-a', check, keepable);
		await memo.answer('token-b', check, keepable);

		expect(check).toHaveBeenCalledTimes(3);
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

	it('counts a refreshed token as the newest, so an older live answer is forgotten first', async () => {
		await memo.answer('a', check, keepable);
		now += 3_000;
		await memo.answer('b', check, keepable);
		await memo.answer('c', check, keepable);
		now += 2_000;
		await memo.answer('a', check, keepable); // a expired and is checked again: now the newest entry
		await memo.answer('d', check, keepable); // past the bound: b, the oldest live answer, goes — not a

		await memo.answer('a', check, keepable);
		await memo.answer('c', check, keepable);
		expect(check).toHaveBeenCalledTimes(5);
		await memo.answer('b', check, keepable);
		expect(check).toHaveBeenCalledTimes(6);
	});

	it('shares a check still in flight past the window rather than starting another', async () => {
		let release!: (check: Check) => void;
		check.mockImplementation(() => new Promise<Check>((resolve) => (release = resolve)));

		const first = memo.answer('token-a', check, keepable);
		now += 6_000;
		const second = memo.answer('token-a', check, keepable);
		release(ok('user-1'));

		await expect(Promise.all([first, second])).resolves.toEqual([ok('user-1'), ok('user-1')]);
		expect(check).toHaveBeenCalledTimes(1);
	});

	it('never reuses an answer past the token’s own expiry', async () => {
		const token = jwtExpiring(Math.floor(now / 1000) + 2); // expires in 2 s, the window is 5 s

		await memo.answer(token, check, keepable);
		now += 1_500;
		await memo.answer(token, check, keepable);
		expect(check).toHaveBeenCalledTimes(1);

		now += 1_000;
		await memo.answer(token, check, keepable);
		expect(check).toHaveBeenCalledTimes(2);
	});

	it('checks an expired token every time and keeps nothing for it', async () => {
		const token = jwtExpiring(Math.floor(now / 1000) - 1);

		await memo.answer(token, check, keepable);
		await memo.answer(token, check, keepable);

		expect(check).toHaveBeenCalledTimes(2);
		expect(memo.size).toBe(0);
	});

	it('gives up a check that overruns its deadline: its callers get the failure, the request is aborted, the next call checks again', async () => {
		const slow = new SessionCheckMemo<Check>(5_000, 3, () => now, 40);
		let release!: (check: Check) => void;
		let signalSeen: AbortSignal | undefined;
		check.mockImplementationOnce((signal: AbortSignal) => {
			signalSeen = signal;
			return new Promise<Check>((resolve) => (release = resolve));
		});

		const stalled = [slow.answer('token-a', check, keepable), slow.answer('token-a', check, keepable)];
		await expect(stalled[0]).rejects.toThrow('did not answer within 40 ms');
		await expect(stalled[1]).rejects.toThrow('did not answer within 40 ms');
		expect(signalSeen?.aborted).toBe(true);
		expect(slow.size).toBe(0);

		await expect(slow.answer('token-a', check, keepable)).resolves.toEqual(ok('user-1'));
		expect(check).toHaveBeenCalledTimes(2);
		release(ok('late')); // the stalled check answering later changes nothing
		expect(slow.size).toBe(1);
	});

	it('runs a check it does not keep (window off, no token, expired token) under the same deadline', async () => {
		const off = new SessionCheckMemo<Check>(0, 3, () => now, 40);
		check.mockImplementation(() => new Promise<Check>(() => undefined));

		await expect(off.answer('token-a', check, keepable)).rejects.toThrow('did not answer within 40 ms');
		const kept = new SessionCheckMemo<Check>(5_000, 3, () => now, 40);
		await expect(kept.answer('', check, keepable)).rejects.toThrow('did not answer within 40 ms');
		await expect(kept.answer(jwtExpiring(Math.floor(now / 1000) - 1), check, keepable)).rejects.toThrow(
			'did not answer within 40 ms'
		);
		expect(check).toHaveBeenCalledTimes(3);
	});

	it('answers a check that throws before returning its promise with a rejection, with and without a deadline', async () => {
		const boom = (): Promise<Check> => {
			throw new Error('boom');
		};
		await expect(new SessionCheckMemo<Check>(0, 3, () => now).withDeadline(boom)).rejects.toThrow('boom');
		await expect(new SessionCheckMemo<Check>(0, 3, () => now, 40).withDeadline(boom)).rejects.toThrow('boom');
	});

	it('never shares a check in flight with a request made after the token expired', async () => {
		// The token expires in one second; a check started before that is still pending when the next request arrives.
		const token = jwtExpiring(Math.floor(now / 1000) + 1);
		let settle!: (value: Check) => void;
		check.mockImplementationOnce(() => new Promise<Check>((resolve) => (settle = resolve)));
		const first = memo.answer(token, check, keepable);

		now += 2_000;
		check.mockResolvedValueOnce({ data: { statusCode: 401 } } as unknown as Check);
		const second = memo.answer(token, check, keepable);
		settle({ data: { id: 'user-1' } } as unknown as Check);

		await expect(first).resolves.toMatchObject({ data: { id: 'user-1' } });
		await expect(second).resolves.toMatchObject({ data: { statusCode: 401 } });
		expect(check).toHaveBeenCalledTimes(2);
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

describe('tokenExpiresAt', () => {
	it('reads the exp claim of a JWT, in milliseconds', () => {
		expect(tokenExpiresAt(jwtExpiring(1_700_000_000))).toBe(1_700_000_000_000);
	});

	it.each(['opaque-token', 'a.b', `x.${Buffer.from('not json').toString('base64url')}.y`, jwtExpiring(NaN)])(
		'answers nothing for %p',
		(token) => {
			expect(tokenExpiresAt(token)).toBeUndefined();
		}
	);
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
