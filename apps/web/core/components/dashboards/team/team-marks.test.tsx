/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react';
import type { ProjectShareItem } from '@/core/lib/utils/dashboards/team';
import { PRIVATE_PROJECTS_KEY } from '@/core/lib/utils/project-visibility';

jest.mock('next-intl', () => ({
	useLocale: () => 'en',
	useTranslations: () => (key: string) => key
}));

import { ProjectChip } from './team-project-chip';
import { ProjectMark } from './team-marks';

const HINT = 'common.PRIVATE_PROJECT_HINT';

const hiddenProjects = {
	key: PRIVATE_PROJECTS_KEY,
	name: 'Private projects',
	imageUrl: null,
	color: null,
	isNoProject: false,
	isProjectHidden: true,
	seconds: 3600
} as unknown as ProjectShareItem;

describe('ProjectMark, a project kept from the reader', () => {
	it('draws the lock, which takes the focus to tell what it means', () => {
		render(<ProjectMark imageUrl={null} color={null} isNoProject={false} isHidden />);

		expect(screen.getByRole('img', { name: HINT }).getAttribute('tabindex')).toBe('0');
	});

	it('leaves the focus to the control around it when it sits in one', () => {
		render(<ProjectMark imageUrl={null} color={null} isNoProject={false} isHidden isFocusable={false} />);

		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
	});
});

describe('ProjectChip, a project kept from the reader', () => {
	it('takes no focus inside a row button or a hidden chip', () => {
		render(<ProjectChip project={hiddenProjects} isFocusable={false} />);

		expect(screen.getByText('Private projects')).toBeTruthy();
		expect(screen.getByRole('img', { name: HINT }).hasAttribute('tabindex')).toBe(false);
	});
});
