/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { useStores } from '../../../../models';
import TaskRow from '../components/task-row';
import { PropertyLabel } from '../components/property-label';
import { Calendar, Clock, User, Users } from '../../../../../src/components/icons';
import { SvgXml } from 'react-native-svg';
import { categoryIcon } from '../../../svgs/icons';
import ProfileInfo from '../components/profile-info';
import { creatorIdOf, creatorOf } from './task-creator';
import ManageAssignees from '../components/manage-assignees';
import { useOrganizationTeam } from '../../../../services/hooks/use-organization';
import CalendarModal from '../components/calendar-modal';
import { useTeamTasks } from '../../../../services/hooks/features/use-team-tasks';
import moment from 'moment-timezone';
import TaskStatus from '../../../task-status';
import TaskSize from '../../../task-size';
import TaskPriority from '../../../task-priority';
import TaskLabels from '../../../task-labels';
import TaskVersion from '../../../task-version';
import { useAppTheme, useWebTheme } from '../../../../theme';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { SettingScreenNavigationProp } from '../../../../navigators/authenticated-navigator';
import TaskEpic from '../../../task-epic';
import IssuesModal from '../../../issues-modal';
import { observer } from 'mobx-react-lite';
import { translate } from '../../../../i18n';
import { navigateTo } from '../../../../navigators/routes';

const TaskMainInfo = observer(() => {
	const {
		TaskStore: { detailedTask: task }
	} = useStores();

	const { currentTeam } = useOrganizationTeam();
	const { updateTask } = useTeamTasks();

	const theme = useWebTheme();
	const creator = creatorOf(task);

	return (
		<View style={styles.properties}>
			{/* Issue type */}
			<TaskRow
				labelComponent={<PropertyLabel property="issueType" label={translate('taskDetailsScreen.typeIssue')} />}
			>
				<IssuesModal task={task} nameIncluded={true} smallFont={true} />
			</TaskRow>
			{/* Creator */}
			<TaskRow labelComponent={<PropertyLabel icon={User} label={translate('taskDetailsScreen.creator')} />}>
				<ProfileInfo
					userId={creatorIdOf(task)}
					profilePicSrc={creator?.imageUrl ?? ''}
					names={`${creator?.firstName || ''} ${creator?.lastName || ''}`}
				/>
			</TaskRow>
			{/* Assignees */}
			<TaskRow labelComponent={<PropertyLabel icon={Users} label={translate('taskDetailsScreen.assignees')} />}>
				{task?.members?.map((member, index) => (
					<ProfileInfo
						key={index}
						userId={member?.userId || member?.user?.id}
						profilePicSrc={member?.user?.imageUrl}
						names={`${member?.user?.firstName || ''} ${member?.user?.lastName || ''}`}
					/>
				))}

				{/* Manage Assignees */}
				<ManageAssignees memberList={currentTeam?.members} task={task} />
			</TaskRow>

			{/* Manage Start Date */}
			<TaskRow
				labelComponent={<PropertyLabel icon={Calendar} label={translate('taskDetailsScreen.startDate')} />}
			>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, startDate: date }, task?.id)}
					selectedDate={task?.startDate}
				/>
			</TaskRow>

			{/* Manage Due Date */}
			<TaskRow labelComponent={<PropertyLabel icon={Calendar} label={translate('taskDetailsScreen.dueDate')} />}>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, dueDate: date }, task?.id)}
					selectedDate={task?.dueDate}
					isDueDate={true}
				/>
			</TaskRow>

			{/* Days Remaining */}
			{task?.startDate && task?.dueDate && (
				<TaskRow
					labelComponent={<PropertyLabel icon={Clock} label={translate('taskDetailsScreen.daysRemaining')} />}
				>
					<Text style={[styles.daysRemaining, { color: theme.colors.foreground }]}>
						{moment(task?.dueDate).diff(moment(), 'days') < 0
							? 0
							: moment(task?.dueDate).diff(moment(), 'days')}
					</Text>
				</TaskRow>
			)}

			{/* horizontal separator */}
			<View style={[styles.horizontalSeparator, { borderBottomColor: theme.colors.border }]} />

			{/* Version */}
			<TaskRow
				alignItems={true}
				labelComponent={<PropertyLabel property="version" label={translate('taskDetailsScreen.version')} />}
			>
				<TaskVersion
					task={task}
					canCreateVersion={true}
					forDetails
				/>
			</TaskRow>

			{/* Epic */}
			{task && task.issueType === 'Story' && (
				<TaskRow
					alignItems={true}
					labelComponent={<PropertyLabel property="epic" label={translate('taskDetailsScreen.epic')} />}
				>
					<TaskEpic
						task={task}
						containerStyle={{
							width: '70%'
						}}
					/>
				</TaskRow>
			)}
			{task && <EpicParent task={task} />}

			{/* Status */}
			<TaskRow
				alignItems={true}
				labelComponent={<PropertyLabel property="status" label={translate('taskDetailsScreen.status')} />}
			>
				<TaskStatus
					task={task}
					canCreateStatus={true}
					forDetails
				/>
			</TaskRow>

			{/* Labels */}
			<TaskRow labelComponent={<PropertyLabel property="label" label={translate('taskDetailsScreen.labels')} />}>
				<TaskLabels
					task={task}
					forDetails
				/>
			</TaskRow>

			{/* Size */}
			<TaskRow
				alignItems={true}
				labelComponent={<PropertyLabel property="size" label={translate('taskDetailsScreen.size')} />}
			>
				<TaskSize
					task={task}
					canCreateSize={true}
					forDetails
				/>
			</TaskRow>

			{/* Priority */}
			<TaskRow
				alignItems={true}
				labelComponent={<PropertyLabel property="priority" label={translate('taskDetailsScreen.priority')} />}
			>
				<TaskPriority
					task={task}
					canCreatePriority={true}
					forDetails
				/>
			</TaskRow>
		</View>
	);
});

export default TaskMainInfo;

const EpicParent: React.FC<{ task: ITeamTask }> = ({ task }) => {
	const { colors } = useAppTheme();

	const navigation = useNavigation<SettingScreenNavigationProp<'TaskScreen'>>();

	const navigateToEpic = () => {
		navigateTo(navigation, 'TaskScreen', { taskId: task?.rootEpic?.id });
	};

	if (task?.issueType === 'Story') {
		return <></>;
	}
	return (!task?.issueType || task?.issueType === 'Task' || task?.issueType === 'Bug') && task?.rootEpic ? (
		<TaskRow
			alignItems={true}
			labelComponent={<PropertyLabel property="epic" label={translate('taskDetailsScreen.epic')} />}
		>
			<TouchableOpacity onPress={navigateToEpic} style={styles.epicParentButton}>
				<View style={styles.epicParentIconWrapper}>
					<SvgXml xml={categoryIcon} />
				</View>
				<Text
					ellipsizeMode="tail"
					numberOfLines={1}
					style={{ color: colors.primary, fontSize: 12 }}
				>{`#${task?.rootEpic?.number} ${task?.rootEpic?.title}`}</Text>
			</TouchableOpacity>
		</TaskRow>
	) : (
		<></>
	);
};

const styles = StyleSheet.create({
	daysRemaining: {
		fontSize: 13,
		fontWeight: '600'
	},
	epicParentButton: { alignItems: 'center', flexDirection: 'row', gap: 4, width: '60%' },
	epicParentIconWrapper: {
		backgroundColor: '#8154BA',
		borderRadius: 4,
		marginVertical: 5,
		padding: 4
	},
	horizontalSeparator: {
		borderBottomWidth: StyleSheet.hairlineWidth,
		marginVertical: 10,
		width: '100%'
	},
	properties: {
		gap: 4,
		paddingBottom: 12,
		paddingHorizontal: 16
	}
});
