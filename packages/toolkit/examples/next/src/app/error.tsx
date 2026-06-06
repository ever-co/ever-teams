'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error('Application error:', error);
	}, [error]);

	return (
		<main className="flex flex-col justify-center items-center gap-2 min-h-[70vh]">
			<h2 className="text-9xl">Error</h2>
			<p className="text-xl text-gray-400 dark:text-gray-100">
				Something went wrong.{' '}
				<button onClick={reset} className="underline hover:text-black dark:hover:text-white">
					Try again
				</button>
				{' or go to '}
				<Link href={'/'} className="hover:underline dark:hover:text-white hover:text-black">
					home
				</Link>
			</p>
			{process.env.NODE_ENV === 'development' && (
				<div className="flex flex-col border text-red-500 p-4 text-sm rounded-lg">
					<span>Name: {error.name}</span>
					<span>Message: {error.message}</span>
					<span>Stack: {error.stack}</span>
				</div>
			)}
		</main>
	);
}
