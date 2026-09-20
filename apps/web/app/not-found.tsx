'use client';

import NotFound from '@/core/components/pages/404';
import { RuntimeEnvScript } from '@/core/components/providers/runtime-env-provider';
import { APP_FAVICON_URL } from '@/core/constants/config/constants';

const NotFoundPage = () => {
	return (
		<>
			{/*
			 * This document is rendered by app/layout.tsx without app/[locale]/layout.tsx (unknown or
			 * invalid first path segment), so it renders no <html> of its own and cannot carry the
			 * runtime env attribute. Publish it here, ahead of the page content: its module-level
			 * constants (and those of the pages a soft navigation from here loads) must see the
			 * runtime env, not the build-time fallbacks.
			 */}
			<RuntimeEnvScript />
			<NotFound />
			{/* React hoists this into <head>: the deployment's icon, not a build-time one. */}
			<link rel="icon" href={APP_FAVICON_URL} />
		</>
	);
};

export default NotFoundPage;
