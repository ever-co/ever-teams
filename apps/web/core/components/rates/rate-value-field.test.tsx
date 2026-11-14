/** @jest-environment jsdom */

import React from 'react';
import { getDefaultStore } from 'jotai';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { RateValueField } from './rate-value-field';

const mockToastSuccess = jest.fn();

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('sonner', () => ({ toast: { success: (...args: unknown[]) => mockToastSuccess(...args) } }));
jest.mock('@/core/hooks/auth/use-current-organization', () => ({ useGetCurrentOrganization: () => undefined }));
jest.mock('@/core/components/icons', () => ({ Pencil: () => null, Plus: () => null, Spinner: () => null }));
// The popover's content is drawn open, so the form can be filled as the person sees it once the field is clicked;
// clicking the field opens it again, as the popover does
jest.mock('@/core/components/common/popover', () => {
	const { createContext, useContext } = jest.requireActual<typeof React>('react');
	const OpenContext = createContext<(isOpen: boolean) => void>(() => undefined);
	return {
		Popover: ({ children, onOpenChange }: React.PropsWithChildren<{ onOpenChange: (isOpen: boolean) => void }>) => (
			<OpenContext.Provider value={onOpenChange}>{children}</OpenContext.Provider>
		),
		PopoverTrigger: ({ children, 'aria-label': label }: React.PropsWithChildren<{ 'aria-label'?: string }>) => {
			const open = useContext(OpenContext);
			return (
				<button type="button" aria-label={label} onClick={() => open(true)}>
					{children}
				</button>
			);
		},
		PopoverContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>
	};
});

function renderField(organization: Record<string, unknown>) {
	getDefaultStore().set(currentOrganizationState, organization as never);
	const onSave = jest.fn().mockResolvedValue({ repricedTimeLogs: null });
	render(<RateValueField label="Client rate" value={60} currency="EUR" asksAboutPastTime onSave={onSave} />);
	fireEvent.change(screen.getByLabelText('Client rate'), { target: { value: '80' } });
	return onSave;
}

async function save() {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
	});
}

beforeEach(() => {
	mockToastSuccess.mockReset();
});

afterEach(() => {
	getDefaultStore().set(currentOrganizationState, null);
});

it('asks nothing of a Gauzy that does not store rates on time entries, and saves as before', async () => {
	const onSave = renderField({ id: 'organization-1' });

	await save();

	expect(screen.queryByRole('radio')).toBeNull();
	expect(onSave).toHaveBeenCalledWith(80, undefined);
	expect(mockToastSuccess).not.toHaveBeenCalled();
});

it('leaves the price of time already tracked as it is with "No, from now on", and says so', async () => {
	const onSave = renderField({ id: 'organization-1', timeLogsKeepTheirRates: true });

	await save();

	expect(onSave).toHaveBeenCalledWith(80, undefined);
	expect(mockToastSuccess).toHaveBeenCalledWith('rates.RATE_SAVED', { description: 'rates.PAST_TIME_KEPT' });
});

it('sends the day a client rate applies from, and says how many entries changed price', async () => {
	const onSave = renderField({ id: 'organization-1', timeLogsKeepTheirRates: true });
	onSave.mockResolvedValue({ repricedTimeLogs: 5 });

	fireEvent.click(screen.getByRole('radio', { name: /rates.APPLY_FROM_DAY/ }));
	await save();

	expect(screen.getByText('rates.APPLY_DAY_MISSING')).toBeTruthy();
	expect(onSave).not.toHaveBeenCalled();

	fireEvent.change(screen.getByLabelText('rates.APPLY_DAY'), { target: { value: '2026-10-01' } });
	await save();

	const [value, applyFrom] = onSave.mock.calls[0];
	expect(value).toBe(80);
	expect(new Date(applyFrom).getTime()).toBe(new Date(2026, 9, 1).getTime());
	expect(mockToastSuccess).toHaveBeenCalledWith('rates.RATE_SAVED', { description: 'rates.ENTRIES_REPRICED' });
});

it('asks afresh at each edit: an earlier day is not kept for the next change', async () => {
	renderField({ id: 'organization-1', timeLogsKeepTheirRates: true });

	fireEvent.click(screen.getByRole('radio', { name: /rates.APPLY_FROM_DAY/ }));
	fireEvent.change(screen.getByLabelText('rates.APPLY_DAY'), { target: { value: '2026-10-01' } });
	fireEvent.click(screen.getByRole('button', { name: /^Client rate/ }));

	expect(screen.getByRole('radio', { name: /rates.APPLY_FROM_NOW/ })).toHaveProperty('checked', true);
	expect(screen.queryByLabelText('rates.APPLY_DAY')).toBeNull();
});
