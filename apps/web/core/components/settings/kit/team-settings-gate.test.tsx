/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import type { TOrganizationTeam, TUser } from '@/core/types/schemas';
import { activeTeamIdState, organizationTeamsState, userState } from '@/core/stores';
import { TeamSettingsGate } from './team-settings-gate';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('@/core/components/common/no-team', () => ({
	__esModule: true,
	default: () => <p>no-team</p>
}));

const ACTIVE_TEAM = {
	id: 'team-a',
	name: 'Atlas',
	createdByUserId: 'user-creator',
	members: [
		{ id: 'member-manager', isManager: true, employee: { userId: 'user-manager' } },
		{ id: 'member-employee', isManager: false, employee: { userId: 'user-employee' } }
	]
} as unknown as TOrganizationTeam;

function renderMembersGateAs(userId: string, roleName: string) {
	const store = createStore();
	store.set(userState, { id: userId, role: { name: roleName } } as unknown as TUser);
	store.set(organizationTeamsState, [ACTIVE_TEAM]);
	store.set(activeTeamIdState, 'team-a');
	render(
		<Provider store={store}>
			<TeamSettingsGate skeleton={<p>loading</p>} requiresManager>
				<p>members settings</p>
			</TeamSettingsGate>
		</Provider>
	);
}

it('opens Members settings to an organization admin who is not in the team', () => {
	renderMembersGateAs('user-admin', 'ADMIN');

	expect(screen.getByText('members settings')).toBeTruthy();
});

it('opens Members settings to a manager of the team', () => {
	renderMembersGateAs('user-manager', 'EMPLOYEE');

	expect(screen.getByText('members settings')).toBeTruthy();
});

it('keeps Members settings closed to a plain employee', () => {
	renderMembersGateAs('user-employee', 'EMPLOYEE');

	expect(screen.queryByText('members settings')).toBeNull();
	expect(screen.getByText('settings.common.MANAGERS_ONLY_TITLE')).toBeTruthy();
});
