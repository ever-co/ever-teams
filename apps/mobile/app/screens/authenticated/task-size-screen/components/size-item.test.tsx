/**
 * A row of Settings > Team > Task Sizes. Editing or deleting a size is a task settings write the API refuses to a user
 * who neither manages the size's team nor holds ORG_TASK_SETTING, so the screen shows the row read-only to them: the
 * edit and delete actions stay visible, disabled, and a press on them does nothing.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SizeItem from './size-item';
import { ITaskSizeItem } from '../../../../services/interfaces/ITaskSize';

// The row's icons as their names; the row finds its buttons by the names a screen reader hears
jest.mock('../../../../../src/components/icons', () =>
	jest.requireActual('../../../../../test/icons-stand-in').iconsStandIn()
);

const SIZE: ITaskSizeItem = {
	id: 'size-1',
	createdAt: '',
	updatedAt: '',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	organizationTeamId: 'team-1',
	name: 'large',
	color: '#D4EFDF'
};

async function renderRow(readOnly?: boolean) {
	const openForEdit = jest.fn();
	const onDeleteSize = jest.fn();
	await render(<SizeItem size={SIZE} openForEdit={openForEdit} onDeleteSize={onDeleteSize} readOnly={readOnly} />);
	return { openForEdit, onDeleteSize };
}

describe('<SizeItem>', () => {
	it('keeps the edit and delete actions visible but disabled on a read-only row', async () => {
		const { openForEdit, onDeleteSize } = await renderRow(true);

		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).not.toHaveBeenCalled();
		expect(onDeleteSize).not.toHaveBeenCalled();
		expect(screen.getByLabelText(/edit/i)).toBeDisabled();
		expect(screen.getByLabelText(/delete/i)).toBeDisabled();
	});

	it('edits and deletes a row the user may change', async () => {
		const { openForEdit, onDeleteSize } = await renderRow();

		await fireEvent.press(screen.getByLabelText(/edit/i));
		await fireEvent.press(screen.getByLabelText(/delete/i));

		expect(openForEdit).toHaveBeenCalledTimes(1);
		expect(onDeleteSize).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText(/edit/i)).toBeEnabled();
		expect(screen.getByLabelText(/delete/i)).toBeEnabled();
	});
});
