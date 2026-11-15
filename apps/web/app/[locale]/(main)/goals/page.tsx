'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { GoalsPage } from '@/core/components/dashboards/goals/goals-page';
import { GoalsPageSkeleton } from '@/core/components/dashboards/goals/goals-page-skeleton';

export default withAuthentication(GoalsPage, { displayName: 'Goals', skeleton: GoalsPageSkeleton });
