import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import TaskVersionPopup, { versionOptionOf } from './task-version-popup';
import { ITaskVersionItemList } from '../services/interfaces/ITaskVersion';

const mockVersions = [
	{ id: 'v1', name: 'Spring release', value: 'spring-release', color: '#5483BA' },
	{ id: 'v2', name: 'v2.0 beta', value: 'v2.0-beta', color: '#66BB97' }
] as ITaskVersionItemList[];

jest.mock('../services/hooks/features/use-task-version', () => ({
	useTaskVersion: () => ({
		taskVersionList: mockVersions,
		createTaskVersion: jest.fn(),
		updateTaskVersion: jest.fn()
	})
}));
jest.mock('../services/hooks/features/use-task-settings-access', () => ({
	useTaskSettingsAccess: () => ({ canCreate: true, readOnlyHint: 'read only' })
}));
jest.mock('../screens/authenticated/task-version-screen/components/task-version-form', () => {
	const { Text: MockText } = jest.requireActual('react-native');
	return { __esModule: true, default: () => <MockText>version form</MockText> };
});
jest.mock('../../src/components/icons', () => jest.requireActual('../../test/icons-stand-in').iconsStandIn());

const CHIP = { x: 16, y: 300, width: 120, height: 30 };

describe("a task's version menu", () => {
	it('lists the versions under their saved names, the one the task holds checked', async () => {
		await render(
			<TaskVersionPopup
				visible
				onDismiss={jest.fn()}
				versionName="v2.0-beta"
				setSelectedVersion={jest.fn()}
				anchor={CHIP}
			/>
		);

		expect(screen.getByPlaceholderText('taskMenus.search.version undefined')).toBeTruthy();
		expect(screen.getByLabelText('v2.0 beta')).toBeSelected();
		expect(screen.getByText('v2.0 beta')).not.toHaveStyle({ textTransform: 'capitalize' });
		expect(screen.getAllByTestId('icon-Tag')).toHaveLength(2);
	});

	it('hands the picked version over and closes', async () => {
		const setSelectedVersion = jest.fn();
		const onDismiss = jest.fn();
		await render(
			<TaskVersionPopup
				visible
				onDismiss={onDismiss}
				versionName=""
				setSelectedVersion={setSelectedVersion}
				anchor={CHIP}
			/>
		);

		await fireEvent.press(screen.getByLabelText('Spring release'));

		expect(setSelectedVersion).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
		expect(onDismiss).toHaveBeenCalledTimes(1);
	});

	it('opens the create form from Create version, in the dialog', async () => {
		await render(
			<TaskVersionPopup
				visible
				onDismiss={jest.fn()}
				versionName=""
				setSelectedVersion={jest.fn()}
				canCreateVersion
				anchor={CHIP}
			/>
		);

		await fireEvent.press(screen.getByLabelText('taskMenus.actions.createVersion undefined'));

		expect(screen.getByText('version form')).toBeTruthy();
	});
});

describe('a version as a row', () => {
	it('keeps its saved name and leaves its color to the muted tag, as on the web', () => {
		const option = versionOptionOf(mockVersions[1], 'v2.0-beta');

		expect(option).toMatchObject({ name: 'v2.0 beta', color: null, isSelected: true });
	});
});
