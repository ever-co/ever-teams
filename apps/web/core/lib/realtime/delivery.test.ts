import { deliversPromptly } from './delivery';

/**
 * A tab stops polling chat and notifications only where the platform says an event reaches its socket as soon as it
 * is written. Where it does not (the platform dispatched once a minute, or only in another process), a tab that
 * stopped polling showed a colleague's message up to a minute late.
 */
describe('deliversPromptly', () => {
	it('trusts the push only when the platform says delivery is prompt', () => {
		expect(deliversPromptly({ delivery: { dispatch: 'inline', shared: false, prompt: true } })).toBe(true);
		expect(deliversPromptly({ delivery: { dispatch: 'queue', shared: true, prompt: true } })).toBe(true);
	});

	it('keeps polling for a platform that does not say so', () => {
		expect(deliversPromptly({ delivery: { dispatch: 'queue', shared: false, prompt: false } })).toBe(false);
		// A platform older than the field.
		expect(deliversPromptly({})).toBe(false);
		expect(deliversPromptly({ delivery: null })).toBe(false);
		expect(deliversPromptly(undefined)).toBe(false);
		// Only a boolean true counts.
		expect(deliversPromptly({ delivery: { prompt: 'true' as unknown as boolean } })).toBe(false);
	});
});
