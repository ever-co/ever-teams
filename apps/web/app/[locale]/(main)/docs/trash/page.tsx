'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { DocsPage } from '@/core/components/pages/docs/docs-page';
import { DocsPageSkeleton } from '@/core/components/pages/docs/docs-page-skeleton';

function Page() {
	return <DocsPage view="trash" />;
}

export default withAuthentication(Page, { displayName: 'DocsTrash', skeleton: DocsPageSkeleton });
