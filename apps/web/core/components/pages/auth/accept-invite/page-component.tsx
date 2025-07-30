'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout';
import { useAcceptInvite } from '@/core/hooks/auth/use-accept-invite';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';
import { EInvitationState } from '@/core/types/schemas/user/invite.schema';
import { InvitationExpiredMessageCard } from './invitation-expired-message-card';
import { AcceptInviteSkelethon } from '@/core/components/layouts/skeletons/accept-invite-skelethon';
import { Loader } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect } from 'react';

export function AcceptInvitePageComponent() {
	const searchParams = useSearchParams();
	const code = searchParams?.get('code')?.split('/')[0];
	const email = searchParams?.get('email');

	const { invitationState, handleAcceptInvitation, acceptInvitationLoading, validateInvitation, setInvitationState } =
		useAcceptInvite();

	const onCompleteRegistration = useCallback(
		async ({ fullName, password }: { fullName: string; password: string }) => {
			// Accept invitation
			if (!code || !email) {
				console.error('Missing required parameters: code and/or email');
				return;
			}

			await handleAcceptInvitation({
				password,
				user: {
					firstName: fullName ? fullName.split(' ').slice(0, -1).join(' ') : null,
					lastName: fullName ? fullName.split(' ').slice(-1).join(' ') : null,
					email
				},
				code,
				email
			});
		},
		[handleAcceptInvitation, code, email]
	);

	useEffect(() => {
		// Validate invitation
		if (!code || !email) {
			setInvitationState({
				state: EInvitationState.FAILED,
				loading: false,
				data: null,
				error: new Error('Missing parameters')
			});
			console.error('Missing parameters: code and/or email');
			return;
		}

		validateInvitation({ code, email });
	}, [code, email, validateInvitation, setInvitationState]);

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
						onCompleteRegistration={onCompleteRegistration}
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
