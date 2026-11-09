'use client';

import { withAuthentication } from '@/core/components/layouts/app/authenticator';
import { ChatPage } from '@/core/components/pages/chat/chat-page';
import { ChatPageSkeleton } from '@/core/components/pages/chat/chat-page-skeleton';

function ChatUnreadsPage() {
	return <ChatPage view="unreads" />;
}

export default withAuthentication(ChatUnreadsPage, { displayName: 'ChatUnreads', skeleton: ChatPageSkeleton });
