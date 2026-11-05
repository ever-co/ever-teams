/** @jest-environment jsdom */
import { render } from '@testing-library/react';
import type { TAuthenticationPassword } from '@/core/hooks/auth/use-authentication-password';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { PasswordWorkspaceStep } from './workspace-steps';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));
jest.mock('next/navigation', () => ({
	useRouter: () => ({ refresh: jest.fn() })
}));
jest.mock('@/core/lib/helpers/index', () => ({
	...jest.requireActual('@/core/lib/helpers/index'),
	getAccessTokenCookie: () => ''
}));

const workspaceWithoutTeams = {
	token: 'solo-token',
	user: { email: 'jane@example.test', name: 'Jane', tenant: { name: 'Solo' } },
	current_teams: []
} as unknown as ISigninEmailConfirmWorkspaces;

function passwordFormWith(workspaces: ISigninEmailConfirmWorkspaces[]) {
	return {
		workspaces,
		defaultTeamId: undefined,
		getLastTeamIdWithRecentLogout: () => null,
		handleWorkspaceSubmit: jest.fn(),
		signInWorkspaceLoading: false,
		authScreen: { screen: 'workspace', setScreen: jest.fn() },
		setErrors: jest.fn(),
		// #4922's remembered team reads the signed-in address
		formValues: { email: 'jane@example.test', password: '' }
	} as unknown as TAuthenticationPassword;
}

describe('PasswordWorkspaceStep', () => {
	it('drops the selection an earlier account left when the new one has no team', () => {
		const setSelectedWorkspace = jest.fn();
		const setSelectedTeam = jest.fn();

		render(
			<PasswordWorkspaceStep
				form={passwordFormWith([workspaceWithoutTeams])}
				selection={{ selectedWorkspace: 2, setSelectedWorkspace, selectedTeam: 'old-team', setSelectedTeam }}
			/>
		);

		expect(setSelectedWorkspace).toHaveBeenLastCalledWith(0);
		expect(setSelectedTeam).toHaveBeenLastCalledWith('');
	});
});
