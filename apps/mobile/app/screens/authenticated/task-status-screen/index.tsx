import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { navigateTo } from '../../../navigators/routes';
import { translate } from '../../../i18n';
import { useTaskStatus } from '../../../services/hooks/features/use-task-status';
import { TaskSettingsScreen } from '../../../components/task-settings-screen';
import StatusItem from './components/status-item';
import TaskStatusForm from './components/task-status-form';

type TaskStatusScreenParams = {
	previousTab?: 1 | 2;
};

type TaskStatusScreenRouteProp = RouteProp<{ TaskStatus: TaskStatusScreenParams }, 'TaskStatus'>;

/** Settings, then the team's task statuses, on the shared settings list screen. */
export const TaskStatusScreen: FC<AuthenticatedDrawerScreenProps<'TaskStatus'>> = observer(
	function AuthenticatedDrawerScreen({ navigation }) {
		const route = useRoute<TaskStatusScreenRouteProp>();
		// back to the Settings tab the screen was opened from, the team's by default
		const previousTab = route.params?.previousTab || (2 as const);
		const { isLoading, statuses, deleteStatus, updateStatus, createStatus } = useTaskStatus();

		return (
			<TaskSettingsScreen
				texts={{
					title: translate('settingScreen.statusScreen.mainTitle'),
					listTitle: translate('settingScreen.statusScreen.listStatuses'),
					create: translate('settingScreen.statusScreen.createStatusButton'),
					empty: translate('settingScreen.statusScreen.noActiveStatuses')
				}}
				isLoading={isLoading}
				items={statuses?.items}
				total={statuses?.total}
				keyOf={(item) => item.id}
				onBack={() => navigateTo(navigation, 'Setting', { activeTab: previousTab })}
				renderRow={(item, row) => (
					<StatusItem
						status={item}
						openForEdit={row.openForEdit}
						onDeleteTask={() => deleteStatus(item.id)}
						readOnly={row.readOnly}
					/>
				)}
				renderForm={(form) => (
					<TaskStatusForm
						item={form.item ?? undefined}
						isEdit={form.isEdit}
						onDismiss={form.onDismiss}
						onUpdateStatus={updateStatus}
						onCreateStatus={createStatus}
					/>
				)}
			/>
		);
	}
);
