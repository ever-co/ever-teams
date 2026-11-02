'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TeamTasksPage } from '@/core/components/pages/teams/team/tasks/list/team-tasks-page';
import { TeamTasksPageSkeleton } from '@/core/components/pages/teams/team/tasks/team-tasks-page-skeleton';

export default withAuthentication(TeamTasksPage, { displayName: 'TeamTask', skeleton: TeamTasksPageSkeleton });
