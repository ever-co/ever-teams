/* eslint-disable camelcase */
/* eslint-disable react-native/no-color-literals */
/* eslint-disable react-native/no-inline-styles */
import React, { useState, useCallback } from 'react';
import { View, ViewStyle, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// COMPONENTS
import { Card } from '../../../../components';
import ActionSheet from '../../../../components/action-sheet';

// STYLES
import { GLOBAL_STYLE as GS } from '../../../../../assets/ts/styles';
import { useAppTheme, useWebTheme } from '../../../../theme';
import EstimateTime from '../../timer-screen/components/estimate-time';
import AllTaskStatuses from '../../../../components/all-task-statuses';
import { OT_Member } from '../../../../services/interfaces/IOrganizationTeam';
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
import { SettingScreenNavigationProp } from '../../../../navigators/authenticated-navigator';
import { cardEdgeOf } from '../../../../components/card-edge';
import { useClickOutside } from 'react-native-click-outside';
import { TimeProgressBar } from './time-progress-bar';
import { navigateTo } from '../../../../navigators/routes';
import { MemberCardViewer, memberCardActionsOf, showsMemberMenu } from './member-card-actions';

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
	canNavigate: boolean;
}

export const ListItemContent: React.FC<IcontentProps> = observer(({ memberInfo, taskEdition, onPressIn }) => {
	// HOOKS
	const { colors } = useAppTheme();
	const clickOutsideTaskEstimationInputRef = useClickOutside<View>(() => taskEdition.setEstimateEditMode(false));
	return (
		<TouchableWithoutFeedback>
			<View
				style={[
					{
						...GS.p3,
						...GS.positionRelative,
						backgroundColor: colors.background
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
	const { colors } = useAppTheme();
	//  STATS
	const memberInfo = useTeamMemberCard(props.member);
	const taskEdition = useTMCardTaskEdit(memberInfo.memberTask);
	const theme = useWebTheme();
	const [showUnassignedList, setShowUnassignedList] = useState<boolean>(false);

	const navigation = useNavigation<SettingScreenNavigationProp<'Profile'>>();

	// Memoize handlers to prevent inline function creation on each render
	const isMenuOpen = props.openMenuIndex === props.index;

	const handleMenuPress = useCallback(() => {
		props.setOpenMenuIndex(props.index);
	}, [props.index, props.setOpenMenuIndex]);

	const closeMenu = useCallback(() => {
		props.setOpenMenuIndex(null);
	}, [props.setOpenMenuIndex]);

	const handleBackPress = useCallback(() => {
		setShowUnassignedList(false);
	}, []);

	const onPressIn = useCallback(
		(isTaskScreen?: boolean) => {
			taskEdition.setEditMode(false);
			taskEdition.setEstimateEditMode(false);
			props.setOpenMenuIndex(null);

			if (props.canNavigate) {
				isTaskScreen
					? memberInfo.memberTask &&
						navigateTo(navigation, 'TaskScreen', { taskId: memberInfo.memberTask?.id })
					: navigateTo(navigation, 'Profile', {
							userId: memberInfo.memberUser.id,
							activeTab: 'worked'
						});
			}
		},
		[props, taskEdition, memberInfo, navigation]
	);

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

	const viewer: MemberCardViewer = {
		isAuthTeamManager: memberInfo.isAuthTeamManager,
		isAuthUser: memberInfo.isAuthUser,
		isTeamCreator: memberInfo.isTeamCreator,
		isTeamManager: memberInfo.isTeamManager,
		isTeamOwner: memberInfo.isTeamOwner,
		hasTask: Boolean(taskEdition.task),
		hasTasksToAssign: memberInfo.memberUnassignTasks?.length > 0,
		hasActiveTask: Boolean(memberInfo.memberTask)
	};
	const menuHandlers = {
		editTask: handleEditTask,
		editEstimate: handleEditEstimate,
		assignTask: handleShowUnassignedList,
		unassignTask: handleUnassignTask,
		makeManager: handleMakeMemberManager,
		unMakeManager: handleUnMakeMemberManager,
		remove: handleRemoveMember
	};
	const menuActions = memberCardActionsOf(viewer, menuHandlers, translate);
	const showMenuTrigger = !showUnassignedList && showsMemberMenu(viewer, menuActions);

	return (
		<Card
			testID="team-member-card"
			style={{
				...$listCard,
				...GS.mt5,
				backgroundColor: colors.background,
				borderColor: cardEdgeOf(memberInfo.isAuthUser, theme)
			}}
			HeadingComponent={
				<View style={styles.menuCorner}>
					{showUnassignedList && (
						<TouchableOpacity onPress={handleBackPress}>
							<Ionicons name="chevron-back" size={24} color={colors.primary} />
						</TouchableOpacity>
					)}
					{showMenuTrigger && (
						<TouchableOpacity testID="member-card-menu" hitSlop={12} onPress={handleMenuPress}>
							<Ionicons name="ellipsis-vertical-outline" size={24} color={colors.primary} />
						</TouchableOpacity>
					)}
					<ActionSheet
						visible={isMenuOpen}
						onClose={closeMenu}
						title={memberInfo.memberUser?.name}
						actions={menuActions}
					/>
				</View>
			}
			ContentComponent={
				<>
					{!showUnassignedList ? (
						<ListItemContent taskEdition={taskEdition} memberInfo={memberInfo} onPressIn={onPressIn} />
					) : (
						<UnassignedTasksList memberInfo={memberInfo} setShowUnassignedList={setShowUnassignedList} />
					)}
				</>
			}
		/>
	);
});

export default ListCardItem;

// The web's member card: radius 14, a hairline and the light shadow; presence shows on the avatar's badge
const $listCard: ViewStyle = {
	...GS.flex1,
	...GS.p0,
	borderWidth: StyleSheet.hairlineWidth,
	...GS.shadowSm,
	borderRadius: 14,
	minHeight: null
};

const styles = StyleSheet.create({
	estimate: {
		alignItems: 'center',
		borderRadius: 5,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginLeft: 'auto',
		marginRight: 10,
		paddingVertical: 2
	},
	menuCorner: {
		paddingRight: 15,
		paddingTop: 25,
		position: 'absolute',
		right: 0,
		top: 0,
		zIndex: 9999
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
	// in the row's flow at its right end, so a long name is cut short before the time instead of running under it
	wrapTotalTime: {
		alignItems: 'center',
		flexShrink: 0,
		justifyContent: 'center',
		marginLeft: 'auto',
		marginRight: 30,
		paddingLeft: 8
	}
});
