/** @jest-environment jsdom */

import { act, fireEvent, render, screen } from '@testing-library/react';

let mockOrganization: Record<string, unknown> | null = null;
const mockSaveRequirement = jest.fn(async () => undefined);

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/settings/use-organization-tracking-requirements', () => ({
	...jest.requireActual('@/core/hooks/settings/use-organization-tracking-requirements'),
	useOrganizationTrackingRequirements: () => ({
		organization: mockOrganization,
		saveRequirement: mockSaveRequirement
	})
}));

import { OrganizationTrackingSection } from './organization-tracking-section';

const switchOf = (requirement: string) => document.getElementById(`organization-${requirement}`) as HTMLElement;

describe('OrganizationTrackingSection', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('shows each requirement as the organization stores it', () => {
		mockOrganization = { id: 'organization-a', name: 'Acme', requireTeam: true, requireProject: true };

		render(<OrganizationTrackingSection />);

		expect(switchOf('requireTeam').getAttribute('aria-checked')).toBe('true');
		expect(switchOf('requireProject').getAttribute('aria-checked')).toBe('true');
		expect(switchOf('requireTask').getAttribute('aria-checked')).toBe('false');
		expect(switchOf('requireClient').getAttribute('aria-checked')).toBe('false');
		expect(switchOf('requireDescription').getAttribute('aria-checked')).toBe('false');
	});

	it('saves the switch an admin turns off', async () => {
		mockOrganization = { id: 'organization-a', name: 'Acme', requireTeam: true };

		render(<OrganizationTrackingSection />);
		await act(async () => {
			fireEvent.click(switchOf('requireTeam'));
		});

		expect(mockSaveRequirement).toHaveBeenCalledWith('requireTeam', false);
	});

	it('shows the section loading until the organization is read', () => {
		mockOrganization = null;

		render(<OrganizationTrackingSection />);

		expect(screen.queryByRole('switch')).toBeNull();
		expect(screen.getByText('settings.teamGeneral.ORGANIZATION_TRACKING_SECTION')).toBeTruthy();
	});
});
