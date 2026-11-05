/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { WorkspacePicker } from './workspace-picker';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

function workspaceNamed(name: string, teamCount: number) {
	const teams = Array.from({ length: teamCount }, (_, index) => ({
		team_id: `${name}-team-${index}`,
		team_name: `${name} team ${index}`,
		team_member_count: '3'
	}));
	return {
		token: `${name}-token`,
		user: { email: 'jane@example.test', name: 'Jane', tenant: { name } },
		current_teams: teams
	} as unknown as ISigninEmailConfirmWorkspaces;
}

function renderPicker(workspaces: ISigninEmailConfirmWorkspaces[], selectedWorkspace: number) {
	const onSubmit = jest.fn((event: { preventDefault: () => void }) => event.preventDefault());
	render(
		<WorkspacePicker
			workspaces={workspaces}
			onSubmit={onSubmit}
			selectedWorkspace={selectedWorkspace}
			setSelectedWorkspace={jest.fn()}
			selectedTeam=""
			setSelectedTeam={jest.fn()}
		/>
	);
	return { onSubmit, continueButton: screen.getByRole('button', { name: 'common.CONTINUE' }) };
}

describe('WorkspacePicker', () => {
	it('keeps Enter in the search from signing in to the selected workspace', () => {
		const workspaces = ['Acme', 'Beta', 'Corp', 'Delta', 'Echo', 'Foxtrot', 'Golf'].map((name) =>
			workspaceNamed(name, 1)
		);
		renderPicker(workspaces, 0);
		const search = screen.getByPlaceholderText('auth.workspace.SEARCH');
		fireEvent.change(search, { target: { value: 'golf' } });

		const isNotCancelled = fireEvent.keyDown(search, { key: 'Enter' });

		expect(isNotCancelled).toBe(false);
	});

	it('keeps Continue off while the selected workspace is not in the list', () => {
		const { continueButton } = renderPicker([workspaceNamed('Empty', 0), workspaceNamed('Acme', 2)], 0);

		expect(screen.queryByText('Empty')).toBeNull();
		expect(continueButton.hasAttribute('disabled')).toBe(true);
	});

	it('allows Continue on a listed workspace', () => {
		const { continueButton } = renderPicker([workspaceNamed('Empty', 0), workspaceNamed('Acme', 2)], 1);

		expect(continueButton.hasAttribute('disabled')).toBe(false);
	});

	it('states no expanded state on a workspace without a team list', () => {
		renderPicker([workspaceNamed('Empty', 0), workspaceNamed('Other', 0)], 0);

		const row = screen.getByText('Empty').closest('button');
		expect(row?.hasAttribute('aria-expanded')).toBe(false);
	});

	it('states the expanded state of a workspace with teams', () => {
		renderPicker([workspaceNamed('Acme', 2)], 0);

		const row = screen.getByText('Acme').closest('button');
		expect(row?.getAttribute('aria-expanded')).toBe('true');
	});
});
