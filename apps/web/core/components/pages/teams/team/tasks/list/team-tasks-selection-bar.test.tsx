/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({
	useTranslations: () => (key: string, values?: Record<string, unknown>) =>
		values ? `${key}(${Object.values(values).join(',')})` : key
}));

import { TeamTasksSelectionBar } from './team-tasks-states';

function renderBar(canBulk: boolean) {
	const onEdit = jest.fn();
	render(
		<TeamTasksSelectionBar count={2} canBulk={canBulk} onEdit={onEdit} onArchive={jest.fn()} onClear={jest.fn()} />
	);
	return { onEdit };
}

describe('TeamTasksSelectionBar', () => {
	it('offers project and due date for the selection, with or without the platform’s bulk update', () => {
		for (const canBulk of [false, true]) {
			const { onEdit } = renderBar(canBulk);
			const project = screen.getByRole('button', { name: 'taskMenus.fields.project' });
			const due = screen.getByRole('button', { name: 'pages.taskDetails.DUE_DATE' });

			fireEvent.click(project);
			fireEvent.click(due);

			expect(onEdit).toHaveBeenNthCalledWith(1, 'project', project);
			expect(onEdit).toHaveBeenNthCalledWith(2, 'dueDate', due);
			document.body.innerHTML = '';
		}
	});

	it('keeps the properties in their order, then Labels and Archive with the bulk update', () => {
		renderBar(true);
		const names = screen
			.getAllByRole('button')
			.map((button) => button.textContent?.trim())
			.filter(Boolean);
		expect(names.slice(0, 7)).toEqual([
			'taskMenus.fields.status',
			'taskMenus.fields.priority',
			'taskMenus.fields.size',
			'common.ASSIGNEE',
			'taskMenus.fields.project',
			'pages.taskDetails.DUE_DATE',
			'taskViews.LABELS'
		]);
		expect(names).toContain('taskViews.ARCHIVE');
	});
});
