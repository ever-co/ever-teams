'use client';

import NotFound from '@/core/components/pages/404';
import { RuntimeEnvScript } from '@/core/components/providers/runtime-env-provider';

const NotFoundPage = () => {
	return (
		<>
			{/*
			 * This document is rendered by app/layout.tsx without app/[locale]/layout.tsx (unknown or
			 * invalid first path segment), so it does not get the <head> runtime env script. Render it
			 * here, ahead of the page content: its module-level constants (and those of the pages a
			 * soft navigation from here loads) must see the runtime env, not the build-time fallbacks.
			 */}
			<RuntimeEnvScript />
			<NotFound />
		</>
	);
};

export default NotFoundPage;
