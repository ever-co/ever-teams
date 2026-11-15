/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { GROUP_SIMILAR_ENTRIES_STORAGE_KEY, useSimilarEntryGrouping } from './use-similar-entry-grouping';

describe('useSimilarEntryGrouping', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('groups similar entries by default', () => {
		const { result } = renderHook(() => useSimilarEntryGrouping());

		expect(result.current.isGrouping).toBe(true);
	});

	it('remembers in the browser that grouping was turned off', () => {
		const first = renderHook(() => useSimilarEntryGrouping());
		act(() => first.result.current.setIsGrouping(false));

		const next = renderHook(() => useSimilarEntryGrouping());

		expect(window.localStorage.getItem(GROUP_SIMILAR_ENTRIES_STORAGE_KEY)).toBe('false');
		expect(next.result.current.isGrouping).toBe(false);
	});

	it('keeps grouping on when the browser holds something else than a choice', () => {
		window.localStorage.setItem(GROUP_SIMILAR_ENTRIES_STORAGE_KEY, '"sometimes"');

		const { result } = renderHook(() => useSimilarEntryGrouping());

		expect(result.current.isGrouping).toBe(true);
	});

	it('opens a group closed by default, and closes it again', () => {
		const { result } = renderHook(() => useSimilarEntryGrouping());
		expect(result.current.isGroupOpen('2026-11-10|fix-login')).toBe(false);

		act(() => result.current.toggleGroup('2026-11-10|fix-login'));
		expect(result.current.isGroupOpen('2026-11-10|fix-login')).toBe(true);
		expect(result.current.isGroupOpen('2026-11-10|meetings')).toBe(false);

		act(() => result.current.toggleGroup('2026-11-10|fix-login'));
		expect(result.current.isGroupOpen('2026-11-10|fix-login')).toBe(false);
	});
});
