/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { TimeZoneNotice as TTimeZoneNotice } from '@/core/lib/utils/time-zone-notice';
import { TimeZoneNotice } from './time-zone-notice';

const mockAdopt = jest.fn();
const mockKeep = jest.fn();
const mockDismiss = jest.fn();
let mockState: { notice: TTimeZoneNotice | null; isSaving: boolean; hasFailed: boolean };

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values && Object.keys(values).length > 0 ? `${key}:${JSON.stringify(values)}` : key
}));
jest.mock('@/core/components/common/toast-orb', () => ({
	ToastOrb: () => null,
	orbToneColor: () => 'currentColor'
}));
jest.mock('@/core/hooks/settings/use-time-zone-notice', () => ({
	useTimeZoneNotice: () => ({
		...mockState,
		adoptBrowserZone: mockAdopt,
		keepProfileZone: mockKeep,
		dismiss: mockDismiss
	})
}));

const KINSHASA_TO_NEW_YORK: TTimeZoneNotice = {
	profileZone: 'Africa/Kinshasa',
	profileOffset: '+01:00',
	browserZone: 'America/New_York',
	browserOffset: '-05:00',
	pairKey: 'Africa/Kinshasa|America/New_York'
};

beforeEach(() => {
	mockState = { notice: KINSHASA_TO_NEW_YORK, isSaving: false, hasFailed: false };
	mockAdopt.mockReset();
	mockKeep.mockReset();
	mockDismiss.mockReset();
});

describe('TimeZoneNotice', () => {
	it('shows nothing when the zones agree', () => {
		mockState = { notice: null, isSaving: false, hasFailed: false };

		const { container } = render(<TimeZoneNotice />);

		expect(container.innerHTML).toBe('');
	});

	it('names both zones with their offsets, and offers to use one or keep the other', () => {
		render(<TimeZoneNotice />);

		expect(screen.getByText(/timeZoneNotice\.TITLE:/).textContent).toContain(
			'"profileZone":"Africa/Kinshasa","profileOffset":"settings.preferences.UTC_OFFSET:{\\"offset\\":\\"+01:00\\"}","browserZone":"America/New York","browserOffset":"settings.preferences.UTC_OFFSET:{\\"offset\\":\\"-05:00\\"}"'
		);
		expect(screen.getByText('timeZoneNotice.DESCRIPTION')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'timeZoneNotice.USE:{"zone":"America/New York"}' }));
		fireEvent.click(screen.getByRole('button', { name: 'timeZoneNotice.KEEP:{"zone":"Africa/Kinshasa"}' }));
		fireEvent.click(screen.getByRole('button', { name: 'common.CLOSE' }));

		expect(mockAdopt).toHaveBeenCalledTimes(1);
		expect(mockKeep).toHaveBeenCalledTimes(1);
		expect(mockDismiss).toHaveBeenCalledTimes(1);
	});

	it('offers the browser zone to a profile without one, with nothing to keep', () => {
		mockState.notice = {
			...KINSHASA_TO_NEW_YORK,
			profileZone: null,
			profileOffset: null,
			pairKey: '|America/New_York'
		};

		render(<TimeZoneNotice />);

		expect(screen.getByText(/timeZoneNotice\.TITLE_NO_PROFILE_ZONE:/)).toBeTruthy();
		expect(screen.getByText('timeZoneNotice.DESCRIPTION_NO_PROFILE_ZONE')).toBeTruthy();
		expect(screen.queryByRole('button', { name: /timeZoneNotice\.KEEP/ })).toBeNull();
	});

	it('holds both answers while the zone is being saved', () => {
		mockState.isSaving = true;

		render(<TimeZoneNotice />);

		const main = screen.getByRole('button', { name: 'timeZoneNotice.SAVING' });
		expect((main as HTMLButtonElement).disabled).toBe(true);
		expect(main.getAttribute('aria-busy')).toBe('true');
		const keep = screen.getByRole('button', { name: /timeZoneNotice\.KEEP/ });
		expect((keep as HTMLButtonElement).disabled).toBe(true);
	});

	it('says the save failed and offers to try again', () => {
		mockState.hasFailed = true;

		render(<TimeZoneNotice />);

		expect(screen.getByText('timeZoneNotice.SAVE_FAILED')).toBeTruthy();
		expect(screen.getByText('timeZoneNotice.SAVE_FAILED_DESCRIPTION')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'timeZoneNotice.TRY_AGAIN' }));
		expect(mockAdopt).toHaveBeenCalledTimes(1);
	});
});
