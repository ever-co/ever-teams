import React from 'react';
import { translate } from '../../../../app/i18n';
import { ShellPage } from '../../../components/shell-page';

/** `/`, as on the web: the timer and the day. */
export default function HomeScreen() {
	return <ShellPage title={translate('shell.tabs.home')} />;
}
