/** @jest-environment jsdom */

import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';

import { userState } from '@/core/stores';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/hooks/settings/use-team-general-settings', () => ({
	useTeamGeneralSettings: () => ({ activeTeam: { id: 'team-a' }, isTeamManager: false })
}));
jest.mock('@/core/components/settings/kit/team-settings-gate', () => ({
	TeamSettingsGate: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
jest.mock('./team-identity-section', () => ({ TeamIdentitySection: () => null }));
jest.mock('./team-visibility-section', () => ({ TeamVisibilitySection: () => null }));
jest.mock('./team-default-project-section', () => ({ TeamDefaultProjectSection: () => null }));
jest.mock('./team-tracking-section', () => ({ TeamTrackingSection: () => null }));
jest.mock('./team-danger-section', () => ({ TeamDangerSection: () => null }));
jest.mock('./organization-tracking-section', () => ({
	OrganizationTrackingSection: () => <p>organization requirements</p>
}));
jest.mock('./organization-tracking-switch-section', () => ({
	OrganizationTrackingSwitchSection: () => <p>organization tracking switch</p>
}));

import { TeamGeneralSettingsPage } from './team-general-settings-page';

function renderPageAs(roleName: string) {
	const store = createStore();
	store.set(userState, { id: 'user-a', role: { name: roleName } } as never);
	render(
		<Provider store={store}>
			<TeamGeneralSettingsPage />
		</Provider>
	);
}

describe('TeamGeneralSettingsPage', () => {
	it("shows an organization admin the organization's tracking requirements", () => {
		renderPageAs('ADMIN');

		expect(screen.getByText('organization requirements')).toBeTruthy();
	});

	it('shows an organization admin who switches time tracking in the organization (#5015)', () => {
		renderPageAs('ADMIN');

		expect(screen.getByText('organization tracking switch')).toBeTruthy();
	});

	it('hides them from anyone else', () => {
		renderPageAs('EMPLOYEE');

		expect(screen.queryByText('organization requirements')).toBeNull();
		expect(screen.queryByText('organization tracking switch')).toBeNull();
	});
});
