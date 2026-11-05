'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/core/components/pages/unauthorized';
import { FocusShell } from '@/core/components/layouts/focus/focus-shell';
import ErrorPageComponent from '@/core/components/pages/error/error';
import { SignInError } from '@/core/components/pages/auth/sign-in-error';
import EverIdNoWorkspace from '@/core/components/pages/auth/ever-id-no-workspace';
import EverIdVerifyEmail from '@/core/components/pages/auth/ever-id-verify-email';

enum Error {
	// Ever ID sign-in without a workspace it may enter (nothing is created)
	EverIdNoWorkspace = 'EverIdNoWorkspace',
	EverIdNoWorkspaceSignup = 'EverIdNoWorkspaceSignup',
	EverIdWorkspaceBlocked = 'EverIdWorkspaceBlocked',
	// Ever ID sign-in refused until Ever ID has verified the e-mail address
	EverIdEmailUnverified = 'EverIdEmailUnverified',
	Configuration = 'Configuration',
	AccessDenied = 'AccessDenied'
}

const errorMap = {
	[Error.EverIdNoWorkspace]: <EverIdNoWorkspace />,
	[Error.EverIdNoWorkspaceSignup]: <EverIdNoWorkspace offerSignup />,
	[Error.EverIdWorkspaceBlocked]: <EverIdNoWorkspace reason="blocked" />,
	[Error.EverIdEmailUnverified]: <EverIdVerifyEmail />,
	[Error.Configuration]: <ErrorPageComponent />,
	[Error.AccessDenied]: <UnauthorizedPage />
};

/** Own keys only: `?error=__proto__` or `?error=toString` would read the members of Object.prototype. */
function isKnownError(error: string | null): error is Error {
	if (!error) {
		return false;
	}
	return Object.hasOwn(errorMap, error);
}

/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
export default function Page() {
	const search = useSearchParams();
	const error = search?.get('error') ?? null;
	// next-auth also sends OAuthSignin, OAuthCallback, Verification, Default...: they get the generic sign-in error
	let page = <SignInError code={error} />;
	if (isKnownError(error)) {
		page = errorMap[error];
	}
	return <FocusShell>{page}</FocusShell>;
}
