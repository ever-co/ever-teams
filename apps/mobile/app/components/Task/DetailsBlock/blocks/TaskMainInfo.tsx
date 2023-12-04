/* eslint-disable react-native/no-inline-styles  */
/* eslint-disable react-native/no-color-literals  */
import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import { useStores } from '../../../../models';
import TaskRow from '../components/TaskRow';
import { SvgXml } from 'react-native-svg';
import { calendarIcon, categoryIcon, clipboardIcon, peopleIconSmall, profileIcon } from '../../../svgs/icons';
import ProfileInfo from '../components/ProfileInfo';
import ManageAssignees from '../components/ManageAssignees';
import { useOrganizationTeam } from '../../../../services/hooks/useOrganization';
import CalendarModal from '../components/CalendarModal';
import { useTeamTasks } from '../../../../services/hooks/features/useTeamTasks';
import moment from 'moment-timezone';
import TaskStatus from '../../../TaskStatus';
import TaskSize from '../../../TaskSize';
import TaskPriority from '../../../TaskPriority';
import TaskLabels from '../../../TaskLabels';
import TaskVersion from '../../../TaskVersion';
import { useAppTheme } from '../../../../theme';
import { ITeamTask } from '../../../../services/interfaces/ITask';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { SettingScreenNavigationProp } from '../../../../navigators/AuthenticatedNavigator';
import TaskEpic from '../../../TaskEpic';
import IssuesModal from '../../../IssuesModal';
import { observer } from 'mobx-react-lite';
import { translate } from '../../../../i18n';

const TaskMainInfo = observer(() => {
	const {
		TaskStore: { detailedTask: task }
	} = useStores();

	const { currentTeam } = useOrganizationTeam();
	const { updateTask } = useTeamTasks();

	const { colors } = useAppTheme();

	return (
		<View style={{ paddingHorizontal: 12, gap: 12, paddingBottom: 12 }}>
			{/* Issue type */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={clipboardIcon} />
						<Text style={styles.labelText}>{translate('taskDetailsScreen.typeIssue')}</Text>
					</View>
				}
			>
				<IssuesModal task={task} nameIncluded={true} smallFont={true} />
			</TaskRow>
			{/* Creator */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={profileIcon} />
						<Text style={styles.labelText}>{translate('taskDetailsScreen.creator')}</Text>
					</View>
				}
			>
				<ProfileInfo
					userId={task?.creatorId || task?.creator?.id}
					profilePicSrc={task?.creator?.imageUrl}
					names={`${task?.creator?.firstName || ''} ${task?.creator?.lastName || ''}`}
				/>
			</TaskRow>
			{/* Assignees */}
			<TaskRow
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={peopleIconSmall} />
						<Text style={styles.labelText}>{translate('taskDetailsScreen.assignees')}</Text>
					</View>
				}
			>
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
				labelComponent={
					<View style={styles.labelComponent}>
						<SvgXml xml={calendarIcon} />
						<Text style={styles.labelText}>{translate('taskDetailsScreen.startDate')}</Text>
					</View>
				}
			>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, startDate: date }, task?.id)}
					selectedDate={task?.startDate}
				/>
			</TaskRow>

			{/* Manage Due Date */}
			<TaskRow
				labelComponent={
					<View style={[styles.labelComponent, { marginLeft: 19 }]}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.dueDate')}</Text>
					</View>
				}
			>
				<CalendarModal
					updateTask={(date) => updateTask({ ...task, dueDate: date }, task?.id)}
					selectedDate={task?.dueDate}
					isDueDate={true}
				/>
			</TaskRow>

			{/* Days Remaining */}
			{task?.startDate && task?.dueDate && (
				<TaskRow
					labelComponent={
						<View style={[styles.labelComponent, { marginLeft: 19 }]}>
							<Text style={styles.labelText}>{translate('taskDetailsScreen.daysRemaining')}</Text>
						</View>
					}
				>
					<Text style={{ fontWeight: '600', fontSize: 12, color: colors.primary }}>
						{moment(task?.dueDate).diff(moment(), 'days') < 0
							? 0
							: moment(task?.dueDate).diff(moment(), 'days')}
					</Text>
				</TaskRow>
			)}

			{/* horizontal separator */}
			<View style={styles.horizontalSeparator} />

			{/* Version */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.version')}</Text>
					</View>
				}
			>
				<TaskVersion
					task={task}
					containerStyle={{
						width: '70%',
						borderRadius: 3
					}}
				/>
			</TaskRow>

			{/* Epic */}
			{task && task.issueType === 'Story' && (
				<TaskRow
					alignItems={true}
					labelComponent={
						<View style={styles.labelComponent}>
							<Text style={styles.labelText}>{translate('taskDetailsScreen.epic')}</Text>
						</View>
					}
				>
					<TaskEpic
						task={task}
						containerStyle={{
							width: '70%',
							borderRadius: 3
						}}
					/>
				</TaskRow>
			)}
			{task && <EpicParent task={task} />}

			{/* Status */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.status')}</Text>
					</View>
				}
			>
				<TaskStatus
					task={task}
					canCreateStatus={true}
					containerStyle={{
						width: '70%',
						borderRadius: 3,
						borderWidth: !task?.status ? 1 : 0
					}}
				/>
			</TaskRow>

			{/* Labels */}
			<TaskRow
				labelComponent={
					<View style={[styles.labelComponent, { marginTop: 10 }]}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.labels')}</Text>
					</View>
				}
			>
				<TaskLabels
					task={task}
					taskScreenButton={true}
					noBorders={true}
					containerStyle={{
						width: '70%',
						borderRadius: 3,
						marginVertical: task?.tags.length ? 20 : 0
					}}
				/>
			</TaskRow>

			{/* Size */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.size')}</Text>
					</View>
				}
			>
				<TaskSize
					task={task}
					canCreateSize={true}
					containerStyle={{
						width: '70%',
						borderRadius: 3,
						borderWidth: !task?.size ? 1 : 0
					}}
				/>
			</TaskRow>

			{/* Priority */}
			<TaskRow
				alignItems={true}
				labelComponent={
					<View style={styles.labelComponent}>
						<Text style={styles.labelText}>{translate('taskDetailsScreen.priority')}</Text>
					</View>
				}
			>
				<TaskPriority
					task={task}
					canCreatePriority={true}
					containerStyle={{
						width: '70%',
						borderRadius: 3,
						borderWidth: !task?.priority ? 1 : 0
					}}
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
		navigation.navigate('TaskScreen', { taskId: task?.rootEpic?.id });
	};

	if (task?.issueType === 'Story') {
		return <></>;
	}
	return (!task?.issueType || task?.issueType === 'Task' || task?.issueType === 'Bug') && task?.rootEpic ? (
		<TaskRow
			alignItems={true}
			labelComponent={
				<View style={styles.labelComponent}>
					<Text style={styles.labelText}>{translate('taskDetailsScreen.epic')}</Text>
				</View>
			}
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
	epicParentButton: { alignItems: 'center', flexDirection: 'row', gap: 4, width: '60%' },
	epicParentIconWrapper: {
		backgroundColor: '#8154BA',
		borderRadius: 4,
		marginVertical: 5,
		padding: 4
	},
	horizontalSeparator: {
		borderBottomColor: '#F2F2F2',
		borderBottomWidth: 1,
		marginVertical: 10,
		width: '100%'
	},
	labelComponent: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 7
	},
	labelText: {
		color: '#A5A2B2',
		fontSize: 12
	}
});
