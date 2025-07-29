'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useAcceptInvite } from '@/core/hooks/auth/use-accept-invite';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';
import { EInvitationState } from '@/core/types/schemas/user/invite.schema';
import { InvitationExpiredMessageCard } from './invitation-expired-message-card';
import { Spinner } from '@/core/components/common/spinner';
import { AcceptInviteSkelethon } from '@/core/components/layouts/skeletons/accept-invite-skelethon';

export function AcceptInvitePageComponent() {
	const { invitationState, handleAcceptInvitation, acceptInvitationLoading } = useAcceptInvite();

	const renderContent = () => {
		switch (invitationState.state) {
			case EInvitationState.LOADING:
				return (
					<div className="w-full h-full flex items-center justify-center">
						<Spinner className="w-10 h-10" />
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
