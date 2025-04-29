'use client';

import ErrorPage from '@/core/components/pages/error';

const Error = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
	return (
		<>
			<ErrorPage error={error} reset={reset} />
		</>
	);
};

export default Error;
