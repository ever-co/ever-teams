'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useAcceptInvite } from '@/core/hooks/auth/use-accept-invite';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';
import { EInvitationState } from '@/core/types/schemas/user/invite.schema';
import { InvitationExpiredMessageCard } from './invitation-expired-message-card';
import { AcceptInviteSkelethon } from '@/core/components/layouts/skeletons/accept-invite-skelethon';
import { Loader } from 'lucide-react';

export function AcceptInvitePageComponent() {
	const { invitationState, handleAcceptInvitation, acceptInvitationLoading } = useAcceptInvite();

	const renderContent = () => {
		switch (invitationState.state) {
			case EInvitationState.LOADING:
				return (
					<div className="w-full h-full flex items-center justify-center">
						<Loader size={50} className=" animate-spin" />
					</div>
				);
			case EInvitationState.VALIDATED:
				return (
					<CompleteInvitationRegistrationForm
						invitationData={invitationState.data}
						onAcceptInvitation={handleAcceptInvitation}
						acceptInvitationLoading={acceptInvitationLoading}
					/>
				);
			case EInvitationState.FAILED:
				return <InvitationExpiredMessageCard />;
			default:
				return <AcceptInviteSkelethon />;
		}
	};

	return (
		<AuthLayout isAuthPage={false}>
			<div className="w-full  h-full flex items-center justify-center">{renderContent()}</div>
		</AuthLayout>
	);
}
