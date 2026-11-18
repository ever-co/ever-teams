import React from 'react';
import { translate } from '../../../app/i18n';
import { ShellPage } from '../../components/shell-page';

/** `/auth/passcode`, the web's sign-in with the e-mailed code. */
export default function SignInScreen() {
	return <ShellPage title={translate('shell.signIn.title')} emptyMessage={translate('shell.signIn.message')} />;
}
