/** @jest-environment jsdom */

import { render, renderHook, screen } from '@testing-library/react';
import { ProjectGlyph } from '@/core/components/dashboards/time-activity/time-activity-cells';
import { useTimesheetFilterCategories } from '@/core/components/dashboards/timesheets/timesheets-filters';
import { NO_PROJECT_VALUE } from '@/core/lib/utils/dashboards/timesheets';
import { PRIVATE_PROJECTS_KEY } from '@/core/lib/utils/project-visibility';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { HiddenProjectMark, HiddenProjectName } from './hidden-project-mark';

/**
 * CORE-27 (ever-co/ever-teams#5370): a project the API keeps from the reader is drawn with the lock of private projects,
 * which says "You are not on this private project", and gathered under one "Private projects" filter choice beside
 * "No project".
 */

const HINT = 'You are not on this private project';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => {
		const messages: Record<string, string> = {
			'common.PRIVATE_PROJECT': 'Private project',
			'common.PRIVATE_PROJECTS': 'Private projects',
			'common.PRIVATE_PROJECT_HINT': HINT,
			'dashboard.timesheets.NO_PROJECT': 'No project'
		};
		return messages[key] ?? key;
	}
}));

describe('the lock of a project the API keeps from the reader', () => {
	it('says why on hover and on focus, and assistive technology reads the same sentence', () => {
		render(<HiddenProjectMark />);
		const mark = screen.getByRole('img', { name: HINT });

		expect(mark.getAttribute('tabindex')).toBe('0');
	});

	it('takes no focus inside a control that holds it', () => {
		render(<HiddenProjectMark isFocusable={false} />);

		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
	});

	it('names a record’s hidden project as a private project, beside the lock', () => {
		render(<HiddenProjectName label="Private project" />);

		expect(screen.getByText('Private project')).toBeTruthy();
		expect(screen.getByRole('img', { name: HINT })).toBeTruthy();
	});

	it('names a hidden project inside a control with a lock that leaves the focus to the control', () => {
		render(<HiddenProjectName label="Private projects" isFocusable={false} />);

		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
	});

	it('gives its hint to the control it sits in, which reads it on focus', () => {
		render(
			<button type="button">
				<HiddenProjectName label="Private projects" isFocusable={false} />
			</button>
		);

		expect(screen.getByRole('button', { name: `${HINT} Private projects` })).toBeTruthy();
	});

	it('takes the place of the project tile on the "Private projects" row of a report', () => {
		const privateProjects = {
			key: PRIVATE_PROJECTS_KEY,
			name: 'Private projects',
			imageUrl: null,
			color: null,
			seconds: 43200
		};
		render(<ProjectGlyph project={privateProjects} />);

		expect(screen.getByRole('img', { name: HINT })).toBeTruthy();
	});
});

describe('the Timesheets project filter of a reader who is not on some private projects', () => {
	it('offers "Private projects" and "No project" as two choices, and no hidden project by name or id', () => {
		const logOf = (id: string, project: Record<string, unknown> | null) =>
			({ id, projectId: project?.id ?? null, project }) as unknown as ITimeLog;
		const logs = [
			logOf('log-1', { id: 'project-client-x-redesign', projectHidden: true }),
			logOf('log-2', { id: 'project-internal-audit', projectHidden: true }),
			logOf('log-3', null),
			logOf('log-4', { id: 'project-website', name: 'Website' })
		];
		const { result } = renderHook(() =>
			useTimesheetFilterCategories({
				isManage: false,
				members: [],
				logs,
				clients: [],
				canFilterByClient: false,
				hasPickedClient: false
			})
		);
		const projects = result.current.find((category) => category.field === 'projects');

		expect(projects?.options.map((option) => [option.value, option.name])).toEqual([
			['project-website', 'Website'],
			[PRIVATE_PROJECTS_KEY, 'Private projects'],
			[NO_PROJECT_VALUE, 'No project']
		]);
	});
});
