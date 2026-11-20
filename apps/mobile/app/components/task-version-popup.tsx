import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskVersion } from '../services/hooks/features/use-task-version';
import { ITaskVersionItemList } from '../services/interfaces/ITaskVersion';
import { translate } from '../i18n';
import TaskVersionForm from '../screens/authenticated/task-version-screen/components/task-version-form';
import { PickerOption } from './property-picker';
import { settingOptionOf, TaskSettingPicker } from './task-setting-picker';
import type { MenuRect } from '../../src/components/menu-placement';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	versionName: string;
	setSelectedVersion: (version: ITaskVersionItemList) => unknown;
	canCreateVersion?: boolean;
	/** The chip the versions open from, so they show in the web's menu under it. */
	anchor?: MenuRect | null;
}

/**
 * A version as a row, as the web's version menu draws it: its name as it was saved, and its tag in the muted color
 * whatever color the version holds.
 */
export function versionOptionOf(version: ITaskVersionItemList, versionName: string): PickerOption {
	const option = settingOptionOf(version, versionName);
	return { ...option, name: version.name ?? '', color: null };
}

/** A task's version to pick, in the web's menu under its chip; creating one opens its form in the dialog. */
const TaskVersionPopup: FC<Props> = observer(function TaskVersionPopup({
	visible,
	onDismiss,
	setSelectedVersion,
	versionName,
	canCreateVersion,
	anchor
}) {
	const { taskVersionList, createTaskVersion, updateTaskVersion } = useTaskVersion();
	return (
		<TaskSettingPicker
			visible={visible}
			onDismiss={onDismiss}
			title={translate('taskDetailsScreen.versions')}
			items={taskVersionList ?? []}
			optionOf={(version) => versionOptionOf(version, versionName)}
			onPick={(version) => setSelectedVersion(version)}
			canCreateHere={canCreateVersion}
			createLabel={translate('settingScreen.versionScreen.createNewVersionText')}
			kind="version"
			anchor={anchor}
			searchPlaceholder={translate('taskMenus.search.version')}
			menuCreateLabel={translate('taskMenus.actions.createVersion')}
			keepsCase
			renderCreateForm={(close) => (
				<TaskVersionForm
					onDismiss={close}
					onCreateVersion={createTaskVersion}
					onUpdateVersion={updateTaskVersion}
					isEdit={false}
					createVersionModal={true}
				/>
			)}
		/>
	);
});

export default TaskVersionPopup;
