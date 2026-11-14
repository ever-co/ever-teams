/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { getDefaultStore } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { DateRangePicker } from './date-range-picker';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));

afterEach(() => {
	getDefaultStore().set(currentOrganizationState, null);
});

it('offers this week from the workspace week start, even when it arrives while the picker is open', async () => {
	jest.useFakeTimers({ now: new Date(2026, 10, 11, 12), doNotFake: ['queueMicrotask', 'nextTick'] });
	const onDateRangeChange = jest.fn();
	render(<DateRangePicker onDateRangeChange={onDateRangeChange} />);
	fireEvent.click(screen.getAllByRole('button')[0]);

	await act(async () => {
		getDefaultStore().set(currentOrganizationState, { id: 'organization-1', startWeekOn: 'SUNDAY' } as never);
	});
	fireEvent.click(await screen.findByText('common.THIS_WEEK'));

	const range = onDateRangeChange.mock.calls.at(-1)?.[0];
	expect(range.from).toEqual(new Date(2026, 10, 8));
	jest.useRealTimers();
});
