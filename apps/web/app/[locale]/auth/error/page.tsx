'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@/core/components/pages/unauthorized';
import ErrorPageComponent from '@/core/components/pages/error/error';
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

/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
export default function Page() {
	const search = useSearchParams();
	const error = search?.get('error') as Error;
	return <>{errorMap[error]}</>;
}
