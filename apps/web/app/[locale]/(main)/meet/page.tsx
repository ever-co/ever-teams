'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { MeetingsPage } from '@/core/components/pages/meet/home/meetings-page';
import GlobalSkeleton from '@/core/components/common/global-skeleton';

export default withAuthentication(MeetingsPage, { displayName: 'MeetingsPage', skeleton: GlobalSkeleton });
