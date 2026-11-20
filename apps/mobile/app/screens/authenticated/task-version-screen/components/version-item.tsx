import React, { FC } from 'react';
import { ITaskVersionItemList } from '../../../../services/interfaces/ITaskVersion';
import TaskSettingRow from '../../../../components/task-setting-row';

interface IVersionItem {
	version: ITaskVersionItemList;
	onDeleteTask: () => unknown;
	openForEdit: () => unknown;
	/** Shows the edit and delete actions disabled, for a user who may not change it. */
	readOnly?: boolean;
}

/** A row of the team's task versions: the shared settings row. */
const VersionItem: FC<IVersionItem> = ({ version, onDeleteTask, openForEdit, readOnly = false }) => {
	return (
		<TaskSettingRow
			name={version?.name ?? ''}
			color={undefined}
			iconUrl={undefined}
			onEdit={openForEdit}
			onDelete={onDeleteTask}
			readOnly={readOnly}
		/>
	);
};

export default VersionItem;
