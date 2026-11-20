/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-native/no-color-literals */
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Dimensions } from 'react-native';
import React, { ComponentProps, SetStateAction, useCallback, useEffect, useState } from 'react';
import { useStores } from '../../../models';
import { typography, useAppTheme, useWebTheme } from '../../../theme';
import { Feather } from '@expo/vector-icons';
import IconButton from './icon-button';
import * as Clipboard from 'expo-clipboard';
import { useTeamTasks } from '../../../services/hooks/features/use-team-tasks';
import { showMessage } from 'react-native-flash-message';
import { translate } from '../../../i18n';
import { TaskEyebrow } from './task-eyebrow';
import { ITeamTask } from '../../../services/interfaces/ITask';
import { limitTextCharaters } from '../../../helpers/sub-text';
import CreateParentTaskModal from './create-parent-task-modal';
import { observer } from 'mobx-react-lite';
import { useNavigation } from '@react-navigation/native';
import { SettingScreenNavigationProp } from '../../../navigators/authenticated-navigator';
import { navigateTo } from '../../../navigators/routes';

const TaskTitleBlock = observer(() => {
	const {
		TaskStore: { detailedTask: task },
		teamStore: { activeTeam }
	} = useStores();

	const { colors } = useAppTheme();
	const theme = useWebTheme();

	const [title, setTitle] = useState<string>('');
	const [edit, setEdit] = useState<boolean>(false);

	const { updateTitle } = useTeamTasks();

	const saveTitle = useCallback((newTitle: string) => {
		if (newTitle.length > 255) {
			showMessage({
				message: translate('taskDetailsScreen.characterLimitErrorTitle'),
				description: translate('taskDetailsScreen.characterLimitErrorDescription'),
				type: 'danger'
			});
			return;
		}
		updateTitle(newTitle, task, true);
		setEdit(false);
	}, []);

	useEffect(() => {
		if (!edit) {
			task && setTitle(task?.title);
		}
	}, [task?.title, edit]);

	const copyTitle = () => {
		Clipboard.setStringAsync(title);
		showMessage({
			message: translate('taskDetailsScreen.copyTitle'),
			type: 'info',
			backgroundColor: colors.accentFill
		});
	};

	return (
		<View style={{ gap: 12, marginVertical: 16 }}>
			<TaskEyebrow task={task} teamName={activeTeam?.name} />
			<View style={{ flexDirection: 'row', gap: 5 }}>
				{edit ? (
					<TextInput
						testID="task-title"
						multiline
						autoFocus
						style={[styles.textInput, { color: theme.colors.foreground, borderColor: theme.colors.input }]}
						onChangeText={(text) => setTitle(text)}
						value={title}
					/>
				) : (
					<Text
						testID="task-title"
						accessibilityRole="button"
						accessibilityHint={translate('common.edit')}
						onPress={() => setEdit(true)}
						style={[styles.title, { color: theme.colors.foreground }]}
					>
						{title}
					</Text>
				)}
				<TitleIcons edit={edit} setEdit={setEdit} copyTitle={copyTitle} saveTitle={() => saveTitle(title)} />
			</View>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
				{(!task?.issueType || task?.issueType === 'Task' || task?.issueType === 'Bug') &&
					task?.rootEpic &&
					task?.parentId !== task?.rootEpic.id && (
						<ParentTaskBadge
							task={{
								...task,
								parentId: task?.rootEpic.id,
								parent: task?.rootEpic
							}}
						/>
					)}

				<ParentTaskBadge task={task} />

				<ParentTaskInput task={task} />
			</View>
		</View>
	);
});

export default TaskTitleBlock;

interface ITitleIcons {
	edit: boolean;
	setEdit: React.Dispatch<SetStateAction<boolean>>;
	copyTitle: () => void;
	saveTitle: () => void;
}

const TitleIcons: React.FC<ITitleIcons> = ({ edit, setEdit, copyTitle, saveTitle }) => {
	const theme = useWebTheme();
	const muted = theme.colors['muted-foreground'];
	if (edit) {
		return (
			<View style={styles.titleIcons}>
				<IconButton
					testID="task-title-save"
					label={translate('common.save')}
					icon="check"
					color={theme.colors['primary-ink']}
					onPress={saveTitle}
				/>
				<IconButton
					testID="task-title-cancel"
					label={translate('common.cancel')}
					icon="x"
					color={muted}
					onPress={() => setEdit(false)}
				/>
			</View>
		);
	}
	return (
		<View style={styles.titleIcons}>
			<IconButton
				testID="task-title-edit"
				label={translate('common.edit')}
				icon="edit-2"
				color={muted}
				onPress={() => setEdit(true)}
			/>
			<IconButton
				testID="task-title-copy"
				label={translate('taskDetailsScreen.copyTitleButton')}
				icon="copy"
				color={muted}
				onPress={copyTitle}
			/>
		</View>
	);
};

const ParentTaskBadge: React.FC<{ task: ITeamTask }> = observer(({ task }) => {
	const navigation = useNavigation<SettingScreenNavigationProp<'TaskScreen'>>();

	const { width } = Dimensions.get('window');

	const navigateToParent = (): void => {
		navigateTo(navigation, 'TaskScreen', { taskId: task?.parentId || task?.parent.id });
	};
	return task?.parentId && task?.parent ? (
		<TouchableOpacity
			onPress={navigateToParent}
			style={{
				borderRadius: 3,
				alignItems: 'center',
				justifyContent: 'center',
				height: 24,
				paddingHorizontal: 8,
				paddingVertical: 2,
				backgroundColor:
					task?.parent?.issueType === 'Epic'
						? '#8154BA'
						: task?.parent?.issueType === 'Story'
							? '#54BA951A'
							: task?.parent?.issueType === 'Bug'
								? '#C24A4A1A'
								: task?.parent?.issueType === 'Task' || !task?.parent?.issueType
									? '#5483ba'
									: ''
			}}
		>
			<Text
				style={{
					fontSize: 10,
					color:
						task?.parent?.issueType === 'Epic'
							? '#FFFFFF'
							: task?.parent?.issueType === 'Story'
								? '#27AE60'
								: task?.parent?.issueType === 'Bug'
									? '#C24A4A'
									: task?.parent?.issueType === 'Task' || !task?.parent?.issueType
										? '#FFFFFF'
										: ''
				}}
			>
				<Text
					style={{
						fontSize: 10,
						color:
							task?.parent?.issueType === 'Epic'
								? '#FFFFFF80'
								: task?.parent?.issueType === 'Story'
									? '#27AE6080'
									: task?.parent?.issueType === 'Bug'
										? '#C24A4A80'
										: task?.parent?.issueType === 'Task' || !task?.parent?.issueType
											? '#FFFFFF'
											: ''
					}}
				>
					#{task?.parent?.taskNumber || task?.parent.number}
				</Text>
				{` - ${limitTextCharaters({
					text: task?.parent?.title,
					numChars: width < 391 ? 8 : width <= 410 ? 12 : 18
				})}`}
			</Text>
		</TouchableOpacity>
	) : (
		<></>
	);
});

/** The parent action's label: Change parent once the task has one. */
function parentActionLabelOf(task: ITeamTask): string {
	if (task?.parentId) {
		return translate('taskDetailsScreen.changeParent');
	}
	return translate('taskDetailsScreen.addParent');
}

/** The parent action's icon: a plus to add one, a swap to change it. */
function parentActionIconOf(task: ITeamTask): ComponentProps<typeof Feather>['name'] {
	if (task?.parentId) {
		return 'repeat';
	}
	return 'plus';
}

const ParentTaskInput: React.FC<{ task: ITeamTask }> = observer(({ task }) => {
	const [modalVisible, setModalVisible] = useState<boolean>(false);
	const theme = useWebTheme();
	const ink = theme.colors['primary-ink'];
	return task && task?.issueType !== 'Epic' ? (
		<TouchableOpacity
			testID="task-parent-action"
			accessibilityRole="button"
			style={styles.parentAction}
			onPress={() => setModalVisible(true)}
		>
			<Feather name={parentActionIconOf(task)} size={14} color={ink} />
			<Text style={[styles.parentActionText, { color: ink }]}>{parentActionLabelOf(task)}</Text>

			<CreateParentTaskModal visible={modalVisible} onDismiss={() => setModalVisible(false)} task={task} />
		</TouchableOpacity>
	) : (
		<></>
	);
});

const styles = StyleSheet.create({
	parentAction: {
		alignItems: 'center',
		borderRadius: 8,
		flexDirection: 'row',
		gap: 4,
		minHeight: 32,
		paddingHorizontal: 8
	},
	parentActionText: {
		fontFamily: typography.primary.medium,
		fontSize: 13
	},
	textInput: {
		borderRadius: 8,
		borderWidth: 1,
		flex: 1,
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		lineHeight: 30,
		maxHeight: 150,
		paddingHorizontal: 8,
		paddingVertical: 4,
		textAlignVertical: 'top'
	},
	titleIcons: {
		gap: 2
	},
	title: {
		flex: 1,
		fontFamily: typography.primary.semiBold,
		fontSize: 24,
		lineHeight: 30
	}
});
