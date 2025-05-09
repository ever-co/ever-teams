/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useCallback, useEffect } from 'react';
import { View, ViewStyle, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, Entypo } from '@expo/vector-icons';

// COMPONENTS
import { Card, ListItem } from '../../../../components';

// STYLES
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { spacing, typography, useAppTheme } from '../../../../theme';
import EstimateTime from '../../timer-screen/components/estimate-time';
import AllTaskStatuses from '../../../../components/all-task-statuses';
import { IOrganizationTeamWithMStatus, OT_Member } from '../../../../services/interfaces/IOrganizationTeam';
import {
	I_TeamMemberCardHook,
	I_TMCardTaskEditHook,
	useTeamMemberCard,
	useTMCardTaskEdit
} from '../../../../services/hooks/features/use-team-member-card';
import UserHeaderCard from './user-header-card';
import TaskInfo from './task-info';
import { observer } from 'mobx-react-lite';
import { TodayWorkedTime } from './today-work-time';
import { useNavigation } from '@react-navigation/native';
import { WorkedOnTask } from './worked-on-task';
import UnassignedTasksList from './unassigned-task-list';
import { translate } from '../../../../i18n';
import { useTimer } from '../../../../services/hooks/use-timer';
import { SettingScreenNavigationProp } from '../../../../navigators/authenticated-navigator';
import { getTimerStatusValue } from '../../../../helpers/get-timer-status';
import { useClickOutside } from 'react-native-click-outside';
import { TimeProgressBar } from './time-progress-bar';

export type ListItemProps = {
	member: OT_Member;
};

interface IcontentProps {
	memberInfo: I_TeamMemberCardHook;
	taskEdition: I_TMCardTaskEditHook;
	onPressIn?: (isTaskScreen?: boolean) => void;
}

export interface Props extends ListItemProps {
	index: number;
	openMenuIndex: number | null;
	setOpenMenuIndex: React.Dispatch<React.SetStateAction<number | null>>;
	currentTeam: IOrganizationTeamWithMStatus | null;
	canNavigate: boolean;
}

export const ListItemContent: React.FC<IcontentProps> = observer(({ memberInfo, taskEdition, onPressIn }) => {
	// HOOKS
	const { colors, dark } = useAppTheme();
	const clickOutsideTaskEstimationInputRef = useClickOutside<View>(() => taskEdition.setEstimateEditMode(false));
	return (
		<TouchableWithoutFeedback>
			<View
				style={[
					{
						...GS.p3,
						...GS.positionRelative,
						backgroundColor: dark ? '#1E2025' : colors.background
					},
					{ borderRadius: 14 }
				]}
			>
				<View style={styles.firstContainer} onTouchEnd={() => onPressIn && onPressIn()}>
					<UserHeaderCard user={memberInfo.memberUser} member={memberInfo.member} />
					<View style={styles.wrapTotalTime}>
						<TodayWorkedTime isAuthUser={memberInfo.isAuthUser} memberInfo={memberInfo} />
					</View>
				</View>

				<View style={[styles.wrapTaskTitle, { borderTopColor: colors.divider }]}>
					<TaskInfo
						editMode={taskEdition.editMode}
						setEditMode={taskEdition.setEditMode}
						memberInfo={memberInfo}
						onPressIn={() => onPressIn && onPressIn(true)}
					/>
					<View onTouchEnd={() => taskEdition.editMode && taskEdition.setEditMode(false)}>
						{memberInfo.memberTask ? <AllTaskStatuses task={memberInfo.memberTask} /> : null}
					</View>
				</View>
				<View style={[styles.times, { borderTopColor: colors.divider }]}>
					<TouchableWithoutFeedback>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
								height: 48,
								width: '100%',
								gap: 10
							}}
						>
							<View style={{ ...GS.alignCenter }}>
								<WorkedOnTask period="Daily" memberInfo={memberInfo} />
							</View>

							<View style={{ ...GS.alignCenter }}>
								<WorkedOnTask period="Total" memberInfo={memberInfo} />
							</View>

							{memberInfo.memberTask && taskEdition.estimateEditMode ? (
								<View
									style={styles.estimate}
									collapsable={false}
									ref={clickOutsideTaskEstimationInputRef}
								>
									<EstimateTime
										setEditEstimate={taskEdition.setEstimateEditMode}
										currentTask={memberInfo.memberTask}
									/>
								</View>
							) : (
								<TimeProgressBar
									isAuthUser={memberInfo.isAuthUser}
									memberInfo={memberInfo}
									onPress={() => taskEdition.setEstimateEditMode(true)}
								/>
							)}
						</View>
					</TouchableWithoutFeedback>
				</View>
			</View>
		</TouchableWithoutFeedback>
	);
});

const ListCardItem: React.FC<Props> = observer((props) => {
	const { colors, dark } = useAppTheme();
	//  STATS
	const memberInfo = useTeamMemberCard(props.member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const { timerStatus } = useTimer();
	const [showUnassignedList, setShowUnassignedList] = useState<boolean>(false);

	const navigation = useNavigation<SettingScreenNavigationProp<'Profile'>>();

	// Memoize handlers to prevent inline function creation on each render
	const handleMenuPress = useCallback(() => {
		props.setOpenMenuIndex(props.openMenuIndex === props.index ? null : props.index);
	}, [props.openMenuIndex, props.index, props.setOpenMenuIndex]);

	const handleBackPress = useCallback(() => {
		setShowUnassignedList(false);
	}, []);

	const onPressIn = useCallback((isTaskScreen?: boolean) => {
		taskEdition.setEditMode(false);
		taskEdition.setEstimateEditMode(false);
		props.setOpenMenuIndex(null);

		if (props.canNavigate) {
			isTaskScreen
				? memberInfo.memberTask && navigation.navigate('TaskScreen', { taskId: memberInfo.memberTask?.id })
				: navigation.navigate('Profile', {
						userId: memberInfo.memberUser.id,
						activeTab: 'worked'
				  });
		}
	}, [props, taskEdition, memberInfo, navigation]);

	// Handle task actions with memoized functions to prevent re-renders
	const handleEditTask = useCallback(() => {
		taskEdition.setEditMode(true);
		props.setOpenMenuIndex(null);
	}, [taskEdition, props]);

	const handleEditEstimate = useCallback(() => {
		taskEdition.setEstimateEditMode(true);
		props.setOpenMenuIndex(null);
	}, [taskEdition, props]);

	const handleShowUnassignedList = useCallback(() => {
		setShowUnassignedList(true);
		props.setOpenMenuIndex(null);
	}, [props]);

	const handleUnassignTask = useCallback(() => {
		memberInfo.unassignTask(taskEdition.task);
		props.setOpenMenuIndex(null);
	}, [memberInfo, taskEdition.task, props]);

	const handleMakeMemberManager = useCallback(() => {
		props.setOpenMenuIndex(null);
		memberInfo.makeMemberManager();
	}, [props, memberInfo]);

	const handleUnMakeMemberManager = useCallback(() => {
		props.setOpenMenuIndex(null);
		memberInfo.unMakeMemberManager();
	}, [props, memberInfo]);

	const handleRemoveMember = useCallback(() => {
		props.setOpenMenuIndex(null);
		memberInfo.removeMemberFromTeam();
	}, [props, memberInfo]);

	const currentMember = props.currentTeam?.members?.find((currentMember) => currentMember.id === props.member.id);

	const timerStatusValue = getTimerStatusValue(timerStatus, currentMember, props.currentTeam?.public);

	return (
		<Card
			style={{
				...$listCard,
				...GS.mt5,
				paddingTop: 4,
				backgroundColor:
					timerStatusValue === 'idle'
						? '#F1A2A2'
						: timerStatusValue === 'pause'
						? '#EBC386'
						: timerStatusValue === 'online'
						? '#88D1A5'
						: '#DCD6D6'
			}}
			HeadingComponent={
				<View
					style={{
						...GS.positionAbsolute,
						...GS.t0,
						...GS.r0,
						...GS.pt5,
						...GS.pr3,
						...GS.zIndexFront
					}}
				>
					<View
						style={{
							...GS.positionRelative,
							...GS.zIndexFront
						}}
					>
						<View
							style={{
								...GS.positionAbsolute,
								paddingHorizontal: 20,
								...GS.noBorder,
								...GS.r0,
								...GS.zIndexFront,
								...GS.shadowLg,
								shadowColor: 'rgba(0, 0, 0, 0.52)',
								borderRadius: 14,
								borderWidth: dark ? 1 : 0,
								borderColor: colors.border,
								width: 172,
								marginTop: -5,
								marginRight: 17,
								backgroundColor: colors.background,
								minWidth: spacing.huge * 2,
								...(props.index !== props.openMenuIndex ? { display: 'none' } : {})
							}}
						>
							<View style={{ marginVertical: 8 }}>
								{(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && taskEdition.task && (
									<ListItem
										textStyle={[styles.dropdownTxt, { color: colors.primary }]}
										onPress={handleEditTask}
									>
										{translate('tasksScreen.editTaskLabel')}
									</ListItem>
								)}
								{(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && taskEdition.task && (
									<ListItem
										textStyle={[styles.dropdownTxt, { color: colors.primary }]}
										onPress={handleEditEstimate}
									>
										{translate('myWorkScreen.estimateLabel')}
									</ListItem>
								)}

								{(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) &&
									memberInfo.memberUnassignTasks?.length > 0 && (
										<ListItem
											textStyle={[styles.dropdownTxt, { color: colors.primary }]}
											onPress={handleShowUnassignedList}
										>
											{translate('tasksScreen.assignTaskButton')}
										</ListItem>
									)}
								{(memberInfo.isAuthTeamManager || memberInfo.isAuthUser) && !!memberInfo.memberTask && (
									<ListItem
										textStyle={[styles.dropdownTxt, { color: colors.primary }]}
										onPress={handleUnassignTask}
									>
										{translate('tasksScreen.unassignTaskLabel')}
									</ListItem>
								)}

								{memberInfo.isAuthTeamManager &&
									!memberInfo.isAuthUser &&
									!memberInfo.isTeamCreator && (
										<>
											{memberInfo.isTeamManager ? (
												<ListItem
													textStyle={[styles.dropdownTxt, { color: colors.primary }]}
													onPress={handleUnMakeMemberManager}
												>
													{translate('tasksScreen.unMakeManager')}
												</ListItem>
											) : (
												<ListItem
													textStyle={[styles.dropdownTxt, { color: colors.primary }]}
													onPress={handleMakeMemberManager}
												>
													{translate('tasksScreen.makeManager')}
												</ListItem>
											)}
										</>
									)}
								{!memberInfo.isTeamOwner && (
									<ListItem
										textStyle={[styles.dropdownTxt, { color: '#DE5536' }]}
										style={{}}
										onPress={handleRemoveMember}
									>
										{translate('tasksScreen.remove')}
									</ListItem>
								)}
							</View>
						</View>
						{showUnassignedList ? (
							<TouchableOpacity onPress={handleBackPress}>
								<Ionicons name="chevron-back" size={24} color={colors.primary} />
							</TouchableOpacity>
						) : memberInfo.isAuthTeamManager || memberInfo.isAuthUser ? (
							<TouchableOpacity onPress={handleMenuPress}>
								{props.openMenuIndex !== props.index ? (
									<Ionicons name="ellipsis-vertical-outline" size={24} color={colors.primary} />
								) : (
									<Entypo name="cross" size={24} color={colors.primary} />
								)}
							</TouchableOpacity>
						) : null}
					</View>
				</View>
			}
			ContentComponent={
				<>
					{!showUnassignedList ? (
						<ListItemContent
							taskEdition={taskEdition}
							memberInfo={memberInfo}
							onPressIn={onPressIn}
						/>
					) : (
						<UnassignedTasksList memberInfo={memberInfo} setShowUnassignedList={setShowUnassignedList} />
					)}
				</>
			}
		/>
	);
});

export default ListCardItem;

const $listCard: ViewStyle = {
	...GS.flex1,
	...GS.p0,
	borderWidth: 0,
	...GS.shadowSm,
	...GS.roundedMd,
	minHeight: null,
	shadowOffset: { width: 0, height: 0 }
};

const styles = StyleSheet.create({
	dropdownTxt: {
		color: '#282048',
		fontFamily: typography.primary.semiBold,
		fontSize: 14,
		height: 36,
		width: '100%'
	},
	estimate: {
		alignItems: 'center',
		borderRadius: 5,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginLeft: 'auto',
		marginRight: 10,
		paddingVertical: 2
	},
	firstContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		width: '95%'
	},

	times: {
		alignItems: 'center',
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingTop: 16
	},

	wrapTaskTitle: {
		borderTopWidth: 1,
		marginTop: 16,
		paddingVertical: 16,
		width: '98%'
	},
	wrapTotalTime: {
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 30,
		position: 'absolute',
		right: 0
	}
});
