/** @jest-environment jsdom */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
jest.mock('@/core/components/icons', () => {
	const Icon = () => null;
	return { Archive: Icon, Calendar: Icon, Tag: Icon, Users: Icon, X: Icon };
});
jest.mock('@/core/components/tasks/task-property-icon', () => ({ TaskPropertyPlaceholderIcon: () => null }));
jest.mock('@/core/components/common/command', () => ({ commandKeycapClass: '' }));
jest.mock('@/core/components/duplicated-components/_button', () => ({
	Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
		<button {...props}>{children}</button>
	)
}));

import { TaskSelectionBar } from './task-selection-bar';

function renderBar(canBulk: boolean) {
	const handlers = { onEdit: jest.fn(), onArchive: jest.fn(), onClear: jest.fn() };
	render(<TaskSelectionBar count={3} canBulk={canBulk} {...handlers} />);
	return handlers;
}

describe('the selection bar of a board', () => {
	it('opens the picker of each property against its button, Project and Due date included', () => {
		const { onEdit } = renderBar(true);
		const project = screen.getByText('taskMenus.fields.project');
		fireEvent.click(project);
		expect(onEdit).toHaveBeenCalledWith('project', project);
		fireEvent.click(screen.getByText('pages.taskDetails.DUE_DATE'));
		expect(onEdit).toHaveBeenLastCalledWith('dueDate', expect.any(HTMLElement));
	});

	it('offers Labels and Archive only with the bulk update, and always clears', () => {
		const { onArchive, onClear } = renderBar(true);
		fireEvent.click(screen.getByText('taskViews.ARCHIVE'));
		expect(onArchive).toHaveBeenCalledTimes(1);
		expect(screen.getByText('taskViews.LABELS')).toBeTruthy();
		fireEvent.click(screen.getByLabelText('pages.teamTasks.CLEAR_SELECTION'));
		expect(onClear).toHaveBeenCalledTimes(1);
	});

	it('leaves Labels and Archive out without the bulk update', () => {
		renderBar(false);
		expect(screen.queryByText('taskViews.ARCHIVE')).toBeNull();
		expect(screen.queryByText('taskViews.LABELS')).toBeNull();
		expect(screen.getByText('taskMenus.fields.status')).toBeTruthy();
	});
});
