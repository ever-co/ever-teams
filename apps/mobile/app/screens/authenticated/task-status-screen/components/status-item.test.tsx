/**
 * A row of Settings > Team > Task Statuses. Editing or deleting a status is a task settings write the API refuses to a
 * user who neither manages the status's team nor holds ORG_TASK_SETTING, so the screen shows the row read-only to them:
 * the edit and delete actions stay visible, disabled.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import StatusItem from './status-item';
import { ITaskStatusItem } from '../../../../services/interfaces/ITaskStatus';

jest.mock('../../../../../src/components/menu-anchor', () =>
	jest.requireActual('../../../../../test/menu-anchor-stand-in').menuAnchorStandIn()
);

const STATUS: ITaskStatusItem = {
	id: 'status-1',
	createdAt: '',
	updatedAt: '',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1',
	name: 'in-review',
	color: '#D4EFDF'
};

async function renderRow(readOnly?: boolean) {
	const openForEdit = jest.fn();
	const onDeleteTask = jest.fn();
	await render(
		<StatusItem status={STATUS} openForEdit={openForEdit} onDeleteTask={onDeleteTask} readOnly={readOnly} />
	);
	return { openForEdit, onDeleteTask };
}

describe('<StatusItem>', () => {
	it('keeps the edit and delete actions visible but disabled on a read-only row', async () => {
		const { openForEdit, onDeleteTask } = await renderRow(true);

		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).not.toHaveBeenCalled();
		expect(onDeleteTask).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/edit/i)).toBeDisabled();
		expect(screen.getByLabelText(/delete/i)).toBeDisabled();
	});

	it('edits and deletes a row the user may change', async () => {
		const { openForEdit, onDeleteTask } = await renderRow();

		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).toHaveBeenCalledTimes(1);
		expect(onDeleteTask).toHaveBeenCalledTimes(1);
		await fireEvent.press(screen.getByTestId('task-setting-actions'));
		expect(screen.getByLabelText(/edit/i)).toBeEnabled();
		expect(screen.getByLabelText(/delete/i)).toBeEnabled();
	});

	it("reads the status's name formatted, as the list always showed it", async () => {
		await renderRow();

		expect(screen.getByText('In Review')).toBeTruthy();
	});
});
