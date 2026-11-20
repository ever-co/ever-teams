import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskPriority } from '../services/hooks/features/use-task-priority';
import { ITaskPriorityItem } from '../services/interfaces/ITaskPriority';
import { translate } from '../i18n';
import type { MenuRect } from '../../src/components/menu-placement';
import TaskPriorityForm from '../screens/authenticated/task-priorities-screen/components/task-priority-form';
import { settingOptionOf, TaskSettingPicker } from './task-setting-picker';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	priorityName: string;
	setSelectedPriority: (status: ITaskPriorityItem) => unknown;
	canCreatePriority?: boolean;
	/** The chip the picker opens from, so its values show in the web's menu under it. */
	anchor?: MenuRect | null;
}

const TaskPriorityPopup: FC<Props> = observer(function TaskPriorityPopup({
	visible,
	onDismiss,
	setSelectedPriority,
	priorityName,
	canCreatePriority,
	anchor
}) {
	const { allTaskPriorities, createPriority, updatePriority } = useTaskPriority();

	return (
		<TaskSettingPicker
			visible={visible}
			onDismiss={onDismiss}
			title={translate('settingScreen.priorityScreen.priorities')}
			items={allTaskPriorities ?? []}
			optionOf={(priority) => settingOptionOf(priority, priorityName)}
			onPick={(priority) => setSelectedPriority(priority)}
			canCreateHere={canCreatePriority}
			kind="priority"
			anchor={anchor}
			searchPlaceholder={translate('taskMenus.search.priority')}
			menuCreateLabel={translate('taskMenus.actions.createPriority')}
			createLabel={translate('settingScreen.priorityScreen.createNewPriorityText')}
			renderCreateForm={(close) => (
				<TaskPriorityForm
					onDismiss={close}
					onCreatePriority={createPriority}
					onUpdatePriority={updatePriority}
					isEdit={false}
				/>
			)}
		/>
	);
});

export default TaskPriorityPopup;
