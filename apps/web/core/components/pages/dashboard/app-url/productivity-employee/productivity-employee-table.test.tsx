/** @jest-environment jsdom */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductivityEmployeeTable } from './productivity-employee-table';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string) => key
}));

jest.mock('@/core/components/duplicated-components/_pagination', () => ({
	Paginate: () => null
}));

jest.mock('../productivity-project/states', () => ({
	EmptyState: () => null
}));

function activity(projectName?: string) {
	return {
		title: 'Code editor',
		duration: '3600',
		duration_percentage: '50',
		employeeId: 'employee-1',
		projectId: projectName ? 'project-1' : null,
		date: '2026-09-18',
		sessions: '1',
		projectName
	};
}

function renderRows(...activities: ReturnType<typeof activity>[]) {
	const data = [
		{
			employee: { id: 'employee-1', fullName: 'Jane Doe', user: { imageUrl: null } },
			dates: [{ date: '2026-09-18', projects: [{ activity: activities }] }]
		}
	];
	return render(<ProductivityEmployeeTable data={data} />);
}

describe('ProductivityEmployeeTable project badge', () => {
	it("shows the row's project initials, not a hard-coded brand", () => {
		const { container } = renderRows(activity('Website Redesign'));

		expect(screen.getByText('Website Redesign')).toBeTruthy();
		expect(screen.getByText('WR')).toBeTruthy();
		expect(container.textContent).not.toContain('Ever');
	});

	it('keeps the badge empty for activities without a project', () => {
		const { container } = renderRows(activity());

		expect(screen.getByText('No project')).toBeTruthy();
		const badge = container.querySelector('[aria-hidden="true"].rounded-md');
		expect(badge?.textContent).toBe('');
		expect(container.textContent).not.toContain('Ever');
	});
});
