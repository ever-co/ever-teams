import React from 'react';
import { Redirect, Stack } from 'expo-router';

import { NEXT_SHELL_BUILD } from './next-shell-build';

export { NEXT_SHELL_BUILD };

/**
 * A group of the new app's pages that have no screen yet (`/team/tasks`, `/my-week`, `/all-teams`): they show in its own
 * builds, and the app people install opens the team instead of an empty page.
 */
export function NextShellStack() {
	if (!NEXT_SHELL_BUILD) {
		return <Redirect href="/" />;
	}
	return <Stack screenOptions={{ headerShown: false }} />;
}
