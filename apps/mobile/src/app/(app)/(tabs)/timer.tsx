import React, { useEffect } from 'react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { translate } from '../../../../app/i18n';
import { AuthenticatedTimerScreen } from '../../../../app/screens';
import { ShellPage } from '../../../components/shell-page';
import { followAppState, followConnection, QUERY_CACHE_MAX_AGE_MS, queryClient } from '../../../data/query-client';
import { queryPersister } from '../../../data/query-persister';
import { HomeTimer } from '../../../home/home-timer';
import { RunHeartbeat } from '../../../home/run-heartbeat';
import { routeOf } from '../../../navigation/current-screen';
import { NEXT_SHELL_BUILD } from '../../../navigation/next-shell';

const persistOptions = { persister: queryPersister, maxAge: QUERY_CACHE_MAX_AGE_MS };

function followThePhone(): () => void {
	followConnection();
	return followAppState();
}

/**
 * The new Home (#5504), in builds made with EXPO_PUBLIC_APP_SHELL=next until it does all the Work tab does: its own
 * query client follows the connection and the foreground, which the current app's does not.
 */
function NewHome() {
	useEffect(followThePhone, []);
	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
			<RunHeartbeat />
			<ShellPage title={translate('shell.tabs.home')}>
				<HomeTimer />
			</ShellPage>
		</PersistQueryClientProvider>
	);
}

const CurrentWork = routeOf(AuthenticatedTimerScreen);

function workScreen() {
	if (NEXT_SHELL_BUILD) {
		return NewHome;
	}
	return CurrentWork;
}

/** `/timer`: the Work tab, the timer; the web shows it in its header instead. */
export default workScreen();
