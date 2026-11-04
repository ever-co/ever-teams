import { BackdropLoader } from '@/core/components/common/loader';
import { Button } from '@/core/components/common/button';
import { Checkbox } from '@/core/components/common/checkbox';
import { EverCard } from '@/core/components/common/ever-card';
import { Text } from '@/core/components/common/typography';
import { InputField } from '@/core/components/duplicated-components/_input';
import { TERMS_LINK } from '@/core/constants/config/constants';
import { cn } from '@/core/lib/helpers';
import { TInviteVerified } from '@/core/types/schemas/user/invite.schema';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export function CompleteInvitationRegistrationForm(props: {
	invitationData: TInviteVerified;
	onCompleteRegistration: (data: { fullName: string; password: string }) => Promise<void>;
	acceptInvitationLoading: boolean;
}) {
	const t = useTranslations();
	const { invitationData, onCompleteRegistration, acceptInvitationLoading } = props;
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

	const [errors, setErrors] = useState({
		fullName: '',
		password: '',
		confirmPassword: '',
		acceptInviteFailed: ''
	});

	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			try {
				e.preventDefault();

				setErrors({
					fullName: '',
					password: '',
					confirmPassword: '',
					acceptInviteFailed: ''
				});

				if (userDetails.password !== userDetails.confirmPassword) {
					setErrors({
						...errors,
						confirmPassword: t('errors.PASSWORDS_DO_NOT_MATCH')
					});

					return;
				}

				await onCompleteRegistration(userDetails);
				setLoadingWorkspace(true);
				router.push('/');
			} catch (error) {
				setErrors({
					...errors,
					acceptInviteFailed: 'Failed to accept invitation'
				});
				console.error('Failed to accept invitation:', error);
			}
		},
		[onCompleteRegistration, userDetails, errors, t]
	);

	useEffect(() => {
		return () => {
			setLoadingWorkspace(false);
		};
	}, []);

	return (
		<div className="mx-auto w-full max-w-sm flex flex-col gap-6">
			<div className="w-full flex flex-col gap-2 text-center">
				<h2 className="text-xl font-semibold text-balance">
					{t('pages.invite.acceptInvite.ACCEPT_INVITATION_TO_TEAM', {
						team: invitationData.organization.name
					})}
				</h2>
				<p className="text-sm text-balance text-muted-foreground">
					{t('pages.invite.acceptInvite.COMPLETE_REGISTRATION', { userEmail: invitationData.email })}
				</p>
			</div>
			<EverCard className="w-full p-5 md:p-6" shadow="custom">
				<form className="flex flex-col gap-4 items-center justify-between" onSubmit={handleSubmit}>
					<div className="w-full flex flex-col items-center gap-5">
						<Text.Heading as="h3" className="text-center text-base">
							{t('pages.invite.acceptInvite.USER_DETAILS')}
						</Text.Heading>
						<div className="w-full">
							<InputField
								name="name"
								type="text"
								placeholder={t('form.NAME_PLACEHOLDER')}
								value={userDetails.fullName}
								errors={errors}
								onChange={(e) => setUserDetails({ ...userDetails, fullName: e.target.value })}
								autoComplete="off"
								required
							/>

							<InputField
								type="password"
								name="password"
								placeholder={t('form.PASSWORD_PLACEHOLDER')}
								value={userDetails.password}
								errors={errors}
								onChange={(e) => setUserDetails({ ...userDetails, password: e.target.value })}
								autoComplete="off"
							/>

							<InputField
								type="password"
								name="confirmPassword"
								placeholder={t('form.CONFIRM_PASSWORD_PLACEHOLDER')}
								wrapperClassName="mb-0"
								value={userDetails.confirmPassword}
								errors={errors}
								onChange={(e) => {
									setUserDetails({ ...userDetails, confirmPassword: e.target.value });
								}}
								autoComplete="off"
							/>
							{errors.acceptInviteFailed && (
								<Text.Error className="justify-self-start self-start">
									{errors.acceptInviteFailed}
								</Text.Error>
							)}
						</div>
					</div>

					<div
						className={cn(
							'flex items-center gap-3 w-full',
							requiresTermsAgreement && 'justify-between',
							!requiresTermsAgreement && 'justify-end'
						)}
					>
						{requiresTermsAgreement && (
							<div className="flex items-center gap-2">
								<Checkbox
									id="accept-invite-agree-terms"
									checked={agreeToTerms}
									onCheckedChange={() => setAgreeToTerms(!agreeToTerms)}
								/>
								{/* A real label: clicking the "Agree to" text toggles the (16px) checkbox — it did not before. */}
								<label
									htmlFor="accept-invite-agree-terms"
									className="cursor-pointer text-sm text-muted-foreground"
								>
									{t('form.AGREE_TO')}{' '}
									<a
										href={TERMS_LINK}
										target="_blank"
										className="rounded-sm font-medium text-primary-ink underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
										rel="noreferrer"
									>
										{t('layout.footer.TERMS_AND_CONDITIONS')}
									</a>
								</label>
							</div>
						)}

						<Button
							loading={acceptInvitationLoading}
							disabled={
								acceptInvitationLoading || (requiresTermsAgreement && !agreeToTerms) || loadingWorkspace
							}
							className="shrink-0"
							type="submit"
						>
							{t('common.JOIN_REQUEST')}
						</Button>
					</div>
				</form>
			</EverCard>
			<BackdropLoader show={loadingWorkspace} title={t('pages.authTeam.LOADING_WORKSPACE')} />
		</div>
	);
}
