'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ChatPage } from '@/core/components/pages/chat/chat-page';
import { ChatPageSkeleton } from '@/core/components/pages/chat/chat-page-skeleton';

export default withAuthentication(ChatPage, { displayName: 'Chat', skeleton: ChatPageSkeleton });
