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

// A locale prefix (`/fr`, `/pt-BR`) as the browser shows it in front of a page path
const RECOVERY_PAGE = /^(?:\/[a-z]{2}(?:-[A-Za-z]{2})?)?\/auth\/(?:forgot-password|reset-password)(?:\/|$)/;

/**
 * Whether the page in the browser is a password recovery page, locale prefix or not. A session that ends there (an
 * old session still in the browser that opens a reset link) is cleared without leaving the page, so the link works.
 */
export function isPasswordRecoveryPage(pathname: string): boolean {
	return RECOVERY_PAGE.test(pathname);
}
