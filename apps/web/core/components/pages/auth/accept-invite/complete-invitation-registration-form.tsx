import { Button } from '@/core/components/common/button';
import { Checkbox } from '@/core/components/common/checkbox';
import { TERMS_LINK } from '@/core/constants/config/constants';
import { TInviteVerified } from '@/core/types/schemas/user/invite.schema';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Lock, User } from '@/core/components/icons';
import { AuthField, PasswordField } from '@/core/components/auth/kit/auth-field';
import { AuthNotice } from '@/core/components/auth/kit/auth-notice';
import { AuthState } from '@/core/components/auth/kit/auth-state';
import { PasswordChecks } from '@/core/components/auth/kit/password-checks';
import { AUTH_TEXT_LINK } from '@/core/components/auth/kit/auth-recipes';

const NO_ERRORS = {
	confirmPassword: '',
	acceptInviteFailed: ''
};

export function CompleteInvitationRegistrationForm(props: {
	invitationData: TInviteVerified;
	onCompleteRegistration: (data: { fullName: string; password: string }) => Promise<void>;
	acceptInvitationLoading: boolean;
	/** The name as it is typed, for the preview beside the form. */
	onNameChange?: (fullName: string) => void;
}) {
	const t = useTranslations();
	const { invitationData, onCompleteRegistration, acceptInvitationLoading, onNameChange } = props;
	const [agreeToTerms, setAgreeToTerms] = useState(false);
	// A deployment that turned TERMS_LINK off has no terms to agree to: no checkbox, nothing to tick.
	const requiresTermsAgreement = Boolean(TERMS_LINK);
	const router = useRouter();
	const [loadingWorkspace, setLoadingWorkspace] = useState(false);

	const [userDetails, setUserDetails] = useState({
		fullName: invitationData.fullName || '',
		password: '',
		confirmPassword: ''
	});

	const [errors, setErrors] = useState(NO_ERRORS);

	const handleSubmit = useCallback(
		async (e: FormEvent<HTMLFormElement>) => {
			e.preventDefault();
			setErrors(NO_ERRORS);

			if (userDetails.password !== userDetails.confirmPassword) {
				setErrors({ ...NO_ERRORS, confirmPassword: t('errors.PASSWORDS_DO_NOT_MATCH') });
				return;
			}

			try {
				await onCompleteRegistration(userDetails);
				setLoadingWorkspace(true);
				router.push('/');
			} catch (error) {
				setErrors({ ...NO_ERRORS, acceptInviteFailed: t('auth.invite.FAILED') });
				console.error('Failed to accept invitation:', error);
			}
		},
		[onCompleteRegistration, userDetails, router, t]
	);

	useEffect(() => {
		return () => {
			setLoadingWorkspace(false);
		};
	}, []);

	const changeName = (fullName: string) => {
		setUserDetails((details) => ({ ...details, fullName }));
		onNameChange?.(fullName);
	};

	const needsAgreement = requiresTermsAgreement && !agreeToTerms;
	const isJoinDisabled = acceptInvitationLoading || needsAgreement || loadingWorkspace;

	if (loadingWorkspace) {
		return (
			<AuthState
				tone="loading"
				title={t('auth.workspace.OPENING')}
				description={t('pages.authTeam.LOADING_WORKSPACE')}
			/>
		);
	}

	return (
		<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
			<AuthField
				id="accept-invite-name"
				name="name"
				label={t('auth.field.NAME_LABEL')}
				placeholder={t('auth.field.NAME_PLACEHOLDER')}
				icon={<User />}
				value={userDetails.fullName}
				onChange={(e) => changeName(e.target.value)}
				autoComplete="name"
				required
			/>
			<PasswordField
				id="accept-invite-password"
				name="password"
				label={t('auth.field.NEW_PASSWORD_LABEL')}
				placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
				icon={<Lock />}
				value={userDetails.password}
				onChange={(e) => setUserDetails((details) => ({ ...details, password: e.target.value }))}
				autoComplete="new-password"
			/>
			<PasswordField
				id="accept-invite-confirm"
				name="confirmPassword"
				label={t('auth.field.CONFIRM_PASSWORD_LABEL')}
				placeholder={t('auth.field.PASSWORD_PLACEHOLDER')}
				icon={<Lock />}
				value={userDetails.confirmPassword}
				onChange={(e) => setUserDetails((details) => ({ ...details, confirmPassword: e.target.value }))}
				error={errors.confirmPassword}
				autoComplete="new-password"
			/>
			<PasswordChecks password={userDetails.password} confirmation={userDetails.confirmPassword} />

			{requiresTermsAgreement && (
				<div className="flex items-start gap-2.5">
					<Checkbox
						id="accept-invite-agree-terms"
						checked={agreeToTerms}
						onCheckedChange={() => setAgreeToTerms(!agreeToTerms)}
						className="mt-px"
					/>
					{/* A real label: clicking the "Agree to" text toggles the (16px) checkbox. */}
					<label
						htmlFor="accept-invite-agree-terms"
						className="cursor-pointer text-[13px] text-muted-foreground"
					>
						{t('form.AGREE_TO')}{' '}
						<a href={TERMS_LINK} target="_blank" className={AUTH_TEXT_LINK} rel="noreferrer">
							{t('layout.footer.TERMS_AND_CONDITIONS')}
						</a>
					</label>
				</div>
			)}

			{errors.acceptInviteFailed && <AuthNotice tone="error" title={errors.acceptInviteFailed} />}

			<Button
				loading={acceptInvitationLoading}
				disabled={isJoinDisabled}
				className="w-full max-sm:h-11"
				type="submit"
			>
				{t('common.JOIN_REQUEST')}
			</Button>
		</form>
	);
}
