'use client';

import ErrorPage from '@components/pages/error';
/**
 * Error page
 *
 * @description the page that will be shown if any social login failed. This is not related to Next.js error file
 * @returns a custom component that shows error
 */
const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
	return (
		<>
			<ErrorPage error={error} reset={reset} />
		</>
	);
};

export default Error;
