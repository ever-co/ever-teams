/** The recovery pages: a reset link opens one while the person may still be signed in to another workspace. */
const RECOVERY_AUTH_PATHS = ['/auth/forgot-password', '/auth/reset-password'];

function isRecoveryPath(pathname: string) {
	return RECOVERY_AUTH_PATHS.some((path) => pathname.startsWith(path));
}

/** Whether a signed-in visit to this page is sent to the app: every auth page except password recovery. */
export function sendsSignedInVisitToApp(pathname: string): boolean {
	const isAuthPath = /^\/auth\//.test(pathname);
	if (!isAuthPath) {
		return false;
	}
	return !isRecoveryPath(pathname);
}
