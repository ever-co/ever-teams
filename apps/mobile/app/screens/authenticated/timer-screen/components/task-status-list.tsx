/* eslint-disable react-native/no-color-literals */
import React, { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ITaskStatus, ITeamTask } from '../../../../services/interfaces/ITask';

// COMPONENTS
import { useStores } from '../../../../models';
import { observer } from 'mobx-react-lite';

// STYLES
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { typography, useAppTheme } from '../../../../theme';
import { BadgedTaskStatus } from '../../../../components/StatusIcon';
import { useTeamTasks } from '../../../../services/hooks/features/useTeamTasks';
import { showMessage } from 'react-native-flash-message';
import { useTaskStatus } from '../../../../services/hooks/features/useTaskStatus';

export interface Props {
	onDismiss: () => unknown;
}

const TaskStatusList: FC<Props> = observer(({ onDismiss }) => {
	const { updateTask } = useTeamTasks();
	const { colors } = useAppTheme();
	const {
		TaskStore: { activeTask, setActiveTask }
	} = useStores();

	const { allStatuses } = useTaskStatus();

	const OnItemPressed = (text) => {
		onChangeStatus(text);
		onDismiss();
	};

	const onChangeStatus = async (text) => {
		const value: ITaskStatus = text;
		const task: ITeamTask = {
			...activeTask,
			status: value
		};

		const { response } = await updateTask(task, task.id);

		if (response.status === 202 || response.status === 200 || response.status === 201) {
			setActiveTask(task);
			showMessage({
				message: 'Update success',
				type: 'success'
			});
		}
	};

	return (
		<View style={[styles.dropdownContainer, { backgroundColor: colors.background }]}>
			{allStatuses.map((item, idx) => (
				<TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => OnItemPressed(item)}>
					<BadgedTaskStatus TextSize={10} iconSize={10} status={item.name} />
				</TouchableOpacity>
			))}
		</View>
	);
});

export default TaskStatusList;

const styles = StyleSheet.create({
	dropdownContainer: {
		borderRadius: 5,
		minWidth: 135,
		paddingHorizontal: 5,
		position: 'absolute',
		top: 37,
		width: '100%',
		zIndex: 1000,
		...GS.noBorder,
		borderWidth: 1,
		elevation: 10,
		shadowColor: 'rgba(0, 0, 0, 0.1)',
		shadowOffset: { width: 10, height: 10.5 },
		shadowOpacity: 1,
		shadowRadius: 15
	},
	dropdownItem: {
		alignItems: 'center',
		flexDirection: 'row',
		paddingVertical: 2
	},
	dropdownItemTxt: {
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10
	},
	iconStyle: {
		height: 12,
		marginRight: 5,
		width: 12
	}
});
