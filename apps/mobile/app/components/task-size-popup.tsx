import React, { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { useTaskSizes } from '../services/hooks/features/use-task-sizes';
import { ITaskSizeItem } from '../services/interfaces/ITaskSize';
import { translate } from '../i18n';
import type { MenuRect } from '../../src/components/menu-placement';
import TaskSizeForm from '../screens/authenticated/task-size-screen/components/task-size-form';
import { settingOptionOf, TaskSettingPicker } from './task-setting-picker';

export interface Props {
	visible: boolean;
	onDismiss: () => unknown;
	sizeName: string;
	setSelectedSize: (status: ITaskSizeItem) => unknown;
	canCreateSize?: boolean;
	/** The chip the picker opens from, so its values show in the web's menu under it. */
	anchor?: MenuRect | null;
}

const TaskSizePopup: FC<Props> = observer(function TaskSizePopup({
	visible,
	onDismiss,
	setSelectedSize,
	sizeName,
	canCreateSize,
	anchor
}) {
	const { allTaskSizes, createSize, updateSize } = useTaskSizes();

	return (
		<TaskSettingPicker
			visible={visible}
			onDismiss={onDismiss}
			title={translate('settingScreen.sizeScreen.sizes')}
			items={allTaskSizes ?? []}
			optionOf={(size) => settingOptionOf(size, sizeName)}
			onPick={(size) => setSelectedSize(size)}
			canCreateHere={canCreateSize}
			kind="size"
			anchor={anchor}
			searchPlaceholder={translate('taskMenus.search.size')}
			menuCreateLabel={translate('taskMenus.actions.createSize')}
			createLabel={translate('settingScreen.sizeScreen.createNewSizeText')}
			renderCreateForm={(close) => (
				<TaskSizeForm onDismiss={close} onCreateSize={createSize} onUpdateSize={updateSize} isEdit={false} />
			)}
		/>
	);
});

export default TaskSizePopup;
