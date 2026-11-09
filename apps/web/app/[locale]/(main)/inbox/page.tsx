'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { InboxPage } from '@/core/components/pages/inbox/inbox-page';
import { InboxPageSkeleton } from '@/core/components/pages/inbox/inbox-page-skeleton';

export default withAuthentication(InboxPage, { displayName: 'Inbox', skeleton: InboxPageSkeleton });
