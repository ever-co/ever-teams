/** @jest-environment jsdom */

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization } from '@/core/types/schemas';
import { useInvoiceClock } from './use-invoice-clock';

describe('useInvoiceClock', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('turns to the next day on a page left open across midnight in the organization zone', () => {
		jest.useFakeTimers();
		jest.setSystemTime(new Date('2026-11-13T23:59:30.000Z'));
		const store = createStore();
		store.set(currentOrganizationState, { id: 'org-1', timeZone: 'UTC' } as TOrganization);
		const wrapper = ({ children }: { children: React.ReactNode }) => (
			<JotaiProvider store={store}>{children}</JotaiProvider>
		);

		const { result } = renderHook(() => useInvoiceClock(), { wrapper });
		expect(result.current.todayKey).toBe('2026-11-13');

		act(() => {
			jest.advanceTimersByTime(60_000);
		});

		expect(result.current.todayKey).toBe('2026-11-14');
	});
});
