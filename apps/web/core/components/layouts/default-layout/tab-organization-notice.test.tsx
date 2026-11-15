/** @jest-environment jsdom */
/**
 * Another tab opened another organization (#5134): this tab says it keeps working in its own one, or, once it can no
 * longer, asks where it works. It never opens the other organization while its own timer runs.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { TabOrganizationNotice } from './tab-organization-notice';

const mockTabOrganization = {
	state: 'shared' as 'shared' | 'own' | 'lost',
	ownOrganizationName: 'Ever Technologies',
	isTimerRunning: false,
	canBringOwnOrganizationBack: true,
	openSharedOrganization: jest.fn(),
	bringOwnOrganizationBack: jest.fn()
};

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, string>) =>
		values?.organization ? `${key} ${values.organization}` : key
}));
jest.mock('@/core/hooks/auth/use-tab-organization', () => ({
	useTabOrganization: () => mockTabOrganization
}));

beforeEach(() => {
	// The notice's status orb asks whether the person prefers reduced motion
	window.matchMedia = jest.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
	mockTabOrganization.state = 'shared';
	mockTabOrganization.isTimerRunning = false;
	mockTabOrganization.canBringOwnOrganizationBack = true;
	mockTabOrganization.openSharedOrganization.mockReset();
	mockTabOrganization.bringOwnOrganizationBack.mockReset();
});

describe('TabOrganizationNotice', () => {
	it('says nothing while the tab works with the shared cookies', () => {
		const { container } = render(<TabOrganizationNotice />);

		expect(container.innerHTML).toBe('');
	});

	it('says the tab keeps working in its own organization, and offers both ways out', () => {
		mockTabOrganization.state = 'own';

		render(<TabOrganizationNotice />);

		expect(screen.getByText('tabOrganizationNotice.TITLE')).toBeTruthy();
		expect(screen.getByText('tabOrganizationNotice.KEEPS_WORKING Ever Technologies')).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: 'tabOrganizationNotice.OPEN_HERE' }));
		expect(mockTabOrganization.openSharedOrganization).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByRole('button', { name: 'tabOrganizationNotice.BRING_BACK Ever Technologies' }));
		expect(mockTabOrganization.bringOwnOrganizationBack).toHaveBeenCalledTimes(1);
	});

	it('does not open the other organization here while its timer runs in its own one', () => {
		mockTabOrganization.state = 'own';
		mockTabOrganization.isTimerRunning = true;

		render(<TabOrganizationNotice />);

		expect(screen.getByText('tabOrganizationNotice.STOP_TIMER_FIRST Ever Technologies')).toBeTruthy();
		expect(
			(screen.getByRole('button', { name: 'tabOrganizationNotice.OPEN_HERE' }) as HTMLButtonElement).disabled
		).toBe(true);
		const bringBack = screen.getByRole('button', { name: 'tabOrganizationNotice.BRING_BACK Ever Technologies' });
		expect((bringBack as HTMLButtonElement).disabled).toBe(false);
	});

	it('asks where the tab works once it can no longer work in its own organization', () => {
		mockTabOrganization.state = 'lost';

		render(<TabOrganizationNotice />);

		expect(screen.getByText('tabOrganizationNotice.CANNOT_WORK_TITLE Ever Technologies')).toBeTruthy();
		expect(screen.getByText('tabOrganizationNotice.CANNOT_WORK')).toBeTruthy();
	});
});
