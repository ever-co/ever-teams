'use client';
import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { AppsUrlsPage } from '@/core/components/dashboards/apps-urls/apps-urls-page';
import { AppsUrlsPageSkeleton } from '@/core/components/dashboards/apps-urls/apps-urls-page-skeleton';

export default withAuthentication(AppsUrlsPage, {
	displayName: 'Apps & URLs',
	showPageSkeleton: true,
	skeleton: AppsUrlsPageSkeleton
});
