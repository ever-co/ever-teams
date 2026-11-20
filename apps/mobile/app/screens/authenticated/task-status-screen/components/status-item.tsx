import React, { FC } from 'react';
import { ITaskStatusItem } from '../../../../services/interfaces/ITaskStatus';
import TaskSettingRow from '../../../../components/task-setting-row';
import { formatName } from '../../../../helpers/name-format';

interface IStatusItem {
	status: ITaskStatusItem;
	onDeleteTask: () => unknown;
	openForEdit: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change it. */
	readOnly?: boolean;
}

/** A row of the team's task statuses: the shared settings row. */
const StatusItem: FC<IStatusItem> = ({ status, onDeleteTask, openForEdit, readOnly = false }) => {
	return (
		<TaskSettingRow
			name={formatName(status?.name ?? '')}
			color={status?.color}
			iconUrl={status?.fullIconUrl}
			onEdit={openForEdit}
			onDelete={onDeleteTask}
			readOnly={readOnly}
		/>
	);
};

export default StatusItem;
