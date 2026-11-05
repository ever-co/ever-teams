/** @jest-environment jsdom */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TeamDefaultProjectSection } from './team-default-project-section';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => ({ Spinner: () => null }));
jest.mock('@/core/components/common/select', () => ({
	Select: ({
		children,
		onValueChange
	}: React.PropsWithChildren<{ onValueChange: (value: string | null) => void }>) => (
		<div data-testid="default-project-select">
			{children}
			<button type="button" onClick={() => onValueChange('project-b')}>
				pick project-b
			</button>
		</div>
	),
	SelectTrigger: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	SelectValue: ({ children }: React.PropsWithChildren) => <span>{children}</span>,
	SelectContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
	SelectItem: ({ children }: React.PropsWithChildren) => <div>{children}</div>
}));

const TEAM = {
	id: 'team-1',
	name: 'Support',
	defaultProjectId: 'project-a',
	projects: [
		{ id: 'project-a', name: 'Support project' },
		{ id: 'project-b', name: 'Billing' }
	]
};

function renderSection(team: object, canEdit: boolean, saveDefaultProject = jest.fn(async () => undefined)) {
	render(
		<TeamDefaultProjectSection team={team as never} canEdit={canEdit} saveDefaultProject={saveDefaultProject} />
	);
	return saveDefaultProject;
}

describe('TeamDefaultProjectSection', () => {
	it("lets a manager pick another of the team's projects as the default", async () => {
		const save = renderSection(TEAM, true);

		await act(async () => {
			fireEvent.click(screen.getByText('pick project-b'));
		});

		expect(save).toHaveBeenCalledWith('project-b');
	});

	it('shows a member the default project by name, with nothing to change', () => {
		renderSection(TEAM, false);

		expect(screen.getByText('Support project')).toBeTruthy();
		expect(screen.queryByTestId('default-project-select')).toBeNull();
	});

	it('shows the first project for a team that names none yet, as the app uses it', () => {
		renderSection({ ...TEAM, defaultProjectId: null }, false);

		expect(screen.getByText('Support project')).toBeTruthy();
	});

	it('offers a manager no picker while the API does not keep a default project, and shows the one in use', () => {
		const teamFromApiWithoutDefault = { id: TEAM.id, name: TEAM.name, projects: TEAM.projects };
		renderSection(teamFromApiWithoutDefault, true);

		expect(screen.getByText('Support project')).toBeTruthy();
		expect(screen.queryByTestId('default-project-select')).toBeNull();
	});

	it('says the default is not set, with no picker, for a team without projects', () => {
		renderSection({ ...TEAM, defaultProjectId: null, projects: [] }, true);

		expect(screen.getByText('settings.teamGeneral.NOT_SET')).toBeTruthy();
		expect(screen.queryByTestId('default-project-select')).toBeNull();
	});
});
