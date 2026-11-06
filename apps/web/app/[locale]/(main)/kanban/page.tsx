'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { KanbanPage } from '@/core/components/pages/kanban/board/kanban-page';
import { KanbanPageSkeleton } from '@/core/components/pages/kanban/board/kanban-page-skeleton';

export default withAuthentication(KanbanPage, { displayName: 'Kanban', skeleton: KanbanPageSkeleton });
