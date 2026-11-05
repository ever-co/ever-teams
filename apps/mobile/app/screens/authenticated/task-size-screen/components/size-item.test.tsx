/**
 * A row of Settings > Team > Task Sizes. Editing or deleting a size is a task settings write the API refuses to a user
 * who neither manages the size's team nor holds ORG_TASK_SETTING, so the screen shows the row read-only to them: the
 * edit and delete actions stay visible, disabled, and a press on them does nothing.
 */
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import SizeItem from './size-item';
import { ITaskSizeItem } from '../../../../services/interfaces/ITaskSize';

// Each icon as the text it renders, labelled with its glyph. The mock drops `disabled` on purpose: a press reaches any
// handler the row attaches, so only a handler withheld from a read-only row keeps it from acting
jest.mock('@expo/vector-icons', () => {
	const mockReact = jest.requireActual('react');
	const { Text: MockText } = jest.requireActual('react-native');
	const mockIcon = ({ name, disabled: _disabled, ...props }: { name: string; disabled?: boolean }) =>
		mockReact.createElement(MockText, { ...props, accessibilityLabel: name }, name);
	return { AntDesign: mockIcon, Ionicons: mockIcon };
});

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

		await fireEvent.press(screen.getByLabelText('edit'));
		await fireEvent.press(screen.getByLabelText('trash-outline'));

		expect(openForEdit).not.toHaveBeenCalled();
		expect(onDeleteSize).not.toHaveBeenCalled();
		expect(screen.getByLabelText('edit')).toBeDisabled();
		expect(screen.getByLabelText('trash-outline')).toBeDisabled();
	});

	it('edits and deletes a row the user may change', async () => {
		const { openForEdit, onDeleteSize } = await renderRow();

		await fireEvent.press(screen.getByLabelText('edit'));
		await fireEvent.press(screen.getByLabelText('trash-outline'));

		expect(openForEdit).toHaveBeenCalledTimes(1);
		expect(onDeleteSize).toHaveBeenCalledTimes(1);
		expect(screen.getByLabelText('edit')).toBeEnabled();
		expect(screen.getByLabelText('trash-outline')).toBeEnabled();
	});
});
