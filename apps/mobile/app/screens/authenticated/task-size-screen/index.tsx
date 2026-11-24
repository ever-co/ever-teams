import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { navigateTo } from '../../../navigators/routes';
import { translate } from '../../../i18n';
import { useTaskSizes } from '../../../services/hooks/features/use-task-sizes';
import { TaskSettingsScreen } from '../../../components/task-settings-screen';
import SizeItem from './components/size-item';
import TaskSizeForm from './components/task-size-form';

type TaskSizeScreenParams = {
	previousTab?: 1 | 2;
};

type TaskSizeScreenRouteProp = RouteProp<{ TaskSizeScreen: TaskSizeScreenParams }, 'TaskSizeScreen'>;

/** Settings, then the team's task sizes, on the shared settings list screen. */
export const TaskSizeScreen: FC<AuthenticatedDrawerScreenProps<'TaskSizeScreen'>> = observer(
	function AuthenticatedDrawerScreen({ navigation }) {
		const route = useRoute<TaskSizeScreenRouteProp>();
		// back to the Settings tab the screen was opened from, the team's by default
		const previousTab = route.params?.previousTab || (2 as const);
		const { isLoading, sizes, deleteSize, updateSize, createSize } = useTaskSizes();

		return (
			<TaskSettingsScreen
				texts={{
					title: translate('settingScreen.sizeScreen.mainTitle'),
					listTitle: translate('settingScreen.sizeScreen.listSizes'),
					create: translate('settingScreen.sizeScreen.createSizeButton'),
					empty: translate('settingScreen.sizeScreen.noActiveSizes')
				}}
				isLoading={isLoading}
				items={sizes?.items}
				total={sizes?.total}
				keyOf={(_, index) => index.toString()}
				onBack={() => navigateTo(navigation, 'Setting', { activeTab: previousTab })}
				renderRow={(item, row) => (
					<SizeItem
						size={item}
						openForEdit={row.openForEdit}
						onDeleteSize={() => deleteSize(item.id)}
						readOnly={row.readOnly}
					/>
				)}
				renderForm={(form) => (
					<TaskSizeForm
						item={form.item ?? undefined}
						isEdit={form.isEdit}
						onDismiss={form.onDismiss}
						onUpdateSize={updateSize}
						onCreateSize={createSize}
					/>
				)}
			/>
		);
	}
);
