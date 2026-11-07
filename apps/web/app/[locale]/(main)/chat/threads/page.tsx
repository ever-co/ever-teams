'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ChatPage } from '@/core/components/pages/chat/chat-page';
import { ChatPageSkeleton } from '@/core/components/pages/chat/chat-page-skeleton';

function ChatThreadsPage() {
	return <ChatPage view="threads" />;
}

export default withAuthentication(ChatThreadsPage, { displayName: 'ChatThreads', skeleton: ChatPageSkeleton });
