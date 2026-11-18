import React from 'react';
import { translate } from '../../../../app/i18n';
import { ShellPage } from '../../../components/shell-page';

/** `/my-week`, the web's address of the person's week. */
export default function WeekScreen() {
	return <ShellPage title={translate('shell.tabs.week')} />;
}
