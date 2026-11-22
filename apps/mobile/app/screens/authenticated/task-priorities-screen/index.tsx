import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { navigateTo } from '../../../navigators/routes';
import { translate } from '../../../i18n';
import { useTaskPriority } from '../../../services/hooks/features/use-task-priority';
import { TaskSettingsScreen } from '../../../components/task-settings-screen';
import PriorityItem from './components/priority-item';
import TaskPriorityForm from './components/task-priority-form';

type TaskPriorityScreenParams = {
	previousTab?: 1 | 2;
};

type TaskPriorityScreenRouteProp = RouteProp<{ TaskPriority: TaskPriorityScreenParams }, 'TaskPriority'>;

/** Settings, then the team's task priorities, on the shared settings list screen. */
export const TaskPriorityScreen: FC<AuthenticatedDrawerScreenProps<'TaskPriority'>> = observer(
	function AuthenticatedDrawerScreen({ navigation }) {
		const route = useRoute<TaskPriorityScreenRouteProp>();
		// back to the Settings tab the screen was opened from, the team's by default
		const previousTab = route.params?.previousTab || (2 as const);
		const { isLoading, priorities, deletePriority, updatePriority, createPriority } = useTaskPriority();

		return (
			<TaskSettingsScreen
				texts={{
					title: translate('settingScreen.priorityScreen.mainTitle'),
					listTitle: translate('settingScreen.priorityScreen.listPriorities'),
					create: translate('settingScreen.priorityScreen.createNewPriorityText'),
					empty: translate('settingScreen.priorityScreen.noActivePriorities')
				}}
				isLoading={isLoading}
				items={priorities?.items}
				total={priorities?.total}
				keyOf={(_, index) => index.toString()}
				onBack={() => navigateTo(navigation, 'Setting', { activeTab: previousTab })}
				renderRow={(item, row) => (
					<PriorityItem
						priority={item}
						openForEdit={row.openForEdit}
						onDeletePriority={() => deletePriority(item.id)}
						readOnly={row.readOnly}
					/>
				)}
				renderForm={(form) => (
					<TaskPriorityForm
						item={form.item ?? undefined}
						isEdit={form.isEdit}
						onDismiss={form.onDismiss}
						onUpdatePriority={updatePriority}
						onCreatePriority={createPriority}
					/>
				)}
			/>
		);
	}
);
