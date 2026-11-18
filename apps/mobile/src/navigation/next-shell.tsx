import React from 'react';
import { Redirect, Stack } from 'expo-router';

/** Builds made with EXPO_PUBLIC_APP_SHELL=next show the new app's screens; the app people install shows the current ones. */
export const NEXT_SHELL_BUILD = process.env.EXPO_PUBLIC_APP_SHELL === 'next';

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
