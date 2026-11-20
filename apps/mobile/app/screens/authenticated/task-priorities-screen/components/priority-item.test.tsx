/**
 * A row of Settings > Team > Task Priorities. Editing or deleting a priority is a task settings write the API refuses
 * to a user who neither manages the priority's team nor holds ORG_TASK_SETTING, so the screen shows the row read-only
 * to them: the edit and delete actions stay visible, disabled, and a press on them does nothing.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PriorityItem from './priority-item';
import { ITaskPriorityItem } from '../../../../services/interfaces/ITaskPriority';

jest.mock('../../../../../src/components/menu-anchor', () =>
	jest.requireActual('../../../../../test/menu-anchor-stand-in').menuAnchorStandIn()
);

const PRIORITY: ITaskPriorityItem = {
	id: 'priority-1',
	createdAt: '',
	updatedAt: '',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1',
	name: 'urgent',
	color: '#D4EFDF'
};

async function renderRow(readOnly?: boolean) {
	const openForEdit = jest.fn();
	const onDeletePriority = jest.fn();
	await render(
		<PriorityItem
			priority={PRIORITY}
			openForEdit={openForEdit}
			onDeletePriority={onDeletePriority}
			readOnly={readOnly}
		/>
	);
	return { openForEdit, onDeletePriority };
}

describe('<PriorityItem>', () => {
	it('keeps the edit and delete actions visible but disabled on a read-only row', async () => {
		const { openForEdit, onDeletePriority } = await renderRow(true);

		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).not.toHaveBeenCalled();
		expect(onDeletePriority).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/edit/i)).toBeDisabled();
		expect(screen.getByLabelText(/delete/i)).toBeDisabled();
	});

	it('edits and deletes a row the user may change', async () => {
		const { openForEdit, onDeletePriority } = await renderRow();

		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).toHaveBeenCalledTimes(1);
		expect(onDeletePriority).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		expect(screen.getByLabelText(/edit/i)).toBeEnabled();
		expect(screen.getByLabelText(/delete/i)).toBeEnabled();
	});
});
