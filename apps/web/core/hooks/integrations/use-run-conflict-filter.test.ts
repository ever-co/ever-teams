/** @jest-environment jsdom */

import { createRef } from 'react';
import { act, renderHook } from '@testing-library/react';
import { useRunConflictFilter } from './use-run-conflict-filter';

describe('useRunConflictFilter', () => {
	it('narrows to a run, brings the list into view with the focus, and clears', () => {
		const element = document.createElement('div');
		element.tabIndex = -1;
		document.body.appendChild(element);
		element.scrollIntoView = jest.fn();
		const listRef = { current: element };
		const { result } = renderHook(({ integrationId }) => useRunConflictFilter(integrationId, listRef), {
			initialProps: { integrationId: 'int-1' as string | null }
		});

		act(() => result.current.showRun('run-1'));
		expect(result.current.runId).toBe('run-1');
		expect(element.scrollIntoView).toHaveBeenCalled();
		expect(document.activeElement).toBe(element);

		act(() => result.current.clearRun());
		expect(result.current.runId).toBeNull();
		element.remove();
	});

	it('another connection starts with every run', () => {
		const listRef = createRef<HTMLDivElement>();
		const { result, rerender } = renderHook(({ integrationId }) => useRunConflictFilter(integrationId, listRef), {
			initialProps: { integrationId: 'int-1' as string | null }
		});
		act(() => result.current.showRun('run-1'));
		expect(result.current.runId).toBe('run-1');

		rerender({ integrationId: 'int-2' });
		expect(result.current.runId).toBeNull();
	});
});
