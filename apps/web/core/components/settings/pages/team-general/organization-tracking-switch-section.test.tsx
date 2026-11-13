/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';

let mockOrganization: Record<string, unknown> | null = null;
const mockSaveRestriction = jest.fn(async () => undefined);

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/settings/use-organization-tracking-requirements', () => ({
	...jest.requireActual('@/core/hooks/settings/use-organization-tracking-requirements'),
	useOrganizationTrackingSwitchRule: () => ({ organization: mockOrganization, saveRestriction: mockSaveRestriction })
}));

import { OrganizationTrackingSwitchSection } from './organization-tracking-switch-section';

const restrictionSwitch = () =>
	document.getElementById('organization-restrictTrackingSwitchToHigherRoles') as HTMLElement | null;

/**
 * #5015: an organization's admins choose whether only someone of a higher role turns a person's time tracking on or
 * off. Off by default; Gauzy writes the switches as before then.
 */
describe('OrganizationTrackingSwitchSection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it.each([
		['on', true, 'true'],
		['off', false, 'false']
	])('shows the setting %s as the organization stores it', (_label, stored, checked) => {
		mockOrganization = { id: 'organization-a', name: 'Acme', restrictTrackingSwitchToHigherRoles: stored };

		render(<OrganizationTrackingSwitchSection />);

		expect(restrictionSwitch()?.getAttribute('aria-checked')).toBe(checked);
		expect(screen.getByText('settings.teamGeneral.TRACKING_SWITCH_SECTION')).toBeTruthy();
	});

	it('saves the setting an admin turns on', async () => {
		mockOrganization = { id: 'organization-a', name: 'Acme', restrictTrackingSwitchToHigherRoles: false };

		render(<OrganizationTrackingSwitchSection />);
		await act(async () => {
			fireEvent.click(restrictionSwitch() as HTMLElement);
		});

		expect(mockSaveRestriction).toHaveBeenCalledWith(true);
	});

	it('shows nothing for a Gauzy that does not serve the setting yet, which would refuse to save it', () => {
		mockOrganization = { id: 'organization-a', name: 'Acme', requireTeam: false };

		const { container } = render(<OrganizationTrackingSwitchSection />);

		expect(container.innerHTML).toBe('');
	});

	it('shows nothing until the organization is read', () => {
		mockOrganization = null;

		const { container } = render(<OrganizationTrackingSwitchSection />);

		expect(container.innerHTML).toBe('');
	});
});
