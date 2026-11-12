/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';

const mockRouter = { replace: jest.fn() };
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
	useRouter: () => mockRouter,
	usePathname: () => '/reports/time-and-activity',
	useSearchParams: () => mockSearchParams
}));

import { useReportUrlFilters } from './use-report-url-filters';

const NOT_SCROLLING = { scroll: false };

describe('useReportUrlFilters', () => {
	beforeEach(() => {
		mockRouter.replace.mockReset();
		mockSearchParams = new URLSearchParams();
	});

	it('reads the filters a shared link carries', () => {
		mockSearchParams = new URLSearchParams('clients=acme,none&billable=true&labels=bug');

		const { result } = renderHook(() => useReportUrlFilters());

		expect(result.current.filters).toEqual({ clients: ['acme', 'none'], billable: ['true'], labels: ['bug'] });
	});

	it('writes a picked value into the link, beside what the link already holds', () => {
		mockSearchParams = new URLSearchParams('billable=true');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.setFilter('clients', ['acme', 'none']));

		expect(mockRouter.replace).toHaveBeenCalledWith(
			'/reports/time-and-activity?billable=true&clients=acme%2Cnone',
			NOT_SCROLLING
		);
	});

	it('removes one value and keeps the others of the same filter', () => {
		mockSearchParams = new URLSearchParams('labels=bug,urgent');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.removeFilterValue('labels', 'bug'));

		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?labels=urgent', NOT_SCROLLING);
	});

	it('clears its three filters in one change of the link', () => {
		mockSearchParams = new URLSearchParams('clients=acme&billable=true&labels=bug&date=2026-11-03');
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).toHaveBeenCalledTimes(1);
		expect(mockRouter.replace).toHaveBeenCalledWith('/reports/time-and-activity?date=2026-11-03', NOT_SCROLLING);
	});

	it('leaves the link alone when clearing changes nothing', () => {
		const { result } = renderHook(() => useReportUrlFilters());

		act(() => result.current.clearFilters());

		expect(mockRouter.replace).not.toHaveBeenCalled();
	});
});
