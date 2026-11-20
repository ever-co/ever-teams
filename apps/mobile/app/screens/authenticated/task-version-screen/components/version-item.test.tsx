/**
 * A row of Settings > Team > Task Versions. Editing or deleting a version is a task settings write the API refuses to
 * a user who neither manages the version's team nor holds ORG_TASK_SETTING, so the screen shows the row read-only to
 * them: the edit and delete actions stay visible, disabled, and a press on them does nothing.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import VersionItem from './version-item';
import { ITaskVersionItemList } from '../../../../services/interfaces/ITaskVersion';

// The row's icons as their names; the row finds its buttons by the names a screen reader hears
jest.mock('../../../../../src/components/icons', () =>
	jest.requireActual('../../../../../test/icons-stand-in').iconsStandIn()
);

const VERSION: ITaskVersionItemList = {
	id: 'version-1',
	createdAt: '',
	updatedAt: '',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1',
	name: 'v1.0'
};

async function renderRow(readOnly?: boolean) {
	const openForEdit = jest.fn();
	const onDeleteTask = jest.fn();
	await render(
		<VersionItem version={VERSION} openForEdit={openForEdit} onDeleteTask={onDeleteTask} readOnly={readOnly} />
	);
	return { openForEdit, onDeleteTask };
}

describe('<VersionItem>', () => {
	it('keeps the edit and delete actions visible but disabled on a read-only row', async () => {
		const { openForEdit, onDeleteTask } = await renderRow(true);

		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).not.toHaveBeenCalled();
		expect(onDeleteTask).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/edit/i)).toBeDisabled();
		expect(screen.getByLabelText(/delete/i)).toBeDisabled();
	});

	it('edits and deletes a row the user may change', async () => {
		const { openForEdit, onDeleteTask } = await renderRow();

		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).toHaveBeenCalledTimes(1);
		expect(onDeleteTask).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText(/edit/i)).toBeEnabled();
		expect(screen.getByLabelText(/delete/i)).toBeEnabled();
	});
});
