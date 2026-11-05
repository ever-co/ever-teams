/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { MemberRowModel } from '@/core/hooks/settings/use-team-members-settings';
import { MemberRateEditor } from './member-rate-editor';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key,
	useLocale: () => 'en'
}));
jest.mock('@/core/hooks/organizations/rates/use-rates', () => ({
	useEmployeePayRate: () => ({ data: undefined, isLoading: false })
}));
jest.mock('@/core/components/icons', () => ({ Spinner: () => null }));
jest.mock('./people-parts', () => ({ MemberAvatar: () => null }));

function rowWithRate(value: number): MemberRowModel {
	return {
		id: 'row-ana',
		name: 'Ana Lima',
		imageUrl: null,
		employeeId: 'employee-ana',
		canEditRate: true,
		rate: { value, currency: 'EUR', weeklyLimit: 35 }
	} as unknown as MemberRowModel;
}

it('does not write back the rate it opened with when another admin changed it meanwhile', async () => {
	const onSaveRates = jest.fn().mockResolvedValue(undefined);
	const view = render(<MemberRateEditor row={rowWithRate(40)} onCancel={jest.fn()} onSaveRates={onSaveRates} />);

	view.rerender(<MemberRateEditor row={rowWithRate(50)} onCancel={jest.fn()} onSaveRates={onSaveRates} />);
	fireEvent.change(screen.getByLabelText('rates.WEEKLY_LIMIT'), { target: { value: '20' } });
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name: 'common.SAVE' }));
	});

	expect(onSaveRates).toHaveBeenCalledWith('row-ana', { reWeeklyLimit: 20 });
});
