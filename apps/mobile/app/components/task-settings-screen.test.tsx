import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { runInAction } from 'mobx';
import { TaskSettingsScreen } from './task-settings-screen';

jest.mock('@gorhom/bottom-sheet', () => jest.requireActual('../../test/bottom-sheet-stand-in').bottomSheetStandIn());
jest.mock('./screen', () => {
	const { View } = jest.requireActual('react-native');
	return { Screen: View };
});
// The access rights in a MobX store, as the real hook reads them: the screen must follow a change of them
const mockRights = jest.requireActual('mobx').observable({ canCreate: true });
jest.mock('../services/hooks/features/use-task-settings-access', () => ({
	useTaskSettingsAccess: () => ({
		canCreate: mockRights.canCreate,
		canWriteRow: (row: { organizationTeamId?: string | null }) => row.organizationTeamId === 'team-1',
		readOnlyHint: 'Only team managers can change these settings.'
	})
}));

type Row = { id: string; name: string; organizationTeamId?: string | null };

const backlog: Row = { id: 'status-1', name: 'Backlog', organizationTeamId: 'team-1' };
const shared: Row = { id: 'status-2', name: 'Shared default', organizationTeamId: null };
const texts = {
	title: 'Task Statuses',
	listTitle: 'List of Statuses',
	create: 'Create new status',
	empty: 'No statuses yet'
};

function drawScreen(items: Row[], total = items.length) {
	const onBack = jest.fn();
	const drawing = render(
		<TaskSettingsScreen<Row>
			texts={texts}
			isLoading={false}
			items={items}
			total={total}
			keyOf={(item) => item.id}
			onBack={onBack}
			renderRow={(item, row) => (
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={`Edit ${item.name}`}
					accessibilityState={{ disabled: row.readOnly }}
					onPress={row.openForEdit}
				>
					<Text>{item.name}</Text>
				</Pressable>
			)}
			renderForm={(form) => (
				<>
					<Text>{`form for ${form.item?.name ?? 'a new value'}`}</Text>
					{form.isEdit && <Text>editing</Text>}
				</>
			)}
		/>
	);
	return { drawing, onBack };
}

describe('a team task settings list screen', () => {
	it('shows its title, its rows, each read-only where the team does not hold it, and the reason', async () => {
		const { drawing } = drawScreen([backlog, shared]);
		await drawing;

		expect(screen.getByText('Task Statuses')).toBeTruthy();
		expect(screen.getByText('List of Statuses')).toBeTruthy();
		expect(screen.getByText('Backlog')).toBeTruthy();
		expect(screen.getByLabelText('Edit Backlog').props.accessibilityState).toMatchObject({ disabled: false });
		expect(screen.getByLabelText('Edit Shared default').props.accessibilityState).toMatchObject({ disabled: true });
		expect(screen.getByText('Only team managers can change these settings.')).toBeTruthy();
	});

	it('opens the form to create from either Create button, and to edit from a row', async () => {
		const { drawing } = drawScreen([backlog]);
		await drawing;

		expect(screen.getAllByText('Create new status')).toHaveLength(2);
		await fireEvent.press(screen.getAllByText('Create new status')[1]);
		expect(screen.getByText('form for a new value')).toBeTruthy();
		expect(screen.queryByText('editing')).toBeNull();

		await fireEvent.press(screen.getByLabelText('Edit Backlog'));
		expect(screen.getByText('form for Backlog')).toBeTruthy();
		expect(screen.getByText('editing')).toBeTruthy();
	});

	it('says the list is empty once loaded without values', async () => {
		const { drawing } = drawScreen([], 0);
		await drawing;

		expect(screen.getByText('No statuses yet')).toBeTruthy();
	});

	it('follows a change of the access rights in their store', async () => {
		const { drawing } = drawScreen([backlog]);
		await drawing;
		expect(screen.queryByText('Only team managers can change these settings.')).toBeNull();

		await act(async () => {
			runInAction(() => {
				mockRights.canCreate = false;
			});
		});

		expect(screen.getByText('Only team managers can change these settings.')).toBeTruthy();
		runInAction(() => {
			mockRights.canCreate = true;
		});
	});
});
