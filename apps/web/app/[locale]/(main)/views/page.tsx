'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ViewsPage } from '@/core/components/pages/teams/team/tasks/views/views-page';
import { ViewsPageSkeleton } from '@/core/components/pages/teams/team/tasks/views/views-page-skeleton';

export default withAuthentication(ViewsPage, { displayName: 'TaskViews', skeleton: ViewsPageSkeleton });
