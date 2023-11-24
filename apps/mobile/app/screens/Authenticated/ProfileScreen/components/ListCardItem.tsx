/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { FC, useMemo, useState } from 'react';
import { View, TouchableNativeFeedback, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';
import { Card, Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedCircularProgress } from 'react-native-circular-progress';

// COMPONENTS
import { ListItem } from '../../../../components';
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { spacing, typography, useAppTheme } from '../../../../theme';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import WorkedOnTask from '../../../../components/WorkedOnTask';
import TaskStatus from '../../../../components/TaskStatus';
import TimerButton from './TimerButton';
import { observer } from 'mobx-react-lite';
import { IUserProfile } from '../logics/useProfileScreenLogic';
import TaskTitleDisplay from './TaskTitleDisplay';
import AllTaskStatuses from '../../../../components/AllTaskStatuses';
import WorkedOnTaskHours from '../../../../components/WorkedDayHours';
import EstimateTime from '../../TimerScreen/components/EstimateTime';
import { secondsToTime } from '../../../../helpers/date';
import { useTaskStatistics } from '../../../../services/hooks/features/useTaskStatics';
import { useStores } from '../../../../models';
import IssuesModal from '../../../../components/IssuesModal';
import { SettingScreenNavigationProp } from '../../../../navigators/AuthenticatedNavigator';
import { useNavigation } from '@react-navigation/native';

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

	const navigateToTask = (taskId: string) => {
		!editTitle && navigation.navigate('TaskScreen', { taskId });
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
						title={'Total time'}
						containerStyle={{ flexDirection: 'row', alignItems: 'center' }}
						totalTimeText={{ color: colors.primary }}
					/>
					<TouchableOpacity
						onPress={() => props.setOpenMenuIndex(props.openMenuIndex === props.index ? null : props.index)}
						style={{ height: 20 }}
					>
						{props.index !== props.openMenuIndex ? (
							<Ionicons name="ellipsis-vertical-outline" size={20} color={colors.primary} />
						) : (
							<Entypo name="cross" size={20} color={colors.primary} />
						)}
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
								title={'Today Work'}
								containerStyle={{ alignItems: 'center' }}
								totalTimeText={{ color: colors.primary }}
							/>
						) : (
							<View style={{ left: 12, justifyContent: 'center', alignItems: 'center' }}>
								<Text style={[styles.timeHeading, { color: colors.tertiary }]}>Assigned</Text>
								<Text style={[styles.timeNumber, { color: colors.primary }]}>
									{props.task.members.length} people
								</Text>
							</View>
						)}
					</View>
					<TaskStatus containerStyle={styles.statusContainer} task={props.task} />
				</View>
				{props.index === props.openMenuIndex && (
					<SidePopUp
						setEditTitle={setEditTitle}
						setShowMenu={() => props.setOpenMenuIndex(null)}
						setEnableEstimate={setEnableEstimate}
						props={props}
					/>
				)}
			</View>
		</TouchableNativeFeedback>
	);
});

interface IMenuProps {
	setShowMenu: () => unknown;
	setEditTitle: (value: boolean) => unknown;
	setEnableEstimate: (value: boolean) => unknown;
	props: ListItemProps;
}
const SidePopUp: FC<IMenuProps> = ({ props, setShowMenu, setEditTitle, setEnableEstimate }) => {
	const { colors } = useAppTheme();
	const { isAssigned, task, profile } = props;
	return (
		<View
			style={{
				...GS.positionAbsolute,
				...GS.p2,
				...GS.mt1,
				...GS.pt1,
				...GS.shadow,
				...GS.r0,
				...GS.rounded,
				...GS.border,
				borderColor: colors.border,
				...GS.zIndexFront,
				width: 120,
				shadowColor: colors.border,
				marginRight: 27,
				backgroundColor: colors.background,
				minWidth: spacing.huge * 2
			}}
		>
			<View style={{}}>
				<ListItem
					textStyle={[styles.dropdownTxt, { color: colors.primary }]}
					onPress={() => {
						setEditTitle(true);
						setShowMenu();
					}}
				>
					Edit Task
				</ListItem>
				<ListItem
					textStyle={[styles.dropdownTxt, { color: colors.primary }]}
					onPress={() => {
						setEnableEstimate(true);
						setShowMenu();
					}}
				>
					Estimate
				</ListItem>

				{!isAssigned && (
					<ListItem
						textStyle={[styles.dropdownTxt, { color: colors.primary }]}
						onPress={() => {
							profile.assignTask(task);
							setShowMenu();
						}}
					>
						Assign Task
					</ListItem>
				)}

				{isAssigned && (
					<ListItem
						textStyle={[styles.dropdownTxt, { color: colors.primary }]}
						onPress={() => {
							profile.unassignTask(task);
							setShowMenu();
						}}
					>
						Unassign Task
					</ListItem>
				)}
			</View>
		</View>
	);
};

const ListCardItem: React.FC<Props> = (props) => {
	const { colors, dark } = useAppTheme();
	// STATS

	const { activeAuthTask } = props;

	return (
		<Card
			style={[
				styles.cardContainer,
				!dark && activeAuthTask && props.isNowTab && { borderColor: '#8C7AE4', borderWidth: 3 }
			]}
		>
			{dark ? (
				<LinearGradient
					colors={['#B993E6', '#6EB0EC', '#5855D8']}
					start={{ x: 0.1, y: 0.5 }}
					end={{ x: 1, y: 0.5 }}
					style={{ padding: activeAuthTask && props.isNowTab ? 3 : 0, borderRadius: 14 }}
				>
					<View style={{ backgroundColor: colors.background, borderRadius: 14 }}>
						<ListItemContent {...props} />
					</View>
				</LinearGradient>
			) : (
				<View style={{ backgroundColor: colors.background, borderRadius: 14 }}>
					<ListItemContent {...props} />
				</View>
			)}
		</Card>
	);
};

export default ListCardItem;

const styles = StyleSheet.create({
	cardContainer: {
		borderRadius: 14,
		elevation: 5,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 12 },
		shadowOpacity: 0.05,
		shadowRadius: 5
	},
	dropdownTxt: {
		color: '#282048',
		fontFamily: typography.primary.semiBold,
		fontSize: 14
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
