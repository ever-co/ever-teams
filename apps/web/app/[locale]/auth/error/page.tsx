'use client';

import { useSearchParams } from 'next/navigation';
import UnauthorizedPage from '@components/pages/unauthorized';
import ErrorPageComponent from '@components/pages/error/error';

enum Error {
	Configuration = 'Configuration',
	AccessDenied = 'AccessDenied'
}

const errorMap = {
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
