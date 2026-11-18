import React from 'react';
import { translate } from '../../../../../app/i18n';
import { ShellPage } from '../../../../components/shell-page';

/** `/team/tasks`, the web's address of the team's tasks. */
export default function TasksScreen() {
	return <ShellPage title={translate('shell.tabs.tasks')} />;
}
