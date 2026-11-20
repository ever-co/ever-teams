import React, { FC } from 'react';
import { ITaskSizeItem } from '../../../../services/interfaces/ITaskSize';
import TaskSettingRow from '../../../../components/task-setting-row';
import { formatName } from '../../../../helpers/name-format';

interface ISizeItem {
	size: ITaskSizeItem;
	onDeleteSize: () => unknown;
	openForEdit: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change it. */
	readOnly?: boolean;
}

/** A row of the team's task sizes: the shared settings row. */
const SizeItem: FC<ISizeItem> = ({ size, onDeleteSize, openForEdit, readOnly = false }) => {
	return (
		<TaskSettingRow
			kind="size"
			name={formatName(size?.name ?? '')}
			color={size?.color}
			iconUrl={size?.fullIconUrl}
			storedIcon={size?.icon}
			onEdit={openForEdit}
			onDelete={onDeleteSize}
			readOnly={readOnly}
		/>
	);
};

export default SizeItem;
