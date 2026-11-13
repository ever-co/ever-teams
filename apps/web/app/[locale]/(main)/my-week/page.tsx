'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MyWeekPage } from '@/core/components/dashboards/my-week/my-week-page';
import { MyWeekPageSkeleton } from '@/core/components/dashboards/my-week/my-week-page-skeleton';

export default withAuthentication(MyWeekPage, { displayName: 'MyWeek', skeleton: MyWeekPageSkeleton });
