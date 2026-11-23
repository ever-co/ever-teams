import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AuthenticatedDrawerScreenProps } from '../../../navigators/authenticated-navigator';
import { navigateTo } from '../../../navigators/routes';
import { translate } from '../../../i18n';
import { useTaskVersion } from '../../../services/hooks/features/use-task-version';
import { TaskSettingsScreen } from '../../../components/task-settings-screen';
import VersionItem from './components/version-item';
import TaskVersionForm from './components/task-version-form';

type TaskVersionScreenParams = {
	previousTab?: 1 | 2;
};

type TaskVersionScreenRouteProp = RouteProp<{ TaskVersion: TaskVersionScreenParams }, 'TaskVersion'>;

/** Settings, then the team's task versions, on the shared settings list screen. */
export const TaskVersionScreen: FC<AuthenticatedDrawerScreenProps<'TaskVersion'>> = observer(
	function AuthenticatedDrawerScreen({ navigation }) {
		const route = useRoute<TaskVersionScreenRouteProp>();
		// back to the Settings tab the screen was opened from, the team's by default
		const previousTab = route.params?.previousTab || (2 as const);
		const { isLoading, versions, deleteTaskVersion, updateTaskVersion, createTaskVersion } = useTaskVersion();

		return (
			<TaskSettingsScreen
				texts={{
					title: translate('settingScreen.versionScreen.mainTitle'),
					listTitle: translate('settingScreen.versionScreen.listOfVersions'),
					create: translate('settingScreen.versionScreen.createNewVersionButton'),
					empty: translate('settingScreen.versionScreen.noActiveVersions')
				}}
				isLoading={isLoading}
				items={versions?.items}
				total={versions?.total}
				keyOf={(_, index) => index.toString()}
				onBack={() => navigateTo(navigation, 'Setting', { activeTab: previousTab })}
				renderRow={(item, row) => (
					<VersionItem
						version={item}
						openForEdit={row.openForEdit}
						onDeleteTask={() => deleteTaskVersion(item.id)}
						readOnly={row.readOnly}
					/>
				)}
				renderForm={(form) => (
					<TaskVersionForm
						item={form.item ?? undefined}
						isEdit={form.isEdit}
						onDismiss={form.onDismiss}
						onUpdateVersion={updateTaskVersion}
						onCreateVersion={createTaskVersion}
					/>
				)}
				// the versions form kept its own way with the keyboard, and a list as high as its rows
				sheet={{
					keyboardBehavior: 'extend',
					keyboardBlurBehavior: 'none',
					keyboardShouldPersistTaps: 'always',
					contentStyle: { padding: 16 },
					listGrows: false
				}}
			/>
		);
	}
);
