import React from 'react';
import { Redirect } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useStores } from '../../../app/models';
import { LoginScreen } from '../../../app/screens';
import { routeOf } from '../../navigation/current-screen';

const SignIn = routeOf(LoginScreen);

/** `/auth/passcode`, as on the web: the sign-in with the code sent by e-mail; once signed in, the team. */
export default observer(function PasscodeRoute() {
	const {
		authenticationStore: { isAuthenticated }
	} = useStores();
	if (isAuthenticated) {
		return <Redirect href="/" />;
	}
	return <SignIn />;
});
