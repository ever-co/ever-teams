'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useAcceptInvite } from '@/core/hooks/auth/use-accept-invite';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';
import { EInvitationState } from '@/core/types/schemas/user/invite.schema';
import { InvitationExpiredMessageCard } from './invitation-expired-message-card';
import { Loader } from 'lucide-react';

export function AcceptInvitePageComponent() {
	const { invitationState, handleAcceptInvitation, acceptInvitationLoading } = useAcceptInvite();

	return (
		<AuthLayout isAuthPage={false}>
			<div className="w-full border  h-full flex items-center justify-center">
				{invitationState.state === EInvitationState.IDLE ? (
					<div>Idle</div> // we need to add skeleton here
				) : invitationState.state === EInvitationState.LOADING ? (
					<div className="w-full h-full flex items-center justify-center">
						<Loader size={50} className=" animate-spin" />
					</div>
				) : invitationState.state === EInvitationState.VALIDATED ? (
					<CompleteInvitationRegistrationForm
						invitationData={invitationState.data}
						onAcceptInvitation={handleAcceptInvitation}
						acceptInvitationLoading={acceptInvitationLoading}
					/>
				) : (
					<InvitationExpiredMessageCard />
				)}
			</div>
		</AuthLayout>
	);
}
