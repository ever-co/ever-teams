'use client';

import NotFound from '@/core/components/pages/404';
import { useRuntimeEnvHtmlProps } from '@/core/components/providers/runtime-env-provider';
import { APP_FAVICON_URL } from '@/core/constants/config/constants';

const NotFoundPage = () => {
	// This document is rendered by app/layout.tsx WITHOUT app/[locale]/layout.tsx (a first path
	// segment that is not a known locale), so nothing above it renders <html> and Next would inject a
	// bare one. Render it here instead, carrying the runtime env: its start tag is parsed before any
	// bundle module, so this page's module-level constants — and those of every page a soft navigation
	// from here loads — see the deployment's values rather than the build-time fallbacks.
	// (`notFound()` from inside the app uses app/[locale]/not-found.tsx, which is already under the
	// locale layout's <html>, so this can never nest.)
	const runtimeEnvHtmlProps = useRuntimeEnvHtmlProps();

	return (
		<html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning {...runtimeEnvHtmlProps}>
			<head>
				{/* Runtime APP_FAVICON_URL (default /favicon.ico), so a reused image can carry its own icon. */}
				<link rel="icon" href={APP_FAVICON_URL} />
			</head>
			<body>
				<NotFound />
			</body>
		</html>
	);
};

export default NotFoundPage;
