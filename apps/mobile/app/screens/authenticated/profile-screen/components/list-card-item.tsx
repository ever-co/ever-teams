/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useMemo, useState } from 'react';
import { View, TouchableNativeFeedback, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Text } from 'react-native-paper';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

// COMPONENTS
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { typography, useAppTheme, useWebTheme } from '../../../../theme';
import { cardEdgeOf } from '../../../../components/card-edge';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import WorkedOnTask from '../../../../components/worked-on-task';
import TaskStatus from '../../../../components/task-status';
import TimerButton from './timer-button';
import { observer } from 'mobx-react-lite';
import { IUserProfile } from '../logics/use-profile-screen-logic';
import TaskTitleDisplay from './task-title-display';
import AllTaskStatuses from '../../../../components/all-task-statuses';
import WorkedOnTaskHours from '../../../../components/worked-day-hours';
import EstimateTime from '../../timer-screen/components/estimate-time';
import { secondsToTime } from '../../../../helpers/date';
import { useTaskStatistics } from '../../../../services/hooks/features/use-task-statistics';
import { useStores } from '../../../../models';
import IssuesModal from '../../../../components/issues-modal';
import { SettingScreenNavigationProp } from '../../../../navigators/authenticated-navigator';
import { useNavigation } from '@react-navigation/native';
import { translate } from '../../../../i18n';
import { navigateTo } from '../../../../navigators/routes';
import ActionSheet from '../../../../components/action-sheet';
import { TaskCardHandlers, taskCardActionsOf } from './task-card-actions';

export type ListItemProps = {
	active?: boolean;
	task?: ITeamTask;
	isAssigned?: boolean;
	isAuthUser: boolean;
	activeAuthTask: boolean;
	viewType?: 'default' | 'unassign';
	profile?: IUserProfile;
	isNowTab?: boolean;
	index: number;
	openMenuIndex: number | null;
	setOpenMenuIndex: React.Dispatch<React.SetStateAction<number | null>>;
};

export interface Props extends ListItemProps {}

export const ListItemContent: React.FC<ListItemProps> = observer((props) => {
	const { colors } = useAppTheme();
	const {
		TimerStore: { timerStatus }
	} = useStores();

	const [editTitle, setEditTitle] = useState(false);
	const [enableEstimate, setEnableEstimate] = useState(false);

	const { h, m } = secondsToTime(props.task.estimate || 0);
	const { getTaskStat, activeTaskTotalStat } = useTaskStatistics();
	const { taskTotalStat } = getTaskStat(props.task);

	const progress = useMemo(() => {
		if (!props.isAuthUser) {
			return (taskTotalStat?.duration * 100) / props.task?.estimate;
		}

		return (activeTaskTotalStat?.duration * 100) / props.task?.estimate || 0;
	}, [timerStatus, props.activeAuthTask, activeTaskTotalStat]);

	const navigation = useNavigation<SettingScreenNavigationProp<'TaskScreen'>>();

	const menuHandlers: TaskCardHandlers = {
		editTitle: () => setEditTitle(true),
		editEstimate: () => setEnableEstimate(true),
		assign: () => props.profile?.assignTask(props.task),
		unassign: () => props.profile?.unassignTask(props.task)
	};

	const navigateToTask = (taskId: string) => {
		!editTitle && navigateTo(navigation, 'TaskScreen', { taskId });
	};

	return (
		<TouchableNativeFeedback
			onPressIn={() => {
				props.setOpenMenuIndex(null);
				setEditTitle(false);
				setEnableEstimate(false);
			}}
		>
			<View
				style={{
					...GS.p3,
					...GS.positionRelative,
					backgroundColor: colors.background,
					borderRadius: 14
				}}
			>
				<View style={styles.firstContainer}>
					<WorkedOnTask
						memberTask={props.task}
						isAuthUser={props.profile.isAuthUser}
						isActiveTask={props.activeAuthTask}
						title={translate('teamScreen.cardTotalTimeLabel')}
						containerStyle={{ flexDirection: 'row', alignItems: 'center' }}
						totalTimeText={{ color: colors.primary }}
					/>
					<TouchableOpacity
						testID="task-card-menu"
						hitSlop={12}
						onPress={() => props.setOpenMenuIndex(props.index)}
						style={{ height: 20 }}
					>
						<Ionicons name="ellipsis-vertical-outline" size={20} color={colors.primary} />
					</TouchableOpacity>
				</View>

				<View style={{ marginBottom: 16 }}>
					<View style={styles.wrapperTask}>
						<TouchableOpacity onPress={() => navigateToTask(props.task?.id)} style={{ width: '80%' }}>
							<View
								style={{
									flexDirection: 'row',
									width: '80%',
									alignItems: 'center'
								}}
							>
								<View style={{ marginRight: 3 }}>
									<IssuesModal task={props.task} readonly={true} />
								</View>

								<TaskTitleDisplay
									task={props.task}
									editMode={editTitle}
									setEditMode={setEditTitle}
									navigateToTask={navigateToTask}
								/>
							</View>
						</TouchableOpacity>
						{!enableEstimate ? (
							<TouchableOpacity onPress={() => setEnableEstimate(true)}>
								<AnimatedCircularProgress
									size={56}
									width={7}
									fill={progress}
									tintColor="#27AE60"
									backgroundColor="#F0F0F0"
								>
									{() => (
										<Text style={{ ...styles.progessText, color: colors.primary }}>
											{h !== 0 ? h + 'h' : m !== 0 ? m + 'm' : h + 'h'}
										</Text>
									)}
								</AnimatedCircularProgress>
							</TouchableOpacity>
						) : (
							<EstimateTime setEditEstimate={setEnableEstimate} currentTask={props.task} />
						)}
					</View>
					<AllTaskStatuses task={props.task} />
				</View>
				<View style={[styles.times, { borderTopColor: colors.border }]}>
					<View style={styles.wrapButton}>
						{props.isAuthUser && props.profile.member.isTrackingEnabled && (
							<TimerButton isActiveTask={props.activeAuthTask} task={props.task} />
						)}
						{!props.isAssigned && !props.isAuthUser && (
							<TouchableOpacity
								style={[styles.timerBtn, { backgroundColor: '#fff' }]}
								onPress={() => props.profile.assignTask(props.task)}
							>
								<Image
									resizeMode="contain"
									style={styles.timerIcon}
									source={require('../../../../../assets/icons/new/arrow-right.png')}
								/>
							</TouchableOpacity>
						)}
						{props.isAssigned ? (
							<WorkedOnTaskHours
								memberTask={props.task}
								title={translate('teamScreen.cardTodayWorkLabel')}
								containerStyle={{ alignItems: 'center' }}
								totalTimeText={{ color: colors.primary }}
							/>
						) : (
							<View style={{ left: 12, justifyContent: 'center', alignItems: 'center' }}>
								<Text style={[styles.timeHeading, { color: colors.tertiary }]}>
									{translate('tasksScreen.assignedTab')}
								</Text>
								<Text style={[styles.timeNumber, { color: colors.primary }]}>
									{translate('tasksScreen.assignedPeople', { count: props.task.members.length })}
								</Text>
							</View>
						)}
					</View>
					<TaskStatus containerStyle={styles.statusContainer} task={props.task} />
				</View>
				<ActionSheet
					visible={props.index === props.openMenuIndex}
					onClose={() => props.setOpenMenuIndex(null)}
					title={props.task?.title}
					actions={taskCardActionsOf(Boolean(props.isAssigned), menuHandlers, translate)}
				/>
			</View>
		</TouchableNativeFeedback>
	);
});

const ListCardItem: React.FC<Props> = (props) => {
	const { colors } = useAppTheme();
	const theme = useWebTheme();
	// STATS

	const { activeAuthTask } = props;
	// the task the timer runs on, in the worked tab: marked by the primary hairline, as the person's own card on Team
	const isCurrentTask = Boolean(activeAuthTask && props.isNowTab);

	return (
		<Card
			testID="profile-task-card"
			style={[styles.cardContainer, { borderColor: cardEdgeOf(isCurrentTask, theme) }]}
		>
			<View style={{ backgroundColor: colors.background, borderRadius: 14 }}>
				<ListItemContent {...props} />
			</View>
		</Card>
	);
};

export default ListCardItem;

const styles = StyleSheet.create({
	// The web's card: radius 14, a hairline and the light shadow
	cardContainer: {
		borderRadius: 14,
		borderWidth: StyleSheet.hairlineWidth,
		boxShadow: '0 1px 2px rgba(0, 0, 0, 0.065)'
	},
	firstContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 10
	},
	progessText: {
		fontFamily: typography.primary.semiBold,
		fontSize: 12
	},
	statusContainer: {
		alignItems: 'center',
		borderColor: 'transparent',
		height: 33,
		paddingHorizontal: 9,
		width: 120
	},
	timeHeading: {
		color: '#7E7991',
		fontFamily: typography.fonts.PlusJakartaSans.medium,
		fontSize: 10
	},
	timeNumber: {
		color: '#282048',
		fontFamily: typography.fonts.PlusJakartaSans.semiBold,
		fontSize: 14
	},
	timerBtn: {
		alignItems: 'center',
		borderColor: 'rgba(0, 0, 0, 0.4)',
		borderRadius: 20,
		borderWidth: 1,
		elevation: 10,
		height: 42,
		justifyContent: 'center',
		marginRight: 10,
		// shadowColor: "rgba(0,0,0,0.16)",
		// shadowOffset: { width: 5, height: 10 },
		// shadowOpacity: 1,
		// shadowRadius: 10,
		...GS.shadowSm,
		width: 42
	},
	timerIcon: {
		height: 21,
		width: 21
	},
	times: {
		alignItems: 'center',
		borderTopColor: 'rgba(0, 0, 0, 0.06)',
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingTop: 14
	},
	wrapButton: {
		alignItems: 'center',
		flexDirection: 'row'
	},
	wrapperTask: {
		alignItems: 'center',
		flexDirection: 'row',
		height: 42,
		justifyContent: 'space-between',
		paddingRight: 10,
		width: '100%'
	}
});
