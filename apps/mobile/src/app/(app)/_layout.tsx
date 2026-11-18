import React from 'react';
import { Redirect } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { observer } from 'mobx-react-lite';
import HamburgerMenu from '../../../app/components/hamburger-menu';
import { useAppLocale } from '../../../app/i18n';
import { useStores } from '../../../app/models';
import { UnmountOnBlur } from '../../../app/navigators/authenticated-navigator';
import { TimeCounterHost } from '../../../app/services/hooks/use-timer';
import { NextShellHeartbeat } from '../../home/next-shell-heartbeat';

export const unstable_settings = { initialRouteName: '(tabs)' };

/**
 * The signed-in part, as the current app draws it: the menu in a drawer from the right, the tabs, and the screens it
 * opens, with the one counter of the running time beside them. Without a session, the sign-in.
 */
export default observer(function SignedInLayout() {
	const {
		authenticationStore: { isAuthenticated }
	} = useStores();
	// the menu's texts follow a new language
	useAppLocale();
	if (!isAuthenticated) {
		return <Redirect href="/auth/passcode" />;
	}
	return (
		<>
			<TimeCounterHost />
			<NextShellHeartbeat />
			<Drawer
				drawerContent={(props) => <HamburgerMenu {...props} />}
				screenLayout={({ children }) => <UnmountOnBlur>{children}</UnmountOnBlur>}
				screenOptions={{
					headerShown: false,
					drawerPosition: 'right',
					drawerStyle: { width: '83%' }
				}}
			/>
		</>
	);
});
