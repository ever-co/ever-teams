/** @jest-environment jsdom */

import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import type { TOrganization, TOrganizationProject } from '@/core/types/schemas';
import { PrivateProjectMark } from './private-project-mark';
import { ProjectVisibilityProperty } from './project-properties';

const HINT = 'Only its members and managers see this project';
const NOT_ENFORCED = 'Everyone still sees it until an admin turns on Private projects in the workspace settings.';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'pages.projects.visibility.PRIVATE_HINT': HINT,
			'pages.projects.visibility.NOT_ENFORCED': NOT_ENFORCED,
			'pages.projects.visibility.LABEL': 'Visibility',
			'pages.projects.visibility.PRIVATE_TITLE': 'Members and managers only',
			'pages.projects.visibility.EVERYONE_TITLE': 'Everyone in the organization'
		};
		return messages[key] ?? key;
	}
}));

/** Renders inside a workspace whose private projects setting is `enforced`; `undefined` is a Gauzy without it. */
function inWorkspace(ui: ReactNode, enforced: boolean | undefined) {
	const store = createStore();
	const organization = { id: 'organization-a', name: 'Acme' } as TOrganization;
	if (enforced !== undefined) {
		organization.enforcePrivateProjects = enforced;
	}
	store.set(currentOrganizationState, organization);
	return render(<Provider store={store}>{ui}</Provider>);
}

describe('the lock beside a private project name', () => {
	it.each([
		['everyone sees', true],
		['never chose', null]
	])('is not shown for a project %s', (_case, isPublic) => {
		const { container } = inWorkspace(<PrivateProjectMark project={{ public: isPublic }} />, true);

		expect(container.innerHTML).toBe('');
	});

	it.each([
		['keeps private projects private no longer', false],
		['runs on a Gauzy without the setting', undefined]
	])('promises nothing while the workspace %s, since everyone still sees the project', (_case, enforced) => {
		const { container } = inWorkspace(<PrivateProjectMark project={{ public: false }} />, enforced);

		expect(container.innerHTML).toBe('');
	});

	it('tells assistive technology why, and can be focused to show it on the project page', () => {
		inWorkspace(<PrivateProjectMark project={{ public: false }} />, true);

		const mark = screen.getByRole('img', { name: HINT });
		expect(mark.getAttribute('tabindex')).toBe('0');
	});

	it('takes no focus of its own inside a link, which carries the sentence in its name', () => {
		inWorkspace(
			<a href="/projects/project-1">
				Client X redesign
				<PrivateProjectMark project={{ public: false }} isFocusable={false} />
			</a>,
			true
		);

		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
		expect(screen.getByRole('link').textContent).toContain('Client X redesign');
	});

	it('shows its sentence when the link that holds the focus asks it to', async () => {
		inWorkspace(<PrivateProjectMark project={{ public: false }} isFocusable={false} isHintOpen />, true);

		expect(await screen.findByText(HINT)).toBeTruthy();
	});
});

describe('the Visibility property of the project page', () => {
	const privateProject = { id: 'project-1', name: 'Client X redesign', public: false } as TOrganizationProject;

	it('says a private project is kept to its people while the workspace keeps it so', () => {
		inWorkspace(<ProjectVisibilityProperty project={privateProject} />, true);

		expect(screen.getByText('Members and managers only')).toBeTruthy();
		expect(screen.queryByText(NOT_ENFORCED)).toBeNull();
	});

	it('says everyone still sees a project marked private while the workspace setting is off', () => {
		inWorkspace(<ProjectVisibilityProperty project={privateProject} />, false);

		expect(screen.getByText('Members and managers only')).toBeTruthy();
		expect(screen.getByText(NOT_ENFORCED)).toBeTruthy();
	});

	it('is not shown by a Gauzy without the setting', () => {
		const { container } = inWorkspace(<ProjectVisibilityProperty project={privateProject} />, undefined);

		expect(container.innerHTML).toBe('');
	});
});
