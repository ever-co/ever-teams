'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { TeamTaskTrashPage } from '@/core/components/pages/task-trash/team-task-trash-page';
import { TeamTasksPageSkeleton } from '@/core/components/pages/teams/team/tasks/team-tasks-page-skeleton';

export default withAuthentication(TeamTaskTrashPage, { displayName: 'TeamTaskTrash', skeleton: TeamTasksPageSkeleton });
