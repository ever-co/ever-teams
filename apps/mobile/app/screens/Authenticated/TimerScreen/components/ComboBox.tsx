/* eslint-disable camelcase */
/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import React, { FC, useState } from 'react';
import { Text } from 'react-native-paper';
import { View, StyleSheet, TouchableWithoutFeedback, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TaskDisplayBox from './TaskDisplayBox';
import { observer } from 'mobx-react-lite';
import { typography, useAppTheme } from '../../../../theme';
import { translate } from '../../../../i18n';
import { RTuseTaskInput } from '../../../../services/hooks/features/useTaskInput';
import IndividualTask from './IndividualTask';

export interface Props {
	tasksHandler: RTuseTaskInput;
	closeCombo: () => unknown;
	setEditMode: (val: boolean) => void;
}

const ComboBox: FC<Props> = observer(function ComboBox({ tasksHandler, closeCombo, setEditMode }) {
	const { colors } = useAppTheme();
	const [isScrolling, setIsScrolling] = useState<boolean>(false);

	return (
		<TouchableWithoutFeedback>
			<View style={styles.mainContainer}>
				<Pressable
					onPress={() => tasksHandler.handleTaskCreation()}
					style={[
						styles.createTaskBtn,
						{ backgroundColor: colors.background, borderColor: colors.secondary }
					]}
				>
					<Ionicons name="add-sharp" size={24} color={colors.secondary} />
					<Text style={[styles.createTaskTxt, { color: colors.secondary }]}>
						{translate('myWorkScreen.tabCreateTask')}
					</Text>
				</Pressable>
				<View style={styles.filterSection}>
					<Pressable onPress={() => tasksHandler.setFilter('open')}>
						<TaskDisplayBox
							count={tasksHandler.openTaskCount}
							openTask={true}
							selected={tasksHandler.filter === 'open'}
						/>
					</Pressable>
					<Pressable onPress={() => tasksHandler.setFilter('closed')}>
						<TaskDisplayBox
							count={tasksHandler.closedTaskCount}
							openTask={false}
							selected={tasksHandler.filter === 'closed'}
						/>
					</Pressable>
				</View>
				<View style={{ maxHeight: 315 }}>
					<FlatList
						onScrollBeginDrag={() => setIsScrolling(true)}
						onScrollEndDrag={() => setIsScrolling(false)}
						showsVerticalScrollIndicator={false}
						data={tasksHandler.filteredTasks}
						renderItem={({ item, index }) => (
							<IndividualTask
								key={index}
								onReopenTask={() => tasksHandler.handleReopenTask(item)}
								task={item}
								isScrolling={isScrolling}
								handleActiveTask={tasksHandler.setActiveTeamTask}
								closeCombo={closeCombo}
								setEditMode={setEditMode}
							/>
						)}
					/>
				</View>
			</View>
		</TouchableWithoutFeedback>
	);
});

const styles = StyleSheet.create({
	createTaskBtn: {
		alignItems: 'center',
		borderRadius: 10,
		borderWidth: 1.5,
		flexDirection: 'row',
		height: 33,
		justifyContent: 'center',
		paddingLeft: 24,
		paddingRight: 16,
		width: '100%'
	},
	createTaskTxt: {
		color: '#3826A6',
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 10,
		lineHeight: 12.6
	},
	filterSection: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 26,
		paddingBottom: 16,
		width: 232
	},

	mainContainer: {
		marginTop: 16,
		width: '100%',
		zIndex: 5
	}
});

export default ComboBox;
