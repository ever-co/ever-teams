'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';

export function AcceptInvitePageComponent() {
	return (
		<AuthLayout isAuthPage={false}>
			<div className="w-full border  h-full flex items-center justify-center">
				<CompleteInvitationRegistrationForm />
			</div>
		</AuthLayout>
	);
}
