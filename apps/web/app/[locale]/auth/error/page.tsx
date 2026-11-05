'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/core/components/pages/unauthorized';
import { FocusShell } from '@/core/components/layouts/focus/focus-shell';
import ErrorPageComponent from '@/core/components/pages/error/error';
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

/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
export default function Page() {
	const search = useSearchParams();
	const error = search?.get('error') as Error;
	return <FocusShell>{errorMap[error]}</FocusShell>;
}
