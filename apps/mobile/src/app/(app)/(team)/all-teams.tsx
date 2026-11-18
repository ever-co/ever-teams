import React from 'react';
import { translate } from '../../../../app/i18n';
import { ShellPage } from '../../../components/shell-page';

/** `/all-teams`, the web's address of the teams and who works now. */
export default function TeamScreen() {
	return <ShellPage title={translate('shell.tabs.team')} />;
}
