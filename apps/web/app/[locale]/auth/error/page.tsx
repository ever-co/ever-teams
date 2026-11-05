'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/core/components/pages/unauthorized';
import { FocusShell } from '@/core/components/layouts/focus/focus-shell';
import ErrorPageComponent from '@/core/components/pages/error/error';
import { SignInError } from '@/core/components/pages/auth/sign-in-error';
import EverIdNoWorkspace from '@/core/components/pages/auth/ever-id-no-workspace';
import EverIdVerifyEmail from '@/core/components/pages/auth/ever-id-verify-email';
import ProviderAccountUnconfirmed from '@/core/components/pages/auth/provider-account-unconfirmed';

enum Error {
	// Ever ID sign-in without a workspace it may enter (nothing is created)
	EverIdNoWorkspace = 'EverIdNoWorkspace',
	EverIdNoWorkspaceSignup = 'EverIdNoWorkspaceSignup',
	EverIdWorkspaceBlocked = 'EverIdWorkspaceBlocked',
	// Ever ID sign-in refused until Ever ID has verified the e-mail address
	EverIdEmailUnverified = 'EverIdEmailUnverified',
	// Provider sign-in refused: the address only has accounts that have not confirmed it (no second account is made)
	ProviderAccountUnconfirmed = 'ProviderAccountUnconfirmed',
	// Provider sign-in of an account that has no workspace yet (no second account is made)
	ProviderAccountNotSetUp = 'ProviderAccountNotSetUp',
	Configuration = 'Configuration',
	AccessDenied = 'AccessDenied'
}

const errorMap = {
	[Error.EverIdNoWorkspace]: <EverIdNoWorkspace />,
	[Error.EverIdNoWorkspaceSignup]: <EverIdNoWorkspace offerSignup />,
	[Error.EverIdWorkspaceBlocked]: <EverIdNoWorkspace reason="blocked" />,
	[Error.EverIdEmailUnverified]: <EverIdVerifyEmail />,
	[Error.ProviderAccountUnconfirmed]: <ProviderAccountUnconfirmed />,
	[Error.ProviderAccountNotSetUp]: <ProviderAccountUnconfirmed reason="not-set-up" />,
	[Error.Configuration]: <ErrorPageComponent />,
	[Error.AccessDenied]: <UnauthorizedPage />
};

/** The shape of a next-auth code (OAuthSignin, Verification...): any other value is not shown on the page. */
const ERROR_CODE = /^[A-Za-z]{1,40}$/;

/** Only the map's own codes: `toString` or `__proto__` would otherwise read Object.prototype. */
function errorPageOf(error: string) {
	if (Object.prototype.hasOwnProperty.call(errorMap, error)) {
		return errorMap[error as Error];
	}
	return null;
}

function shownCodeOf(error: string) {
	if (ERROR_CODE.test(error)) {
		return error;
	}
	return null;
}

/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
export default function Page() {
	const search = useSearchParams();
	const error = search?.get('error') ?? '';
	// next-auth also sends OAuthSignin, OAuthCallback, Verification, Default...: they get the generic sign-in error
	const page = errorPageOf(error) ?? <SignInError code={shownCodeOf(error)} />;
	return <FocusShell>{page}</FocusShell>;
}
