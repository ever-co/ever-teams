'use client';

import { AuthLayout } from '@/core/components/layouts/default-layout/auth-layout';
import { useAcceptInvite } from '@/core/hooks/auth/use-accept-invite';
import { CompleteInvitationRegistrationForm } from './complete-invitation-registration-form';
import { EInvitationState, TInviteVerified } from '@/core/types/schemas/user/invite.schema';
import { InvitationExpiredMessageCard } from './invitation-expired-message-card';
import { AcceptInviteSkeleton } from '@/core/components/layouts/skeletons/accept-invite-skeleton';
import { EntityTile } from '@/core/components/common/entity-tile';
import { AuthHeading } from '@/core/components/auth/kit/auth-heading';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { InviteScene } from '@/core/components/auth/scenes/auth-scenes';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

function renderAddress(chunks: ReactNode) {
	return <span className="font-medium break-all text-foreground">{chunks}</span>;
}

function ValidatedInvitation({
	invitation,
	onCompleteRegistration,
	acceptInvitationLoading,
	onNameChange
}: Readonly<{
	invitation: TInviteVerified;
	onCompleteRegistration: (data: { fullName: string; password: string }) => Promise<void>;
	acceptInvitationLoading: boolean;
	onNameChange: (fullName: string) => void;
}>) {
	const t = useTranslations();
	const organizationName = invitation.organization.name;

	return (
		<div className="flex flex-col">
			<AuthHeading
				mark={
					<EntityTile
						name={organizationName}
						imageUrl={invitation.organization.image}
						className="size-11 rounded-xl text-sm"
					/>
				}
				title={t('auth.invite.TITLE', { organization: organizationName })}
				description={t.rich('auth.invite.DESCRIPTION', { email: invitation.email, address: renderAddress })}
				className="mb-7"
			/>
			<CompleteInvitationRegistrationForm
				invitationData={invitation}
				onCompleteRegistration={onCompleteRegistration}
				acceptInvitationLoading={acceptInvitationLoading}
				onNameChange={onNameChange}
			/>
		</div>
	);
}

export function AcceptInvitePageComponent() {
	const t = useTranslations();
	const searchParams = useSearchParams();
	const code = searchParams?.get('code')?.split('/')[0];
	const email = searchParams?.get('email');
	const [typedName, setTypedName] = useState<string | null>(null);

	const { invitationState, handleAcceptInvitation, acceptInvitationLoading, validateInvitation, setInvitationState } =
		useAcceptInvite();

	const onCompleteRegistration = useCallback(
		async ({ fullName, password }: { fullName: string; password: string }) => {
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

	// Validate exactly once per (code, email). Guarding by key means a changing callback identity can
	// never re-trigger the request (that is what looped this page, see use-invite-validation.ts).
	const validatedKeyRef = useRef<string | null>(null);
	useEffect(() => {
		const key = `${code ?? ''}|${email ?? ''}`;
		if (validatedKeyRef.current === key) return;
		validatedKeyRef.current = key;
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

	let content: ReactNode = <AcceptInviteSkeleton />;
	let scene: ReactNode = null;

	if (invitationState.state === EInvitationState.LOADING) {
		content = <AuthState tone="loading" title={t('auth.invite.CHECKING')} />;
	}

	if (invitationState.state === EInvitationState.FAILED) {
		content = <InvitationExpiredMessageCard />;
	}

	if (invitationState.state === EInvitationState.VALIDATED) {
		const invitation = invitationState.data;
		const shownName = typedName ?? invitation.fullName ?? '';
		content = (
			<ValidatedInvitation
				invitation={invitation}
				onCompleteRegistration={onCompleteRegistration}
				acceptInvitationLoading={acceptInvitationLoading}
				onNameChange={setTypedName}
			/>
		);
		scene = (
			<InviteScene
				title={t('auth.scene.INVITE_TITLE')}
				description={t('auth.scene.INVITE_TEXT')}
				organizationName={invitation.organization.name}
				organizationImage={invitation.organization.image}
				name={shownName}
				email={invitation.email}
			/>
		);
	}

	return <AuthLayout aside={scene}>{content}</AuthLayout>;
}
