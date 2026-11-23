import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskStatus } from '../services/hooks/features/use-task-status';
import { ITaskStatusItem } from '../services/interfaces/ITaskStatus';
import { translate } from '../i18n';
import type { MenuRect } from '../../src/components/menu-placement';
import { useTaskStatusValue } from './status-type';
import TaskStatusForm from '../screens/authenticated/task-status-screen/components/task-status-form';
import { PickerOption } from './property-picker';
import { settingOptionOf, TaskSettingPicker } from './task-setting-picker';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	statusName: string;
	setSelectedStatus?: (status: string) => unknown;
	canCreateStatus?: boolean;
	/** The chip the picker opens from, so its values show in the web's menu under it. */
	anchor?: MenuRect | null;
}

type StatusValues = ReturnType<typeof useTaskStatusValue>;

/** A status as the icon map knows it, under its name with spaces for hyphens. */
function knownStatusOf(status: ITaskStatusItem, statusValues: StatusValues) {
	return statusValues?.[(status.name ?? '').replaceAll('-', ' ')];
}

/** The value a status sends when picked: the one its icon map names, or its own. */
function statusValueOf(status: ITaskStatusItem, statusValues: StatusValues): string {
	return knownStatusOf(status, statusValues)?.value ?? status.value ?? '';
}

/** A status row with the name and icon the icon map gives it, as the status chips show them. */
function statusOptionOf(status: ITaskStatusItem, statusValues: StatusValues, statusName: string): PickerOption {
	const known = knownStatusOf(status, statusValues);
	const option = settingOptionOf(status, statusName);
	return { ...option, name: known?.name ?? option.name, icon: known?.icon };
}

const TaskStatusPopup: FC<Props> = observer(function FilterPopup({
	visible,
	onDismiss,
	setSelectedStatus,
	statusName,
	canCreateStatus,
	anchor
}) {
	const { allStatuses, createStatus, updateStatus } = useTaskStatus();
	const statusValues = useTaskStatusValue();

	return (
		<TaskSettingPicker
			visible={visible}
			onDismiss={onDismiss}
			title={translate('settingScreen.statusScreen.statuses')}
			items={allStatuses ?? []}
			optionOf={(status) => statusOptionOf(status, statusValues, statusName)}
			onPick={(status) => setSelectedStatus?.(statusValueOf(status, statusValues))}
			canCreateHere={canCreateStatus}
			kind="status"
			anchor={anchor}
			searchPlaceholder={translate('taskMenus.search.status')}
			menuCreateLabel={translate('taskMenus.actions.createStatus')}
			createLabel={translate('settingScreen.statusScreen.createNewStatusText')}
			renderCreateForm={(close) => (
				<TaskStatusForm
					onDismiss={close}
					onCreateStatus={createStatus}
					onUpdateStatus={updateStatus}
					isEdit={false}
				/>
			)}
		/>
	);
});

export default TaskStatusPopup;
