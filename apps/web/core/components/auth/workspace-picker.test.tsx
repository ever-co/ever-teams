/** @jest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ISigninEmailConfirmWorkspaces } from '@/core/types/interfaces/auth/auth';
import { setPathAfterSignIn } from '@/core/lib/auth/navigate-after-sign-in';
import { WorkspacePicker } from './workspace-picker';

// The page a site's sign-in sets before sending the person to sign in (#5528)
const CONSENT_PAGE = '/embed/authorize?origin=https%3A%2F%2Fteam.example.com&organization=organization-1';

const storedPath = () => JSON.parse(window.sessionStorage.getItem('ever-teams:path-after-sign-in') ?? '{}').path;

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

function renderPicker(
	workspaces: ISigninEmailConfirmWorkspaces[],
	selectedWorkspace: number,
	onBackButtonClick?: () => void
) {
	const onSubmit = jest.fn((event: { preventDefault: () => void }) => event.preventDefault());
	render(
		<WorkspacePicker
			workspaces={workspaces}
			onSubmit={onSubmit}
			onBackButtonClick={onBackButtonClick}
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

	it('signs in to the chosen workspace, then opens the creation of another one (#5025)', () => {
		const { onSubmit } = renderPicker([workspaceNamed('Acme', 2)], 0);

		fireEvent.click(screen.getByRole('button', { name: 'auth.workspace.CREATE_NEW' }));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(JSON.parse(window.sessionStorage.getItem('ever-teams:path-after-sign-in') ?? '{}').path).toBe(
			'/workspace/new'
		);
	});

	it('opens the home page again when Continue is chosen after all', () => {
		const { continueButton } = renderPicker([workspaceNamed('Acme', 2)], 0);
		fireEvent.click(screen.getByRole('button', { name: 'auth.workspace.CREATE_NEW' }));

		fireEvent.click(continueButton);

		expect(window.sessionStorage.getItem('ever-teams:path-after-sign-in')).toBeNull();
	});

	it('keeps the page another page set before the sign-in when Continue is chosen (#5528)', () => {
		window.sessionStorage.clear();
		setPathAfterSignIn(CONSENT_PAGE);
		const { continueButton } = renderPicker([workspaceNamed('Acme', 2)], 0);

		fireEvent.click(continueButton);

		expect(storedPath()).toBe(CONSENT_PAGE);
	});

	it('keeps that page when the person leaves the list ("Not you?") too', () => {
		window.sessionStorage.clear();
		setPathAfterSignIn(CONSENT_PAGE);
		renderPicker([workspaceNamed('Acme', 2)], 0, jest.fn());

		fireEvent.click(screen.getByRole('button', { name: 'auth.workspace.NOT_YOU' }));

		expect(storedPath()).toBe(CONSENT_PAGE);
	});

	it('drops the creation page when the person leaves the list ("Not you?")', () => {
		const onBack = jest.fn();
		renderPicker([workspaceNamed('Acme', 2)], 0, onBack);
		fireEvent.click(screen.getByRole('button', { name: 'auth.workspace.CREATE_NEW' }));

		fireEvent.click(screen.getByRole('button', { name: 'auth.workspace.NOT_YOU' }));

		expect(onBack).toHaveBeenCalledTimes(1);
		expect(window.sessionStorage.getItem('ever-teams:path-after-sign-in')).toBeNull();
	});
});
