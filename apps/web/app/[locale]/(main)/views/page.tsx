'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ViewsPage } from '@/core/components/pages/teams/team/tasks/views/views-page';
import { TeamTasksPageSkeleton } from '@/core/components/pages/teams/team/tasks/team-tasks-page-skeleton';

export default withAuthentication(ViewsPage, { displayName: 'TaskViews', skeleton: TeamTasksPageSkeleton });
