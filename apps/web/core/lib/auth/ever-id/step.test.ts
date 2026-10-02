/**
 * The pages of the Ever ID steps get a step marker and nothing else: never a key, a token or an e-mail address.
 */
import { EVER_ID_STEP_PARAM, everIdStepPath, isEverIdStep } from './step';

describe('Ever ID step marker', () => {
	it('builds the same-origin page of each step, carrying the marker only', () => {
		expect(everIdStepPath('confirm')).toBe('/auth/passcode?ever_id=confirm');
		expect(everIdStepPath('signup')).toBe('/auth/signup?ever_id=signup');
		for (const path of [everIdStepPath('confirm'), everIdStepPath('signup')]) {
			const url = new URL(path, 'https://app.example.test');
			expect([...url.searchParams.keys()]).toEqual([EVER_ID_STEP_PARAM]);
			expect(path).not.toMatch(/@|%40|token|handoff/i);
		}
	});

	it.each([
		['confirm', 'confirm', true],
		['signup', 'signup', true],
		['signup', 'confirm', false],
		['CONFIRM', 'confirm', false],
		['', 'confirm', false],
		[null, 'signup', false]
	] as const)('reads %p as the %s step: %p', (value, step, expected) => {
		expect(isEverIdStep(value, step)).toBe(expected);
	});
});
