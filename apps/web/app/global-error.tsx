'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
	useEffect(() => {
		Sentry.captureException(error);
	}, [error]);

	return (
		<html data-scroll-behavior="smooth">
			<body>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						minHeight: '100vh',
						fontFamily: 'system-ui, sans-serif',
						padding: '20px'
					}}
				>
					<h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong!</h1>
					<p style={{ color: '#666', textAlign: 'center', maxWidth: '400px' }}>
						An unexpected error occurred. Please try refreshing the page or contact support if the problem
						persists.
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							marginTop: '20px',
							padding: '10px 20px',
							backgroundColor: '#0070f3',
							color: 'white',
							border: 'none',
							borderRadius: '5px',
							cursor: 'pointer'
						}}
					>
						Refresh Page
					</button>
				</div>
			</body>
		</html>
	);
}
