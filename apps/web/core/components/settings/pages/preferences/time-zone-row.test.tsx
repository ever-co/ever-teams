/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockSaveZone = jest.fn<Promise<boolean>, [string]>();
const mockDetect = jest.fn<Promise<string | null>, []>();
const mockToastError = jest.fn();

type Children = Readonly<{ children?: ReactNode }>;

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('sonner', () => ({ toast: { error: (message: string) => mockToastError(message) } }));
jest.mock('next/dynamic', () => () => {
	function MockTimeZoneList({ onPick }: Readonly<{ onPick: (zone: string) => void }>) {
		return (
			<button type="button" onClick={() => onPick('America/New_York')}>
				New York
			</button>
		);
	}
	return MockTimeZoneList;
});
jest.mock('@/core/components/common/input', () => ({ controlRecipe: '' }));
jest.mock('@/core/components/common/popover', () => ({
	Popover: ({ children }: Children) => <div>{children}</div>,
	PopoverTrigger: ({ children }: Children) => <div>{children}</div>,
	PopoverContent: ({ children }: Children) => <div>{children}</div>
}));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children, onClick }: Children & { onClick?: () => void }) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	)
}));
jest.mock('@/core/components/icons', () => ({ ChevronsUpDown: () => null, Spinner: () => null }));
jest.mock('@/core/components/settings/kit/settings-page', () => ({
	SettingsRow: ({ children }: Children) => <div>{children}</div>
}));
jest.mock('@/core/hooks/settings/use-time-zone-setting', () => ({
	useTimeZoneSetting: () => ({
		currentZone: 'Africa/Kinshasa',
		display: null,
		isSaving: false,
		saveZone: mockSaveZone,
		detect: mockDetect
	})
}));

import { TimeZoneRow } from './time-zone-row';

beforeEach(() => {
	mockSaveZone.mockReset();
	mockDetect.mockReset();
	mockToastError.mockReset();
});

describe('TimeZoneRow', () => {
	it('says the time zone could not be saved when a picked zone is not saved', async () => {
		mockSaveZone.mockResolvedValue(false);
		render(<TimeZoneRow />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'New York' }));
		});

		expect(mockSaveZone).toHaveBeenCalledWith('America/New_York');
		expect(mockToastError).toHaveBeenCalledWith('timeZoneNotice.SAVE_FAILED');
	});

	it('says the time zone could not be saved when the detected zone is not saved', async () => {
		mockDetect.mockResolvedValue(null);
		render(<TimeZoneRow />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'common.DETECT' }));
		});

		expect(mockToastError).toHaveBeenCalledWith('timeZoneNotice.SAVE_FAILED');
	});

	it('announces a saved zone without an error', async () => {
		mockSaveZone.mockResolvedValue(true);
		render(<TimeZoneRow />);

		await act(async () => {
			fireEvent.click(screen.getByRole('button', { name: 'New York' }));
		});

		expect(mockToastError).not.toHaveBeenCalled();
		expect(screen.getByText('settings.preferences.TIME_ZONE_SET')).toBeTruthy();
	});
});
