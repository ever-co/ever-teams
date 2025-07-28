'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { WorkspaceNotFoundMessageCard } from './workspace-not-founf-message-card';

export function AcceptInvitePageComponent() {
	return (
		<AuthLayout isAuthPage={false}>
			<div className="w-full border  h-full flex items-center justify-center">
				<WorkspaceNotFoundMessageCard />
			</div>
		</AuthLayout>
	);
}
