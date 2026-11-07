'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TaskViewRoute } from '@/core/components/pages/teams/team/tasks/views/task-view-route';
import { TeamTasksPageSkeleton } from '@/core/components/pages/teams/team/tasks/team-tasks-page-skeleton';

export default withAuthentication(TaskViewRoute, { displayName: 'TaskView', skeleton: TeamTasksPageSkeleton });
