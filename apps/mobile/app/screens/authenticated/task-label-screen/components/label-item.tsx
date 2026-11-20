import React, { FC } from 'react';
import { ITaskLabelItem } from '../../../../services/interfaces/ITaskLabel';
import TaskSettingRow from '../../../../components/task-setting-row';

interface ILabelItem {
	label: ITaskLabelItem;
	onDeleteLabel: () => unknown;
	openForEdit: () => unknown;
}

/** A row of the team's task labels: the shared settings row. */
const LabelItem: FC<ILabelItem> = ({ label, onDeleteLabel, openForEdit }) => {
	return (
		<TaskSettingRow
			name={label?.name ?? ''}
			color={label?.color}
			iconUrl={label?.fullIconUrl}
			onEdit={openForEdit}
			onDelete={onDeleteLabel}
		/>
	);
};

export default LabelItem;
