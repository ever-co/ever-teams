import { fakeTimers } from './fake-socket';
import { InvalidationScheduler, isTextFieldFocused } from './invalidation-scheduler';

function setUp(editing = { value: false }) {
	const timers = fakeTimers();
	const invalidated: unknown[] = [];
	const scheduler = new InvalidationScheduler({
		invalidate: (key) => invalidated.push(key),
		isEditing: () => editing.value,
		windowMs: 100,
		maxDeferMs: 1_000,
		setTimeout: timers.setTimeout,
		clearTimeout: timers.clearTimeout
	});
	return { timers, invalidated, scheduler, editing };
}

describe('InvalidationScheduler', () => {
	it('folds the refetches of a burst into one per query', () => {
		const { timers, invalidated, scheduler } = setUp();
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }]);
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }, { queryKey: ['notifications', 'unread-count'], deferrable: false }]);
		expect(invalidated).toEqual([]);
		timers.advance(100);
		expect(invalidated).toEqual([['tasks'], ['notifications', 'unread-count']]);
	});

	it('holds the deferrable refetches while the user types, runs the others, and runs the held ones on flush', () => {
		const editing = { value: true };
		const { timers, invalidated, scheduler } = setUp(editing);
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }, { queryKey: ['notifications'], deferrable: false }]);
		timers.advance(100);
		expect(invalidated).toEqual([['notifications']]);
		editing.value = false;
		scheduler.flush();
		expect(invalidated).toEqual([['notifications'], ['tasks']]);
	});

	it('does not hold a refetch longer than the longest deferral', () => {
		const editing = { value: true };
		const { timers, invalidated, scheduler } = setUp(editing);
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }]);
		timers.advance(900);
		expect(invalidated).toEqual([]);
		timers.advance(300);
		expect(invalidated).toEqual([['tasks']]);
	});

	it('a non-deferrable ask of a key wins over a deferrable one', () => {
		const editing = { value: true };
		const { timers, invalidated, scheduler } = setUp(editing);
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }]);
		scheduler.add([{ queryKey: ['tasks'], deferrable: false }]);
		timers.advance(100);
		expect(invalidated).toEqual([['tasks']]);
	});

	it('runs nothing once disposed', () => {
		const { timers, invalidated, scheduler } = setUp();
		scheduler.add([{ queryKey: ['tasks'], deferrable: true }]);
		scheduler.dispose();
		timers.advance(1_000);
		expect(invalidated).toEqual([]);
	});
});

describe('isTextFieldFocused', () => {
	const doc = (activeElement: unknown) => ({ activeElement }) as Pick<Document, 'activeElement'>;

	it('knows text inputs, textareas and editable content', () => {
		expect(isTextFieldFocused(doc({ tagName: 'TEXTAREA' }))).toBe(true);
		expect(isTextFieldFocused(doc({ tagName: 'INPUT', type: 'text' }))).toBe(true);
		expect(isTextFieldFocused(doc({ tagName: 'INPUT', type: 'checkbox' }))).toBe(false);
		expect(isTextFieldFocused(doc({ tagName: 'DIV', isContentEditable: true }))).toBe(true);
		expect(isTextFieldFocused(doc({ tagName: 'BUTTON' }))).toBe(false);
		expect(isTextFieldFocused(doc(null))).toBe(false);
		expect(isTextFieldFocused(undefined)).toBe(false);
	});
});
